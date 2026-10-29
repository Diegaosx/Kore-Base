import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  User,
  UserRole,
  UserStatus,
  Locale,
  AuditLog,
  DailyMetricPoint,
  DashboardSummary,
} from '../../shared/types';
import { hashPassword, verifyPassword, hashToken } from '../security/crypto-shield';

export interface StoredUser extends User {
  passwordHash: string;
}

export interface PasswordResetRecord {
  id: string;
  userId: string;
  email: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

interface DatabaseSchemaState {
  users: StoredUser[];
  passwordResets: PasswordResetRecord[];
  auditLogs: AuditLog[];
  metricsDaily: DailyMetricPoint[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'kore_postgres_store.json');

function formatDateKey(date: Date): { date: string; label: string } {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return {
    date: `${yyyy}-${mm}-${dd}`,
    label: `${dd}/${mm}`,
  };
}

function createInitialSeed(): DatabaseSchemaState {
  const now = new Date();
  const nowIso = now.toISOString();

  const initialUsers: StoredUser[] = [
    {
      id: 'usr_admin_01',
      name: 'Rafael Araujo',
      email: 'admin@kore.dev',
      passwordHash: hashPassword('Admin@123456'),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      locale: 'pt-BR',
      department: 'Platform Architecture',
      lastLoginAt: nowIso,
      createdAt: new Date(now.getTime() - 28 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
    {
      id: 'usr_client_01',
      name: 'Beatriz Monteiro',
      email: 'cliente@kore.dev',
      passwordHash: hashPassword('Cliente@123456'),
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      locale: 'pt-BR',
      department: 'Operations',
      lastLoginAt: new Date(now.getTime() - 2 * 3600000).toISOString(),
      createdAt: new Date(now.getTime() - 24 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
    {
      id: 'usr_client_02',
      name: 'Carlos Méndez',
      email: 'carlos.mendez@kore.dev',
      passwordHash: hashPassword('Cliente@123456'),
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      locale: 'es',
      department: 'Finance',
      lastLoginAt: new Date(now.getTime() - 14 * 3600000).toISOString(),
      createdAt: new Date(now.getTime() - 19 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
    {
      id: 'usr_admin_02',
      name: 'Elena Rostova',
      email: 'elena.rostova@kore.dev',
      passwordHash: hashPassword('Admin@123456'),
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      locale: 'en',
      department: 'Security & Compliance',
      lastLoginAt: new Date(now.getTime() - 6 * 3600000).toISOString(),
      createdAt: new Date(now.getTime() - 15 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
    {
      id: 'usr_client_03',
      name: 'Lucas Ferreira',
      email: 'lucas.ferreira@kore.dev',
      passwordHash: hashPassword('Cliente@123456'),
      role: UserRole.CLIENT,
      status: UserStatus.SUSPENDED,
      locale: 'pt-BR',
      department: 'External Partner',
      lastLoginAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
      createdAt: new Date(now.getTime() - 12 * 86400000).toISOString(),
      updatedAt: nowIso,
    },
  ];

  // Generate 30 days of deterministic daily metrics
  const metricsDaily: DailyMetricPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const { date, label } = formatDateKey(d);
    const dayIndex = 29 - i;
    const wave = Math.sin(dayIndex * 0.45);
    const progressiveUsers = Math.min(
      initialUsers.length,
      Math.max(1, Math.ceil(((dayIndex + 1) / 30) * initialUsers.length))
    );
    const loginsCount = Math.max(8, Math.round(18 + dayIndex * 1.4 + wave * 6));
    const actionsCount = Math.max(25, Math.round(64 + dayIndex * 4.8 + wave * 18));
    metricsDaily.push({
      date,
      label,
      usersCount: i === 0 ? initialUsers.length : progressiveUsers,
      loginsCount,
      actionsCount,
    });
  }

  const auditLogs: AuditLog[] = [
    {
      id: 'log_seed_01',
      timestamp: new Date(now.getTime() - 45 * 60000).toISOString(),
      actorId: 'usr_admin_01',
      actorEmail: 'admin@kore.dev',
      actorRole: UserRole.ADMIN,
      action: 'SYSTEM_BOOT_CHECKS',
      category: 'security',
      resource: '/api/infra/status',
      status: 'success',
      ipAddress: '10.24.0.1',
      latencyMs: 2,
      metadata: { jwtAlg: 'HS256', rateLimit: 'active', postgresSchema: 'verified' },
    },
    {
      id: 'log_seed_02',
      timestamp: new Date(now.getTime() - 32 * 60000).toISOString(),
      actorId: 'usr_admin_02',
      actorEmail: 'elena.rostova@kore.dev',
      actorRole: UserRole.ADMIN,
      action: 'USER_STATUS_SUSPENDED',
      category: 'users',
      resource: '/api/users/usr_client_03',
      status: 'warning',
      ipAddress: '10.24.0.14',
      latencyMs: 6,
      metadata: { targetEmail: 'lucas.ferreira@kore.dev', status: 'suspended' },
    },
    {
      id: 'log_seed_03',
      timestamp: new Date(now.getTime() - 18 * 60000).toISOString(),
      actorId: 'usr_client_01',
      actorEmail: 'cliente@kore.dev',
      actorRole: UserRole.CLIENT,
      action: 'AUTH_LOGIN_SUCCESS',
      category: 'auth',
      resource: '/api/auth/login',
      status: 'success',
      ipAddress: '192.168.1.40',
      latencyMs: 14,
      metadata: { locale: 'pt-BR' },
    },
    {
      id: 'log_seed_04',
      timestamp: new Date(now.getTime() - 9 * 60000).toISOString(),
      actorId: 'usr_admin_01',
      actorEmail: 'admin@kore.dev',
      actorRole: UserRole.ADMIN,
      action: 'BULLMQ_WORKER_REGISTERED',
      category: 'queue',
      resource: 'kore_queue:email-dispatch',
      status: 'success',
      ipAddress: '10.24.0.1',
      latencyMs: 3,
      metadata: { queues: 4, concurrency: 5 },
    },
  ];

  return {
    users: initialUsers,
    passwordResets: [],
    auditLogs,
    metricsDaily,
  };
}

class PostgresRepository {
  private state: DatabaseSchemaState;

  constructor() {
    this.state = this.loadOrInitialize();
  }

  private loadOrInitialize(): DatabaseSchemaState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw) as DatabaseSchemaState;
        if (parsed && Array.isArray(parsed.users) && parsed.users.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback to fresh seed if corrupted
    }
    const seed = createInitialSeed();
    this.persist(seed);
    return seed;
  }

  private persist(state = this.state): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch {
      // Ignore write failures in read-only filesystems
    }
  }

  private stripPassword(user: StoredUser): User {
    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
  }

  public incrementTodayMetric(field: 'loginsCount' | 'actionsCount' | 'usersCount'): void {
    const { date, label } = formatDateKey(new Date());
    let todayPoint = this.state.metricsDaily.find((m) => m.date === date);
    if (!todayPoint) {
      todayPoint = {
        date,
        label,
        usersCount: this.state.users.length,
        loginsCount: 1,
        actionsCount: 1,
      };
      this.state.metricsDaily.push(todayPoint);
    }
    if (field === 'usersCount') {
      todayPoint.usersCount = this.state.users.length;
    } else {
      todayPoint[field] += 1;
    }
    this.persist();
  }

  public listUsers(): User[] {
    return this.state.users.map((u) => this.stripPassword(u));
  }

  public findUserById(id: string): User | null {
    const found = this.state.users.find((u) => u.id === id);
    return found ? this.stripPassword(found) : null;
  }

  public findStoredUserById(id: string): StoredUser | null {
    return this.state.users.find((u) => u.id === id) || null;
  }

  public findStoredUserByEmail(email: string): StoredUser | null {
    const clean = email.trim().toLowerCase();
    return this.state.users.find((u) => u.email.toLowerCase() === clean) || null;
  }

  public verifyUserCredentials(email: string, passwordPlain: string): User | null {
    const stored = this.findStoredUserByEmail(email);
    if (!stored) return null;
    if (!verifyPassword(passwordPlain, stored.passwordHash)) return null;
    stored.lastLoginAt = new Date().toISOString();
    this.incrementTodayMetric('loginsCount');
    this.persist();
    return this.stripPassword(stored);
  }

  public createUser(params: {
    name: string;
    email: string;
    passwordPlain: string;
    role: UserRole;
    status?: UserStatus;
    locale?: Locale;
    department?: string;
  }): User {
    const existing = this.findStoredUserByEmail(params.email);
    if (existing) {
      throw new Error('E-mail already registered');
    }
    const nowIso = new Date().toISOString();
    const newUser: StoredUser = {
      id: `usr_${crypto.randomBytes(6).toString('hex')}`,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      passwordHash: hashPassword(params.passwordPlain),
      role: params.role,
      status: params.status || UserStatus.ACTIVE,
      locale: params.locale || 'pt-BR',
      department: params.department?.trim() || 'General',
      lastLoginAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.state.users.unshift(newUser);
    this.incrementTodayMetric('usersCount');
    this.persist();
    return this.stripPassword(newUser);
  }

  public updateUser(
    id: string,
    updates: {
      name?: string;
      email?: string;
      role?: UserRole;
      status?: UserStatus;
      locale?: Locale;
      department?: string;
      passwordPlain?: string;
    }
  ): User {
    const target = this.findStoredUserById(id);
    if (!target) {
      throw new Error('User not found');
    }
    if (updates.email && updates.email.toLowerCase() !== target.email.toLowerCase()) {
      const duplicate = this.findStoredUserByEmail(updates.email);
      if (duplicate && duplicate.id !== id) {
        throw new Error('E-mail already in use by another account');
      }
      target.email = updates.email.trim().toLowerCase();
    }
    if (updates.name !== undefined) target.name = updates.name.trim();
    if (updates.role !== undefined) target.role = updates.role;
    if (updates.status !== undefined) target.status = updates.status;
    if (updates.locale !== undefined) target.locale = updates.locale;
    if (updates.department !== undefined) target.department = updates.department.trim();
    if (updates.passwordPlain && updates.passwordPlain.length >= 6) {
      target.passwordHash = hashPassword(updates.passwordPlain);
    }
    target.updatedAt = new Date().toISOString();
    this.persist();
    return this.stripPassword(target);
  }

  public deleteUser(id: string): boolean {
    const index = this.state.users.findIndex((u) => u.id === id);
    if (index === -1) return false;
    this.state.users.splice(index, 1);
    this.incrementTodayMetric('usersCount');
    this.persist();
    return true;
  }

  public storePasswordReset(params: {
    userId: string;
    email: string;
    tokenHash: string;
    expiresInMinutes?: number;
  }): PasswordResetRecord {
    const expiresAt = new Date(
      Date.now() + (params.expiresInMinutes ?? 30) * 60000
    ).toISOString();
    const record: PasswordResetRecord = {
      id: `rst_${crypto.randomBytes(6).toString('hex')}`,
      userId: params.userId,
      email: params.email,
      tokenHash: params.tokenHash,
      expiresAt,
      usedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.state.passwordResets.unshift(record);
    this.persist();
    return record;
  }

  public consumePasswordReset(rawToken: string, newPasswordPlain: string): User | null {
    const digest = hashToken(rawToken.trim());
    const record = this.state.passwordResets.find(
      (r) => r.tokenHash === digest && r.usedAt === null
    );
    if (!record) return null;
    if (new Date(record.expiresAt).getTime() < Date.now()) {
      return null;
    }
    const user = this.findStoredUserById(record.userId);
    if (!user) return null;

    user.passwordHash = hashPassword(newPasswordPlain);
    user.updatedAt = new Date().toISOString();
    record.usedAt = new Date().toISOString();
    this.persist();
    return this.stripPassword(user);
  }

  public appendAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const fullLog: AuditLog = {
      id: `log_${crypto.randomBytes(6).toString('hex')}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.state.auditLogs.unshift(fullLog);
    if (this.state.auditLogs.length > 300) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 300);
    }
    this.incrementTodayMetric('actionsCount');
    this.persist();
    return fullLog;
  }

  public listAuditLogs(params?: {
    category?: string;
    search?: string;
    actorId?: string;
    limit?: number;
  }): AuditLog[] {
    let logs = [...this.state.auditLogs];
    if (params?.actorId) {
      logs = logs.filter((l) => l.actorId === params.actorId);
    }
    if (params?.category && params.category !== 'all') {
      logs = logs.filter((l) => l.category === params.category);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.actorEmail.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.resource.toLowerCase().includes(q) ||
          l.ipAddress.toLowerCase().includes(q)
      );
    }
    return logs.slice(0, params?.limit ?? 100);
  }

  public getDashboardSummary(days = 30): DashboardSummary {
    const clampedDays = Math.min(30, Math.max(7, days));
    const series = this.state.metricsDaily.slice(-clampedDays);
    const totalUsers = this.state.users.length;
    const activeUsers = this.state.users.filter((u) => u.status === UserStatus.ACTIVE).length;

    const loginsLast30d = series.reduce((acc, item) => acc + item.loginsCount, 0);
    const actionsLast30d = series.reduce((acc, item) => acc + item.actionsCount, 0);

    return {
      totals: {
        totalUsers,
        activeUsers,
        loginsLast30d,
        actionsLast30d,
        usersDeltaPct: 14.2,
        loginsDeltaPct: 18.6,
        actionsDeltaPct: 24.1,
      },
      series,
    };
  }
}

export const dbRepo = new PostgresRepository();
