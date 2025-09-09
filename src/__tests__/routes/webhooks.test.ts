// src/__tests__/routes/webhooks.test.ts
import { createServer } from '../../server-factory';
import { Server, ServerInjectResponse } from '@hapi/hapi';
import { prismaMock } from '../mocks/prisma';

// Mock the nudgeEventBus module
jest.mock('src/plugins/nudgeEventbus', () => ({
    messagingExchange: 'message_exchange',
}), { virtual: true });

// Mock the validation and schema functions
jest.mock('@/messagesSchema', () => ({
    isRabbitReviewRequestMessageValid: jest.fn(),
    sampleMessaging: {
        payload: {
            content: {},
        },
    },
}));

// Mock the utils/reviews functions
jest.mock('utils/reviews', () => ({
    buildPublishJson: jest.fn(),
    createNewReview: jest.fn(),
    extractMessagingContentFromShopifyData: jest.fn(),
    extractShopifyDataForRabbitMessaging: jest.fn(),
    getMerchantWithBusinessInfo: jest.fn(),
}));

// Mock the merchant module with the correct structure for Hapi
jest.mock('plugins/merchant', () => ({
    // Plugin structure for Hapi (if it's being auto-loaded)
    plugin: {
        name: 'merchant',
        register: async () => {}, // Empty register function
    },
    // Utility functions
    convertObjectToBuffer: jest.fn(),
    createMerchantEmailMessagingTemplate: jest.fn(),
}));

// After mocking, we can access the mocked functions
const { isRabbitReviewRequestMessageValid } = require('../../messagesSchema');
const {
    buildPublishJson,
    createNewReview,
    extractMessagingContentFromShopifyData,
    extractShopifyDataForRabbitMessaging,
    getMerchantWithBusinessInfo,
} = require('../../utils/reviews');
const { convertObjectToBuffer, createMerchantEmailMessagingTemplate } = require('../../plugins/merchant');

