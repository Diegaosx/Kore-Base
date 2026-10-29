export enum UserRole {
  ADMIN = 'admin',
  CLIENT = 'client',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

export type Locale = 'pt-BR' | 'es' | 'en';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  locale: Locale;
  department: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId: string | null;
  actorEmail: string;
  actorRole: string;
  action: string;
  category: 'auth' | 'users' | 'profile' | 'security' | 'queue' | 'llm' | 'mail' | 'webhook';
  resource: string;
  status: 'success' | 'warning' | 'error';
  ipAddress: string;
  latencyMs: number;
  metadata: Record<string, string | number | boolean | null>;
}

export interface DailyMetricPoint {
  date: string;
  label: string;
  usersCount: number;
  loginsCount: number;
  actionsCount: number;
}

export interface DashboardSummary {
  totals: {
    totalUsers: number;
    activeUsers: number;
    loginsLast30d: number;
    actionsLast30d: number;
    usersDeltaPct: number;
    loginsDeltaPct: number;
    actionsDeltaPct: number;
  };
  series: DailyMetricPoint[];
}

export interface QueueJobRecord {
  id: string;
  queueName: 'email-dispatch' | 'audit-sync' | 'webhook-delivery' | 'llm-processing';
  name: string;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  payload: Record<string, unknown>;
  result?: string;
  createdAt: string;
  processedAt?: string;
}

export type LLMProviderId = 'gemini' | 'openrouter' | 'llama';

export interface InfrastructureStatus {
  database: {
    engine: 'PostgreSQL';
    mode: 'native-pg-pool' | 'embedded-transactional-store';
    host: string;
    databaseName: string;
    poolMax: number;
    connected: boolean;
  };
  cacheAndQueue: {
    redisEnabled: boolean;
    bullmqEnabled: boolean;
    mode: 'redis-bullmq' | 'in-memory-fallback';
    redisHost: string;
    activeQueues: string[];
    cachedKeysCount: number;
    jobsSummary: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
  };
  llm: {
    geminiConfigured: boolean;
    geminiModel: string;
    openRouterConfigured: boolean;
    openRouterModel: string;
    llamaConfigured: boolean;
    llamaModel: string;
  };
  mail: {
    provider: 'resend' | 'smtp';
    fromAddress: string;
    resendConfigured: boolean;
    smtpConfigured: boolean;
    smtpHost: string;
    sentCount: number;
  };
  security: {
    jwtAlgorithm: 'HS256';
    jwtExpiresInSeconds: number;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    authRateLimitMax: number;
    webhookHmacEnabled: boolean;
    maxUploadSizeBytes: number;
  };
}
