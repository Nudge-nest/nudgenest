import Hapi from '@hapi/hapi';
import * as dotenv from 'dotenv';
import { messagingQueue } from './nudgeEventBus';
import { IRabbitDataObject, IReviewMessagePayloadContent } from '../types';
import sgMail from '@sendgrid/mail';
import nodeMailer from 'nodemailer';

dotenv.config();

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        messaging: any;
    }
}

const extractParamsFromLineItems = (lineItems: any[]) => {
    return lineItems.map((lineItem) => {
        return { text: lineItem.name, image: lineItem.image ? lineItem.image : '', price: lineItem.price };
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

const sendEmailNodemailer = async (email: any) => {
    const sendGridApiKey = process.env.SENDGRID_API_KEY;

    if (!sendGridApiKey) {
        throw Error('No Api key found');
    }
    const transporter = nodeMailer.createTransport({
        host: 'smtp.sendgrid.net',
        port: 465,
        secure: true,
        auth: {
            user: 'apikey',
            pass: sendGridApiKey,
        },
        tls: {
            // do not fail on invalid certs
            rejectUnauthorized: false,
        },
        //debug: true, // Enable debugging
        //logger: true, // Log SMTP connections
    });
    return transporter.sendMail(email);
};

const sendReviewMessagePlugin: Hapi.Plugin<null> = {
    name: 'reviewMessage',
    register: async (server: Hapi.Server) => {
        const { messagingChannel } = server.app.rabbit;
        const { sendMail } = server.app.nodeMailer;
        const { send } = server.app.sendGrid;

        await messagingChannel.consume(messagingQueue, async (msg: any) => {
            if (msg) {
                try {
                    const rawContent = JSON.parse(
                        msg.content.toString()
                    ) as IRabbitDataObject<IReviewMessagePayloadContent>;
                    const messageContent = rawContent.payload.content;
                    if (messageContent.type === 'email' || messageContent.type === 'auto') {
                        //Send email here
                        await sendEmail({
                            from: 'nudgenest@gmail.com',
                            personalizations: [
                                {
                                    to: [
                                        {
                                            email: messageContent.email,
                                        },
                                    ],
                                    dynamic_template_data: {
                                        orderNumber: messageContent.order_number,
                                        items: extractParamsFromLineItems(messageContent.line_items),
                                        customerName: messageContent.userName,
                                        reviewURL: 'http://localhost:3000/review/' + messageContent.reviewId,
                                    },
                                },
                            ],
                            template_id: 'd-2ad945b97c4c4bbc8adc640b36c25f3e',
                        });
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
