import "./backend/api/env-boot.ts";
import { getDb, closeDb } from "./backend/db/client.ts";
import { errorLogs, users } from "./backend/db/schema.ts";

async function main() {
  const db = getDb();
  const people = await db.select({ id: users.id, orgId: users.orgId, email: users.email }).from(users).limit(5);
  const now = Date.now();
  const pick = (i: number) => people[i % Math.max(1, people.length)];
  const rows = [
    { off: 2,   env: "production", src: "api",     u: pick(0), method: "POST", path: "/api/v1/sessions/2026_x/answer", status: 500,  message: "OpenAI request timed out after 60s" },
    { off: 23,  env: "production", src: "browser", u: pick(1), method: null,   path: "/interview",                     status: null,  message: "Blank screen — cannot read 'stage' of undefined" },
    { off: 64,  env: "production", src: "api",     u: pick(2), method: "POST", path: "/api/v1/sessions",               status: 500,  message: "Engine build failed — focus-arc gate tripped" },
    { off: 150, env: "local",      src: "api",     u: pick(0), method: "GET",  path: "/api/v1/runs/2026_x/full",       status: 500,  message: "Run log not found on disk" },
    { off: 400, env: "production", src: "browser", u: pick(3), method: null,   path: "/briefing",                      status: null,  message: "Couldn't load the briefing (network dropped)" },
  ];
  for (const r of rows) {
    await db.insert(errorLogs).values({
      orgId: r.u?.orgId ?? null, userId: r.u?.id ?? null, email: r.u?.email ?? null,
      environment: r.env as "local" | "production", source: r.src as "api" | "browser",
      method: r.method, path: r.path, status: r.status, message: r.message,
      details: { demo: true }, createdAt: new Date(now - r.off * 60000),
    });
  }
  const n = (await db.select().from(errorLogs)).length;
  console.log(`seeded ${rows.length} demo rows; error_logs now has ${n} rows total (all marked details.demo=true).`);
  await closeDb();
}
main().catch((e) => { console.error("SEED FAILED:", e); process.exit(1); });
