import { Context, createMockContext, MockContext } from '../prismaContext';
import { IMerchant } from '../../types';
import { defaultConfigs } from '../../plugins/merchant';

export const testMerchant = {
    shopId: 'TESTSH0P1D',
    domains: 'www.test-shopify',
    currencyCode: 'EUR',
    email: 'tester@test.com',
    name: 'test merchant',
    businessInfo: 'test biz info',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    address: {
        address1: 'test address',
        address2: 'test address2',
        city: 'test city',
        country: 'test country',
        zip: 'test zipcode',
        formatted: ['test formatted'],
    },
};

export async function createMerchant(merchant: IMerchant, ctx: Context) {
    return ctx.prisma.merchants.create({
        data: merchant,
    });
}

export async function verifyMerchant(merchantPlatformId: string, ctx: Context): Promise<IMerchant[]> {
    return ctx.prisma.merchants.findMany({
        where: {
            shopId: {
                contains: merchantPlatformId as string,
            },
        },
        select: {
            // Explicitly select fields (excludes otpSecret)
            id: true,
            shopId: true,
            domains: true,
            email: true,
            name: true,
            businessInfo: true,
            createdAt: true,
            updatedAt: true,
        },
    });
}

const createTestMerchantData = (): IMerchant => {
    return testMerchant;
};

describe('Merchants Unit Tests', () => {
    let mockCtx: MockContext;
    let ctx: Context;
    const merchantData = createTestMerchantData();
    const expectedMerchantData = { ...merchantData, id: '507f1f77bcf86cd799439011' };
    beforeEach(() => {
        mockCtx = createMockContext();
        ctx = mockCtx as unknown as Context;
    });
    test('should create new merchant', async () => {
        mockCtx.prisma.merchants.create.mockResolvedValue(expectedMerchantData);
        const result = await createMerchant(merchantData, ctx);
        expect(result).toEqual(expectedMerchantData);
        expect(mockCtx.prisma.merchants.create).toHaveBeenCalledWith({
            data: merchantData,
        });
        expect(mockCtx.prisma.merchants.create).toHaveBeenCalledTimes(1);
    });

    test('should return merchant details if merchant exists', async () => {
        const merchantPlatformId = 'TESTSH0P1D';
        mockCtx.prisma.merchants.findMany.mockResolvedValue([expectedMerchantData]);
        const result = await verifyMerchant(merchantPlatformId, ctx);
        expect(result).toEqual([expectedMerchantData]);
        expect(mockCtx.prisma.merchants.findMany).toHaveBeenCalledWith({
            where: {
                shopId: {
                    contains: merchantPlatformId as string,
                },
            },
            select: {
                // Explicitly select fields (excludes otpSecret)
                id: true,
                shopId: true,
                domains: true,
                email: true,
                name: true,
                businessInfo: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        expect(mockCtx.prisma.merchants.findMany).toHaveBeenCalledTimes(1);
    });

    test('default merchant configs should exist', async () => {
        defaultConfigs;
        expect(defaultConfigs).toBeTruthy();
        expect(defaultConfigs).toHaveProperty('emailContent');
        expect(defaultConfigs).toHaveProperty('reminderEmailContent');
        expect(defaultConfigs).toHaveProperty('remindersFrequency');
        expect(defaultConfigs).toHaveProperty('publish');
        expect(defaultConfigs).toHaveProperty('qrCode');
        expect(defaultConfigs).toHaveProperty('general');
    });
});
