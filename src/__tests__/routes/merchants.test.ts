import { createServer } from '../../server-factory';
import { Server, ServerInjectResponse } from '@hapi/hapi';
import { IMerchant, responseType } from '../../types';
import { prismaMock } from '../mocks/prisma';
import { testMerchant } from '../core/merchants.test';

const mockMerchant = { ...testMerchant, id: '68415f4bc99be1ae3f921dc1' } as any;

describe('Merchants route', () => {
    let server: Server;
    beforeAll(async () => {
        server = await createServer();
        await server.initialize();
    });

    afterAll(async () => {
        await server.stop();
    });

    test('POST /api/v1/merchants Creates new merchant and returns 200 status', async () => {
        prismaMock.merchants.create.mockResolvedValue(mockMerchant);
        const res: ServerInjectResponse<{ version: string; data: responseType }> = await server.inject({
            method: 'POST',
            url: '/api/v1/merchants',
        });
        expect(res.statusCode).toBe(200);
        expect(res.result).toHaveProperty('version');
        expect(res.result).toHaveProperty('data');
        expect(res.result?.version).toMatch('1.0.0');
    });
    test('POST /api/v1/merchants return 500 when merchant data is malformed', async () => {
        prismaMock.merchants.create.mockRejectedValue(new Error('Invalid `prisma.reviews.findUnique()` invocation'));

        const res: ServerInjectResponse<{ version: string; error: responseType }> = await server.inject({
            method: 'POST',
            url: '/api/v1/merchants',
        });
        expect(res.statusCode).toBe(500);
        expect(res.result).toHaveProperty('version');
        expect(res.result).toHaveProperty('error');
        expect(res.result?.version).toMatch('1.0.0');
        expect(res.result?.error).toContain('Invalid');
    });
    test('POST /api/v1/merchants/verify/{merchantPlatformId} returns merchant data and 200 status', async () => {
        const merchantPlatformId = 'TESTSH0P1D';
        prismaMock.merchants.findMany.mockResolvedValue([mockMerchant]);
        const res: ServerInjectResponse<{ version: string; data: responseType }> = await server.inject({
            method: 'POST',
            url: '/api/v1/merchants/verify/' + merchantPlatformId,
        });
        expect(res.statusCode).toBe(200);
        expect(res.result).toHaveProperty('version');
        expect(res.result).toHaveProperty('data');
        expect(res.result?.version).toMatch('1.0.0');
    });
    test('POST /api/v1/merchants/verify/{merchantPlatformId} return 500 on error', async () => {
        prismaMock.merchants.findMany.mockRejectedValue(new Error('Invalid `prisma.reviews.findUnique()` invocation'));
        const res: ServerInjectResponse<{ version: string; error: responseType }> = await server.inject({
            method: 'POST',
            url: '/api/v1/merchants/verify/nonexistent',
        });
        expect(res.statusCode).toBe(500);
        expect(res.result).toHaveProperty('version');
        expect(res.result).toHaveProperty('error');
        expect(res.result?.version).toMatch('1.0.0');
        expect(res.result?.error).toContain('Invalid');
    });
});
