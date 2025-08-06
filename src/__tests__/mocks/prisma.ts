// src/__tests__/mocks/prisma.ts
import { PrismaClient } from '../../../generated/prisma/prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

export const prismaMock = mockDeep<PrismaClient>() as DeepMockProxy<PrismaClient>;

jest.mock('../../../generated/prisma/prisma/client', () => ({
    PrismaClient: jest.fn(() => prismaMock),
}));

beforeEach(() => {
    mockReset(prismaMock);
});
