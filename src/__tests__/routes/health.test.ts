import { createServer } from '../../server-factory';
import { Server, ServerInjectResponse } from '@hapi/hapi';

describe('Health check', () => {
    let server: Server;
    beforeAll(async () => {
        // Initialize server before tests but don't start it
        server = await createServer();
        await server.initialize();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('GET /health returns OK', async () => {
        const res: ServerInjectResponse<{ status: string; timestamp: string }> = await server.inject({
            method: 'GET',
            url: '/health',
        });
        expect(res.statusCode).toBe(200);
        expect(res.result).toHaveProperty('status');
        expect(res.result?.status).toMatch('OK');
    });
});
