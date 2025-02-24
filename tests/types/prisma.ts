import { PrismaClient } from '@prisma/client';
import { DeepMockProxy } from 'jest-mock-extended';

export type MockPrismaClient = DeepMockProxy<PrismaClient>;
export type MockContext = {
  prisma: MockPrismaClient;
}; 