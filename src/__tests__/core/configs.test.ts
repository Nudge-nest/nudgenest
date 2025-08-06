import { Context, createMockContext, MockContext } from '../prismaContext';
import { IReview } from '../../types';
import { defaultConfigs } from '../../plugins/merchant';
import { IReviewConfiguration, IStrictReviewConfiguration } from '../../types/reviewConfigs';

export async function createConfig(config: IReviewConfiguration, ctx: Context) {
    return ctx.prisma.configs.create({
        data: config,
    });
}

export async function getReviewConfigByMerchantId(merchantId: string, ctx: Context): Promise<IReviewConfiguration> {
    return ctx.prisma.configs.findMany({
        where: {
            merchantId: merchantId,
        },
    });
}

export async function updateReviewConfigsByMerchantId(
    merchantId: string,
    configUpdate: IReviewConfiguration,
    ctx: Context
): Promise<IReviewConfiguration> {
    return ctx.prisma.configs.update({
        where: {
            merchantId: merchantId,
        },
        data: configUpdate,
    });
}

const createTestReviewConfigData = (): IReviewConfiguration => {
    return {
        ...defaultConfigs,
        id: '507f1f77bcf86cd799439011',
        merchantId: '507f1f77bcf86cd799439055',
    } as IReviewConfiguration;
};

describe('Review Configurations Unit Tests', () => {
    let mockCtx: MockContext;
    let ctx: Context;
    let reviewConfigData = createTestReviewConfigData();
    let expectedReviewConfigData = {
        ...reviewConfigData,
        id: '507f1f77bcf86cd799439011',
        merchantId: '507f1f77bcf86cd799439055',
    };
    beforeEach(() => {
        mockCtx = createMockContext();
        ctx = mockCtx as unknown as Context;
    });
    test('should create new review configuration', async () => {
        mockCtx.prisma.configs.create.mockResolvedValue(expectedReviewConfigData);
        const result = await createConfig(reviewConfigData, ctx);
        expect(result).toEqual(expectedReviewConfigData);
        expect(mockCtx.prisma.configs.create).toHaveBeenCalledWith({
            data: reviewConfigData,
        });
        expect(mockCtx.prisma.configs.create).toHaveBeenCalledTimes(1);
    });

    test('should return configuration provided with a correct merchant ID', async () => {
        const merchantId = '507f1f77bcf86cd799439055';
        mockCtx.prisma.configs.findMany.mockResolvedValue([expectedReviewConfigData]);
        const result = await getReviewConfigByMerchantId(merchantId, ctx);
        expect(result).toEqual([expectedReviewConfigData]);
        expect(mockCtx.prisma.configs.findMany).toHaveBeenCalledWith({
            where: {
                merchantId: merchantId,
            },
        });
        expect(mockCtx.prisma.configs.findMany).toHaveBeenCalledTimes(1);
    });

    test('should update review config given merchantId and correct update data', async () => {
        const merchantId = '507f1f77bcf86cd799439055';
        mockCtx.prisma.configs.update.mockResolvedValue([expectedReviewConfigData]);
        expectedReviewConfigData.emailContent = [
            ...expectedReviewConfigData.emailContent,
            {
                key: 'buttonTextTest',
                value: 'Leave a review - test',
                description: 'The text displayed on the review button -Test',
                type: 'text',
            },
        ];
        // @ts-ignore
        const result = await updateReviewConfigsByMerchantId(
            merchantId,
            {
                ...expectedReviewConfigData,
                emailContent: [
                    ...expectedReviewConfigData.emailContent,
                    {
                        key: 'buttonTextTest',
                        value: 'Leave a review - test',
                        description: 'The text displayed on the review button -Test',
                        type: 'text',
                    },
                ],
            },
            ctx
        );
        expect(result).toEqual([expectedReviewConfigData]);
        expect(mockCtx.prisma.configs.update).toHaveBeenCalledWith({
            where: {
                merchantId: merchantId as string,
            },
            data: {
                ...expectedReviewConfigData,
                emailContent: [
                    ...expectedReviewConfigData.emailContent,
                    {
                        key: 'buttonTextTest',
                        value: 'Leave a review - test',
                        description: 'The text displayed on the review button -Test',
                        type: 'text',
                    },
                ],
            },
        });
        expect(mockCtx.prisma.configs.update).toHaveBeenCalledTimes(1);
    });
});
