// Members — the workspace's login accounts + pending invites (members-page Phase 1). A normal
// admin's view of who can log in to their OWN org, read-only in this phase: name · role · status
// (Active / Invited / Deactivated). Inviting and row actions land in later phases. Distinct from
// the internal admin User-management console (superadmin, cross-company). The pure table render
// lives in ./members-table.ts (DOM-free, unit-tested); this file owns the mount + data load.

import "../../../admin/src/styles/design/admin-tables.css";
import "../styles/members.css";
import { getMembers } from "../../../shared/api.js";
import { membersTable, type MemberRow } from "./members-table.ts";
import type { Mount, Unmount } from "../../../admin/src/stages/stage.types.ts";

export const mount: Mount = async (root) => {
  const header = `
    <header class="page-header">
      <div class="page-header__row">
        <h1 class="h1">Members</h1>
      </div>
      <div class="text-ink-dim">Everyone who can log in to your workspace, and their access.</div>
    </header>`;
  const shell = (inner: string) => `<div class="stage-inner l-stack l-stack--8">${header}${inner}</div>`;

  const emptyCard = `
    <section class="card-flat space-y-3">
      <div class="eyebrow">No one has access yet</div>
      <p class="text-ink-dim">This is where people who can log in to your workspace will appear.</p>
    </section>`;
  const errorCard = `
    <section class="card-flat space-y-3">
      <div class="eyebrow">Couldn't load members</div>
      <p class="text-ink-dim">Something went wrong. Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`;

  const load = async () => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading members…</p></section>`);
    let members: MemberRow[];
    try {
      const res = (await getMembers()) as { members?: MemberRow[] };
      members = Array.isArray(res.members) ? res.members : [];
    } catch {
      root.innerHTML = shell(errorCard);
      root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
      return;
    }
    root.innerHTML = shell(members.length ? membersTable(members) : emptyCard);
  };

  await load();
};

export const unmount: Unmount = () => {};
