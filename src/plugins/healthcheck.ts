import Hapi from '@hapi/hapi';

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        healthcheck: any;
    }
}

const healthPlugin: Hapi.Plugin<undefined> = {
    name: 'healthcheck',
    register: async (server: Hapi.Server) => {
        server.route({
            method: 'GET',
            path: '/health',
            handler: (_, h: Hapi.ResponseToolkit) => {
                //TODO. Add database check to here?
                return h.response({ status: 'OK', timestamp: new Date().toISOString() }).code(200);
            },
            options: {
                auth: false,
            },
        });
    },
};

export default healthPlugin;
