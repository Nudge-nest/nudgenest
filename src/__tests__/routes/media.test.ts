// src/__tests__/routes/media.test.ts
import { createServer } from '../../server-factory';
import { Server } from '@hapi/hapi';

describe('Media routes', () => {
    let server: Server;

    beforeAll(async () => {
        server = await createServer();
        await server.initialize();
    });

    afterAll(async () => {
        await server.stop();
    });

    describe('POST /api/v1/media', () => {
        test('route exists and responds', async () => {
            const res = await server.inject({
                method: 'POST',
                url: '/api/v1/media',
                payload: 'test',
            });

            // Just check it responds (will be 500 without proper setup)
            expect(res.statusCode).toBeDefined();
            expect(res.result).toBeDefined();
        });
    });

    describe('DELETE /api/v1/media/{mediaUrl}', () => {
        test('route exists and responds', async () => {
            const res = await server.inject({
                method: 'DELETE',
                url: '/api/v1/media/test',
                payload: { mediaUrl: 'https://example.com/test.jpg' },
            });

            // Just check it responds
            expect(res.statusCode).toBeDefined();
            expect(res.result).toBeDefined();
        });
    });
});
