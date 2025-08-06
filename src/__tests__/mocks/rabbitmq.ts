export const createMockChannel = () =>
    ({
        assertQueue: jest.fn().mockResolvedValue({ queue: 'test-queue' }),
        assertExchange: jest.fn().mockResolvedValue({ exchange: 'test-exchange' }),
        bindQueue: jest.fn().mockResolvedValue({}),
        sendToQueue: jest.fn().mockReturnValue(true),
        publish: jest.fn().mockReturnValue(true),
        consume: jest.fn().mockResolvedValue({ consumerTag: 'test-consumer' }),
        ack: jest.fn(),
        nack: jest.fn(),
        prefetch: jest.fn(),
        close: jest.fn(),
        on: jest.fn(),
    }) as any;

export const createMockConnection = () =>
    ({
        createChannel: jest.fn().mockResolvedValue(createMockChannel()),
        close: jest.fn(),
        on: jest.fn(),
    }) as any;
