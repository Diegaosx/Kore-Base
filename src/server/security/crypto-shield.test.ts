import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword,
  verifyPassword,
  signJwt,
  verifyJwt,
  signWebhookPayload,
  verifyWebhookSignature,
  sanitizeInput,
  validateFileUpload,
  canAccessResource,
  RateLimiter,
  generateRecoveryToken,
  hashToken,
} from './crypto-shield';
import { UserRole } from '../../shared/types';

test('scrypt password hashing and constant-time verification', () => {
  const hash = hashPassword('StrongPass!2026');
  assert.equal(hash.startsWith('scrypt$'), true);
  assert.equal(verifyPassword('StrongPass!2026', hash), true);
  assert.equal(verifyPassword('WrongPass!2026', hash), false);
});

test('JWT HS256 signing, verification, and tamper rejection', () => {
  const secret = 'unit-test-jwt-secret-key-with-high-entropy-2026';
  const token = signJwt(
    { sub: 'usr_1', email: 'admin@kore.dev', role: UserRole.ADMIN },
    secret,
    3600
  );

  const claims = verifyJwt(token, secret);
  assert.notEqual(claims, null);
  assert.equal(claims?.sub, 'usr_1');
  assert.equal(claims?.role, UserRole.ADMIN);

  // Tampered secret fails
  assert.equal(verifyJwt(token, 'wrong-secret'), null);

  // Expired token fails
  const expiredToken = signJwt(
    { sub: 'usr_1', email: 'admin@kore.dev', role: UserRole.ADMIN },
    secret,
    -10
  );
  assert.equal(verifyJwt(expiredToken, secret), null);
});

test('Webhook HMAC-SHA256 signature and replay defense', () => {
  const secret = 'whsec_test_secret';
  const payload = JSON.stringify({ event: 'user.created', id: 'usr_99' });
  const nowSec = Math.floor(Date.now() / 1000);

  const signature = signWebhookPayload(payload, secret, nowSec);
  const validResult = verifyWebhookSignature(payload, signature, secret, nowSec, 300);
  assert.equal(validResult.valid, true);

  // Replay outside window fails
  const replayResult = verifyWebhookSignature(payload, signature, secret, nowSec - 600, 300);
  assert.equal(replayResult.valid, false);

  // Tampered payload fails
  const tamperedResult = verifyWebhookSignature(
    JSON.stringify({ event: 'user.deleted', id: 'usr_99' }),
    signature,
    secret,
    nowSec,
    300
  );
  assert.equal(tamperedResult.valid, false);
});

test('RBAC policy enforces strict separation between Admin and Client roles', () => {
  // Admin can access admin and client resources of any user
  assert.equal(
    canAccessResource({
      actorRole: UserRole.ADMIN,
      actorId: 'admin_1',
      requiredRole: UserRole.ADMIN,
      resourceOwnerId: 'client_2',
    }),
    true
  );

  // Client cannot access Admin-required resources
  assert.equal(
    canAccessResource({
      actorRole: UserRole.CLIENT,
      actorId: 'client_1',
      requiredRole: UserRole.ADMIN,
    }),
    false
  );

  // Client can access own profile resource, but not another user's profile
  assert.equal(
    canAccessResource({
      actorRole: UserRole.CLIENT,
      actorId: 'client_1',
      requiredRole: UserRole.CLIENT,
      resourceOwnerId: 'client_1',
    }),
    true
  );
  assert.equal(
    canAccessResource({
      actorRole: UserRole.CLIENT,
      actorId: 'client_1',
      requiredRole: UserRole.CLIENT,
      resourceOwnerId: 'client_2',
    }),
    false
  );
});

test('File upload validation blocks path traversal, bad MIME, and invalid magic bytes', () => {
  const validPng = validateFileUpload({
    filename: 'report-2026.png',
    mimeType: 'image/png',
    sizeBytes: 120400,
    magicBytesHex: '89504e470d0a1a0a',
  });
  assert.equal(validPng.valid, true);

  const traversalAttempt = validateFileUpload({
    filename: '../../etc/passwd.png',
    mimeType: 'image/png',
    sizeBytes: 1024,
  });
  assert.equal(traversalAttempt.valid, false);

  const spoofedMagic = validateFileUpload({
    filename: 'exploit.png',
    mimeType: 'image/png',
    sizeBytes: 2048,
    magicBytesHex: '4d5a9000', // EXE MZ header
  });
  assert.equal(spoofedMagic.valid, false);
});

test('Sliding window rate limiter enforces request quota', () => {
  const limiter = new RateLimiter(60000, 3);
  const t0 = 1000000;

  assert.equal(limiter.consume('ip_1', t0).allowed, true);
  assert.equal(limiter.consume('ip_1', t0 + 100).allowed, true);
  assert.equal(limiter.consume('ip_1', t0 + 200).allowed, true);

  const blocked = limiter.consume('ip_1', t0 + 300);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);

  // After window expires, requests are allowed again
  assert.equal(limiter.consume('ip_1', t0 + 60500).allowed, true);
});

test('Input sanitization and recovery token hashing', () => {
  const dirty = '<script>alert(1)</script>Hello <b>World</b>';
  assert.equal(sanitizeInput(dirty), 'Hello bWorld/b');

  const { rawToken, tokenHash } = generateRecoveryToken();
  assert.equal(rawToken.startsWith('kr_'), true);
  assert.equal(hashToken(rawToken), tokenHash);
});
