/*Handles all things related to configurations*/
import Hapi from '@hapi/hapi';

import * as dotenv from 'dotenv';
import { IReviewConfiguration } from '../types/reviewConfigs';

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
                method: 'PUT',
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
        const config = await prisma.configurations.findMany({
            where: {
                merchantId: merchantId,
            },
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

const updateReviewConfigsHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { merchantId } = request.params as { merchantId: string };
    const configs = request.payload as any;
    const { prisma } = request.server.app;
    try {
        const result = await prisma.configurations.updateMany({
            where: {
                merchantId: merchantId as string,
            },
            data: configs as any,
        });
        // Fetch the updated configuration
        const updatedConfig = await prisma.configurations.findFirst({
            where: {
                merchantId: merchantId,
            },
        });
        return h.response({ version: '1.0.0', data: updatedConfig }).code(200);
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
