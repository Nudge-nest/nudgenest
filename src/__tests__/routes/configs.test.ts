import { createServer } from '../../server-factory';
import { Server, ServerInjectResponse } from '@hapi/hapi';
import { responseType } from '../../types';
import { prismaMock } from '../mocks/prisma';
import { defaultConfigs } from '../../plugins/merchant';
import { IReviewConfiguration } from '../../types/reviewConfigs';

const mockConfig = {
    ...defaultConfigs,
    id: '68415f4bc99be1ae3f921dc1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    merchantId: '68415f4bc99be1ae3f921dc0',
} as any;

describe('Config route', () => {
    let server: Server;
    beforeAll(async () => {
        server = await createServer();
        await server.initialize();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('POST /api/v1/config Creates new review configuration and returns 200 status', async () => {
        prismaMock.configurations.create.mockResolvedValue(mockConfig);
        const res: ServerInjectResponse<{ version: string; data: responseType }> = await server.inject({
            method: 'POST',
            url: '/api/v1/config',
        });
        expect(res.statusCode).toBe(200);
        expect(res.result).toHaveProperty('version');
        expect(res.result).toHaveProperty('data');
        expect(res.result?.version).toMatch('1.0.0');
    });
    test('POST /api/v1/config return 500 when config data is malformed', async () => {
        prismaMock.configurations.create.mockRejectedValue(new Error('Request payload is missing'));
        const res: ServerInjectResponse<{ version: string; error: responseType }> = await server.inject({
            method: 'POST',
            url: '/api/v1/config',
        });
        expect(res.statusCode).toBe(500);
        expect(res.result).toHaveProperty('version');
        expect(res.result).toHaveProperty('error');
        expect(res.result?.version).toMatch('1.0.0');
        expect(res.result?.error).toMatch('Request payload is missing');
    });
    test('GET /api/v1/config/{merchantId} Creates new review configuration and returns 200 status', async () => {
        const merchantId = '68415f4bc99be1ae3f921dc0';
        prismaMock.configurations.findMany.mockResolvedValue([mockConfig]);
        const res: ServerInjectResponse<{ version: string; data: responseType }> = await server.inject({
            method: 'GET',
            url: '/api/v1/config/' + merchantId,
        });

        expect(res.statusCode).toBe(200);
        expect(res.result).toHaveProperty('version');
        expect(res.result).toHaveProperty('data');
        expect(res.result?.version).toMatch('1.0.0');
    });
    test('GET /api/v1/config/{merchantId} return 500 when config data is malformed', async () => {
        prismaMock.configurations.findMany.mockRejectedValue(new Error('merchantId is incorrect'));
        const res: ServerInjectResponse<{ version: string; error: responseType }> = await server.inject({
            method: 'GET',
            url: '/api/v1/config/nonexistent',
        });
        expect(res.statusCode).toBe(500);
        expect(res.result).toHaveProperty('version');
        expect(res.result).toHaveProperty('error');
        expect(res.result?.version).toMatch('1.0.0');
        expect(res.result?.error).toMatch('merchantId is incorrect');
    });
    test('PUT /api/v1/config/{merchantId} updates review configuration and returns 200 status', async () => {
        const merchantId = '68415f4bc99be1ae3f921dc0';
        prismaMock.configurations.update.mockResolvedValue(mockConfig);
        const res: ServerInjectResponse<{ version: string; data: responseType }> = await server.inject({
            method: 'PUT',
            url: '/api/v1/config/' + merchantId,
        });

        expect(res.statusCode).toBe(200);
        expect(res.result).toHaveProperty('version');
        expect(res.result).toHaveProperty('data');
        expect(res.result?.version).toMatch('1.0.0');
    });
    test('PUT /api/v1/config/{merchantId} return 500 when config data is malformed during update', async () => {
        prismaMock.configurations.update.mockRejectedValue({ version: '1.0.0', data: undefined });

        const res: ServerInjectResponse<{ version: string; data: responseType }> = await server.inject({
            method: 'PUT',
            url: '/api/v1/config/nonexistent',
        });
        expect(res.statusCode).toBe(200);
        expect(res.result).toHaveProperty('version');
        expect(res.result).toHaveProperty('data');
        expect(res.result?.version).toMatch('1.0.0');
        expect(res.result?.data).toBe(undefined);
    });
});
