/**
 * grant-admin — promote one or more users to ADMIN.
 *
 * Usage:
 *   node scripts/grant-admin.js                       # promotes the default seed list
 *   node scripts/grant-admin.js a@x.com b@y.com       # promotes the given emails
 *   node scripts/grant-admin.js --revoke a@x.com      # demotes back to USER
 *
 * Idempotent: re-running with the same email is a no-op.
 * Safe in production: only modifies the `role` column, nothing else.
 *
 * The script intentionally does NOT create users that don't exist — admin
 * status is granted to a real, registered account, never bootstrapped from
 * thin air. If an email isn't found we log a warning and move on.
 */

import pkg from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const { PrismaClient } = pkg;

const DEFAULT_ADMINS = ['test@gmail.com', 'meiller.amaury@gmail.com'];

async function main() {
  const argv = process.argv.slice(2);
  const revoke = argv.includes('--revoke');
  const emails = argv.filter((a) => !a.startsWith('--'));
  const targets = (emails.length ? emails : DEFAULT_ADMINS).map((e) =>
    String(e).trim().toLowerCase(),
  );
  const targetRole = revoke ? 'USER' : 'ADMIN';

  if (!process.env.DATABASE_URL) {
    console.error('[grant-admin] DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  let promoted = 0;
  let missing = 0;
  let unchanged = 0;

  try {
    for (const email of targets) {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, username: true, role: true },
      });
      if (!user) {
        console.warn(`[grant-admin] no user with email ${email} — skipping`);
        missing++;
        continue;
      }
      if (user.role === targetRole) {
        console.log(`[grant-admin] ${email} already ${targetRole}`);
        unchanged++;
        continue;
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { role: targetRole },
      });
      console.log(
        `[grant-admin] ${revoke ? 'revoked' : 'granted'} ${targetRole} → ${email} (@${user.username})`,
      );
      promoted++;
    }

    console.log(
      `\n[grant-admin] done. updated=${promoted} unchanged=${unchanged} missing=${missing}`,
    );
  } finally {
    await prisma.$disconnect();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[grant-admin] failed:', err);
  process.exit(1);
});
