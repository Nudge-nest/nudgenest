import Hapi from '@hapi/hapi';
import { PrismaClient } from '../../generated/prisma/prisma/client';

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        prisma: PrismaClient;
    }
}

const prismaPlugin: Hapi.Plugin<null> = {
    name: 'prisma',
    register: async (server: Hapi.Server) => {
        if (process.env.NODE_ENV === 'test') {
            // Always use the same mock instance
            const { prismaMock } = require('../../src/__tests__/mocks/prisma');
            server.app.prisma = prismaMock;
        } else {
            server.app.prisma = new PrismaClient({ log: ['error'] });
        }
        console.log("['info'] Prisma client initialized");
        server.ext({
            type: 'onPostStop',
            method: async (server: Hapi.Server) => {
                server.app.prisma.$disconnect();
                console.log("['info'] Prisma client disconnected");
            },
        });
    },
};

export default prismaPlugin;
