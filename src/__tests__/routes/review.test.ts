import { createServer } from '../../server-factory';
import { Server, ServerInjectResponse } from '@hapi/hapi';
import { IReview, responseType } from '../../types';
import { prismaMock } from '../mocks/prisma';

const mockReview: any = {
    id: '68415f4bc99be1ae3f921dc1',
    merchantId: 'MTY3NTgwMjk3MzU0',
    merchantBusinessId: 'MTY3NTgwMjk3MzU0',
    shopId: '67580297354',
    customerEmail: 'ayoalabi0@gmail.com',
    customerPhone: '',
    verified: true,
    replies: [],
    items: [
        {
            id: '14832321495178',
            admin_graphql_api_id: 'gid://shopify/LineItem/14832321495178',
            attributed_staffs: [],
            current_quantity: { $numberInt: '1' },
            fulfillable_quantity: { $numberInt: '1' },
            fulfillment_service: 'gift_card',
            fulfillment_status: null,
            gift_card: true,
            grams: { $numberInt: '0' },
            name: 'Gift Card - $25',
            price: '25.00',
            price_set: {
                shop_money: { amount: '25.00', currency_code: 'EUR' },
                presentment_money: { amount: '25.00', currency_code: 'EUR' },
            },
            product_exists: true,
            product_id: { $numberLong: '8365100138634' },
            properties: [],
            quantity: { $numberInt: '1' },
            requires_shipping: false,
            sku: null,
            taxable: false,
            title: 'Gift Card',
            total_discount: '0.00',
            total_discount_set: {
                shop_money: { amount: '0.00', currency_code: 'EUR' },
                presentment_money: { amount: '0.00', currency_code: 'EUR' },
            },
            variant_id: { $numberLong: '45728675201162' },
            variant_inventory_management: null,
            variant_title: '$25',
            vendor: 'Snowboard Vendor',
            tax_lines: [],
            duties: [],
            discount_allocations: [],
        },
    ],
    status: 'Completed',
    createdAt: '1749114697542',
    updatedAt: '1749115067462',
    result: [
        { id: '14832321495178', value: '5' },
        {
            id: '9b6171f9-b7ee-422e-8329-811eea7af29c',
            mediaURL: 'https://nudge-nest-media.s3.eu-north-1.amazonaws.com/MTY3NTgwMjk3MzU0/yoda.webp',
        },
        {
            id: 'e82bf0a8-2f81-45cc-a66e-6cb1383a158b',
            mediaURL: 'https://nudge-nest-media.s3.eu-north-1.amazonaws.com/MTY3NTgwMjk3MzU0/mace_windu.webp',
        },
        {
            id: '80ccb8ba-bd25-4aff-b032-b7f084bc92a3',
            mediaURL: 'https://nudge-nest-media.s3.eu-north-1.amazonaws.com/MTY3NTgwMjk3MzU0/obiwan.webp',
        },
        { comment: 'I love all the products very much thank you!' },
    ],
};

describe('Reviews route', () => {
    let server: Server;
    beforeAll(async () => {
        server = await createServer();
        await server.initialize();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('GET /api/v1/reviews/{reviewId} returns 200 status', async () => {
        prismaMock.reviews.findUnique.mockResolvedValue(mockReview);

        const res: ServerInjectResponse<{ version: string; data: responseType }> = await server.inject({
            method: 'GET',
            url: '/api/v1/reviews/68415f4bc99be1ae3f921dc1',
        });

        expect(res.statusCode).toBe(200);
        expect(res.result).toHaveProperty('version');
        expect(res.result).toHaveProperty('data');
        expect(res.result?.version).toMatch('1.0.0');

        // Verify Prisma was called correctly
        expect(prismaMock.reviews.findUnique).toHaveBeenCalledWith({
            where: { id: '68415f4bc99be1ae3f921dc1' },
            select: {
                // Explicitly select fields (excludes otpSecret)
                id: true,
                merchantId: true,
                shopId: true,
                merchantBusinessId: true,
                verified: true,
                replies: true,
                customerName: true,
                items: true,
                status: true,
                result: true,
                createdAt: true,
                updatedAt: true,
            },
        });
    });
    test('GET /api/v1/reviews/{reviewId} return 500 when review does not exist', async () => {
        prismaMock.reviews.findUnique.mockRejectedValue(new Error('Invalid `prisma.reviews.findUnique()` invocation'));

        const res: ServerInjectResponse<{ version: string; error: responseType }> = await server.inject({
            method: 'GET',
            url: '/api/v1/reviews/nonexistent',
        });
        expect(res.statusCode).toBe(500);
        expect(res.result).toHaveProperty('version');
        expect(res.result).toHaveProperty('error');
        expect(res.result?.version).toMatch('1.0.0');
        expect(res.result?.error).toContain('Invalid');
    });
    test.skip('PUT /api/v1/reviews/{reviewId} returns 200 status', async () => {
        const reviewId = '68415f4bc99be1ae3f921dc1';
        prismaMock.reviews.update.mockResolvedValue(mockReview);
        const res: ServerInjectResponse<{ version: string; data: responseType }> = await server.inject({
            method: 'PUT',
            url: '/api/v1/reviews/' + reviewId,
            payload: { id: reviewId, status: 'completed' },
        });
        expect(res.statusCode).toBe(200);
        expect(res.result).toHaveProperty('version');
        expect(res.result).toHaveProperty('data');
        expect(res.result?.version).toMatch('1.0.0');
    });
    test('PUT /api/v1/reviews/{reviewId} return 500 on error', async () => {
        prismaMock.reviews.update.mockRejectedValue(new Error('Invalid `prisma.reviews.findUnique()` invocation'));
        const res: ServerInjectResponse<{ version: string; error: responseType }> = await server.inject({
            method: 'PUT',
            url: '/api/v1/reviews/nonexistent',
            payload: { id: 'nonexistent' },
        });
        expect(res.statusCode).toBe(500);
        expect(res.result).toHaveProperty('version');
        expect(res.result).toHaveProperty('error');
        expect(res.result?.version).toMatch('1.0.0');
        expect(res.result?.error).toContain('Invalid');
    });
    test('GET /api/v1/reviews/list returns 200 status', async () => {
        prismaMock.reviews.findMany.mockResolvedValue([mockReview]);
        const res: ServerInjectResponse<{ version: string; data: responseType }> = await server.inject({
            method: 'GET',
            url: '/api/v1/reviews/list?shopid=MTY3NTgwMjk3MzU0',
        });
        expect(res.statusCode).toBe(200);
        expect(res.result).toHaveProperty('version');
        expect(res.result).toHaveProperty('data');
        expect(res.result?.version).toMatch('1.0.0');
    });
    test('GET /api/v1/reviews/list fails with 500 when shopid is missing from query', async () => {
        prismaMock.reviews.findMany.mockRejectedValue(new Error('shopid is missing in the query'));
        const res: ServerInjectResponse<{ version: string; error: responseType }> = await server.inject({
            method: 'GET',
            url: '/api/v1/reviews/list?hello=world',
        });
        expect(res.statusCode).toBe(500);
        expect(res.result).toHaveProperty('version');
        expect(res.result).toHaveProperty('error');
        expect(res.result?.version).toMatch('1.0.0');
        expect(res.result?.error).toMatch('shopid is missing in the query');
    });
});
