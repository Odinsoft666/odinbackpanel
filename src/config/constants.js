export const ADMIN_CLASSES = {
  SUPERADMIN: 'SUPERADMIN',
  FINANCE_ADMIN: 'FINANCE_ADMIN',
  CALL_ADMIN: 'CALL_ADMIN',
  LIVE_SUPPORT_ADMIN: 'LIVE_SUPPORT_ADMIN',
  MARKETING_ADMIN: 'MARKETING_ADMIN',
  ACCOUNTING_ADMIN: 'ACCOUNTING_ADMIN',
  SUPPORT_ADMIN: 'SUPPORT_ADMIN'
};

export const PASSWORD_POLICY = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAgeDays: 90,
  historyCount: 5,
  maxAttempts: 5,
  lockoutMinutes: 30
};

export const DB_CONFIG = {
  URI: process.env.MONGODB_URI,
  NAME: process.env.MONGODB_NAME || 'odinsoft',
  OPTIONS: {
    serverApi: { version: '1', strict: true },
    maxPoolSize: 10,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 30000
  }
};

export const SESSION_CONFIG = {
  SECRET: process.env.SESSION_SECRET || 'your-secret-key',
  COLLECTION: 'sessions',
  TTL: 14 * 24 * 60 * 60 // 14 days
};

export const SERVER_CONFIG = {
  PORT: process.env.PORT || 3000,
  ENV: process.env.NODE_ENV || 'development'
};


export const JWT_CONFIG = {
  issuer: 'odinsoft',
  audience: 'admin-panel'
};


export const TOKEN_EXPIRY = {
  session: '15m',
  refresh: '7d'
};
