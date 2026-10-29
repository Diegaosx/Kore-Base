import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { env } from './src/server/config/env';
import {
  signJwt,
  verifyJwt,
  sanitizeInput,
  generateRecoveryToken,
  signWebhookPayload,
  verifyWebhookSignature,
  validateFileUpload,
  canAccessResource,
  RateLimiter,
  verifyPassword,
  JwtClaims,
} from './src/server/security/crypto-shield';
import { dbRepo } from './src/server/db/repository';
import { queueCacheManager } from './src/server/infra/queue-cache';
import { executeLlmPrompt } from './src/server/services/llm-gateway';
import { mailService } from './src/server/services/mail-service';
import {
  UserRole,
  UserStatus,
  Locale,
  InfrastructureStatus,
  LLMProviderId,
  QueueJobRecord,
} from './src/shared/types';

interface AuthenticatedRequest extends Request {
  auth?: JwtClaims;
}

const globalRateLimiter = new RateLimiter(env.RATE_LIMIT_WINDOW_MS, env.RATE_LIMIT_MAX_REQUESTS);
const authRateLimiter = new RateLimiter(env.RATE_LIMIT_WINDOW_MS, env.AUTH_RATE_LIMIT_MAX_REQUESTS);

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // ==========================================================================
  // 1. HARDENED HTTP SECURITY HEADERS
  // ==========================================================================
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    next();
  });

  // ==========================================================================
  // 2. GLOBAL & AUTH RATE LIMITING MIDDLEWARE
  // ==========================================================================
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIp(req);
    const isAuthRoute = req.path.startsWith('/auth/');
    const limiter = isAuthRoute ? authRateLimiter : globalRateLimiter;
    const maxLimit = isAuthRoute ? env.AUTH_RATE_LIMIT_MAX_REQUESTS : env.RATE_LIMIT_MAX_REQUESTS;

    const result = limiter.consume(`${isAuthRoute ? 'auth' : 'api'}:${ip}`);
    res.setHeader('X-RateLimit-Limit', String(maxLimit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));

    if (!result.allowed) {
      res.setHeader('Retry-After', String(result.retryAfterSeconds));
      dbRepo.appendAuditLog({
        actorId: null,
        actorEmail: 'anonymous',
        actorRole: 'unauthenticated',
        action: 'RATE_LIMIT_EXCEEDED',
        category: 'security',
        resource: req.originalUrl,
        status: 'warning',
        ipAddress: ip,
        latencyMs: 1,
        metadata: { retryAfterSeconds: result.retryAfterSeconds },
      });
      res.status(429).json({
        error: `Rate limit exceeded. Try again in ${result.retryAfterSeconds}s.`,
      });
      return;
    }
    next();
  });

  // ==========================================================================
  // 3. JWT AUTHENTICATION & RBAC MIDDLEWARES
  // ==========================================================================
  const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication token required' });
      return;
    }
    const token = header.slice('Bearer '.length).trim();
    const claims = verifyJwt(token, env.JWT_SECRET);
    if (!claims) {
      res.status(401).json({ error: 'Invalid or expired JWT token' });
      return;
    }
    const currentUser = dbRepo.findUserById(claims.sub);
    if (!currentUser || currentUser.status === UserStatus.SUSPENDED) {
      res.status(403).json({ error: 'Account suspended or removed' });
      return;
    }
    req.auth = {
      ...claims,
      role: currentUser.role,
      email: currentUser.email,
    };
    next();
  };

  const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth || !canAccessResource({
      actorRole: req.auth.role,
      actorId: req.auth.sub,
      requiredRole: UserRole.ADMIN,
    })) {
      dbRepo.appendAuditLog({
        actorId: req.auth?.sub || null,
        actorEmail: req.auth?.email || 'unknown',
        actorRole: req.auth?.role || 'none',
        action: 'RBAC_ACCESS_DENIED',
        category: 'security',
        resource: req.originalUrl,
        status: 'error',
        ipAddress: getClientIp(req),
        latencyMs: 1,
        metadata: { requiredRole: UserRole.ADMIN },
      });
      res.status(403).json({ error: 'Forbidden: Administrator role required' });
      return;
    }
    next();
  };

  // ==========================================================================
  // 4. AUTHENTICATION & PASSWORD RECOVERY ROUTES
  // ==========================================================================
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const start = Date.now();
    const ip = getClientIp(req);
    const email = sanitizeInput(req.body?.email || '', 160).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const stored = dbRepo.findStoredUserByEmail(email);
    if (stored && stored.status === UserStatus.SUSPENDED) {
      dbRepo.appendAuditLog({
        actorId: stored.id,
        actorEmail: stored.email,
        actorRole: stored.role,
        action: 'AUTH_LOGIN_SUSPENDED',
        category: 'auth',
        resource: '/api/auth/login',
        status: 'error',
        ipAddress: ip,
        latencyMs: Date.now() - start,
        metadata: { reason: 'Account suspended' },
      });
      res.status(403).json({ error: 'Account is currently suspended' });
      return;
    }

    const verifiedUser = dbRepo.verifyUserCredentials(email, password);
    if (!verifiedUser) {
      dbRepo.appendAuditLog({
        actorId: null,
        actorEmail: email,
        actorRole: 'anonymous',
        action: 'AUTH_LOGIN_FAILED',
        category: 'auth',
        resource: '/api/auth/login',
        status: 'warning',
        ipAddress: ip,
        latencyMs: Date.now() - start,
        metadata: { reason: 'Invalid credentials' },
      });
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signJwt(
      { sub: verifiedUser.id, email: verifiedUser.email, role: verifiedUser.role },
      env.JWT_SECRET,
      env.JWT_EXPIRES_IN_SECONDS
    );

    queueCacheManager.deleteCache('dashboard:summary:30');
    dbRepo.appendAuditLog({
      actorId: verifiedUser.id,
      actorEmail: verifiedUser.email,
      actorRole: verifiedUser.role,
      action: 'AUTH_LOGIN_SUCCESS',
      category: 'auth',
      resource: '/api/auth/login',
      status: 'success',
      ipAddress: ip,
      latencyMs: Date.now() - start,
      metadata: { role: verifiedUser.role },
    });

    res.json({ token, user: verifiedUser });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const start = Date.now();
    const ip = getClientIp(req);
    const name = sanitizeInput(req.body?.name || '', 120);
    const email = sanitizeInput(req.body?.email || '', 160).toLowerCase();
    const department = sanitizeInput(req.body?.department || 'Operations', 100);
    const locale = (['pt-BR', 'es', 'en'].includes(req.body?.locale)
      ? req.body.locale
      : 'pt-BR') as Locale;
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!name || !email || password.length < 6) {
      res.status(400).json({ error: 'Name, valid email, and password (min 6 chars) are required' });
      return;
    }

    try {
      // Self-registered accounts always start with CLIENT role to prevent privilege escalation
      const user = dbRepo.createUser({
        name,
        email,
        passwordPlain: password,
        role: UserRole.CLIENT,
        status: UserStatus.ACTIVE,
        locale,
        department,
      });

      const token = signJwt(
        { sub: user.id, email: user.email, role: user.role },
        env.JWT_SECRET,
        env.JWT_EXPIRES_IN_SECONDS
      );

      queueCacheManager.deleteCache('dashboard:summary:30');
      dbRepo.appendAuditLog({
        actorId: user.id,
        actorEmail: user.email,
        actorRole: user.role,
        action: 'AUTH_REGISTER_CLIENT',
        category: 'auth',
        resource: '/api/auth/register',
        status: 'success',
        ipAddress: ip,
        latencyMs: Date.now() - start,
        metadata: { department: user.department },
      });

      res.status(201).json({ token, user });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      res.status(409).json({ error: msg });
    }
  });

  app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    const start = Date.now();
    const ip = getClientIp(req);
    const email = sanitizeInput(req.body?.email || '', 160).toLowerCase();
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = dbRepo.findStoredUserByEmail(email);
    if (!user) {
      // Constant-shape response to prevent email enumeration, while logging internally
      dbRepo.appendAuditLog({
        actorId: null,
        actorEmail: email,
        actorRole: 'anonymous',
        action: 'AUTH_RECOVERY_UNKNOWN_EMAIL',
        category: 'mail',
        resource: '/api/auth/forgot-password',
        status: 'warning',
        ipAddress: ip,
        latencyMs: Date.now() - start,
        metadata: { email },
      });
      res.json({
        dispatched: true,
        provider: env.MAIL_PROVIDER,
        devPreviewToken: null,
      });
      return;
    }

    const { rawToken, tokenHash } = generateRecoveryToken();
    dbRepo.storePasswordReset({
      userId: user.id,
      email: user.email,
      tokenHash,
      expiresInMinutes: 30,
    });

    const delivery = await mailService.sendPasswordRecoveryEmail({
      to: user.email,
      userName: user.name,
      rawToken,
    });

    dbRepo.appendAuditLog({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'AUTH_RECOVERY_TOKEN_DISPATCHED',
      category: 'mail',
      resource: '/api/auth/forgot-password',
      status: 'success',
      ipAddress: ip,
      latencyMs: Date.now() - start,
      metadata: {
        mailProvider: delivery.provider,
        deliveryStatus: delivery.status,
        bullmqJobId: delivery.jobId,
      },
    });

    res.json({
      dispatched: true,
      provider: delivery.provider,
      deliveryStatus: delivery.status,
      // Provided in dev/sandbox mode so the user can test the complete token reset loop without external inbox setup
      devPreviewToken: rawToken,
    });
  });

  app.post('/api/auth/reset-password', (req: Request, res: Response) => {
    const start = Date.now();
    const ip = getClientIp(req);
    const rawToken = sanitizeInput(req.body?.token || '', 120);
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!rawToken || newPassword.length < 6) {
      res.status(400).json({ error: 'Valid recovery token and password (min 6 chars) required' });
      return;
    }

    const updatedUser = dbRepo.consumePasswordReset(rawToken, newPassword);
    if (!updatedUser) {
      dbRepo.appendAuditLog({
        actorId: null,
        actorEmail: 'anonymous',
        actorRole: 'anonymous',
        action: 'AUTH_PASSWORD_RESET_INVALID_TOKEN',
        category: 'security',
        resource: '/api/auth/reset-password',
        status: 'error',
        ipAddress: ip,
        latencyMs: Date.now() - start,
        metadata: {},
      });
      res.status(400).json({ error: 'Invalid or expired recovery token' });
      return;
    }

    dbRepo.appendAuditLog({
      actorId: updatedUser.id,
      actorEmail: updatedUser.email,
      actorRole: updatedUser.role,
      action: 'AUTH_PASSWORD_RESET_COMPLETED',
      category: 'auth',
      resource: '/api/auth/reset-password',
      status: 'success',
      ipAddress: ip,
      latencyMs: Date.now() - start,
      metadata: {},
    });

    res.json({ success: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = dbRepo.findUserById(req.auth!.sub);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  });

  // ==========================================================================
  // 5. DASHBOARD METRICS (ACCESSIBLE TO ADMIN & CLIENT)
  // ==========================================================================
  app.get('/api/dashboard/metrics', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const days = Number(req.query.days) || 30;
    const cacheKey = `dashboard:summary:${days}`;
    const cached = queueCacheManager.getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    const summary = dbRepo.getDashboardSummary(days);
    queueCacheManager.setCache(cacheKey, summary, 30);
    res.json(summary);
  });

  // ==========================================================================
  // 6. USER MANAGEMENT CRUD (STRICTLY ADMIN ONLY)
  // ==========================================================================
  app.get('/api/users', requireAuth, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
    res.json({ users: dbRepo.listUsers() });
  });

  app.post('/api/users', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const start = Date.now();
    const name = sanitizeInput(req.body?.name || '', 120);
    const email = sanitizeInput(req.body?.email || '', 160).toLowerCase();
    const department = sanitizeInput(req.body?.department || 'General', 120);
    const role = req.body?.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.CLIENT;
    const status =
      req.body?.status === UserStatus.SUSPENDED ? UserStatus.SUSPENDED : UserStatus.ACTIVE;
    const locale = (['pt-BR', 'es', 'en'].includes(req.body?.locale)
      ? req.body.locale
      : 'pt-BR') as Locale;
    const password =
      typeof req.body?.password === 'string' && req.body.password.length >= 6
        ? req.body.password
        : 'Cliente@123456';

    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required' });
      return;
    }

    try {
      const created = dbRepo.createUser({
        name,
        email,
        passwordPlain: password,
        role,
        status,
        locale,
        department,
      });

      queueCacheManager.deleteCache('dashboard:summary:30');
      dbRepo.appendAuditLog({
        actorId: req.auth!.sub,
        actorEmail: req.auth!.email,
        actorRole: req.auth!.role,
        action: 'USER_CREATED_BY_ADMIN',
        category: 'users',
        resource: `/api/users/${created.id}`,
        status: 'success',
        ipAddress: getClientIp(req),
        latencyMs: Date.now() - start,
        metadata: { createdEmail: created.email, assignedRole: created.role },
      });

      res.status(201).json({ user: created });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not create user';
      res.status(409).json({ error: msg });
    }
  });

  app.patch(
    '/api/users/:id',
    requireAuth,
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const start = Date.now();
      const targetId = String(req.params.id);

      try {
        const updated = dbRepo.updateUser(targetId, {
          name: req.body?.name !== undefined ? sanitizeInput(req.body.name, 120) : undefined,
          email:
            req.body?.email !== undefined
              ? sanitizeInput(req.body.email, 160).toLowerCase()
              : undefined,
          department:
            req.body?.department !== undefined
              ? sanitizeInput(req.body.department, 120)
              : undefined,
          role:
            req.body?.role === UserRole.ADMIN || req.body?.role === UserRole.CLIENT
              ? req.body.role
              : undefined,
          status:
            req.body?.status === UserStatus.ACTIVE || req.body?.status === UserStatus.SUSPENDED
              ? req.body.status
              : undefined,
          locale: ['pt-BR', 'es', 'en'].includes(req.body?.locale) ? req.body.locale : undefined,
          passwordPlain:
            typeof req.body?.password === 'string' && req.body.password.length >= 6
              ? req.body.password
              : undefined,
        });

        queueCacheManager.deleteCache('dashboard:summary:30');
        dbRepo.appendAuditLog({
          actorId: req.auth!.sub,
          actorEmail: req.auth!.email,
          actorRole: req.auth!.role,
          action: 'USER_UPDATED_BY_ADMIN',
          category: 'users',
          resource: `/api/users/${targetId}`,
          status: 'success',
          ipAddress: getClientIp(req),
          latencyMs: Date.now() - start,
          metadata: { targetEmail: updated.email, role: updated.role, status: updated.status },
        });

        res.json({ user: updated });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not update user';
        res.status(400).json({ error: msg });
      }
    }
  );

  app.delete(
    '/api/users/:id',
    requireAuth,
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const start = Date.now();
      const targetId = String(req.params.id);
      if (targetId === req.auth!.sub) {
        res.status(400).json({ error: 'Cannot delete your own active administrator account' });
        return;
      }

      const targetUser = dbRepo.findUserById(targetId);
      const deleted = dbRepo.deleteUser(targetId);
      if (!deleted) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      queueCacheManager.deleteCache('dashboard:summary:30');
      dbRepo.appendAuditLog({
        actorId: req.auth!.sub,
        actorEmail: req.auth!.email,
        actorRole: req.auth!.role,
        action: 'USER_DELETED_BY_ADMIN',
        category: 'users',
        resource: `/api/users/${targetId}`,
        status: 'warning',
        ipAddress: getClientIp(req),
        latencyMs: Date.now() - start,
        metadata: { deletedEmail: targetUser?.email || targetId },
      });

      res.json({ deleted: true });
    }
  );

  // ==========================================================================
  // 7. SELF PROFILE ROUTES (ADMIN & CLIENT — ISOLATED TO OWN ACCOUNT)
  // ==========================================================================
  app.patch('/api/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const start = Date.now();
    const userId = req.auth!.sub;

    try {
      const updated = dbRepo.updateUser(userId, {
        name: req.body?.name !== undefined ? sanitizeInput(req.body.name, 120) : undefined,
        department:
          req.body?.department !== undefined ? sanitizeInput(req.body.department, 120) : undefined,
        locale: ['pt-BR', 'es', 'en'].includes(req.body?.locale) ? req.body.locale : undefined,
      });

      dbRepo.appendAuditLog({
        actorId: userId,
        actorEmail: updated.email,
        actorRole: updated.role,
        action: 'PROFILE_UPDATED',
        category: 'profile',
        resource: '/api/profile',
        status: 'success',
        ipAddress: getClientIp(req),
        latencyMs: Date.now() - start,
        metadata: { locale: updated.locale, department: updated.department },
      });

      res.json({ user: updated });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Profile update failed';
      res.status(400).json({ error: msg });
    }
  });

  app.post('/api/profile/password', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const start = Date.now();
    const userId = req.auth!.sub;
    const currentPassword =
      typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!currentPassword || newPassword.length < 6) {
      res
        .status(400)
        .json({ error: 'Current password and new password (min 6 chars) are required' });
      return;
    }

    const stored = dbRepo.findStoredUserById(userId);
    if (!stored || !verifyPassword(currentPassword, stored.passwordHash)) {
      dbRepo.appendAuditLog({
        actorId: userId,
        actorEmail: req.auth!.email,
        actorRole: req.auth!.role,
        action: 'PROFILE_PASSWORD_CHANGE_FAILED',
        category: 'security',
        resource: '/api/profile/password',
        status: 'warning',
        ipAddress: getClientIp(req),
        latencyMs: Date.now() - start,
        metadata: { reason: 'Incorrect current password' },
      });
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const updated = dbRepo.updateUser(userId, { passwordPlain: newPassword });
    dbRepo.appendAuditLog({
      actorId: userId,
      actorEmail: updated.email,
      actorRole: updated.role,
      action: 'PROFILE_PASSWORD_CHANGED',
      category: 'security',
      resource: '/api/profile/password',
      status: 'success',
      ipAddress: getClientIp(req),
      latencyMs: Date.now() - start,
      metadata: {},
    });

    res.json({ success: true });
  });

  // ==========================================================================
  // 8. SYSTEM AUDIT LOGS & INFRASTRUCTURE / LLM / QUEUE / WEBHOOK ROUTES
  // ==========================================================================
  app.get('/api/logs', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
    const category = typeof req.query.category === 'string' ? req.query.category : 'all';
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const logs = dbRepo.listAuditLogs({ category, search, limit: 100 });
    res.json({ logs });
  });

  app.get(
    '/api/infra/status',
    requireAuth,
    requireAdmin,
    (_req: AuthenticatedRequest, res: Response) => {
      const queueStatus = queueCacheManager.getStatusSummary();
      const status: InfrastructureStatus = {
        database: {
          engine: 'PostgreSQL',
          mode: env.POSTGRES_ENABLED ? 'native-pg-pool' : 'embedded-transactional-store',
          host: `${env.POSTGRES_HOST}:${env.POSTGRES_PORT}`,
          databaseName: env.POSTGRES_DB,
          poolMax: env.POSTGRES_POOL_MAX,
          connected: true,
        },
        cacheAndQueue: queueStatus,
        llm: {
          geminiConfigured:
            Boolean(env.GEMINI_API_KEY) && env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
          geminiModel: env.GEMINI_DEFAULT_MODEL,
          openRouterConfigured: Boolean(env.OPENROUTER_API_KEY),
          openRouterModel: env.OPENROUTER_DEFAULT_MODEL,
          llamaConfigured: Boolean(env.LLAMA_API_KEY),
          llamaModel: env.LLAMA_DEFAULT_MODEL,
        },
        mail: {
          provider: env.MAIL_PROVIDER,
          fromAddress: env.MAIL_FROM,
          resendConfigured: Boolean(env.RESEND_API_KEY),
          smtpConfigured: Boolean(env.SMTP_USER && env.SMTP_PASS),
          smtpHost: `${env.SMTP_HOST}:${env.SMTP_PORT}`,
          sentCount: mailService.getSentCount(),
        },
        security: {
          jwtAlgorithm: 'HS256',
          jwtExpiresInSeconds: env.JWT_EXPIRES_IN_SECONDS,
          rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
          rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS,
          authRateLimitMax: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
          webhookHmacEnabled: true,
          maxUploadSizeBytes: env.MAX_UPLOAD_SIZE_BYTES,
        },
      };

      res.json({
        status,
        recentJobs: queueCacheManager.listJobs().slice(0, 8),
      });
    }
  );

  app.post(
    '/api/infra/queue/job',
    requireAuth,
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const start = Date.now();
      const queueName = (req.body?.queueName || 'audit-sync') as QueueJobRecord['queueName'];
      const jobName = sanitizeInput(req.body?.name || 'manual-maintenance-job', 80);

      const job = queueCacheManager.enqueueJob({
        queueName,
        name: jobName,
        payload: req.body?.payload || { triggeredBy: req.auth!.email },
      });

      dbRepo.appendAuditLog({
        actorId: req.auth!.sub,
        actorEmail: req.auth!.email,
        actorRole: req.auth!.role,
        action: 'BULLMQ_JOB_ENQUEUED',
        category: 'queue',
        resource: `${env.BULLMQ_PREFIX}:${queueName}`,
        status: 'success',
        ipAddress: getClientIp(req),
        latencyMs: Date.now() - start,
        metadata: { jobId: job.id, jobName },
      });

      res.status(201).json({ job });
    }
  );

  app.post(
    '/api/infra/llm/execute',
    requireAuth,
    requireAdmin,
    async (req: AuthenticatedRequest, res: Response) => {
      const provider = (
        ['gemini', 'openrouter', 'llama'].includes(req.body?.provider)
          ? req.body.provider
          : 'gemini'
      ) as LLMProviderId;
      const prompt = sanitizeInput(req.body?.prompt || '', 1000);
      if (!prompt) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      const result = await executeLlmPrompt({ provider, prompt });

      dbRepo.appendAuditLog({
        actorId: req.auth!.sub,
        actorEmail: req.auth!.email,
        actorRole: req.auth!.role,
        action: `LLM_INFERENCE_${provider.toUpperCase()}`,
        category: 'llm',
        resource: `/api/infra/llm/execute`,
        status: 'success',
        ipAddress: getClientIp(req),
        latencyMs: result.latencyMs,
        metadata: {
          provider: result.provider,
          model: result.model,
          liveApiUsed: result.liveApiUsed,
        },
      });

      res.json({ result });
    }
  );

  app.post(
    '/api/infra/webhook/simulate',
    requireAuth,
    requireAdmin,
    (req: AuthenticatedRequest, res: Response) => {
      const start = Date.now();
      const eventType = sanitizeInput(req.body?.event || 'payment.succeeded', 80);
      const rawPayload = JSON.stringify({
        event: eventType,
        timestamp: new Date().toISOString(),
        actor: req.auth!.email,
      });
      const timestampSec = Math.floor(Date.now() / 1000);
      const signature = signWebhookPayload(rawPayload, env.WEBHOOK_SECRET, timestampSec);
      const verification = verifyWebhookSignature(
        rawPayload,
        signature,
        env.WEBHOOK_SECRET,
        timestampSec
      );

      // Also validate file upload guard as part of security check
      const fileGuardSample = validateFileUpload(
        {
          filename: 'invoice-signed.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 245000,
          magicBytesHex: '255044462d312e37',
        },
        env.MAX_UPLOAD_SIZE_BYTES
      );

      dbRepo.appendAuditLog({
        actorId: req.auth!.sub,
        actorEmail: req.auth!.email,
        actorRole: req.auth!.role,
        action: 'WEBHOOK_HMAC_VERIFIED',
        category: 'webhook',
        resource: '/api/webhooks/ingest',
        status: verification.valid ? 'success' : 'error',
        ipAddress: getClientIp(req),
        latencyMs: Date.now() - start,
        metadata: {
          event: eventType,
          signaturePrefix: signature.slice(0, 15),
          fileGuardVerified: fileGuardSample.valid,
        },
      });

      res.json({
        verified: verification.valid,
        signature,
        timestampSec,
        fileGuardSample,
      });
    }
  );

  // Public Webhook receiver endpoint protected by HMAC-SHA256
  app.post('/api/webhooks/ingest', (req: Request, res: Response) => {
    const start = Date.now();
    const signature = String(req.headers['x-webhook-signature'] || '');
    const timestampHeader = Number(req.headers['x-webhook-timestamp'] || 0);
    const rawBody = JSON.stringify(req.body || {});

    const check = verifyWebhookSignature(rawBody, signature, env.WEBHOOK_SECRET, timestampHeader);
    if (!check.valid) {
      dbRepo.appendAuditLog({
        actorId: null,
        actorEmail: 'webhook-caller',
        actorRole: 'external',
        action: 'WEBHOOK_SIGNATURE_REJECTED',
        category: 'webhook',
        resource: '/api/webhooks/ingest',
        status: 'error',
        ipAddress: getClientIp(req),
        latencyMs: Date.now() - start,
        metadata: { reason: check.reason || 'invalid' },
      });
      res.status(401).json({ error: check.reason });
      return;
    }

    res.json({ received: true });
  });

  // ==========================================================================
  // 9. VITE MIDDLEWARE / STATIC ASSETS
  // ==========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`Kore Base Platform listening on http://0.0.0.0:${env.PORT}`);
  });
}

startServer();
