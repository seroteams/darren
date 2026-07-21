// Run detail — a member re-reads ONE of their own past 1:1s, read-only.
// Wired to /api/v1/runs/mine/:id, fenced server-side by company AND user (a run you don't
// own → 404). Three tabs so a manager sees what happened, when, and with whom:
//   Overview — who + when + the one-line read + how useful was it (rating)
//   Briefing — the field set the manager saw at the end of the meeting
//   Answers  — the raw questions and how they were answered (the material behind the briefing)

import { STAGES, store, isAdmin } from "../state.js";
import { getMyRun, rateMyRun } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { createStarRating } from "../ui/star-rating.js";
import { breadcrumb } from "../ui/breadcrumb.ts";
import { recapHeader } from "../ui/recap-header.ts";
import { renderReadonlyBriefing, type Briefing, type PromiseRow } from "../ui/briefing-view.ts";
import { formatDate, relTime } from "../ui/time.ts";
import { icon } from "../ui/icon.js";
import { Check, Calendar, Clock, MessageSquare } from "lucide";
import type { Mount, Unmount } from "./stage.types.ts";

export type TurnRead = "skip" | "decline" | "thin" | "note";
export type Turn = { alias: string | null; name: string | null; answer: string | null; skipped: boolean; read?: TurnRead | null };
export type RunDetail = {
  id: string;
  headline: string;
  ctx: { name: string; role: string; seniority: string; meetingType: string };
  briefing: Briefing | null;
  turns?: Turn[];
  lastSeenAt: number;
  completedAt: number | null;
  rating: { stars: number; note: string; updatedAt: string | null } | null;
  promises?: PromiseRow[] | null; // Promises loop phase 3 — the wrap-up agreements + outcomes
};

// The "when it happened" row — date · how long ago · questions answered. The profile
// identity (avatar + name + role + meeting badge) now lives in the shared recap header
// above the tabs (ui/recap-header.ts), so it's persistent, not Overview-only.
function renderWhen(run: RunDetail): string {
  const when = run.completedAt || run.lastSeenAt || 0;
  const answered = (run.turns || []).filter((t) => !t.skipped).length;
  const whenBits: string[] = [];
  if (when) {
    whenBits.push(`<span>${icon(Calendar, { size: 15 })} ${escapeHtml(formatDate(when))}</span>`);
    whenBits.push(`<span>${icon(Clock, { size: 15 })} ${escapeHtml(relTime(when))}</span>`);
  }
  whenBits.push(`<span>${icon(MessageSquare, { size: 15 })} ${answered} question${answered === 1 ? "" : "s"} answered</span>`);
  return `<div class="rd-when">${whenBits.join("")}</div>`;
}

// The "how useful was this?" star rating. A radiogroup of five star buttons —
// keyboard-operable, labelled — pre-filled from the run's saved rating. A low score
// (<=2) reveals the optional "what missed?" note, saved via an explicit Save button.
function renderRating(run: RunDetail): string {
  const stars = run.rating?.stars ?? 0;
  const note = run.rating?.note ?? "";
  return `<section class="card-flat space-y-3 js-rating">
      <div class="eyebrow">Did this help you run the 1:1?</div>
      <div class="js-stars-mount"></div>
      <div class="star-rating__note l-stack l-stack--2" ${stars && stars <= 2 ? "" : "hidden"}>
        <label class="text-sm text-ink-dim" for="rating-note">What did it miss? (optional)</label>
        <textarea id="rating-note" class="input" rows="2">${escapeHtml(note)}</textarea>
        <div><button type="button" class="btn btn--sm js-note-save">Save note</button></div>
      </div>
      <div class="text-sm text-ink-mute js-rating-status" role="status" aria-live="polite"></div>
    </section>`;
}

// Overview tab — who + when, the briefing's one-line read (if any), then the rating.
function renderOverview(run: RunDetail): string {
  const lead = run.briefing?.headline
    ? `<section class="card-flat space-y-2"><div class="eyebrow">In a line</div><p class="rd-digest">${escapeHtml(run.briefing.headline)}</p></section>`
    : "";
  return `<div class="l-stack l-stack--4">${renderWhen(run)}${lead}${renderRating(run)}</div>`;
}

// How each read-quality tag shows on the Answers tab: a scannable chip so a
// manager can see at a glance which questions landed. Reuses the base .chip set.
const READ_CHIP: Record<TurnRead, { label: string; cls: string }> = {
  note: { label: "Good note", cls: "chip--mint" },
  thin: { label: "Thin", cls: "chip--gold" },
  skip: { label: "Skipped", cls: "chip--plain" },
  decline: { label: "Declined", cls: "chip--coral" },
};

function readChip(read: Turn["read"]): string {
  const c = read ? READ_CHIP[read] : null;
  if (!c) return "";
  return `<span class="chip ${c.cls} rd-turn__read">${c.label}</span>`;
}

// Answers tab — the questions asked and how they were answered. Skipped turns are dimmed.
function renderAnswers(run: RunDetail): string {
  const turns = run.turns || [];
  if (!turns.length) {
    return `<section class="card-flat"><p class="text-sm text-ink-dim">No answers were captured in this 1:1.</p></section>`;
  }
  const rows = turns
    .map((t) => {
      const q = escapeHtml(t.name || "Question");
      const body = t.skipped
        ? `<p class="rd-turn__a text-ink-mute"><em>Skipped</em></p>`
        : `<p class="rd-turn__a">${escapeHtml(t.answer || "")}</p>`;
      return `<div class="rd-turn${t.skipped ? " rd-turn--skipped" : ""}"><div class="rd-turn__q"><span>${q}</span>${readChip(t.read)}</div>${body}</div>`;
    })
    .join("");
  const answerer = run.ctx?.name
    ? `The questions you asked, and ${escapeHtml(run.ctx.name)}'s answers.`
    : "The questions you asked, and their answers.";
  return `<section class="card-flat space-y-3">
      <p class="text-sm text-ink-dim">${answerer}</p>
      <div>${rows}</div>
    </section>`;
}