describe('Shopify Webhook route', () => {
    let server: Server;
    let mockChannel: any;

    beforeAll(async () => {
        try {
            server = await createServer();
            await server.initialize();

            // Set up mock RabbitMQ channel
            mockChannel = {
                publish: jest.fn().mockReturnValue(true),
                close: jest.fn().mockResolvedValue(undefined),
            };

            server.app.rabbit = {
                messagingChannel: mockChannel,
                connection: {
                    close: jest.fn().mockResolvedValue(undefined),
                },
            };

            // Set up mock Prisma
            server.app.prisma = prismaMock;
        } catch (error) {
            console.error('Failed to initialize server:', error);
            throw error;
        }
    });

    afterAll(async () => {
        if (server) {
            await server.stop();
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Set up all the mock return values
        extractShopifyDataForRabbitMessaging.mockReturnValue({
            mocked: 'shopifyData',
            merchant_business_entity_id: 'merchant-123',
        });
        getMerchantWithBusinessInfo.mockResolvedValue({
            id: 'merchant-id-456',
            name: 'Test Merchant',
            email: 'merchant@example.com',
        });
        createNewReview.mockResolvedValue({ id: 'review-123' });
        extractMessagingContentFromShopifyData.mockReturnValue({ mocked: 'messagingContent' });
        buildPublishJson.mockReturnValue({ mocked: 'publishJson' });
        createMerchantEmailMessagingTemplate.mockReturnValue({ mocked: 'merchantEmailJson' });
        isRabbitReviewRequestMessageValid.mockReturnValue(true);
        convertObjectToBuffer.mockImplementation((obj: any) => Buffer.from(JSON.stringify(obj)));
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
            verified_email: true,
        },
        line_items: [],
    };

    test('POST /api/v1/shopify-webhook returns 200 when webhook is processed successfully', async () => {
        const res: ServerInjectResponse<{ version: string; message: string }> = await server.inject({
            method: 'POST',
            url: '/api/v1/shopify-webhook',
            payload: validPayload,
        });

        expect(res.statusCode).toBe(200);
        expect(res.result).toHaveProperty('version', '1.0.0');
        expect(res.result).toHaveProperty('message', 'New review processed successfully');

        // Should publish twice - once for review, once for merchant
        expect(mockChannel.publish).toHaveBeenCalledTimes(2);

        expect(getMerchantWithBusinessInfo).toHaveBeenCalledWith(prismaMock, 'merchant-123');
        expect(createNewReview).toHaveBeenCalledWith(
            prismaMock,
            { mocked: 'shopifyData', merchant_business_entity_id: 'merchant-123' },
            'merchant-id-456'
        );
        expect(extractShopifyDataForRabbitMessaging).toHaveBeenCalledWith(validPayload);
        expect(extractMessagingContentFromShopifyData).toHaveBeenCalledWith(
            { mocked: 'shopifyData', merchant_business_entity_id: 'merchant-123' },
            'review-123'
        );
        expect(buildPublishJson).toHaveBeenCalled();
        expect(createMerchantEmailMessagingTemplate).toHaveBeenCalledWith(
            { id: 'merchant-id-456', name: 'Test Merchant', email: 'merchant@example.com' },
            expect.objectContaining({ payload: { content: {} } }),
            'new-review-merchant'
        );
        expect(isRabbitReviewRequestMessageValid).toHaveBeenCalledTimes(2);
    });

    test('POST /api/v1/shopify-webhook returns null when order_number is missing', async () => {
        const invalidPayload = { ...validPayload, order_number: undefined };

        const res = await server.inject({
            method: 'POST',
            url: '/api/v1/shopify-webhook',
            payload: invalidPayload,
        });

        expect(res.statusCode).toBe(204); // null returns 204
        expect(mockChannel.publish).not.toHaveBeenCalled();
        expect(createNewReview).not.toHaveBeenCalled();
        expect(extractShopifyDataForRabbitMessaging).not.toHaveBeenCalled();
        expect(getMerchantWithBusinessInfo).not.toHaveBeenCalled();
    });

    test('POST /api/v1/shopify-webhook returns null when customer_locale is missing', async () => {
        const invalidPayload = { ...validPayload, customer_locale: undefined };

        const res = await server.inject({
            method: 'POST',
            url: '/api/v1/shopify-webhook',
            payload: invalidPayload,
        });

        expect(res.statusCode).toBe(204); // null returns 204
        expect(mockChannel.publish).not.toHaveBeenCalled();
        expect(createNewReview).not.toHaveBeenCalled();
        expect(extractShopifyDataForRabbitMessaging).not.toHaveBeenCalled();
        expect(getMerchantWithBusinessInfo).not.toHaveBeenCalled();
    });

    test('POST /api/v1/shopify-webhook returns 500 when review creation fails', async () => {
        createNewReview.mockRejectedValue(new Error('Database error'));

        const res: ServerInjectResponse<{ version: string; error: string }> = await server.inject({
            method: 'POST',
            url: '/api/v1/shopify-webhook',
            payload: validPayload,
        });

        expect(res.statusCode).toBe(500);
        expect(res.result).toHaveProperty('version', '1.0.0');
        expect(res.result).toHaveProperty('error', 'Database error');
        expect(mockChannel.publish).not.toHaveBeenCalled();
        expect(createNewReview).toHaveBeenCalled();
        expect(extractShopifyDataForRabbitMessaging).toHaveBeenCalled();
        expect(getMerchantWithBusinessInfo).toHaveBeenCalled();
    });

    test('POST /api/v1/shopify-webhook returns 500 when merchant fetch fails', async () => {
        getMerchantWithBusinessInfo.mockRejectedValue(new Error('Merchant not found'));

        const res: ServerInjectResponse<{ version: string; error: string }> = await server.inject({
            method: 'POST',
            url: '/api/v1/shopify-webhook',
            payload: validPayload,
        });

        expect(res.statusCode).toBe(500);
        expect(res.result).toHaveProperty('version', '1.0.0');
        expect(res.result).toHaveProperty('error', 'Merchant not found');
        expect(mockChannel.publish).not.toHaveBeenCalled();
        expect(createNewReview).not.toHaveBeenCalled();
        expect(getMerchantWithBusinessInfo).toHaveBeenCalled();
    });

    test('POST /api/v1/shopify-webhook returns 500 when review messaging data is invalid', async () => {
        isRabbitReviewRequestMessageValid
            .mockReturnValueOnce(false) // First call for review message
            .mockReturnValueOnce(true); // Second call for merchant message (shouldn't be reached)

        const res: ServerInjectResponse<{ version: string; error: string }> = await server.inject({
            method: 'POST',
            url: '/api/v1/shopify-webhook',
            payload: validPayload,
        });

        expect(res.statusCode).toBe(500);
        expect(res.result).toHaveProperty('version', '1.0.0');
        expect(res.result).toHaveProperty('error', 'Invalid messaging data to publish');
        expect(mockChannel.publish).not.toHaveBeenCalled();
        expect(createNewReview).toHaveBeenCalled();
        expect(buildPublishJson).toHaveBeenCalled();
        expect(createMerchantEmailMessagingTemplate).toHaveBeenCalled();
        expect(isRabbitReviewRequestMessageValid).toHaveBeenCalledTimes(1);
    });

    test('POST /api/v1/shopify-webhook returns 500 when merchant messaging data is invalid', async () => {
        isRabbitReviewRequestMessageValid
            .mockReturnValueOnce(true) // First call for review message
            .mockReturnValueOnce(false); // Second call for merchant message

        const res: ServerInjectResponse<{ version: string; error: string }> = await server.inject({
            method: 'POST',
            url: '/api/v1/shopify-webhook',
            payload: validPayload,
        });

        expect(res.statusCode).toBe(500);
        expect(res.result).toHaveProperty('version', '1.0.0');
        expect(res.result).toHaveProperty('error', 'Invalid messaging data to publish');
        expect(mockChannel.publish).not.toHaveBeenCalled();
        expect(createNewReview).toHaveBeenCalled();
        expect(buildPublishJson).toHaveBeenCalled();
        expect(createMerchantEmailMessagingTemplate).toHaveBeenCalled();
        expect(isRabbitReviewRequestMessageValid).toHaveBeenCalledTimes(2);
    });

    test('POST /api/v1/shopify-webhook returns 500 when publishing fails', async () => {
        // Mock channel.publish to throw an error on first call
        mockChannel.publish.mockImplementationOnce(() => {
            throw new Error('Failed to publish to RabbitMQ');
        });

        const res: ServerInjectResponse<{ version: string; error: string }> = await server.inject({
            method: 'POST',
            url: '/api/v1/shopify-webhook',
            payload: validPayload,
        });

        expect(res.statusCode).toBe(500);
        expect(res.result).toHaveProperty('version', '1.0.0');
        expect(res.result).toHaveProperty('error', 'Failed to publish to RabbitMQ');
        expect(mockChannel.publish).toHaveBeenCalledTimes(1);
        expect(createNewReview).toHaveBeenCalled();
        expect(buildPublishJson).toHaveBeenCalled();
        expect(createMerchantEmailMessagingTemplate).toHaveBeenCalled();
        expect(isRabbitReviewRequestMessageValid).toHaveBeenCalledTimes(2);
    });

    test('POST /api/v1/shopify-webhook verifies complete flow of data transformation', async () => {
        // Set up specific mock values to trace data flow
        const extractedData = {
            customer: { email: 'test@example.com' },
            orderId: '12345',
            merchant_business_entity_id: 'merchant-123',
        };
        const merchantData = {
            id: 'merchant-id-789',
            name: 'Test Store',
            email: 'store@example.com',
        };
        const newReview = { id: 'review-456', status: 'pending' };
        const messagingContent = { reviewId: 'review-456', email: 'test@example.com' };
        const publishJson = { type: 'review_request', data: messagingContent };
        const merchantEmailJson = { type: 'merchant_email', data: { merchantId: 'merchant-id-789' } };

        extractShopifyDataForRabbitMessaging.mockReturnValue(extractedData);
        getMerchantWithBusinessInfo.mockResolvedValue(merchantData);
        createNewReview.mockResolvedValue(newReview);
        extractMessagingContentFromShopifyData.mockReturnValue(messagingContent);
        buildPublishJson.mockReturnValue(publishJson);
        createMerchantEmailMessagingTemplate.mockReturnValue(merchantEmailJson);
        isRabbitReviewRequestMessageValid.mockReturnValue(true);
        convertObjectToBuffer.mockImplementation((obj: any) => Buffer.from(JSON.stringify(obj)));

        const res = await server.inject({
            method: 'POST',
            url: '/api/v1/shopify-webhook',
            payload: validPayload,
        });

        expect(res.statusCode).toBe(200);

        // Verify the correct data flow
        expect(extractShopifyDataForRabbitMessaging).toHaveBeenCalledWith(validPayload);
        expect(getMerchantWithBusinessInfo).toHaveBeenCalledWith(prismaMock, 'merchant-123');
        expect(createNewReview).toHaveBeenCalledWith(prismaMock, extractedData, 'merchant-id-789');
        expect(extractMessagingContentFromShopifyData).toHaveBeenCalledWith(extractedData, 'review-456');
        expect(buildPublishJson).toHaveBeenCalledWith(
            messagingContent,
            expect.objectContaining({
                payload: { content: {} },
            })
        );
        expect(createMerchantEmailMessagingTemplate).toHaveBeenCalledWith(
            merchantData,
            expect.objectContaining({
                payload: { content: {} },
            }),
            'new-review-merchant'
        );
        expect(isRabbitReviewRequestMessageValid).toHaveBeenCalledWith(publishJson);
        expect(isRabbitReviewRequestMessageValid).toHaveBeenCalledWith(merchantEmailJson);

        // Verify both messages were published with correct data
        expect(mockChannel.publish).toHaveBeenCalledTimes(2);
        expect(mockChannel.publish).toHaveBeenNthCalledWith(
            1,
            'message_exchange',
            '',
            Buffer.from(JSON.stringify(publishJson))
        );
        expect(mockChannel.publish).toHaveBeenNthCalledWith(
            2,
            'message_exchange',
            '',
            Buffer.from(JSON.stringify(merchantEmailJson))
        );

        // Verify convertObjectToBuffer was called for both messages
        expect(convertObjectToBuffer).toHaveBeenCalledTimes(2);
        expect(convertObjectToBuffer).toHaveBeenCalledWith(publishJson);
        expect(convertObjectToBuffer).toHaveBeenCalledWith(merchantEmailJson);
    });
});
