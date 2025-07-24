'use strict';

import Hapi, { Server } from '@hapi/hapi';
import * as dotenv from 'dotenv';
import rabbitPlugin from './plugins/nudgeEventBus';
import shopifyWebhookPlugin from './plugins/shopifyWebhook';
import sendReviewMessagePlugin from './plugins/sendReviewMessagePlugin';
import shopifyReviewRequestListenerPlugin from './plugins/shopifyReviewRequestListener';
import prismaPlugin from './plugins/prisma';
import merchantsPlugin from './plugins/merchant';
import reviewsPlugin from './plugins/review';
import healthcheck from './plugins/healthcheck';
import reviewConfigsPlugin from './plugins/configs';
import reviewMediaPlugin from './plugins/media';

dotenv.config();

let server: Server;

const init = async () => {
    server = Hapi.server({
        port: process.env.PORT || 8080,
        host: '0.0.0.0',
        debug: false,
        routes: {
            log: { collect: true },
            cors: {
                origin: ['*'],
                credentials: false,
            },
        },
    });

    await server.register(require('@hapi/inert'));
    await server.register([
        healthcheck,
        prismaPlugin,
        rabbitPlugin,
        shopifyWebhookPlugin,
        merchantsPlugin,
        reviewsPlugin,
        sendReviewMessagePlugin,
        shopifyReviewRequestListenerPlugin,
        reviewConfigsPlugin,
        reviewMediaPlugin,
    ]);

    server.route({
        method: 'GET',
        path: '/{param*}',
        handler: {
            directory: {
                path: '.',
                redirectToSlash: true,
                index: true,
            },
        },
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();
