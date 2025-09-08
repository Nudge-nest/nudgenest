import { Validator } from 'jsonschema';
import { IRabbitDataObject, IReviewMessagePayloadContent } from './types';
const { v4: uuidv4 } = require('uuid');

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
                        receiver: { type: 'array', items: { type: 'string' } },
                    },
                },
                content: {
                    type: 'object',
                    properties: {
                        userName: { type: 'string' },
                        type: { type: 'string' },
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
    messageId: uuidv4(),
    timestamp: new Date().toISOString(),
    eventType: 'new-review',
    priority: 'NORMAL',
    payload: {
        userId: 'user-5678',
        context: {
            action: 'action_type',
            details: '',
            receiver: [],
        },
        content: {
            userName: 'customer 1',
            type: 'email',
            email: '',
            line_items: [],
            order_number: 1,
            reviewId: '',
            currency: 'EUR',
        },
    },
    metadata: {
        retries: 0,
    },
};
