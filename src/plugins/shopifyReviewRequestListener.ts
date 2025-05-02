import Hapi from '@hapi/hapi';

import * as dotenv from 'dotenv';
import { messagingExchange, shopifyReviewRequestQueue } from './nudgeEventBus';
import { isRabbitReviewRequestMessageValid, sampleMessaging } from '../messagesSchema';
import { IReviewMessagePayloadContent, IRabbitDataObject, IShopifyWebhookMessagePayloadContent } from '../types';

dotenv.config();

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        shopifyreqlistener: any;
    }
}

const createNewReview = async (prisma: any, shopifyMessage: any) => {
    const { merchant_business_entity_id, customer, line_items } = shopifyMessage;
    if (!customer?.email) {
        throw new Error('Missing customer email');
    }
    try {
        const newReview = await prisma.reviews.create({
            data: {
                merchantId: merchant_business_entity_id,
                customerPhone: customer.phone || '',
                customerEmail: customer.email,
                items: line_items,
            },
        });
        console.log("['info'] New review created", newReview.id);
        return newReview;
    } catch (error: any) {
        throw new Error(error.message);
    }
};

const shopifyReviewRequestListenerPlugin: Hapi.Plugin<null> = {
    name: 'shopifyreqlistener',
    register: async (server: Hapi.Server) => {
        const { shopifyChannel, messagingChannel } = server.app.rabbit;
        const { prisma } = server.app;
        await shopifyChannel.consume(shopifyReviewRequestQueue, async (msg: any) => {
            if (msg) {
                try {
                    //const rawContent = msg.content.toString();
                    const channelMessageToJson = JSON.parse(
                        msg.content.toString()
                    ) as IRabbitDataObject<IShopifyWebhookMessagePayloadContent>;
                    const { customer, line_items, order_number } = channelMessageToJson.payload.content;
                    const newReview = await createNewReview(prisma, channelMessageToJson.payload.content);
                    const newMessageContent: IReviewMessagePayloadContent = {
                        userName: customer.first_name,
                        type: 'auto',
                        email: customer.email,
                        line_items: line_items,
                        order_number: order_number,
                        reviewId: newReview.id,
                    };
                    let newReviewMessage = { ...sampleMessaging };
                    newReviewMessage.payload.content = newMessageContent;
                    const isValidMessage = isRabbitReviewRequestMessageValid(newReviewMessage);
                    if (isValidMessage) {
                        messagingChannel.publish(messagingExchange, '', Buffer.from(JSON.stringify(newReviewMessage)));
                    } else {
                        throw new Error(`${msg} is not a valid message`);
                    }
                } catch (err: any) {
                    console.error(`[shopifyReviewRequestQueue] Invalid Message:`, err.message);
                    console.error(err.message);
                } finally {
                    shopifyChannel.ack(msg); // Always acknowledge the message
                }
            }
        });
    },
};

export default shopifyReviewRequestListenerPlugin;
