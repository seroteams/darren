// Team — the people the manager has met with, built automatically from their own past
// 1:1s (pre-go-live PG4). Grouped by person (normalized name), each card shows how often,
// how recently, and how useful on average. Each card is a button that opens that person's
// page (PG5). PG9 adds a "Tidy up" mode: rename a person, or merge two duplicate cards into
// one (their history + average combine). Distinct from the admin Library (admin-only).

import { STAGES, store } from "../state.js";
import { listMyRuns, getTeamAliases, mergePeople, renamePerson } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { groupRunsByPerson } from "../ui/group-people.js";
import { relTime } from "../ui/time.ts";
import type { Mount, Unmount } from "./stage.types.ts";

type Person = {
  key: string;
  name: string;
  role: string;
  count: number;
  lastMet: number;
  ratedCount: number;
  avgStars: number | null;
};
type Aliases = { merges: Record<string, string>; names: Record<string, string> };

// Local one-use time-ago (mirrors runs.ts) — four lines, so no shared util for one caller.
function metaLine(p: Person): string {
  const bits: string[] = [`${p.count} meeting${p.count > 1 ? "s" : ""}`];
  const last = relTime(p.lastMet);
  if (last) bits.push(`last ${last}`);
  bits.push(p.avgStars != null ? `★ ${p.avgStars.toFixed(1)} avg (${p.ratedCount} rated)` : "not yet rated");
  return escapeHtml(bits.join(" · "));
}

// A clickable card — a real <button>, so it's keyboard-operable for free — opening the
// person's page (PG5). The global :focus-visible rule supplies the focus ring.
function personCard(p: Person): string {
  const role = p.role ? `<span class="text-ink-dim"> · ${escapeHtml(p.role)}</span>` : "";
  return `<button type="button" class="card-flat runs-list__row js-person" data-key="${escapeHtml(p.key)}"><span class="l-stack l-stack--2"><span class="text-sm"><strong>${escapeHtml(p.name)}</strong>${role}</span><span class="text-sm text-ink-dim">${metaLine(p)}</span></span></button>`;
}

// The same person in "Tidy up" mode: not a nav button, but a card with a rename control and
// a "merge into…" picker listing every OTHER person. Choosing a target merges immediately.
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
  let aliases: Aliases = { merges: {}, names: {} };
  let people: Person[] = [];
  let editing = false;
  let runsCache: unknown[] = [];

  const header = (hasPeople: boolean) => `
    <header class="page-header">
      <div class="page-header__row">
        <h1 class="h1">Team</h1>
        ${hasPeople ? `<button type="button" class="btn btn--ghost btn--sm js-edit">${editing ? "Done" : "Tidy up"}</button>` : ""}
      </div>
      <div class="text-ink-dim text-sm">${editing ? "Merge duplicates or rename a person." : "The people you meet with, built from your 1:1s."}</div>
    </header>`;
  const shell = (inner: string, hasPeople = true) => `<div class="stage-inner l-stack l-stack--8">${header(hasPeople)}${inner}</div>`;

  const startOneOnOne = () => {
    store.scripted = null;
    Object.assign(store.ctx, { name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" });
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  };

  const emptyCard = `
    <section class="card-flat space-y-3">
      <div class="eyebrow">Your team will fill in here</div>
      <p class="text-sm text-ink-dim">As you run 1:1s, the people you meet with appear here with their history. Start your first one.</p>
      <button type="button" class="btn js-start">Prep a 1:1</button>
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
    root.querySelector(".js-start")?.addEventListener("click", startOneOnOne);
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
    root.querySelector(".js-edit")?.addEventListener("click", () => { editing = !editing; renderPeople(); });
    root.querySelectorAll<HTMLElement>(".js-person").forEach((el) => {
      el.addEventListener("click", () => {
        const key = el.dataset.key;
        if (key) setState({ personKey: key, stage: STAGES.PERSON_DETAIL });
      });
    });
    root.querySelectorAll<HTMLButtonElement>(".js-rename").forEach((el) => {
      el.addEventListener("click", () => { void doRename(el.dataset.key || "", el.dataset.name || ""); });
    });
    root.querySelectorAll<HTMLSelectElement>(".js-merge").forEach((el) => {
      el.addEventListener("change", () => { void doMerge(el.dataset.key || "", el.dataset.name || "", el.value); });
    });
  };

  const doRename = async (key: string, current: string) => {
    const next = window.prompt(`Rename this person (leave blank to reset to the auto name):`, current);
    if (next === null) return; // cancelled
    try {
      aliases = (await renamePerson(key, next.trim())) as Aliases;
      people = groupRunsByPerson(runsCache, aliases) as Person[];
      renderPeople();
    } catch {
      window.alert("Couldn't rename — please try again.");
    }
  };

  const doMerge = async (fromKey: string, fromName: string, intoKey: string) => {
    if (!intoKey) return;
    const target = people.find((p) => p.key === intoKey);
    if (!window.confirm(`Merge "${fromName}" into "${target?.name ?? intoKey}"? Their 1:1s and rating combine into one person.`)) {
      renderPeople(); // reset the select
      return;
    }
    try {
      aliases = (await mergePeople(fromKey, intoKey)) as Aliases;
      people = groupRunsByPerson(runsCache, aliases) as Person[];
      renderPeople();
    } catch {
      window.alert("Couldn't merge — please try again.");
    }
  };

  const load = async () => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading your team…</p></section>`, false);
    try {
      const [runsRes, aliasRes] = await Promise.all([listMyRuns(), getTeamAliases().catch(() => ({}))]);
      runsCache = Array.isArray(runsRes?.runs) ? runsRes.runs : [];
      const a = aliasRes as Partial<Aliases>;
      aliases = { merges: a?.merges || {}, names: a?.names || {} };
    } catch {
      root.innerHTML = shell(errorCard, false);
      wire();
      return;
    }
    people = groupRunsByPerson(runsCache, aliases) as Person[];
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
