export const API_VERSION_PREFIX = '/api/v1';

export const JWT_CONFIG = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  issuer: 'bookermap',
} as const;

export const PAYMENT_CONFIG = {
  [Symbol.for('STRIPE')]: {
    keys: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'],
  },
  [Symbol.for('PAYSTACK')]: {
    keys: ['PAYSTACK_SECRET_KEY', 'PAYSTACK_PUBLIC_KEY'],
  },
  [Symbol.for('FLUTTERWAVE')]: {
    keys: ['FLUTTERWAVE_SECRET_KEY', 'FLUTTERWAVE_PUBLIC_KEY', 'FLUTTERWAVE_ENCRYPTION_KEY'],
  },
  [Symbol.for('SQUARE')]: {
    keys: ['SQUARE_ACCESS_TOKEN', 'SQUARE_LOCATION_ID', 'SQUARE_WEBHOOK_SIGNATURE_KEY'],
  },
};

export const DB_CONFIG = {
  connectionLimit: 10,
  poolTimeout: 30,
  statementTimeout: 10000,
  ssl: true,
};

export const AppConfig = {
  app: {
    name: 'BookerMap',
    version: '1.0.0',
    port: parseInt(process.env['PORT'] || '3000', 10),
    nodeEnv: process.env['NODE_ENV'] || 'development',
    apiPrefix: API_VERSION_PREFIX,
    corsOrigins: (process.env['CORS_ORIGINS'] || 'http://localhost:3001').split(','),
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100,
    },
  },
  jwt: JWT_CONFIG,
  db: DB_CONFIG,
  payment: {
    defaultProvider: process.env['DEFAULT_PAYMENT_PROVIDER'] || 'paystack',
    currency: process.env['DEFAULT_CURRENCY'] || 'NGN',
  },
  upload: {
    maxFileSize: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    provider: process.env['UPLOAD_PROVIDER'] || 'local',
  },
  smtp: {
    host: process.env['SMTP_HOST'] || '',
    port: parseInt(process.env['SMTP_PORT'] || '587', 10),
    user: process.env['SMTP_USER'] || '',
    from: process.env['SMTP_FROM'] || 'noreply@bookermap.com',
  },
};

export function getEnv(key: string, defaultValue?: string): string {
  return process.env[key] ?? defaultValue ?? '';
}

export function isDevelopment(): boolean {
  return getEnv('NODE_ENV') === 'development';
}

export function isProduction(): boolean {
  return getEnv('NODE_ENV') === 'production';
}

export function isTest(): boolean {
  return getEnv('NODE_ENV') === 'test';
}
