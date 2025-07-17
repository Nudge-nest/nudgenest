/*Handles all things related to configurations*/
import Hapi from '@hapi/hapi';

import * as dotenv from 'dotenv';

dotenv.config();

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        reviewConfigsPlugin: any;
    }
}

const reviewConfigsPlugin: Hapi.Plugin<null> = {
    name: 'reviewConfigsPlugin',
    dependencies: ['prisma'],
    register: async (server: Hapi.Server) => {
        server.route([
            {
                method: 'POST',
                path: '/api/v1/config',
                handler: createReviewConfigsHandler,
                options: {
                    auth: false,
                },
            },
            {
                method: 'GET',
                path: '/api/v1/config/{merchantId}',
                handler: getReviewConfigsHandler,
                options: {
                    auth: false,
                },
            },
            {
                method: 'PATCH',
                path: '/api/v1/config/{merchantId}',
                handler: updateReviewConfigsHandler,
                options: {
                    auth: false,
                },
            },
        ]);
    },
};

const createReviewConfigsHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const configs = request.payload;
    const { prisma } = request.server.app;
    try {
        const config = await prisma.configurations.create({
            data: configs as any,
        });
        return h.response({ version: '1.0.0', data: config }).code(200);
    } catch (error: any) {
        return h
            .response({
                version: '1.0.0',
                error: error.message,
            })
            .code(500);
    }
};

const getReviewConfigsHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { merchantId } = request.params;
    const { prisma } = request.server.app;
    try {
        const merchant = await prisma.configurations.findMany({
            where: {
                merchantId: merchantId,
            },
        });
        //Send Registration message to Merchant
        return h.response({ version: '1.0.0', data: merchant }).code(200);
    } catch (error: any) {
        return h
            .response({
                version: '1.0.0',
                error: error.message,
            })
            .code(500);
    }
};

const updateReviewConfigsHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { merchantId } = request.params;
    const configs = request.payload;
    const { prisma } = request.server.app;
    try {
        const merchant = await prisma.configurations.update({
            where: {
                merchantId: merchantId,
            },
            data: configs as any,
        });
        //Send Registration message to Merchant
        return h.response({ version: '1.0.0', data: merchant }).code(200);
    } catch (error: any) {
        return h
            .response({
                version: '1.0.0',
                error: error.message,
            })
            .code(500);
    }
};

export default reviewConfigsPlugin;
