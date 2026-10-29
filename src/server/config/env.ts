import * as dotenv from 'dotenv';

dotenv.config();

function parseBoolean(val: string | undefined, fallback: boolean): boolean {
  if (val === undefined || val === '') return fallback;
  return val.toLowerCase() === 'true' || val === '1';
}

function parseNumber(val: string | undefined, fallback: number): number {
  if (val === undefined || val === '') return fallback;
  const parsed = Number(val);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseNumber(process.env.PORT, 3000),
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  DEFAULT_LOCALE: (process.env.DEFAULT_LOCALE || 'pt-BR') as 'pt-BR' | 'es' | 'en',

  // Security & Auth
  JWT_SECRET:
    process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16
      ? process.env.JWT_SECRET
      : 'kore-base-enterprise-default-hmac-sha256-jwt-secret-key-2026',
  JWT_EXPIRES_IN_SECONDS: parseNumber(process.env.JWT_EXPIRES_IN_SECONDS, 86400),
  WEBHOOK_SECRET:
    process.env.WEBHOOK_SECRET || 'whsec_kore_enterprise_hmac_sha256_webhook_secret_2026',
  RATE_LIMIT_WINDOW_MS: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 60000),
  RATE_LIMIT_MAX_REQUESTS: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, 120),
  AUTH_RATE_LIMIT_MAX_REQUESTS: parseNumber(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 20),
  MAX_UPLOAD_SIZE_BYTES: parseNumber(process.env.MAX_UPLOAD_SIZE_BYTES, 5 * 1024 * 1024),

  // PostgreSQL Standard Configuration
  POSTGRES_ENABLED: parseBoolean(process.env.POSTGRES_ENABLED, false),
  POSTGRES_HOST: process.env.POSTGRES_HOST || 'localhost',
  POSTGRES_PORT: parseNumber(process.env.POSTGRES_PORT, 5432),
  POSTGRES_USER: process.env.POSTGRES_USER || 'postgres',
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || '',
  POSTGRES_DB: process.env.POSTGRES_DB || 'kore_base',
  POSTGRES_SSL: parseBoolean(process.env.POSTGRES_SSL, false),
  POSTGRES_POOL_MAX: parseNumber(process.env.POSTGRES_POOL_MAX, 10),

  // Optional Redis + BullMQ Configuration
  REDIS_ENABLED: parseBoolean(process.env.REDIS_ENABLED, false),
  BULLMQ_ENABLED: parseBoolean(process.env.BULLMQ_ENABLED, false),
  REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
  REDIS_PORT: parseNumber(process.env.REDIS_PORT, 6379),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  REDIS_DB: parseNumber(process.env.REDIS_DB, 0),
  BULLMQ_PREFIX: process.env.BULLMQ_PREFIX || 'kore_queue',
  BULLMQ_CONCURRENCY: parseNumber(process.env.BULLMQ_CONCURRENCY, 5),

  // Multi-LLM Providers
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_DEFAULT_MODEL: process.env.GEMINI_DEFAULT_MODEL || 'gemini-3.8-flash',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  OPENROUTER_DEFAULT_MODEL:
    process.env.OPENROUTER_DEFAULT_MODEL || 'meta-llama/llama-3.3-70b-instruct',
  LLAMA_API_BASE_URL: process.env.LLAMA_API_BASE_URL || 'https://api.groq.com/openai/v1',
  LLAMA_API_KEY: process.env.LLAMA_API_KEY || '',
  LLAMA_DEFAULT_MODEL: process.env.LLAMA_DEFAULT_MODEL || 'llama-3.3-70b-versatile',

  // SMTP & Resend Mail Configuration
  MAIL_PROVIDER: (process.env.MAIL_PROVIDER === 'smtp' ? 'smtp' : 'resend') as 'resend' | 'smtp',
  MAIL_FROM: process.env.MAIL_FROM || 'no-reply@kore.dev',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.mailgun.org',
  SMTP_PORT: parseNumber(process.env.SMTP_PORT, 587),
  SMTP_SECURE: parseBoolean(process.env.SMTP_SECURE, false),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
};
