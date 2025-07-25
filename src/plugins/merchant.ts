/*Handles all things related to merchants*/
import Hapi from '@hapi/hapi';

import * as dotenv from 'dotenv';

dotenv.config();

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        merchantsPlugin: any;
    }
}

const merchantsPlugin: Hapi.Plugin<null> = {
    name: 'merchantsPlugin',
    dependencies: ['prisma'],
    register: async (server: Hapi.Server) => {
        server.route([
            {
                method: 'POST',
                path: '/api/v1/merchants/verify/{merchantId}',
                handler: verifyMerchantHandler,
                options: {
                    auth: false,
                },
            },
            {
                method: 'POST',
                path: '/api/v1/merchants',
                handler: createMerchantHandler,
                options: {
                    auth: false,
                },
            },
        ]);
    },
};

const defaultConfigs = {
    "id": "",
    "merchantId": "68414ac959456a2575dd1aae",
    "emailContent": {
        "subject": "how did it go?",
        "body": "We would be grateful if you shared how things look and feel.",
        "buttonText": "Leave a review",
        "reminder": {
            "subject": "how did it go? [REMINDER]",
            "body": "We would be grateful if you shared how things look and feel.",
            "buttonText": "Leave a review"
        }
    },
    "reminders": {
        "qty": "2",
        "period": "BIMONTHLY"
    },
    "publish": {
        "autoPublish": "THREESTARS"
    },
    "qrCode": {
        "url": "",
        "qrCode": ""
    },
    "general": {
    }
}

const verifyMerchantHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { merchantId } = request.params;
    const { prisma } = request.server.app;
    try {
        const merchant = await prisma.merchants.findMany({
            where: {
                shopId: {
                    contains: merchantId as string,
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

const createMerchantHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const merchantData = request.payload;
    const { prisma } = request.server.app;
    try {
        const merchant = await prisma.merchants.create({
            data: merchantData as any,
        });
        const reviewConfigs = await prisma.configurations.create({
            data: defaultConfigs as any,
        });
        //Send Registration message to Merchant
        return h.response({ version: '1.0.0', data: { merchant, reviewConfigs } }).code(200);
    } catch (error: any) {
        return h
            .response({
                version: '1.0.0',
                error: error.message,
            })
            .code(500);
    }
};

export default merchantsPlugin;
