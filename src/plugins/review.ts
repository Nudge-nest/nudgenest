/*Handles all things related to Reviews*/
import Hapi from '@hapi/hapi';

import * as dotenv from 'dotenv';

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
                items: true,
                status: true,
                result: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        console.log('Get review', review);
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

const updateReviewById = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { reviewId } = request.params;
    const reviewUpdate = request.payload as any;
    const { prisma } = request.server.app;
    delete reviewUpdate.id;
    try {
        const updatedReview = await prisma.reviews.update({
            where: {
                id: reviewId as string,
            },
            data: { ...reviewUpdate },
        });
        console.log('update review', updatedReview);
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

export default reviewsPlugin;
