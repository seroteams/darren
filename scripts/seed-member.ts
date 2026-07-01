// Dev-only seed: create (or demote) a plain MEMBER account so the admin-role wall can
// actually be walked (admin-access-guard Phase 2). Register always makes an owner, so
// without this there's no non-admin user to test with.
//
// Attaches the member to an existing org — Carl's dev org (carl@seroteams.com) if it's
// there, else the first org. Free: local Postgres + bcrypt, no OpenAI. Refuses to run
// in production.
//
//   node scripts/seed-member.ts
//   → logs in as member@seroteams.com / seromember123 (override via SEED_MEMBER_EMAIL /
//     SEED_MEMBER_PASSWORD)

import "../backend/api/env-boot.ts"; // load .env (DATABASE_URL) before the db client reads it
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb, closeDb, hasDatabaseUrl } from "../backend/db/client.ts";
import { users, organizations } from "../backend/db/schema.ts";

const EMAIL = process.env.SEED_MEMBER_EMAIL || "member@seroteams.com";
const PASSWORD = process.env.SEED_MEMBER_PASSWORD || "seromember123";
const NAME = "Dev Member";
const OWNER_HINT = "carl@seroteams.com"; // the dev org we prefer to attach to

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("seed-member is a dev helper — refusing to run in production.");
  }
  if (!hasDatabaseUrl()) {
    throw new Error("DATABASE_URL is not set — start your local Postgres / .env first.");
  }

  const db = getDb();

  // Pick an org to attach to: the dev owner's org if present, otherwise the first org.
  const ownerRows = await db.select().from(users).where(eq(users.email, OWNER_HINT)).limit(1);
  let orgId = ownerRows[0]?.orgId;
  if (!orgId) {
    const orgRows = await db.select().from(organizations).limit(1);
    orgId = orgRows[0]?.id;
  }
  if (!orgId) {
    throw new Error("No organization found — register an owner first (e.g. carl@seroteams.com), then re-run.");
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const existing = await db.select().from(users).where(eq(users.email, EMAIL)).limit(1);
  if (existing[0]) {
    await db.update(users).set({ role: "member", passwordHash }).where(eq(users.email, EMAIL));
    console.log(`Updated ${EMAIL} → role=member (org ${orgId}).`);
  } else {
    await db.insert(users).values({ orgId, email: EMAIL, name: NAME, role: "member", passwordHash });
    console.log(`Created member ${EMAIL} (org ${orgId}).`);
  }
  console.log(`\n  Log in as:  ${EMAIL}  /  ${PASSWORD}\n`);

  await closeDb();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
