import { jest } from '@jest/globals';
import { createMockConnection } from './mocks/rabbitmq';
import { prismaMock } from './mocks/prisma';

// Mock environment variables FIRST, before any imports
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'mongodb://test:test@localhost:27017/test';
process.env.RABBITMQ_URL = 'amqp://localhost';
process.env.RABBITMQ_URL_AWS = 'amqp://localhost'; // Add this!
process.env.APP_AWS_BUCKET_NAME = 'test-bucket';
process.env.APP_AWS_REGION = 'us-east-1';
process.env.APP_AWS_ACCESS_KEY = 'test-key';
process.env.APP_AWS_SECRET_KEY = 'test-secret';

// Global test timeout
jest.setTimeout(10000);

// Mock Prisma
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn(() => prismaMock),
}));

// Mock external services by default
jest.mock('@sendgrid/mail');
jest.mock('@aws-sdk/client-s3');
jest.mock('twilio');

jest.mock('amqplib', () => ({
    connect: () => Promise.resolve(createMockConnection()),
}));
