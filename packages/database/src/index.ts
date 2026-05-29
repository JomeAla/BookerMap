export interface DatabaseConfig {
  url: string;
  ssl?: boolean;
  connectionLimit?: number;
  poolTimeout?: number;
  statementTimeout?: number;
  logging?: boolean;
}

export function createDatabaseConfig(overrides?: Partial<DatabaseConfig>): DatabaseConfig {
  return {
    url: process.env['DATABASE_URL'] || '',
    ssl: true,
    connectionLimit: 10,
    poolTimeout: 30,
    statementTimeout: 10000,
    logging: false,
    ...overrides,
  };
}

export function getDatabaseUrl(): string {
  return process.env['DATABASE_URL'] || '';
}

export function isDatabaseConfigured(): boolean {
  return !!getDatabaseUrl();
}

export function getPrismaConfig(): {
  datasourceUrl: string;
  logging: ('query' | 'info' | 'warn' | 'error')[];
} {
  return {
    datasourceUrl: getDatabaseUrl(),
    logging: process.env['NODE_ENV'] === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
  };
}

export type PrismaClientLike = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  $on(event: string, callback: (event: unknown) => void): void;
};

export async function connectDatabase(client: PrismaClientLike): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not configured');
  }
  await client.$connect();
}

export async function disconnectDatabase(client: PrismaClientLike): Promise<void> {
  await client.$disconnect();
}

export { Prisma } from '@prisma/client';
export type { PrismaClient } from '@prisma/client';
