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
                path: '/api/v1/merchants/verify/{merchantPlatformId}',
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

export const defaultConfigs = {
    merchantId: '',
    emailContent: [
        {
            key: 'subject',
            value: 'how did it go?',
            description: 'The Subject of the review email to send to customer',
            type: 'text',
        },
        {
            key: 'body',
            value: 'We would be grateful if you shared how things look and feel.',
            description: 'The Body of the review email to send to customer',
            type: 'text',
        },
        {
            key: 'buttonText',
            value: 'Leave a review',
            description: 'The text displayed on the review button',
            type: 'text',
        },
    ],
    reminderEmailContent: [
        {
            key: 'reminderSubject',
            value: 'how did it go? [REMINDER]',
            description: 'The Subject of the reminder email',
            type: 'text',
        },
        {
            key: 'reminderBody',
            value: 'We would be grateful if you shared how things look and feel.',
            description: 'The Body of the reminder email',
            type: 'text',
        },
        {
            key: 'reminderButtonText',
            value: 'Leave a review',
            description: 'The text displayed on the reminder review button',
            type: 'text',
        },
    ],
    remindersFrequency: [
        {
            key: 'remindersQty',
            value: '2',
            description: 'Number of reminder emails to send',
            type: 'number',
        },
        {
            key: 'remindersPeriod',
            value: 'BIMONTHLY',
            description: 'Frequency of reminder emails',
            type: 'select',
        },
    ],
    publish: [
        {
            key: 'autoPublish',
            value: 'THREESTARS',
            description: 'Minimum star rating for auto-publishing reviews',
            type: 'select',
        },
    ],
    qrCode: [
        {
            key: 'qrCodeUrl',
            value: '',
            description: 'URL for the QR code to direct to',
            type: 'url',
        },
        {
            key: 'qrCodeData',
            value: '',
            description: 'Generated QR code image data',
            type: 'image',
        },
    ],
    general: {
        shopReviewQuestions: [
            {
                key: 'default',
                value: 'how did we do?',
                description: 'Shop review default question',
                type: 'text',
            },
        ],
    },
};

const verifyMerchantHandler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { merchantPlatformId } = request.params;
    const { prisma } = request.server.app;
    try {
        const merchant = await prisma.merchants.findMany({
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
