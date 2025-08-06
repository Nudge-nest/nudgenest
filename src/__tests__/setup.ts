import { jest } from '@jest/globals';
import { createMockConnection } from './mocks/rabbitmq';
import {prismaMock} from "./mocks/prisma";

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'mongodb://test:test@localhost:27017/test';

// Global test timeout
jest.setTimeout(10000);

// Mock Prisma
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn(() => prismaMock)
}));

// Mock external services by default
jest.mock('@sendgrid/mail');
jest.mock('@aws-sdk/client-s3');
jest.mock('twilio');

jest.mock('amqplib', () => ({
    connect: () => Promise.resolve(createMockConnection()),
}));
