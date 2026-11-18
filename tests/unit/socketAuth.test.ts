import { describe, expect, it } from 'vitest';
import {
  extractSocketToken,
  signAdminToken,
  verifyAdminToken,
} from '../../src/sockets/auth';

const SECRET = 'unit-test-secret-0123456789abcdef';

describe('admin socket authentication', () => {
  it('signs and verifies a valid admin token', () => {
    const token = signAdminToken(SECRET, 60, 'ops');
    const payload = verifyAdminToken(token, SECRET);
    expect(payload?.role).toBe('admin');
    expect(payload?.sub).toBe('ops');
  });

  it('rejects a token signed with another secret or tampered', () => {
    const token = signAdminToken(SECRET, 60);
    expect(verifyAdminToken(token, 'other-secret')).toBeNull();
    expect(verifyAdminToken(`${token}x`, SECRET)).toBeNull();
    expect(verifyAdminToken('garbage', SECRET)).toBeNull();
  });

  it('rejects expired tokens', () => {
    const token = signAdminToken(SECRET, -1);
    expect(verifyAdminToken(token, SECRET)).toBeNull();
  });

  it('extracts tokens from handshake auth and Authorization headers', () => {
    expect(
      extractSocketToken({ auth: { token: 'abc' }, headers: {} }),
    ).toBe('abc');
    expect(
      extractSocketToken({ auth: { token: 'Bearer abc' }, headers: {} }),
    ).toBe('abc');
    expect(
      extractSocketToken({ auth: {}, headers: { authorization: 'Bearer xyz' } }),
    ).toBe('xyz');
    expect(extractSocketToken({ auth: {}, headers: {} })).toBeNull();
  });
});
