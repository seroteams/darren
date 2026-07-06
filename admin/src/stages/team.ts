// Team — the manager's roster (people-roster Phase 4). Now roster-driven: the page lists the
// real `people` rows, so someone added by name shows up before any 1:1 has happened, and run
// history (how often, how recently, how useful) joins in by personId for the people you've met.
// "Add someone" creates a bare roster person; each met person's card opens their page (PG5);
// a not-yet-met person offers "Prep first 1:1". "Tidy up" renames or merges people via the
// roster endpoints. Distinct from the admin Library (admin-only).

import { STAGES, store } from "../state.js";
import { listMyRuns, listPeople, createPerson, renamePersonV2, mergePeopleV2 } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { Star } from "lucide";
import { buildRosterView } from "../ui/group-people.js";
import { relTime } from "../ui/time.ts";
import type { Mount, Unmount } from "./stage.types.ts";

type Person = {
  key: string; // the roster personId
  name: string;
  role: string;
  count: number;
  openCount: number;
  lastMet: number;
  ratedCount: number;
  avgStars: number | null;
  met: boolean;
};

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

// The same person in "Tidy up" mode: a rename control and a "merge into…" picker of every
// OTHER person. Choosing a target merges immediately. Keyed on personId (the roster endpoints).
function personEditRow(p: Person, all: Person[]): string {
  const role = p.role ? `<span class="text-ink-dim"> · ${escapeHtml(p.role)}</span>` : "";
  const options = all
    .filter((o) => o.key !== p.key)
    .map((o) => `<option value="${escapeHtml(o.key)}">${escapeHtml(o.name)}</option>`)
    .join("");
  const mergeControl = options
    ? `<label class="text-sm text-ink-dim">Merge into
         <select class="input js-merge" data-key="${escapeHtml(p.key)}" data-name="${escapeHtml(p.name)}">
           <option value="">— choose —</option>${options}
         </select></label>`
    : "";
  return `
    <div class="card-flat l-stack l-stack--2">
      <div class="text-sm"><strong>${escapeHtml(p.name)}</strong>${role}</div>
      <div class="text-sm text-ink-dim">${metaLine(p)}</div>
      <div class="l-cluster l-cluster--2">
        <button type="button" class="btn btn--ghost btn--sm js-rename" data-key="${escapeHtml(p.key)}" data-name="${escapeHtml(p.name)}">Rename</button>
        ${mergeControl}
      </div>
    </div>`;
}

export const mount: Mount = async (root, { setState }) => {
  let people: Person[] = [];
  let editing = false;

  const header = (hasPeople: boolean) => `
    <header class="page-header">
      <div class="page-header__row">
        <h1 class="h1">Team</h1>
        <div class="l-cluster l-cluster--2">
          ${hasPeople ? `<button type="button" class="btn btn--ghost btn--sm js-edit">${editing ? "Done" : "Tidy up"}</button>` : ""}
          ${editing ? "" : `<button type="button" class="btn btn--ghost btn--sm js-add">Add someone</button>`}
        </div>
      </div>
      <div class="text-ink-dim text-sm">${editing ? "Merge duplicates or rename a person." : "Everyone on your team. Add a name now; their 1:1 history fills in as you meet."}</div>
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
      ? people.map((p) => personEditRow(p, people)).join("")
      : people.map(personCard).join("");
    root.innerHTML = shell(`<section class="l-stack l-stack--2">${body}</section>`);
    wire();
  };

  const wire = () => {
    root.querySelector(".js-start")?.addEventListener("click", () => startOneOnOne());
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
    root.querySelector(".js-add")?.addEventListener("click", () => { void doAdd(); });
    root.querySelector(".js-edit")?.addEventListener("click", () => { editing = !editing; renderPeople(); });
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
    root.querySelectorAll<HTMLSelectElement>(".js-merge").forEach((el) => {
      el.addEventListener("change", () => { void doMerge(el.dataset.key || "", el.dataset.name || "", el.value); });
    });
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

  const doMerge = async (fromId: string, fromName: string, intoId: string) => {
    if (!intoId) return;
    const target = people.find((p) => p.key === intoId);
    if (!window.confirm(`Merge "${fromName}" into "${target?.name ?? intoId}"? Their 1:1s and rating combine into one person.`)) {
      renderPeople(); // reset the select
      return;
    }
    try {
      await mergePeopleV2(fromId, intoId);
      await load();
    } catch {
      window.alert("Couldn't merge — please try again.");
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
