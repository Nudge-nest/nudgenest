import Hapi from '@hapi/hapi';
import * as dotenv from 'dotenv';
import { messagingQueue } from './nudgeEventBus';
import { eventType, IRabbitDataObject, IReviewMessagePayloadContent } from '../types';
import sgMail from '@sendgrid/mail';
import EmailService from '../email-service';

dotenv.config();

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        messaging: any;
    }
}

const extractParamsFromLineItems = (lineItems: any[]) => {
    if (lineItems.length === 0 || !lineItems) return [];
    return lineItems.map((lineItem) => {
        return { name: lineItem.name, image: lineItem.image ? lineItem.image : '', price: lineItem.price };
    });
};

const sendEmail = async (email: any) => {
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    if (!sendGridApiKey) {
        throw Error('No Api key found');
    }
    // Initialize SendGrid
    sgMail.setApiKey(sendGridApiKey);
    return sgMail.send(email);
};

const sendEmailMessageToReviewer = async (messageContent: IReviewMessagePayloadContent, templateId: eventType) => {
    const { userName, email, reviewId, line_items, order_number, currency } = messageContent;
    if (templateId === 'new-review')
        return EmailService.sendReviewRequest({
            userName,
            email,
            reviewId,
            items: extractParamsFromLineItems(line_items as any[]),
            order_number: `${order_number}`,
            currency,
        });
    if (templateId === 'reminder')
        return EmailService.sendReviewReminder({
            userName,
            email,
            reviewId,
            items: extractParamsFromLineItems(line_items as any[]),
            order_number: `${order_number}`,
            currency,
        });
};

//TODO: remember to fit template details to match merchant's email
const sendEmailMessageToMerchant = async (messageContent: any, templateId: eventType) => {
    const { userName, email, reviewId, line_items, order_number, currency } = messageContent;
    if (templateId === 'merchant-welcome')
        return EmailService.sendMerchantWelcome({
            userName,
            email,
            reviewId,
            items: extractParamsFromLineItems(line_items),
            order_number: `${order_number}`,
            currency,
        });
    if (templateId === 'merchant-verification')
        return EmailService.sendMerchantVerification({
            userName,
            email,
            reviewId,
            items: extractParamsFromLineItems(line_items),
            order_number: `${order_number}`,
            currency,
        });
    if (templateId === 'merchant-deletion')
        return EmailService.sendEmail({
            userName,
            email,
            reviewId,
            items: extractParamsFromLineItems(line_items),
            order_number: `${order_number}`,
            currency,
        });
    if (templateId === 'completed-review')
        return EmailService.sendCompletedReview({
            userName,
            email,
            reviewId,
            items: extractParamsFromLineItems(line_items),
            order_number: `${order_number}`,
            currency,
        });
    if (templateId === 'new-review-merchant')
        return EmailService.sendNewReviewToMerchant({
            userName,
            email,
            reviewId,
            items: extractParamsFromLineItems(line_items),
            order_number: `${order_number}`,
            currency,
        });
    if (templateId === 'completed-review-merchant')
        return EmailService.sendCompletedReviewToMerchant({
            userName,
            email,
            reviewId,
            items: extractParamsFromLineItems(line_items),
            order_number: `${order_number}`,
            currency,
        });
};

const handleSendEmailToReviewer = async (messagingContent: IRabbitDataObject<IReviewMessagePayloadContent>) => {
    const { payload, eventType } = messagingContent;
    await sendEmailMessageToReviewer(payload.content, eventType);
};
const handleSendEmailToReviewee = async (messagingContent: IRabbitDataObject<IReviewMessagePayloadContent>) => {
    const { payload, eventType } = messagingContent;
    console.log('Payload merchant', payload, eventType);
    await sendEmailMessageToMerchant(payload.content, eventType);
};

const sendReviewMessagePlugin: Hapi.Plugin<null> = {
    name: 'reviewMessage',
    register: async (server: Hapi.Server) => {
        const { messagingChannel } = server.app.rabbit;
        await messagingChannel.consume(messagingQueue, async (msg: any) => {
            if (msg) {
                const rawContent = JSON.parse(
                    msg.content.toString()
                ) as IRabbitDataObject<IReviewMessagePayloadContent>;
                const { eventType } = rawContent;
                try {
                    if (eventType === 'new-review' || eventType === 'reminder') {
                        await handleSendEmailToReviewer(rawContent);
                    } else {
                        await handleSendEmailToReviewee(rawContent);
                    }
                    // Process the valid JSON message
                } catch (err: any) {
                    console.error(`Sending messages:`, err);
                } finally {
                    messagingChannel.ack(msg); // Always acknowledge the message
                }
            }
        });
    },
};

export default sendReviewMessagePlugin;
