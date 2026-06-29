// Auth logic (Phase 006 Phase 2): register and login. Pure — it never touches
// req/res or storage directly. The repo (storage) and the hasher (password
// scrambling) are both injected, so the service is fully testable with fakes and
// the real bcrypt is wired only at the controller edge.
//
// The raw password lives only as a local string for the length of a call: register
// hands the repo a one-way hash, login compares against that hash. It is never
// stored, logged, or returned.

import type { AuthRepo, AuthUser } from "./auth.repo.ts";
import { badRequest, conflict, unauthenticated } from "../../middleware/http-error.ts";

/** Shortest password we accept. Plain minimum-length gate — strength rules are not
 *  in this phase. */
const MIN_PASSWORD_LENGTH = 8;

/** The password-scrambling port. bcrypt at the controller edge; a fake in tests. */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

export interface RegisterInput {
  email: string;
  name: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** The safe user shape that leaves the server — no password hash, ever. */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  orgId: string;
  role: string;
}

export interface AuthService {
  register(input: RegisterInput): Promise<PublicUser>;
  login(input: LoginInput): Promise<PublicUser>;
}

function normalizeEmail(email: string): string {
  return (email ?? "").trim().toLowerCase();
}

function toPublic(u: AuthUser): PublicUser {
  return { id: u.id, email: u.email, name: u.name, orgId: u.orgId, role: u.role };
}

export function createAuthService(repo: AuthRepo, hasher: PasswordHasher): AuthService {
  return {
    async register(input) {
      const email = normalizeEmail(input.email);
      const name = (input.name ?? "").trim();
      const password = input.password ?? "";

      if (!email) throw badRequest("Email is required.");
      if (!name) throw badRequest("Name is required.");
      if (password.length < MIN_PASSWORD_LENGTH) {
        throw badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      }
      if (await repo.findByEmail(email)) {
        throw conflict("That email is already registered.");
      }

      const passwordHash = await hasher.hash(password);
      const orgId = await repo.ensureDefaultOrg();
      const user = await repo.createUser({ orgId, email, name, passwordHash });
      return toPublic(user);
    },

    async login(input) {
      const email = normalizeEmail(input.email);
      const password = input.password ?? "";
      const user = email ? await repo.findByEmail(email) : null;

      // One message whether the email is unknown or the password is wrong — we don't
      // reveal which emails have accounts. Still honest: a wrong password is never
      // let in.
      if (!user || !user.passwordHash || !(await hasher.verify(password, user.passwordHash))) {
        throw unauthenticated("Email or password is incorrect.");
      }
      return toPublic(user);
    },
  };
}
