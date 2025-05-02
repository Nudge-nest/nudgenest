import Hapi from '@hapi/hapi';
import { PrismaClient } from '@prisma/client';

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        prisma: PrismaClient;
    }
}

const prismaPlugin: Hapi.Plugin<null> = {
    name: 'prisma',
    register: async (server: Hapi.Server) => {
        server.app.prisma = new PrismaClient({ log: ['error'] });
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
