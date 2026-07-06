// Team — the manager's roster (people-roster Phase 4). Now roster-driven: the page lists the
// real `people` rows, so someone added by name shows up before any 1:1 has happened, and run
// history (how often, how recently, how useful) joins in by personId for the people you've met.
// "Add someone" creates a bare roster person; each met person's card opens their page (PG5);
// a not-yet-met person offers "Prep first 1:1". "Tidy up" renames or merges people via the
// roster endpoints. Distinct from the admin Library (admin-only).

import { STAGES, store } from "../state.js";
import { listMyRuns, listPeople, createPerson, renamePersonV2, getLinkableUsers, linkPerson, unlinkPerson, invitePerson } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { Star } from "lucide";
import { buildRosterView } from "../ui/group-people.js";
import { relTime } from "../ui/time.ts";
import type { Mount, Unmount } from "./stage.types.ts";

type Person = {
  key: string; // the roster personId
  name: string;
  userId: string | null; // linked member account (Phase 5)
  role: string;
  count: number;
  openCount: number;
  lastMet: number;
  ratedCount: number;
  avgStars: number | null;
  met: boolean;
};
type OrgUser = { id: string; name: string; email: string };

// The meta line under a name. A never-touched roster person reads "not met yet"; one with only
// an open prep says so; a met person shows meetings / last / average.
function metaLine(p: Person): string {
  if (p.count === 0) return escapeHtml(p.openCount > 0 ? "1:1 prep in progress · not met yet" : "not met yet");
  const bits: string[] = [`${p.count} meeting${p.count > 1 ? "s" : ""}`];
  const last = relTime(p.lastMet);
  if (last) bits.push(`last ${last}`);
  if (p.openCount > 0) bits.push("prep in progress");
  const rated =
    p.avgStars != null
      ? `${icon(Star, { size: 16, fill: "currentColor" })} ${escapeHtml(p.avgStars.toFixed(1))} avg (${p.ratedCount} rated)`
      : "not yet rated";
  return `${escapeHtml(bits.join(" · "))} · ${rated}`;
}

// A met person is a clickable card opening their page (PG5). A not-yet-met person has no page
// yet, so their card carries a "Prep first 1:1" button instead of being a nav button.
function personCard(p: Person): string {
  const role = p.role ? `<span class="text-ink-dim"> · ${escapeHtml(p.role)}</span>` : "";
  const inner = `<span class="l-stack l-stack--2"><span class="text-sm"><strong>${escapeHtml(p.name)}</strong>${role}</span><span class="text-sm text-ink-dim">${metaLine(p)}</span></span>`;
  if (p.met) return `<button type="button" class="card-flat runs-list__row js-person" data-key="${escapeHtml(p.key)}">${inner}</button>`;
  return `
    <div class="card-flat runs-list__row l-cluster" style="justify-content:space-between;align-items:center;">
      ${inner}
      <button type="button" class="btn btn--ghost btn--sm js-prep-new" data-key="${escapeHtml(p.key)}" data-name="${escapeHtml(p.name)}" data-role="${escapeHtml(p.role)}">Prep first 1:1</button>
    </div>`;
}

// The same person in "Tidy up" mode: a rename control plus the "Linked account" picker
// (people-roster Phase 5) — link this person to one of the company's login accounts so
// they can see the 1:1s about them (list-only: dates + types, never notes). Keyed on
// personId (roster endpoints). Merge is intentionally NOT here yet — see the note in the
// plan's Parked section: merging two roster rows leaves the merged person's past runs
// pointing at the old personId, so their history wouldn't fold under the target (and
// would resurface as a straggler). It returns once run.personId resolves through the
// merge chain (or runs are re-pointed on merge).
function personEditRow(p: Person, orgUsers: OrgUser[]): string {
  const role = p.role ? `<span class="text-ink-dim"> · ${escapeHtml(p.role)}</span>` : "";
  const options = orgUsers
    .map((u) => `<option value="${escapeHtml(u.id)}" ${u.id === p.userId ? "selected" : ""}>${escapeHtml(u.name)} (${escapeHtml(u.email)})</option>`)
    .join("");
  const linkControl = orgUsers.length
    ? `<label class="text-sm text-ink-dim l-stack l-stack--1">Linked account
         <select class="input js-link" data-key="${escapeHtml(p.key)}" data-name="${escapeHtml(p.name)}">
           <option value="" ${p.userId ? "" : "selected"}>— none —</option>${options}
         </select></label>`
    : "";
  // Inviting only makes sense for someone not yet linked to an account.
  const inviteControl = p.userId
    ? ""
    : `<button type="button" class="btn btn--ghost btn--sm js-invite" data-key="${escapeHtml(p.key)}" data-name="${escapeHtml(p.name)}">Invite…</button>`;
  return `
    <div class="card-flat l-stack l-stack--2">
      <div class="text-sm"><strong>${escapeHtml(p.name)}</strong>${role}</div>
      <div class="text-sm text-ink-dim">${metaLine(p)}</div>
      <div class="l-cluster l-cluster--2">
        <button type="button" class="btn btn--ghost btn--sm js-rename" data-key="${escapeHtml(p.key)}" data-name="${escapeHtml(p.name)}">Rename</button>
        ${inviteControl}
      </div>
      ${linkControl}
    </div>`;
}