// The whole detail body: the three tabs + their panes. Pure (string in, string out)
// so it can be unit-tested without a DOM or the network.
export function renderRunDetail(run: RunDetail): string {
  return `
    <div class="ds-tabs" role="tablist">
      <button type="button" class="ds-tab is-active" role="tab" aria-selected="true" data-tab="overview">Overview</button>
      <button type="button" class="ds-tab" role="tab" aria-selected="false" data-tab="briefing">Recap</button>
      <button type="button" class="ds-tab" role="tab" aria-selected="false" data-tab="answers">Answers</button>
    </div>
    <div class="js-pane" data-pane="overview">${renderOverview(run)}</div>
    <div class="js-pane" data-pane="briefing" hidden><div class="l-stack l-stack--4">${renderReadonlyBriefing(run.briefing, run.ctx?.name, run.promises)}</div></div>
    <div class="js-pane" data-pane="answers" hidden>${renderAnswers(run)}</div>`;
}

function wireRating(root: HTMLElement, run: RunDetail): void {
  const mount = root.querySelector<HTMLElement>(".js-stars-mount");
  if (!mount) return;
  const noteWrap = root.querySelector<HTMLElement>(".star-rating__note");
  const noteEl = root.querySelector<HTMLTextAreaElement>("#rating-note");
  const status = root.querySelector<HTMLElement>(".js-rating-status");
  let stars = run.rating?.stars ?? 0;

  const save = async () => {
    if (!stars) return;
    try {
      await rateMyRun(run.id, { stars, note: noteEl?.value ?? "" });
      if (status) status.innerHTML = "Saved " + icon(Check, { size: 16 });
    } catch {
      if (status) status.textContent = "Couldn't save. Please try again.";
    }
  };
  const rating = createStarRating({
    initialStars: stars,
    onChange: (s: number) => {
      stars = s;
      if (noteWrap) noteWrap.hidden = !(s && s <= 2);
      void save();
    },
  });
  mount.appendChild(rating.el);

  noteEl?.addEventListener("input", () => {
    if (status) status.textContent = "Press Save to keep your note.";
  });
  root.querySelector<HTMLButtonElement>(".js-note-save")?.addEventListener("click", () => void save());
}

// Click a tab → show its pane, mark it active. Same idiom as notes-panel.js switchTab.
function wireTabs(root: HTMLElement): void {
  const tabsEl = root.querySelector<HTMLElement>(".ds-tabs");
  if (!tabsEl) return;
  const panes = Array.from(root.querySelectorAll<HTMLElement>(".js-pane"));
  tabsEl.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(".ds-tab");
    if (!btn) return;
    const tab = btn.dataset.tab;
    panes.forEach((p) => {
      p.hidden = p.dataset.pane !== tab;
    });
    tabsEl.querySelectorAll<HTMLElement>(".ds-tab").forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
  });
}

export const mount: Mount = async (root, { setState }) => {
  // Back to the user's own 1:1s list — RUNS for a manager, MEMBER_HOME for a member.
  // STAGES.RUNS is manager-only, so a member used to bounce through the gate; route by
  // role instead (mirrors main.js's own-runs fallback).
  const toList = () => setState({ myRunId: null, stage: isAdmin(store.user) ? STAGES.RUNS : STAGES.MEMBER_HOME });

  const frame = (headerHtml: string, inner: string) =>
    `<div class="stage-inner l-stack l-stack--8">${headerHtml}<div class="l-stack l-stack--4">${inner}</div></div>`;
  // Before the run loads (and on error) there's no context to name — show the trail alone.
  const crumbHeader = `<header class="page-header l-stack l-stack--2">${breadcrumb([{ label: "Your 1:1s", nav: "list" }, { label: "1:1" }])}</header>`;

  const notice = (eyebrow: string, msg: string) =>
    `<section class="card-flat space-y-3"><div class="eyebrow">${escapeHtml(eyebrow)}</div><p class="text-ink-dim">${escapeHtml(msg)}</p></section>`;

  // The breadcrumb's "Your 1:1s" crumb → back to the list. Re-run after each repaint.
  const wireCrumbs = () => {
    root.querySelectorAll<HTMLButtonElement>(".js-crumb").forEach((c) => {
      c.addEventListener("click", () => { if (c.dataset.nav === "list") toList(); });
    });
  };

  const id = store.myRunId;
  root.innerHTML = frame(crumbHeader, `<p class="text-sm text-ink-dim">Loading your 1:1…</p>`);
  wireCrumbs();

  if (!id) {
    root.innerHTML = frame(crumbHeader, notice("No 1:1 selected", "Pick one from your 1:1s list."));
    wireCrumbs();
    return;
  }

  let run: RunDetail;
  try {
    run = (await getMyRun(id)) as RunDetail;
  } catch {
    root.innerHTML = frame(crumbHeader, notice("Couldn't open this 1:1", "It may not be one of yours, or something went wrong. Try again from your 1:1s list."));
    wireCrumbs();
    return;
  }

  root.innerHTML = frame(recapHeader(run.ctx, [{ label: "Your 1:1s", nav: "list" }]), renderRunDetail(run));
  wireCrumbs();
  wireTabs(root);
  wireRating(root, run);
};

export const unmount: Unmount = () => {};
