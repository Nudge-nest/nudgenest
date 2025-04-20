/*Create and initiate all Exchanges and queues here, also major Rabbit pluggin*/
import Hapi from '@hapi/hapi';
import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';

import * as dotenv from 'dotenv';

dotenv.config();

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        rabbit: any;
    }
}

export const shopifyReviewRequestExchange = 'shopify_review_request_exchange';
export const shopifyReviewRequestQueue = 'shopify_review_request_queue';
export const messagingExchange = 'message_exchange';
export const messagingQueue = 'message_queue';

const rabbitPlugin: Hapi.Plugin<null> = {
    name: 'rabbit',
    register: async (server: Hapi.Server) => {
        let connection: Connection;
        try {
            connection = await amqp.connect(process.env.RABBITMQ_URL_AWS as string);
            //amqps://b-c3d9124d-5509-4e95-acfb-da9caf278260.mq.eu-north-1.amazonaws.com:5671
            //amqps://admin:nudgenestrabbitadminpassword@b-c3d9124d-5509-4e95-acfb-da9caf278260.mq.eu-north-1.amazonaws.com:5671

            const createChannelWithExchange = async (exchangeName: string, type = 'fanout') => {
                const channel = await connection.createChannel();
                await channel.assertExchange(exchangeName, type, { durable: true });
                return channel;
            };

            // Declare the fanout exchange
            const shopifyChannel = await createChannelWithExchange(shopifyReviewRequestExchange);
            const messagingChannel = await createChannelWithExchange(messagingExchange);
            // Bind the queue to the exchange
            await shopifyChannel.assertQueue(shopifyReviewRequestQueue, {
                durable: true, // Ensures messages persist in the queue if RabbitMQ restarts
            });
            await messagingChannel.assertQueue(messagingQueue, {
                durable: true, // Ensures messages persist in the queue if RabbitMQ restarts
            });
            await shopifyChannel.bindQueue(shopifyReviewRequestQueue, shopifyReviewRequestExchange, '');
            await messagingChannel.bindQueue(messagingQueue, messagingExchange, '');

            if (connection) server.app.rabbit = { connection, shopifyChannel, messagingChannel };
            console.log("['info'] Rabbit client is connected and ready");
        } catch (e) {
            console.warn(e);
        }
        // Clean up on server stop
        server.ext('onPostStop', async () => {
            if (server.app.rabbit) {
                console.log('Closing RabbitMQ connections...');
                await server.app.rabbit.shopifyChannel.close();
                await server.app.rabbit.messagingChannel.close();
                await server.app.rabbit.connection.close();
            }
        });
    },
};

export default rabbitPlugin;
