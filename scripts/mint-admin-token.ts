/**
 * Mint a short-lived admin Socket.IO JWT.
 * Run locally only; never commit the output.
 */
import { loadConfig } from '../src/config/env';
import { signAdminToken } from '../src/sockets/auth';

function main(): void {
  const config = loadConfig();
  const secret = config.admin.jwtSecret;
  if (!secret) {
    console.error(
      'ADMIN_JWT_SECRET (or SOCKET_ADMIN_JWT_SECRET) is not set. Generate one with: openssl rand -hex 32',
    );
    process.exit(1);
  }
  const ttlArg = process.argv.find((entry) => entry.startsWith('--ttl='));
  const ttl = ttlArg ? Number.parseInt(ttlArg.split('=')[1] ?? '', 10) : config.admin.jwtTtlSeconds;
  const subjectArg = process.argv.find((entry) => entry.startsWith('--subject='));
  const subject = subjectArg?.split('=')[1] ?? 'admin';

  if (!Number.isFinite(ttl) || ttl <= 0) {
    console.error('Invalid --ttl value');
    process.exit(1);
  }

  const token = signAdminToken(secret, ttl, subject);
  console.log('');
  console.log('Admin JWT (keep secret; works for /api/v1/audit/* and /admin Socket.IO):');
  console.log(token);
  console.log('');
  console.log(`Expires in ${ttl} seconds. Examples:`);
  console.log(`  curl -H "Authorization: Bearer <token>" ${config.apiPublicUrl ?? 'http://localhost:4000'}/api/v1/audit/products`);
  console.log(`  io('${config.apiPublicUrl ?? 'http://localhost:4000'}/admin', { auth: { token } });`);
  console.log("  // never ship ADMIN_JWT_SECRET to a browser");
}

main();


