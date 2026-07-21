// Members — the workspace's login accounts + pending invites (members-page Phase 1). A normal
// admin's view of who can log in to their OWN org, read-only in this phase: name · role · status
// (Active / Invited / Deactivated). Inviting and row actions land in later phases. Distinct from
// the internal admin User-management console (superadmin, cross-company). The pure table render
// lives in ./members-table.ts (DOM-free, unit-tested); this file owns the mount + data load.

import "../../../admin/src/styles/design/admin-tables.css";
import "../styles/members.css";
import { getMembers, inviteMember, setMemberRole, deactivateMember, reactivateMember, revokeInvite, resendInvite } from "../../../shared/api.js";
import { showInviteMemberModal } from "../../../admin/src/ui/invite-member-modal.ts";
import { showShareLinkModal } from "../../../admin/src/ui/share-link-modal.ts";
import { openRowMenu, closeRowMenu } from "../../../admin/src/ui/row-menu.ts";
import { showActionError } from "../../../admin/src/ui/action-error.ts";
import { membersTable, type MemberRow } from "./members-table.ts";
import type { Mount, Unmount } from "../../../admin/src/stages/stage.types.ts";

export const mount: Mount = async (root) => {
  const header = `
    <header class="page-header">
      <div class="page-header__row">
        <h1 class="h1">Members</h1>
        <div class="l-cluster l-cluster--2">
          <button type="button" class="btn btn--ghost btn--sm js-invite">Invite people</button>
        </div>
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

  // The one place inviting starts: email + role → the invite engine mints a one-time join link
  // and emails it. The link is also surfaced so the manager can copy it if the email lags.
  const doInvite = async () => {
    const draft = await showInviteMemberModal();
    if (!draft) return; // cancelled
    try {
      const res = (await inviteMember(draft.email, draft.role)) as { link: string };
      await showShareLinkModal({
        title: `Invite sent to ${draft.email}`,
        message: "If the email doesn't arrive, share this link with them directly:",
        link: `${window.location.origin}${res.link}`,
      });
      await load();
    } catch (e) {
      showActionError(root, e instanceof Error ? e.message : "Couldn't send the invite. Please try again.");
    }
  };

  // Run a row action, reload on success, surface the server's plain-words guard message on a
  // block (e.g. "only manager…"). The server is the real gate; the menu just calls it.
  const runAction = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load();
    } catch (e) {
      showActionError(root, e instanceof Error ? e.message : "Couldn't make that change. Please try again.");
    }
  };

  // A resend surfaces the fresh link too, so the manager can copy it if the email lags.
  const doResend = async (id: string) => {
    try {
      const res = (await resendInvite(id)) as { link: string };
      await showShareLinkModal({
        title: "New invite sent",
        message: "If the email doesn't arrive, share this link with them directly:",
        link: `${window.location.origin}${res.link}`,
      });
      await load();
    } catch (e) {
      showActionError(root, e instanceof Error ? e.message : "Couldn't resend. Please try again.");
    }
  };

  const openMemberMenu = (btn: HTMLElement) => {
    const id = btn.dataset.id || "";
    const kind = btn.dataset.kind || "account";
    const role = btn.dataset.role || "member";
    const status = btn.dataset.status || "active";
    let items;
    if (kind === "invite") {
      items = [
        { label: "Resend invite", onSelect: () => { void doResend(id); } },
        { label: "Revoke invite", danger: true, onSelect: () => { void runAction(() => revokeInvite(id)); } },
      ];
    } else if (status === "deactivated") {
      items = [{ label: "Switch back on", onSelect: () => { void runAction(() => reactivateMember(id)); } }];
    } else {
      items = [
        role === "manager"
          ? { label: "Make member", onSelect: () => { void runAction(() => setMemberRole(id, "member")); } }
          : { label: "Make manager", onSelect: () => { void runAction(() => setMemberRole(id, "manager")); } },
        { label: "Switch off access", danger: true, onSelect: () => { void runAction(() => deactivateMember(id)); } },
      ];
    }
    openRowMenu(btn, items);
  };

  const wire = () => {
    root.querySelector(".js-invite")?.addEventListener("click", () => { void doInvite(); });
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
    root.querySelectorAll<HTMLButtonElement>(".js-member-menu").forEach((btn) => {
      btn.addEventListener("click", (e) => { e.stopPropagation(); openMemberMenu(btn); });
    });
  };

  const load = async () => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading members…</p></section>`);
    wire();
    let members: MemberRow[];
    try {
      const res = (await getMembers()) as { members?: MemberRow[] };
      members = Array.isArray(res.members) ? res.members : [];
    } catch {
      root.innerHTML = shell(errorCard);
      wire();
      return;
    }
    root.innerHTML = shell(members.length ? membersTable(members) : emptyCard);
    wire();
  };

  await load();
};

export const unmount: Unmount = () => { closeRowMenu(); };
