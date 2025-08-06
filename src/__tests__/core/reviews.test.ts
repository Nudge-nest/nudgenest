import { Context, createMockContext, MockContext } from '../prismaContext';
import { IReview } from '../../types';

export async function createReview(review: IReview, ctx: Context) {
    return ctx.prisma.reviews.create({
        data: review,
    });
}

export async function getReviewByReviewId(reviewId: string, ctx: Context): Promise<IReview> {
    return ctx.prisma.reviews.findUnique({
        where: {
            id: reviewId as string,
        },
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
}

export async function updateReviewByReviewId(
    reviewId: string,
    reviewUpdate: Partial<IReview>,
    ctx: Context
): Promise<IReview> {
    return ctx.prisma.reviews.update({
        where: {
            id: reviewId as string,
        },
        data: { ...reviewUpdate },
    });
}

export async function listReviewsByMerchantId(query: { shopId: string }, ctx: Context): Promise<IReview> {
    return ctx.prisma.reviews.findMany({
        where: {
            shopId: query.shopId as string,
        },
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
}

const createTestReviewData = (status: 'Pending' | 'Completed' | 'Failed'): IReview => {
    return {
        merchantId: 'MerchantId',
        replies: {},
        verified: true,
        status: status,
        items: [],
        result: [],
        shopId: 'TESTSH0P1D',
        customerName: 'test Customer',
        merchantBusinessId: 'test biz info',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
};

describe('Reviews Unit Tests', () => {
    let mockCtx: MockContext;
    let ctx: Context;
    let reviewData = createTestReviewData('Pending');
    let expectedReviewData = { ...reviewData, id: '507f1f77bcf86cd799439011' };
    beforeEach(() => {
        mockCtx = createMockContext();
        ctx = mockCtx as unknown as Context;
    });
    test('should create new review', async () => {
        mockCtx.prisma.reviews.create.mockResolvedValue(expectedReviewData);
        const result = await createReview(reviewData, ctx);
        expect(result).toEqual(expectedReviewData);
        expect(mockCtx.prisma.reviews.create).toHaveBeenCalledWith({
            data: reviewData,
        });
        expect(mockCtx.prisma.reviews.create).toHaveBeenCalledTimes(1);
    });

    test('should list reviews associated with given shopId in query', async () => {
        const shopId = 'MTY3NTgwMjk3MzU0';
        mockCtx.prisma.reviews.findMany.mockResolvedValue([expectedReviewData]);
        const result = await listReviewsByMerchantId({ shopId: shopId }, ctx);
        expect(result).toEqual([expectedReviewData]);
        expect(mockCtx.prisma.reviews.findMany).toHaveBeenCalledWith({
            where: {
                shopId: shopId as string,
            },
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
        expect(mockCtx.prisma.reviews.findMany).toHaveBeenCalledTimes(1);
    });

    test('should update review given reviewId and correct update data', async () => {
        const reviewId = '507f1f77bcf86cd799439011';
        mockCtx.prisma.reviews.update.mockResolvedValue([expectedReviewData]);
        expectedReviewData.customerName = 'Updated Customer Name';
        const result = await updateReviewByReviewId(
            reviewId,
            { ...reviewData, id: reviewId, customerName: 'Updated Customer Name' },
            ctx
        );
        expect(result).toEqual([expectedReviewData]);
        expect(mockCtx.prisma.reviews.update).toHaveBeenCalledWith({
            where: {
                id: reviewId as string,
            },
            data: { ...reviewData, id: reviewId, customerName: 'Updated Customer Name' },
        });
        expect(mockCtx.prisma.reviews.update).toHaveBeenCalledTimes(1);
    });
});
