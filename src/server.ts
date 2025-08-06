'use strict';

import { createServer } from './server-factory';
import { Server } from '@hapi/hapi';

export let server: Server;

/// Only run when executed directly
if (require.main === module) {
    createServer()
        .then(async (s) => {
            server = s;
            await server.start();
            console.log('Server running on %s', server.info.uri);
        })
        .catch((err) => {
            console.error('Failed to start server:', err);
            process.exit(1);
        });
}

// Handle graceful shutdown for Cloud Run
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    if (server) {
        await server.stop({ timeout: 10000 });
        console.log('Server stopped');
    }
    process.exit(0);
});

export { createServer };
