// Thin controller — read the body, call the service, format the response. No logic,
// no storage. This is the only place the real bcrypt and the Postgres repo are wired
// to the pure service.

import bcrypt from "bcryptjs";
import type { RequestContext } from "../../router.ts";
import { createAuthService } from "./auth.service.ts";
import type { PasswordHasher } from "./auth.service.ts";
import { pgAuthRepo } from "./auth.repo.ts";
import { asRecord, asString } from "../../../shared/guards.ts";

// bcrypt cost 10 — the standard default; one-way, salted per hash.
const bcryptHasher: PasswordHasher = {
  hash: (plain) => bcrypt.hash(plain, 10),
  verify: (plain, hash) => bcrypt.compare(plain, hash),
};

const service = createAuthService(pgAuthRepo, bcryptHasher);

// POST /api/v1/auth/register — { email, name, password } → 201 { user }
export async function register(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const user = await service.register({
    email: asString(body.email),
    name: asString(body.name),
    password: asString(body.password),
  });
  c.json(201, { user });
}

// POST /api/v1/auth/login — { email, password } → 200 { user }
export async function login(c: RequestContext): Promise<void> {
  const body = asRecord(await c.readBody());
  const user = await service.login({ email: asString(body.email), password: asString(body.password) });
  c.json(200, { user });
}
