// Platform configuration schema

export const config = {
  api: {
    port: parseInt(process.env.API_PORT || '3000', 10),
    prefix: '/api/v1',
    corsOrigins: process.env.API_CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    },
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    sessionExpiresIn: parseInt(process.env.SESSION_EXPIRES_IN || '604800', 10), // 7 days in seconds
    mfaIssuer: 'FIDScript Deploy',
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecial: true,
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/fidscript',
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    ssl: process.env.DB_SSL === 'true',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
  },
  storage: {
    endpoint: process.env.S3_ENDPOINT || 'localhost',
    port: parseInt(process.env.S3_PORT || '9000', 10),
    useSSL: process.env.S3_USE_SSL === 'true',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    bucket: process.env.S3_BUCKET || 'fidscript',
  },
  email: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@fidscript.local',
  },
  cloudflare: {
    apiKey: process.env.CLOUDFLARE_API_KEY || '',
    email: process.env.CLOUDFLARE_EMAIL || '',
  },
  dashboard: {
    url: process.env.DASHBOARD_URL || 'http://localhost:3001',
  },
} as const;

export type Config = typeof config;
