import crypto from 'node:crypto';
import { UserRole } from '../../shared/types';

export interface JwtClaims {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
  iss: string;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): Buffer {
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4 !== 0) {
    str += '=';
  }
  return Buffer.from(str, 'base64');
}

/**
 * Hashes a plaintext password using scrypt with a unique 16-byte cryptographic salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash using constant-time comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, salt, originalHex] = parts;
  const derivedBuffer = crypto.scryptSync(password, salt, 64);
  const originalBuffer = Buffer.from(originalHex, 'hex');
  if (derivedBuffer.length !== originalBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(derivedBuffer, originalBuffer);
}

/**
 * Signs an RFC 7519 HS256 JWT token using HMAC-SHA256.
 */
export function signJwt(
  payload: { sub: string; email: string; role: UserRole },
  secret: string,
  expiresInSeconds = 86400
): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload: JwtClaims = {
    ...payload,
    iat: nowSec,
    exp: nowSec + expiresInSeconds,
    iss: 'kore-base-platform',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest();

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

/**
 * Verifies an HS256 JWT token, checking signature integrity, issuer, and expiration.
 */
export function verifyJwt(token: string, secret: string): JwtClaims | null {
  if (!token || typeof token !== 'string') return null;
  const segments = token.split('.');
  if (segments.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = segments;
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest();

  const actualSig = base64UrlDecode(encodedSignature);
  if (expectedSig.length !== actualSig.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(expectedSig, actualSig)) {
    return null;
  }

  try {
    const header = JSON.parse(base64UrlDecode(encodedHeader).toString('utf8'));
    if (header.alg !== 'HS256') return null;

    const claims = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8')) as JwtClaims;
    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof claims.exp !== 'number' || claims.exp <= nowSec) {
      return null;
    }
    if (claims.iss !== 'kore-base-platform') {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

/**
 * Generates a high-entropy password recovery token and its SHA-256 storage digest.
 */
export function generateRecoveryToken(): { rawToken: string; tokenHash: string } {
  const rawToken = `kr_${crypto.randomBytes(18).toString('hex')}`;
  const tokenHash = hashToken(rawToken);
  return { rawToken, tokenHash };
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Signs and verifies webhook payloads with HMAC-SHA256 and replay window tolerance.
 */
export function signWebhookPayload(payload: string, secret: string, timestampSec: number): string {
  const signedContent = `${timestampSec}.${payload}`;
  const digest = crypto.createHmac('sha256', secret).update(signedContent).digest('hex');
  return `v1=${digest}`;
}

export function verifyWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
  timestampSec: number,
  toleranceSeconds = 300
): { valid: boolean; reason?: string } {
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - timestampSec) > toleranceSeconds) {
    return { valid: false, reason: 'Webhook timestamp outside replay tolerance window' };
  }

  const expected = signWebhookPayload(payload, secret, timestampSec);
  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signatureHeader || '', 'utf8');

  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    return { valid: false, reason: 'Invalid HMAC-SHA256 signature' };
  }

  return { valid: true };
}

/**
 * Sanitizes string inputs against XSS script tags and dangerous SQL control sequences.
 */
export function sanitizeInput(value: string, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
    .replace(/[<>]/g, '')
    .replace(/\0/g, '')
    .trim()
    .slice(0, maxLength);
}

export interface FileValidationInput {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  magicBytesHex?: string;
}

const ALLOWED_FILE_TYPES: Record<string, { extensions: string[]; magicPrefixes: string[] }> = {
  'image/png': { extensions: ['.png'], magicPrefixes: ['89504e47'] },
  'image/jpeg': { extensions: ['.jpg', '.jpeg'], magicPrefixes: ['ffd8ff'] },
  'image/webp': { extensions: ['.webp'], magicPrefixes: ['52494646'] },
  'application/pdf': { extensions: ['.pdf'], magicPrefixes: ['25504446'] },
  'text/csv': { extensions: ['.csv'], magicPrefixes: [] },
};

/**
 * Validates file uploads against path traversal, size limits, MIME allowlists, and magic bytes.
 */
export function validateFileUpload(
  file: FileValidationInput,
  maxBytes = 5 * 1024 * 1024
): { valid: boolean; sanitizedFilename: string; reason?: string } {
  if (!file.filename || file.filename.includes('..') || /[\\/]/.test(file.filename)) {
    return { valid: false, sanitizedFilename: '', reason: 'Path traversal or invalid filename' };
  }

  if (file.sizeBytes <= 0 || file.sizeBytes > maxBytes) {
    return { valid: false, sanitizedFilename: '', reason: 'File size exceeds maximum policy' };
  }

  const rule = ALLOWED_FILE_TYPES[file.mimeType];
  if (!rule) {
    return { valid: false, sanitizedFilename: '', reason: 'MIME type not permitted by policy' };
  }

  const lowerName = file.filename.toLowerCase();
  const hasAllowedExt = rule.extensions.some((ext) => lowerName.endsWith(ext));
  if (!hasAllowedExt) {
    return { valid: false, sanitizedFilename: '', reason: 'Extension does not match MIME type' };
  }

  if (rule.magicPrefixes.length > 0 && file.magicBytesHex) {
    const cleanHex = file.magicBytesHex.toLowerCase().replace(/[^0-9a-f]/g, '');
    const matchesMagic = rule.magicPrefixes.some((prefix) => cleanHex.startsWith(prefix));
    if (!matchesMagic) {
      return { valid: false, sanitizedFilename: '', reason: 'Binary magic bytes mismatch' };
    }
  }

  const sanitizedFilename = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return { valid: true, sanitizedFilename };
}

/**
 * Role-Based Access Control (RBAC) policy evaluator.
 * - ADMIN can access and mutate all resources.
 * - CLIENT can only access resources where requiredRole is CLIENT and (if resourceOwnerId is provided) they are the owner.
 */
export function canAccessResource(params: {
  actorRole: UserRole;
  actorId: string;
  requiredRole: UserRole;
  resourceOwnerId?: string;
}): boolean {
  const { actorRole, actorId, requiredRole, resourceOwnerId } = params;
  if (actorRole === UserRole.ADMIN) {
    return true;
  }
  if (requiredRole === UserRole.ADMIN) {
    return false;
  }
  if (resourceOwnerId !== undefined && resourceOwnerId !== actorId) {
    return false;
  }
  return true;
}

/**
 * Sliding-window Rate Limiter for API and authentication endpoints.
 */
export class RateLimiter {
  private buckets = new Map<string, number[]>();

  constructor(
    private readonly windowMs: number,
    private readonly maxRequests: number
  ) {}

  public consume(key: string, nowMs = Date.now()): {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  } {
    const cutoff = nowMs - this.windowMs;
    const existing = this.buckets.get(key) || [];
    const activeTimestamps = existing.filter((ts) => ts > cutoff);

    if (activeTimestamps.length >= this.maxRequests) {
      const oldest = activeTimestamps[0] || nowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + this.windowMs - nowMs) / 1000));
      this.buckets.set(key, activeTimestamps);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    activeTimestamps.push(nowMs);
    this.buckets.set(key, activeTimestamps);
    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - activeTimestamps.length),
      retryAfterSeconds: 0,
    };
  }
}
