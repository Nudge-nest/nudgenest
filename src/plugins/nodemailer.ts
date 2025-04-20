import Hapi from '@hapi/hapi';
import { PrismaClient } from '@prisma/client';
import nodeMailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as dns from 'node:dns';

dotenv.config();

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        nodeMailer: nodeMailer.Transporter;
    }
}

const nodeMailerPlugin: Hapi.Plugin<null> = {
    name: 'nodemailer',
    register: async (server: Hapi.Server) => {
        const sendGridApiKey = process.env.SENDGRID_API_KEY;
        dns.resolve('smtp.sendgrid.net', (err, addresses) => console.log('dns lookup', addresses, err));
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
        // Verify the SMTP connection before adding to Hapi server
        try {
            await transporter.verify();
            console.log('✅ NodeMailer is ready to send emails.');
        } catch (error) {
            console.error('❌ SMTP Connection Failed:', error);
        }
        server.app.nodeMailer = transporter;
        console.log("['info'] Node mailer client initialized");
    },
};

export default nodeMailerPlugin;
