// Team — the manager's roster (people-roster Phase 4). Now roster-driven: the page lists the
// real `people` rows, so someone added by name shows up before any 1:1 has happened, and run
// history (how often, how recently, how useful) joins in by personId for the people you've met.
// "Add someone" creates a bare roster person; each met person's card opens their page (PG5);
// a not-yet-met person offers "Prep first 1:1". Each card also shows account access — whether this
// person can log in and see their own 1:1s (list-only: dates + meeting types, never the notes) —
// with one control to give or change it. Distinct from the admin Library (admin-only).
//
// The pure card render lives in ./team-card.ts (DOM-free, unit-tested); this file owns the mount,
// data loading and the click wiring.

import { STAGES, store } from "../../../admin/src/state.js";
import { listMyRuns, listPeople, createPerson, updatePerson, deletePerson, getLinkableUsers, linkPerson, unlinkPerson, invitePerson } from "../../../shared/api.js";
import { showAddPersonModal } from "../../../admin/src/ui/add-person-modal.ts";
import { showDeletePersonModal } from "../../../admin/src/ui/delete-person-modal.ts";
import { openRowMenu, type RowMenuItem } from "../../../admin/src/ui/row-menu.ts";
import { buildRosterView } from "../../../admin/src/ui/group-people.js";
import { personCard, type Person, type OrgUser } from "./team-card.ts";
import type { Mount, Unmount } from "../../../admin/src/stages/stage.types.ts";

