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
            path: '/',
            handler: (_, h: Hapi.ResponseToolkit) => {
                //TODO. Add database check to here?
                return h.response({ up: true }).code(200);
            },
        });
    },
};

export default healthPlugin;
