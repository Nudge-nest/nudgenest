/*Handles receiving webhooks notification from shopify via api endpoint and publishing to exchange*/
import Hapi from '@hapi/hapi';

import * as dotenv from 'dotenv';
import { shopifyReviewRequestExchange } from './nudgeEventBus';
import { isWebhookDataToPublishValid, sampleShopifyWebhook } from '../shopifyWebhookSchema';
import { IRabbitDataObject, IShopifyWebhookMessagePayloadContent } from '../types';

dotenv.config();

const extractShopifyDataForRabbitMessaging = (payload: any): IShopifyWebhookMessagePayloadContent => {
    const { customer, merchant_business_entity_id, order_status_url, id, customer_locale, order_number, line_items } =
        payload;
    const { id: customerId, first_name, last_name, state, email, phone, verified_email } = customer || {};
    return {
        customer: { id: customerId, first_name, last_name, state, email, phone, verified_email },
        merchant_business_entity_id,
        order_status_url,
        id,
        customer_locale,
        order_number,
        line_items,
    };
};

const buildPublishJson = (
    shopifyMessage: IShopifyWebhookMessagePayloadContent
): IRabbitDataObject<IShopifyWebhookMessagePayloadContent> => ({
    ...sampleShopifyWebhook,
    payload: {
        ...sampleShopifyWebhook.payload,
        content: shopifyMessage,
    },
});

const publishToReviewExchange = (channel: any, publishJson: any) => {
    const publishBuffer = Buffer.from(JSON.stringify(publishJson));
    channel.publish(shopifyReviewRequestExchange, '', publishBuffer);
};

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        shopifyWebhook: any;
    }
}

const shopifyWebhookPlugin: Hapi.Plugin<null> = {
    name: 'shopifyWebhook',
    dependencies: ['rabbit'],
    register: async (server: Hapi.Server) => {
        server.route([
            {
                method: 'POST',
                path: '/api/v1/shopify-webhook',
                handler: webhookMessageHandler,
                options: {
                    auth: false,
                },
            },
        ]);
    },
};

const webhookMessageHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { shopifyChannel } = request.server.app.rabbit;
    const { customer_locale, order_number } = request.payload as any;
    if (!order_number || !customer_locale) return null;
    try {
        const shopifyMessage = extractShopifyDataForRabbitMessaging(request.payload);
        const requestMessagePublishJson = buildPublishJson(shopifyMessage);
        if (!isWebhookDataToPublishValid(requestMessagePublishJson)) throw new Error('Invalid webhook data to publish');
        publishToReviewExchange(shopifyChannel, requestMessagePublishJson);
        return h.response({ version: '1.0.0', message: 'New message published' }).code(200);
    } catch (error: any) {
        return h
            .response({
                version: '1.0.0',
                error: error.message,
            })
            .code(500);
    }
};

export default shopifyWebhookPlugin;
