import { Validator } from 'jsonschema';
import { IRabbitDataObject, IReviewMessagePayloadContent } from './types';

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
                        userName: { type: 'string' },
                        from: { type: 'string' },
                        order_number: { type: 'number' },
                        line_items: { type: 'array', items: { type: 'object' } },
                        email: { type: 'string' },
                        reviewId: { type: 'string' },
                    },
                },
            },
        },
        metadata: { type: 'object', properties: { retries: { type: 'number' } } },
    },
};

export const isRabbitReviewRequestMessageValid = (message: IRabbitDataObject<IReviewMessagePayloadContent>) => {
    // @ts-ignore
    const result = validator.validate(message, schema);
    return result.errors.length === 0;
};

export const sampleMessaging: IRabbitDataObject<IReviewMessagePayloadContent> = {
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
            userName: 'customer 1',
            type: 'sms',
            email: '',
            line_items: [],
            order_number: 1,
            reviewId: '',
        },
    },
    metadata: {
        retries: 0,
    },
};
