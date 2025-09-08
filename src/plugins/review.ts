/*Handles all things related to Reviews*/
import Hapi from '@hapi/hapi';

import * as dotenv from 'dotenv';
import { eventType, IRabbitDataObject, IReviewMessagePayloadContent } from '../types';
import { convertObjectToBuffer, createMerchantEmailMessagingTemplate } from './merchant';
import { isRabbitReviewRequestMessageValid, sampleMessaging } from '../messagesSchema';
import { getMerchantWithBusinessInfo } from '../utils/reviews';
import { messagingExchange } from './nudgeEventBus';

dotenv.config();

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        reviewsPlugin: any;
    }
}

const reviewsPlugin: Hapi.Plugin<null> = {
    name: 'reviewsPlugin',
    dependencies: ['prisma'],
    register: async (server: Hapi.Server) => {
        server.route([
            {
                method: 'GET',
                path: '/api/v1/reviews/{reviewId}',
                handler: getReviewById,
                options: {
                    auth: false,
                },
            },
            {
                method: 'PUT',
                path: '/api/v1/reviews/{reviewId}',
                handler: updateReviewById,
                options: {
                    auth: false,
                },
            },
            {
                method: 'GET',
                path: '/api/v1/reviews/list',
                handler: listReviewsByMerchantId,
                options: {
                    auth: false,
                },
            },
        ]);
    },
};

const getReviewById = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { reviewId } = request.params;
    const { prisma } = request.server.app;
    try {
        const review = await prisma.reviews.findUnique({
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
        return h.response({ version: '1.0.0', data: review }).code(200);
    } catch (error: any) {
        return h
            .response({
                version: '1.0.0',
                error: error.message,
            })
            .code(500);
    }
};

//TODo: Add order Number to review schema and everywhere

export const createReviewEmailMessagingTemplate = (
    review: any,
    sampleMessaging: IRabbitDataObject<IReviewMessagePayloadContent>,
    eventType: eventType
) => {
    return {
        ...sampleMessaging,
        eventType: eventType,
        payload: {
            ...sampleMessaging.payload,
            content: {
                ...sampleMessaging.payload.content,
                userName: review.customerName,
                type: eventType,
                email: review.customerEmail,
                order_number: undefined,
            },
            context: { ...sampleMessaging.payload.context, receiver: ['reviewer'] },
        },
    } as IRabbitDataObject<IReviewMessagePayloadContent>;
};

const updateReviewById = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { reviewId } = request.params;
    const reviewUpdate = request.payload as any;
    const { prisma, rabbit } = request.server.app;
    const { messagingChannel } = rabbit;
    if (reviewUpdate) {
        if (Object.keys(reviewUpdate).length === 0) throw Error('Update data missing');
    }
    try {
        const updatedReview = await prisma.reviews.update({
            where: {
                id: reviewId as string,
            },
            data: { ...reviewUpdate },
        });
        if (reviewUpdate.status === 'Completed' && reviewUpdate.result) {
            const merchant = await getMerchantWithBusinessInfo(prisma, updatedReview.merchantBusinessId);
            const completedReviewMessageToReviewee = createMerchantEmailMessagingTemplate(
                merchant,
                sampleMessaging,
                'completed-review-merchant'
            );
            const completedReviewMessageToReviewer = createReviewEmailMessagingTemplate(
                updatedReview,
                sampleMessaging,
                'completed-review'
            );
            if (
                !isRabbitReviewRequestMessageValid(completedReviewMessageToReviewee) ||
                !isRabbitReviewRequestMessageValid(completedReviewMessageToReviewer)
            )
                throw new Error('Invalid messaging data to publish');
            messagingChannel.publish(messagingExchange, '', convertObjectToBuffer(completedReviewMessageToReviewer));
            messagingChannel.publish(messagingExchange, '', convertObjectToBuffer(completedReviewMessageToReviewee));
        } else {
            return;
        }
        return h.response({ version: '1.0.0', data: updatedReview }).code(200);
    } catch (error: any) {
        return h
            .response({
                version: '1.0.0',
                error: error.message,
            })
            .code(500);
    }
};

//test merchant id MTY3NTgwMjk3MzU0

const listReviewsByMerchantId = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { shopid } = request.query as any;
    const { prisma } = request.server.app;
    try {
        const reviews = await prisma.reviews.findMany({
            where: {
                shopId: shopid as string,
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
        return h.response({ version: '1.0.0', data: reviews }).code(200);
    } catch (error: any) {
        return h
            .response({
                version: '1.0.0',
                error: error.message,
            })
            .code(500);
    }
};

export default reviewsPlugin;
