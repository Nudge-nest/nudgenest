/*Handles receiving webhooks notification from shopify via api endpoint and publishing to exchange*/
import Hapi from '@hapi/hapi';

import * as dotenv from 'dotenv';
import { messagingExchange } from './nudgeEventBus';

import {
    buildPublishJson,
    createNewReview,
    extractMessagingContentFromShopifyData,
    extractShopifyDataForRabbitMessaging,
    getMerchantWithBusinessInfo,
} from '../utils/reviews';
import { isRabbitReviewRequestMessageValid, sampleMessaging } from '../messagesSchema';
import { convertObjectToBuffer, createMerchantEmailMessagingTemplate } from './merchant';

dotenv.config();

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
    const { rabbit, prisma } = request.server.app;
    const { messagingChannel } = rabbit;
    const { customer_locale, order_number } = request.payload as any;
    if (!order_number || !customer_locale) return null;
    try {
        const reviewDataFromPayload = extractShopifyDataForRabbitMessaging(request.payload);
        const merchantData = await getMerchantWithBusinessInfo(
            prisma,
            reviewDataFromPayload.merchant_business_entity_id
        );
        const createNewReviewToDb = await createNewReview(prisma, reviewDataFromPayload, merchantData.id);
        const reviewMessageContent = extractMessagingContentFromShopifyData(
            reviewDataFromPayload,
            createNewReviewToDb.id
        );
        const reviewToMessagingChannelJSON = buildPublishJson(reviewMessageContent, sampleMessaging);
        const reviewMessageToMerchantJSON = createMerchantEmailMessagingTemplate(
            merchantData,
            sampleMessaging,
            'new-review-merchant'
        );
        if (
            !isRabbitReviewRequestMessageValid(reviewToMessagingChannelJSON) ||
            !isRabbitReviewRequestMessageValid(reviewMessageToMerchantJSON)
        )
            throw new Error('Invalid messaging data to publish');
        messagingChannel.publish(messagingExchange, '', convertObjectToBuffer(reviewToMessagingChannelJSON));
        messagingChannel.publish(messagingExchange, '', convertObjectToBuffer(reviewMessageToMerchantJSON));
        return h.response({ version: '1.0.0', message: 'New review processed successfully' }).code(200);
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
