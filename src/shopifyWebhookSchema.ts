import { Validator } from 'jsonschema';
import { IRabbitDataObject } from './types';

const validator = new Validator();

const schema = {
    type: 'object',
    properties: {
        messageId: { type: 'string' },
        timeStamp: { type: 'string' },
        eventType: { type: 'string' },
        priority: { type: 'string' },
        payload: {
            type: 'object',
            properties: {
                userId: { type: 'string' },
                context: {
                    type: 'object',
                    properties: {
                        action: { type: 'string' },
                        details: { type: 'string' },
                    },
                },
                content: {
                    type: 'object',
                    properties: {
                        customer: {
                            type: 'object',
                            properties: {
                                id: { type: 'number' },
                                first_name: { type: 'string' },
                                email: { type: 'string' },
                                last_name: { type: 'string' },
                                state: { type: 'string' },
                                verified_email: { type: 'boolean' },
                            },
                        },
                        merchant_business_entity_id: { type: 'string' },
                        id: { type: 'number' },
                        order_status_url: { type: 'string', format: 'uri' },
                        customer_locale: { type: 'string' },
                        order_number: { type: 'number' },
                        line_items: { type: 'array', items: { type: 'object' } },
                    },
                },
            },
        },
        metadata: { type: 'object', properties: { retries: { type: 'number' } } },
    },
};

export const isWebhookDataToPublishValid = (webhookData: IRabbitDataObject<any>) => {
    // @ts-ignore
    const result = validator.validate(webhookData, schema);
    return result.errors.length === 0;
};

/*
export const sampleShopifyWebhook: IRabbitDataObject<any> = {
    messageId: 'uuid-v4-12345',
    timestamp: '2024-12-15T10:34:56Z',
    eventType: 'event.name',
    priority: 'NORMAL',
    payload: {
        userId: 'user-5678',
        context: {
            action: 'action_type',
            details: '',
        },
        content: {
            customer: {
                id: 0,
                email: '',
                first_name: '',
                last_name: '',
                state: '',
                verified_email: false,
            },
            merchant_business_entity_id: '',
            id: '',
            order_status_url: '',
            customer_locale: '',
            order_number: 0,
            line_items: [],
        },
    },
    metadata: {
        retries: 0,
    },
};
*/
