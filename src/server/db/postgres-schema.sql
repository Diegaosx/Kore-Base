-- ============================================================================
-- KORE BASE PLATFORM — CANONICAL POSTGRESQL SCHEMA
-- Default Relational Database Engine: PostgreSQL 16+
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS TABLE (RBAC: 'admin' | 'client')
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  locale VARCHAR(10) NOT NULL DEFAULT 'pt-BR' CHECK (locale IN ('pt-BR', 'es', 'en')),
  department VARCHAR(120) NOT NULL DEFAULT 'General',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- 2. PASSWORD RESETS TABLE (SHA-256 Token Digest Only)
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets (token_hash);

-- 3. AUDIT LOGS TABLE (Immutable System Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_email VARCHAR(255) NOT NULL,
  actor_role VARCHAR(32) NOT NULL,
  action VARCHAR(120) NOT NULL,
  category VARCHAR(32) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('success', 'warning', 'error')),
  ip_address VARCHAR(64) NOT NULL,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs (category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_email ON audit_logs (actor_email);

-- 4. DAILY TELEMETRY METRICS TABLE (Dashboard Time-Series)
CREATE TABLE IF NOT EXISTS metrics_daily (
  metric_date DATE PRIMARY KEY,
  users_count INTEGER NOT NULL DEFAULT 0,
  logins_count INTEGER NOT NULL DEFAULT 0,
  actions_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