export const mount: Mount = async (root, { setState }) => {
  let people: Person[] = [];
  let orgUsers: OrgUser[] = []; // link-picker options, fetched with the roster
  // Raw roster rows keyed by personId — carries seniority (which buildRosterView drops)
  // so the Edit modal can pre-fill every field.
  let rosterById = new Map<string, { name: string; role: string; seniority: string }>();

  const header = () => `
    <header class="page-header">
      <div class="page-header__row">
        <h1 class="h1">Team</h1>
        <div class="l-cluster l-cluster--2">
          <button type="button" class="btn btn--ghost btn--sm js-add">Add someone</button>
        </div>
      </div>
      <div class="text-ink-dim">Everyone on your team. Add a name now; their 1:1 history fills in as you meet.</div>
    </header>`;
  const shell = (inner: string) => `<div class="stage-inner l-stack l-stack--8">${header()}${inner}</div>`;

  const startOneOnOne = (seed: { personId?: string; name?: string; role?: string } = {}) => {
    store.scripted = null;
    Object.assign(store.ctx, {
      personId: seed.personId ?? null,
      name: seed.name ?? "",
      role: seed.role ?? "",
      seniority: "",
      meetingType: "",
      meetingTypeIndex: null,
      notes: "",
    });
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  };

  const emptyCard = `
    <section class="card-flat space-y-3">
      <div class="eyebrow">Your team starts here</div>
      <p class="text-ink-dim">Add the people you manage — even before your first 1:1. Their history fills in as you prep and meet.</p>
      <div class="l-cluster l-cluster--2">
        <button type="button" class="btn js-add">Add someone</button>
        <button type="button" class="btn btn--ghost js-start">Prep a 1:1</button>
      </div>
    </section>`;
  const errorCard = `
    <section class="card-flat space-y-3">
      <div class="eyebrow">Couldn't load your team</div>
      <p class="text-ink-dim">Something went wrong. Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`;

  const renderPeople = () => {
    const body = people.map((p) => personCard(p, orgUsers)).join("");
    root.innerHTML = shell(`<section class="l-stack l-stack--2">${body}</section>`);
    wire();
  };

  const wire = () => {
    root.querySelector(".js-start")?.addEventListener("click", () => startOneOnOne());
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
    // The empty state shows two "Add someone" buttons (header + card), so wire them all —
    // querySelector alone left the card's button dead.
    root.querySelectorAll<HTMLButtonElement>(".js-add").forEach((el) =>
      el.addEventListener("click", () => { void doAdd(); }),
    );
    root.querySelectorAll<HTMLButtonElement>(".js-prep-new").forEach((el) => {
      el.addEventListener("click", () =>
        startOneOnOne({ personId: el.dataset.key, name: el.dataset.name, role: el.dataset.role }),
      );
    });
    // The card's ⋯ opens View / Edit / Delete (Delete flagged destructive).
    root.querySelectorAll<HTMLButtonElement>(".js-row-menu").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const key = el.dataset.key || "";
        const name = el.dataset.name || "";
        openRowMenu(el, [
          { label: "View", onSelect: () => { if (key) setState({ personKey: key, stage: STAGES.PERSON_DETAIL }); } },
          { label: "Edit", onSelect: () => { void doEdit(key); } },
          { label: "Delete", danger: true, onSelect: () => { void doDelete(key, name); } },
        ]);
      });
    });
    // The card's access button: give access (invite by email or link an existing account) for an
    // unlinked person, or change/remove it for a linked one. (Phase 2 folds these into one sheet.)
    root.querySelectorAll<HTMLButtonElement>(".js-access").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const key = el.dataset.key || "";
        const name = el.dataset.name || "";
        const currentUserId = el.dataset.userid || "";
        const linked = el.dataset.linked === "1";
        const items: RowMenuItem[] = linked
          ? [
              ...orgUsers
                .filter((u) => u.id !== currentUserId)
                .map((u) => ({ label: `Switch to ${u.name}`, onSelect: () => { void doLink(key, name, u.id); } })),
              { label: "Remove access", danger: true, onSelect: () => { void doLink(key, name, ""); } },
            ]
          : [
              { label: "Invite by email…", onSelect: () => { void doInvite(key, name); } },
              ...orgUsers.map((u) => ({ label: `Link to ${u.name}`, onSelect: () => { void doLink(key, name, u.id); } })),
            ];
        openRowMenu(el, items);
      });
    });
  };

  // Invite a person by email → a one-time join link the manager sends themselves (no email
  // infra in the alpha). The link is shown in a prompt so it's selectable/copyable; it's
  // single-use and expires in 7 days. Accepting it creates their account AND links them.
  const doInvite = async (personId: string, personName: string) => {
    const email = window.prompt(`Invite ${personName} — their email address:`, "");
    if (email === null || !email.trim()) return;
    try {
      const res = (await invitePerson(personId, email.trim())) as { link: string };
      window.prompt(
        `Send ${personName} this link (valid 7 days, works once). They'll set a password and see their own 1:1 history — never your notes:`,
        `${window.location.origin}${res.link}`,
      );
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Couldn't create the invite — please try again.");
    }
  };

  // Link (or unlink, on an empty target) a person to a company login account. The linked member
  // sees the 1:1s about them — list-only (dates + meeting types), never the notes.
  const doLink = async (personId: string, personName: string, targetUserId: string) => {
    const target = orgUsers.find((u) => u.id === targetUserId);
    const msg = target
      ? `Link "${personName}" to ${target.name} (${target.email})? They'll see the list of 1:1s about them — dates and meeting types, never your notes.`
      : `Remove "${personName}"'s access? They'll stop seeing the 1:1s about them.`;
    if (!window.confirm(msg)) { renderPeople(); return; }
    try {
      if (target) await linkPerson(personId, targetUserId);
      else await unlinkPerson(personId);
      await load(); // re-renders with the fresh link
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Couldn't update the link — please try again.");
      renderPeople();
    }
  };

  const doAdd = async () => {
    const draft = await showAddPersonModal();
    if (!draft) return; // cancelled
    try {
      await createPerson({ name: draft.name, role: draft.role, seniority: draft.seniority });
      await load();
    } catch {
      window.alert("Couldn't add them — please try again.");
    }
  };

  // Edit reuses the add modal, pre-filled with the person's current details (name/job/
  // seniority come from the raw roster row, kept in rosterById since buildRosterView
  // doesn't thread seniority through). Saving PATCHes all three.
  const doEdit = async (id: string) => {
    const current = rosterById.get(id);
    if (!current) return;
    const draft = await showAddPersonModal({
      title: "Edit team member",
      sub: "Update their details.",
      submitLabel: "Save",
      initial: { name: current.name, role: current.role, seniority: current.seniority },
    });
    if (!draft) return; // cancelled
    try {
      await updatePerson(id, { name: draft.name, role: draft.role, seniority: draft.seniority });
      await load();
    } catch {
      window.alert("Couldn't save the changes — please try again.");
    }
  };

  // Delete is a HARD wipe (person + every 1:1 about them, server-side). Gated behind the
  // type-the-name confirm so it can't happen by a stray click.
  const doDelete = async (id: string, name: string) => {
    const confirmed = await showDeletePersonModal(name);
    if (!confirmed) return;
    try {
      await deletePerson(id);
      await load();
    } catch {
      window.alert("Couldn't delete them — please try again.");
    }
  };

  const load = async () => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading your team…</p></section>`);
    let roster: { id: string; name: string; role: string | null; seniority?: string | null }[];
    let runs: unknown[];
    try {
      // Link options load alongside the roster; a failure there degrades to invite-only, never
      // breaks the page (hence the inner .catch).
      const [peopleRes, runsRes, usersRes] = await Promise.all([
        listPeople(),
        listMyRuns({ open: true }),
        getLinkableUsers().catch(() => ({ users: [] as OrgUser[] })),
      ]);
      const pr = peopleRes as { people?: { id: string; name: string; role: string | null; seniority?: string | null }[] };
      const rr = runsRes as { runs?: unknown[] };
      const ur = usersRes as { users?: OrgUser[] };
      roster = Array.isArray(pr.people) ? pr.people : [];
      runs = Array.isArray(rr.runs) ? rr.runs : [];
      orgUsers = Array.isArray(ur.users) ? ur.users : [];
    } catch {
      root.innerHTML = shell(errorCard);
      wire();
      return;
    }
    rosterById = new Map(
      roster.map((r) => [r.id, { name: r.name, role: r.role ?? "", seniority: r.seniority ?? "" }]),
    );
    people = buildRosterView(roster, runs) as Person[];
    if (people.length === 0) {
      root.innerHTML = shell(emptyCard);
      wire();
      return;
    }
    renderPeople();
  };

  await load();
};

export const unmount: Unmount = () => {};
