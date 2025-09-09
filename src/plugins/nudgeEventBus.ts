/* Create and initiate all Exchanges and Queues, RabbitMQ plugin */
import Hapi from '@hapi/hapi';
import amqp, { Channel, Connection } from 'amqplib';
import * as dotenv from 'dotenv';

dotenv.config();

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        rabbit: {
            connection: any;
            messagingChannel: Channel;
        };
    }
}

// Exchange and queue names
export const messagingExchange = 'message_exchange';
export const messagingQueue = 'message_queue';

const rabbitPlugin: Hapi.Plugin<null> = {
    name: 'rabbit',
    register: async (server: Hapi.Server) => {
        try {
            const RABBITMQ_URL = process.env.RABBITMQ_URL_AWS;
            if (!RABBITMQ_URL) throw new Error('Missing RABBITMQ_URL_AWS');
            const connection: any = await amqp.connect(RABBITMQ_URL);
            // Utility to create and bind exchange/queue
            const setupChannel = async (exchangeName: string, queueName: string, type = 'fanout'): Promise<Channel> => {
                const channel = await connection.createChannel();
                await channel.assertExchange(exchangeName, type, { durable: true });
                await channel.assertQueue(queueName, { durable: true });
                await channel.bindQueue(queueName, exchangeName, '');
                return channel;
            };
            const messagingChannel = await setupChannel(messagingExchange, messagingQueue);
            server.app.rabbit = { connection, /*shopifyChannel, */ messagingChannel };
            console.log('✅ RabbitMQ connection established and ready');
        } catch (err) {
            console.error('❌ Error connecting to RabbitMQ:', err);
        }
        // Gracefully close RabbitMQ connection on server shutdown
        server.ext('onPostStop', async () => {
            if (server.app.rabbit) {
                console.log('🔌 Closing RabbitMQ channels and connection...');
                await server.app.rabbit.messagingChannel.close();
                await server.app.rabbit.connection.close();
            }
        });
    },
};

export default rabbitPlugin;
