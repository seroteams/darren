// One "where does this user land" resolver, shared by login, register and boot so a
// user's home is decided in exactly ONE place — the split-brain bug (audit B1) was login
// sending a member to a different screen than a reload did.
//
// A manager/admin always lands on their dashboard (START). A plain member lands on the
// per-APP member home, which differs by build: the admin app's member home is their Past
// 1:1s (RUNS); the customer app's is MEMBER_HOME. Each app injects its own memberHome (set
// once in main.js as store.memberHome) — a shared stage must never assume one, because the
// same login.js file runs in both bundles.

import { STAGES, isAdmin } from "../state.js";

type UserLike = { roles?: string[]; role?: string } | null | undefined;

export function landingStage(user: UserLike, memberHome: string): string {
  return isAdmin(user) ? STAGES.START : memberHome;
}