export const mount: Mount = async (root, { setState }) => {
  let people: Person[] = [];
  let editing = false;
  let orgUsers: OrgUser[] = []; // link-picker options, fetched once on first Tidy up

  const header = (hasPeople: boolean) => `
    <header class="page-header">
      <div class="page-header__row">
        <h1 class="h1">Team</h1>
        <div class="l-cluster l-cluster--2">
          ${hasPeople ? `<button type="button" class="btn btn--ghost btn--sm js-edit">${editing ? "Done" : "Tidy up"}</button>` : ""}
          ${editing ? "" : `<button type="button" class="btn btn--ghost btn--sm js-add">Add someone</button>`}
        </div>
      </div>
      <div class="text-ink-dim text-sm">${editing ? "Rename a person." : "Everyone on your team. Add a name now; their 1:1 history fills in as you meet."}</div>
    </header>`;
  const shell = (inner: string, hasPeople = true) => `<div class="stage-inner l-stack l-stack--8">${header(hasPeople)}${inner}</div>`;

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
      <p class="text-sm text-ink-dim">Add the people you manage — even before your first 1:1. Their history fills in as you prep and meet.</p>
      <div class="l-cluster l-cluster--2">
        <button type="button" class="btn js-add">Add someone</button>
        <button type="button" class="btn btn--ghost js-start">Prep a 1:1</button>
      </div>
    </section>`;
  const errorCard = `
    <section class="card-flat space-y-3">
      <div class="eyebrow">Couldn't load your team</div>
      <p class="text-sm text-ink-dim">Something went wrong. Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`;

  const renderPeople = () => {
    const body = editing
      ? people.map((p) => personEditRow(p, orgUsers)).join("")
      : people.map(personCard).join("");
    root.innerHTML = shell(`<section class="l-stack l-stack--2">${body}</section>`);
    wire();
  };

  // Entering Tidy up fetches the link-picker options once; a failure just means no
  // picker this visit (rename still works) — the page never blocks on it.
  const enterEdit = async () => {
    editing = !editing;
    if (editing && orgUsers.length === 0) {
      try {
        const res = (await getLinkableUsers()) as { users?: OrgUser[] };
        orgUsers = Array.isArray(res.users) ? res.users : [];
      } catch { orgUsers = []; }
    }
    renderPeople();
  };

  const wire = () => {
    root.querySelector(".js-start")?.addEventListener("click", () => startOneOnOne());
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
    root.querySelector(".js-add")?.addEventListener("click", () => { void doAdd(); });
    root.querySelector(".js-edit")?.addEventListener("click", () => { void enterEdit(); });
    root.querySelectorAll<HTMLElement>(".js-person").forEach((el) => {
      el.addEventListener("click", () => {
        const key = el.dataset.key;
        if (key) setState({ personKey: key, stage: STAGES.PERSON_DETAIL });
      });
    });
    root.querySelectorAll<HTMLButtonElement>(".js-prep-new").forEach((el) => {
      el.addEventListener("click", () =>
        startOneOnOne({ personId: el.dataset.key, name: el.dataset.name, role: el.dataset.role }),
      );
    });
    root.querySelectorAll<HTMLButtonElement>(".js-rename").forEach((el) => {
      el.addEventListener("click", () => { void doRename(el.dataset.key || "", el.dataset.name || ""); });
    });
    root.querySelectorAll<HTMLSelectElement>(".js-link").forEach((el) => {
      el.addEventListener("change", () => { void doLink(el.dataset.key || "", el.dataset.name || "", el.value); });
    });
    root.querySelectorAll<HTMLButtonElement>(".js-invite").forEach((el) => {
      el.addEventListener("click", () => { void doInvite(el.dataset.key || "", el.dataset.name || ""); });
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

  // Link (or unlink, on "— none —") a person to a company login account. The linked member
  // sees the 1:1s about them — list-only (dates + meeting types), never the notes.
  const doLink = async (personId: string, personName: string, targetUserId: string) => {
    const target = orgUsers.find((u) => u.id === targetUserId);
    const msg = target
      ? `Link "${personName}" to ${target.name} (${target.email})? They'll see the list of 1:1s about them — dates and meeting types, never your notes.`
      : `Unlink "${personName}" from their account? They'll stop seeing the 1:1s about them.`;
    if (!window.confirm(msg)) { renderPeople(); return; }
    try {
      if (target) await linkPerson(personId, targetUserId);
      else await unlinkPerson(personId);
      await load(); // re-renders in the current (Tidy up) mode with the fresh link
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Couldn't update the link — please try again.");
      renderPeople();
    }
  };

  const doAdd = async () => {
    const name = window.prompt("Add someone to your team — their name:", "");
    if (name === null) return; // cancelled
    if (!name.trim()) return;
    try {
      await createPerson({ name: name.trim() });
      await load();
    } catch {
      window.alert("Couldn't add them — please try again.");
    }
  };

  const doRename = async (id: string, current: string) => {
    const next = window.prompt(`Rename this person:`, current);
    if (next === null || !next.trim()) return; // cancelled or blank (a roster name can't be empty)
    try {
      await renamePersonV2(id, next.trim());
      await load();
    } catch {
      window.alert("Couldn't rename — please try again.");
    }
  };

  const load = async () => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading your team…</p></section>`, false);
    let roster: { id: string; name: string; role: string | null }[];
    let runs: unknown[];
    try {
      const [peopleRes, runsRes] = await Promise.all([listPeople(), listMyRuns({ open: true })]);
      const pr = peopleRes as { people?: { id: string; name: string; role: string | null }[] };
      const rr = runsRes as { runs?: unknown[] };
      roster = Array.isArray(pr.people) ? pr.people : [];
      runs = Array.isArray(rr.runs) ? rr.runs : [];
    } catch {
      root.innerHTML = shell(errorCard, false);
      wire();
      return;
    }
    people = buildRosterView(roster, runs) as Person[];
    if (people.length === 0) {
      editing = false;
      root.innerHTML = shell(emptyCard, false);
      wire();
      return;
    }
    renderPeople();
  };

  await load();
};

export const unmount: Unmount = () => {};
