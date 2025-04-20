import Hapi from '@hapi/hapi';
import sgMail from '@sendgrid/mail';
import * as dotenv from 'dotenv';

dotenv.config();

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        sendGrid: typeof sgMail;
    }
}

const sendGridPlugin: Hapi.Plugin<null> = {
    name: 'sendgrid',
    register: async (server: Hapi.Server) => {
        const sendGridApiKey = process.env.SENDGRID_API_KEY;

        if (!sendGridApiKey) {
            console.error('❌ SendGrid API key is missing. Set SENDGRID_API_KEY in .env');
            process.exit(1);
        }
        // Initialize SendGrid
        sgMail.setApiKey(sendGridApiKey);
        console.log("['info'] ✅ SendGrid client initialized");

        // Attach SendGrid to the Hapi server
        server.app.sendGrid = sgMail;
    },
};

export default sendGridPlugin;
