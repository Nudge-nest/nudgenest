import { createServer } from '../../server-factory';
import { Server, ServerInjectResponse } from '@hapi/hapi';

// Mock the validation function
jest.mock('../../shopifyWebhookSchema', () => ({
    isWebhookDataToPublishValid: jest.fn(),
    sampleShopifyWebhook: {
        payload: {
            content: {}
        }
    }
}));

import { isWebhookDataToPublishValid } from '../../shopifyWebhookSchema';
import {Channel} from "amqplib";

describe('Shopify Webhook route', () => {
    let server: Server;
    let mockChannel: any;

    beforeAll(async () => {
        server = await createServer();
        await server.initialize();

        // Set up complete mock RabbitMQ channels with ALL required methods
        mockChannel = {
            publish: jest.fn().mockReturnValue(true),
            close: jest.fn().mockResolvedValue(undefined) // Add this
        };

        server.app.rabbit = {
            shopifyChannel: mockChannel,
            messagingChannel: {
                close: jest.fn().mockResolvedValue(undefined) // Add this too
            } as any,
            connection: {
                close: jest.fn().mockResolvedValue(undefined) // And this
            } as any
        };
    });

    afterAll(async () => {
        await server.stop();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const validPayload = {
        customer_locale: 'en',
        order_number: '12345',
        id: 'order-123',
        order_status_url: 'https://shop.com/order/123',
        merchant_business_entity_id: 'merchant-123',
        customer: {
            id: 'cust-123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            state: 'CA',
            verified_email: true
        },
        line_items: []
    };

    test('POST /api/v1/shopify-webhook returns 200 when webhook is processed successfully', async () => {
        (isWebhookDataToPublishValid as jest.Mock).mockReturnValue(true);

        const res: ServerInjectResponse<{version: string; message: string}> = await server.inject({
            method: 'POST',
            url: '/api/v1/shopify-webhook',
            payload: validPayload
        });

        expect(res.statusCode).toBe(200);
        expect(res.result).toHaveProperty('version', '1.0.0');
        expect(res.result).toHaveProperty('message', 'New message published');
        expect(mockChannel.publish).toHaveBeenCalledTimes(1);
    });

    test('POST /api/v1/shopify-webhook returns null when order_number is missing', async () => {
        const invalidPayload = { ...validPayload, order_number: undefined };

        const res = await server.inject({
            method: 'POST',
            url: '/api/v1/shopify-webhook',
            payload: invalidPayload
        });

        expect(res.statusCode).toBe(204); // null returns 204
        expect(mockChannel.publish).not.toHaveBeenCalled();
    });

    test('POST /api/v1/shopify-webhook returns null when customer_locale is missing', async () => {
        const invalidPayload = { ...validPayload, customer_locale: undefined };

        const res = await server.inject({
            method: 'POST',
            url: '/api/v1/shopify-webhook',
            payload: invalidPayload
        });

        expect(res.statusCode).toBe(204); // null returns 204
        expect(mockChannel.publish).not.toHaveBeenCalled();
    });

    test('POST /api/v1/shopify-webhook returns 500 when webhook data is invalid', async () => {
        (isWebhookDataToPublishValid as jest.Mock).mockReturnValue(false);

        const res: ServerInjectResponse<{version: string; error: string}> = await server.inject({
            method: 'POST',
            url: '/api/v1/shopify-webhook',
            payload: validPayload
        });

        expect(res.statusCode).toBe(500);
        expect(res.result).toHaveProperty('version', '1.0.0');
        expect(res.result).toHaveProperty('error', 'Invalid webhook data to publish');
        expect(mockChannel.publish).not.toHaveBeenCalled();
    });

    test('POST /api/v1/shopify-webhook returns 500 when publishing fails', async () => {
        (isWebhookDataToPublishValid as jest.Mock).mockReturnValue(true);
        mockChannel.publish.mockImplementation(() => {
            throw new Error('Failed to publish to RabbitMQ');
        });

        const res: ServerInjectResponse<{version: string; error: string}> = await server.inject({
            method: 'POST',
            url: '/api/v1/shopify-webhook',
            payload: validPayload
        });

        expect(res.statusCode).toBe(500);
        expect(res.result).toHaveProperty('error', 'Failed to publish to RabbitMQ');
    });
});
