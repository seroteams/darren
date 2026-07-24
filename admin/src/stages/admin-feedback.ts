// Feedback inbox — the superadmin's cross-company view of every note testers send via
// the Send-feedback form (feedback-inbox). Wired to GET /api/v1/admin/feedback, gated by
// requireSuperadminRoute: only the allowlisted superadmin (Carl) gets a 200; the nav item
// is hidden for everyone else, but that hiding is cosmetic — the 403 is the real wall.
//
// Design-consolidation Phase 6 (audit D12): the inbox works like an inbox now. Filter tabs
// (New / Done / Archived / All) with done + archive actions; each note is a collapsed
// two-line card that expands on click; a note tied to a 1:1 links through to that run's
// read-only briefing (the same recap components the user drilldown uses, reached the same
// way: stash the run id + bump stageTick so the router re-mounts this stage); delete lives
// behind the shared ⋯ row menu and confirms via the shared dialog — no window.confirm.
// The backend only stores and deletes notes, so done/archived live client-side
// (localStorage) — they're Carl's personal triage marks, not shared data.

import "../styles/feedback-inbox.css";
import "../styles/pulse-drilldowns.css";
import { STAGES, store } from "../state.js";
import { pulseCrumbs } from "../ui/pulse-labels.ts";
import { openRowMenu, closeRowMenu, type RowMenuItem } from "../ui/row-menu.ts";
import { confirmAction as confirmJs, alertAction as alertJs } from "../ui/confirm.js";
import { getFeedbackInbox, deleteFeedbackNote, getAdminRun } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { relTime } from "../ui/time.ts";
import { icon } from "../ui/icon.js";
import { Mail, MessageSquare, ClipboardCheck, MoreHorizontal } from "lucide";
import { noteKind, FEEDBACK_KINDS } from "../ui/feedback-kinds.ts";
import type { FeedbackKind } from "../ui/feedback-kinds.ts";
import { recapHeader } from "../ui/recap-header.ts";
import { breadcrumb } from "../ui/breadcrumb.ts";
import { renderReadonlyBriefing, type Briefing } from "../ui/briefing-view.ts";
import type { Mount, Unmount } from "./stage.types.ts";

const confirmAction = confirmJs as unknown as (opts: {
  message: string; confirmLabel?: string; cancelLabel?: string; destructive?: boolean;
}) => Promise<boolean>;
const alertAction = alertJs as unknown as (opts: { message: string; confirmLabel?: string }) => Promise<void>;

// Resolve the kind map's icon names to the lucide components this stage bundles.
const KIND_ICONS: Record<FeedbackKind, object> = { note: MessageSquare, verdict: ClipboardCheck };

type FeedbackNote = {
  id: string;
  email: string | null;
  userName: string | null;
  company: string | null;
  page: string | null;
  message: string;
  runId?: string | null;
  verdict?: string | null;
  createdAt: string;
};

type NoteStatus = "done" | "archived";

// Carl's triage marks, client-side only (the API has no status field): note id → status.
// Absent = new. Kept in localStorage so they survive reloads on his machine.
const STATUS_KEY = "seroFeedbackStatus";
function loadStatuses(): Record<string, NoteStatus> {
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, NoteStatus>) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch { return {}; }
}
function saveStatuses(statuses: Record<string, NoteStatus>): void {
  try { localStorage.setItem(STATUS_KEY, JSON.stringify(statuses)); } catch { /* private mode etc. */ }
}

function whenText(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? relTime(ms) : "";
}
function exactWhen(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms).toLocaleString() : iso;
}
function displayName(note: FeedbackNote): string {
  return note.userName || note.email || "Unknown";
}
// First letter of the name (or email) for the initials avatar. "?" when we have nothing.
function initialOf(note: FeedbackNote): string {
  const src = note.userName || note.email || "";
  const ch = src.trim().charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

// A briefing-verdict source is a 1:1 (short run id, full id on hover); a plain note
// carries the screen it came from. Returns "" when there's neither, so no empty pill.
function sourcePill(note: FeedbackNote): string {
  if (note.runId)
    return `<span class="fb-pill fb-pill--src" title="${escapeHtml(note.runId)}">1:1 ${escapeHtml(note.runId.slice(0, 8))}…</span>`;
  return note.page ? `<span class="fb-pill fb-pill--src">${escapeHtml(note.page)}</span>` : "";
}
function verdictPill(note: FeedbackNote): string {
  return note.verdict
    ? `<span class="fb-verdict fb-verdict--${note.verdict === "yes" ? "yes" : "no"}">would change: ${escapeHtml(note.verdict)}</span>`
    : "";
}

// The kind at a glance (validation-kit Phase 3b): icon + label chip in the card head,
// driven by the FEEDBACK_KINDS map — a future kind adds a map entry, not renderer surgery.
function typeChip(note: FeedbackNote): string {
  const kind = noteKind(note);
  return `<span class="fb-type fb-type--${kind}">${icon(KIND_ICONS[kind], { size: 14 })} ${escapeHtml(FEEDBACK_KINDS[kind].label)}</span>`;
}

function statusChip(status: NoteStatus | undefined): string {
  if (status === "done") return `<span class="chip chip--mint">done</span>`;
  if (status === "archived") return `<span class="chip chip--plain">archived</span>`;
  return "";
}

// One feedback note as a collapsed two-line card: line one is who · kind · status · time
// (+ the ⋯ menu), line two a one-line preview of the note. Clicking the card expands it to
// the full message, the email row (with Copy), the source/verdict pills, and the link to
// the 1:1 when the note carries one.
function noteCard(note: FeedbackNote, status: NoteStatus | undefined, open: boolean): string {
  const name = displayName(note);
  const company = note.company
    ? `<span class="fb-company"> · ${escapeHtml(note.company)}</span>`
    : "";
  const emailRow =
    note.email && note.email !== name
      ? `<div class="fb-who__email">
           <span class="fb-mail-ico" aria-hidden="true">${icon(Mail, { size: 14 })}</span>
           <a href="mailto:${escapeHtml(note.email)}" class="fb-who__mail" title="${escapeHtml(note.email)}">${escapeHtml(note.email)}</a>
           <button type="button" class="fb-copy js-copy" data-email="${escapeHtml(note.email)}" title="Copy email">Copy</button>
         </div>`
      : "";
  const previewText = note.message || (note.verdict ? "(tap only. No comment)" : "");
  const body = note.message
    ? `<div class="fb-note">${escapeHtml(note.message)}</div>`
    : note.verdict
      ? `<div class="fb-note text-ink-dim">(tap only. No comment)</div>`
      : "";
  const src = sourcePill(note);
  const ver = verdictPill(note);
  const openRun = note.runId
    ? `<button type="button" class="btn btn--ghost btn--sm js-open-run" data-run-id="${escapeHtml(note.runId)}">Open the 1:1</button>`
    : "";
  const pills = src || ver || openRun ? `<div class="fb-pills">${src}${ver}${openRun}</div>` : "";
  return `
    <article class="fb-item js-item${open ? " is-open" : ""}" data-id="${escapeHtml(note.id)}">
      <div class="fb-avatar" aria-hidden="true">${escapeHtml(initialOf(note))}</div>
      <div class="fb-body">
        <div class="fb-head">
          <div class="fb-head__who"><span class="fb-name">${escapeHtml(name)}</span>${company}${typeChip(note)}${statusChip(status)}</div>
          <div class="fb-head__meta">
            <span class="fb-time" title="${escapeHtml(exactWhen(note.createdAt))}">${escapeHtml(whenText(note.createdAt))}</span>
            <button type="button" class="row-menu-btn js-menu" data-id="${escapeHtml(note.id)}" aria-haspopup="menu" aria-label="Actions for this note">${icon(MoreHorizontal, { size: 18 })}</button>
          </div>
        </div>
        <div class="fb-preview">${escapeHtml(previewText)}</div>
        <div class="fb-full">
          ${emailRow}
          ${body}
          ${pills}
        </div>
      </div>
    </article>`;
}

const TABS: Array<{ key: string; label: string }> = [
  { key: "new", label: "New" },
  { key: "done", label: "Done" },
  { key: "archived", label: "Archived" },
  { key: "all", label: "All" },
];

// The run the next mount should open read-only — same route/state pattern as the user
// drilldown: the click stashes the id, bumps stageTick, and the router re-mounts us.
let pendingRunId: string | null = null;

export const mount: Mount = async (root, ctx) => {
  root.classList.add("fb-stage"); // top-align so the page doesn't jump when a row is deleted
  const shell = (inner: string) =>
    `<div class="l-container l-container--wide l-stack l-stack--6">
      <header class="page-header l-stack l-stack--2">
        ${pulseCrumbs('Feedback inbox')}
        <h1 class="h1">Feedback inbox</h1>
        <div class="text-ink-dim text-sm">Every note testers send from "Send feedback". All companies, newest first.</div>
      </header>
      ${inner}
    </div>`;
  // Delegated so it survives every innerHTML repaint (pulse-drilldowns back button).
  root.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest('.js-crumb[data-nav="pulse"]')) ctx.setState({ stage: STAGES.ADMIN_PULSE });
  });

  let notes: FeedbackNote[] = [];
  let statuses = loadStatuses();
  let tab = "new";
  const openIds = new Set<string>();

  const setStatus = (id: string, status: NoteStatus | null) => {
    if (status) statuses[id] = status; else delete statuses[id];
    saveStatuses(statuses);
    paint();
  };

  // The ⋯ menu: triage (done / archive) plus delete behind the shared confirm dialog.
  const openNoteMenu = (btn: HTMLButtonElement) => {
    const id = btn.dataset.id ?? "";
    if (!id) return;
    const status = statuses[id];
    const items: RowMenuItem[] = [];
    items.push(
      status === "done"
        ? { label: "Move back to new", onSelect: () => setStatus(id, null) }
        : { label: "Mark done", onSelect: () => setStatus(id, "done") },
    );
    items.push(
      status === "archived"
        ? { label: "Unarchive", onSelect: () => setStatus(id, null) }
        : { label: "Archive", onSelect: () => setStatus(id, "archived") },
    );
    items.push({
      label: "Delete…",
      danger: true,
      onSelect: () => {
        void (async () => {
          const ok = await confirmAction({
            message: "Delete this feedback note? This can't be undone.",
            confirmLabel: "Delete",
            destructive: true,
          });
          if (!ok) return;
          try {
            await deleteFeedbackNote(id);
            notes = notes.filter((n) => n.id !== id);
            setStatus(id, null); // also drops the stored mark and repaints
          } catch (err) {
            await alertAction({ message: (err as { message?: string })?.message || "Couldn't delete that note." });
          }
        })();
      },
    });
    openRowMenu(btn, items);
  };

  // ONE run's briefing, read-only — the same recap components as the user drilldown.
  // Its own bare container, NOT `shell`: the recap header names the 1:1 (the
  // Screen-Names-The-Object rule), so the inbox page header must not stack above it.
  const recapShell = (inner: string) => `<div class="l-container l-container--wide l-stack l-stack--6">${inner}</div>`;
  const renderRecap = async (runId: string) => {
    root.innerHTML = recapShell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading 1:1…</p></section>`);
    type RunCtx = { name: string; role: string; seniority: string; meetingType: string };
    let run: { ctx: RunCtx; briefing: Briefing | null };
    const wireBack = () => {
      root.querySelectorAll<HTMLButtonElement>('.js-crumb[data-nav="inbox"]').forEach((c) =>
        c.addEventListener("click", () => ctx.setState({ stageTick: store.stageTick + 1 })),
      );
    };
    try {
      run = (await getAdminRun(runId)) as { ctx: RunCtx; briefing: Briefing | null };
    } catch {
      root.innerHTML = recapShell(`
        <header class="page-header l-stack l-stack--3">${breadcrumb([{ label: "Feedback inbox", nav: "inbox" }, { label: "1:1" }])}</header>
        <section class="card-flat space-y-3">
          <div class="eyebrow">Couldn't open</div>
          <p class="text-ink-dim">This 1:1 couldn't be opened. Go back and try another.</p>
        </section>`);
      wireBack();
      return;
    }
    root.innerHTML = recapShell(
      recapHeader(run.ctx || ({} as RunCtx), [{ label: "Feedback inbox", nav: "inbox" }]) +
        renderReadonlyBriefing(run.briefing),
    );
    wireBack();
  };

  const paint = () => {
    const statusOf = (n: FeedbackNote): NoteStatus | undefined => statuses[n.id];
    const counts: Record<string, number> = {
      new: notes.filter((n) => !statusOf(n)).length,
      done: notes.filter((n) => statusOf(n) === "done").length,
      archived: notes.filter((n) => statusOf(n) === "archived").length,
      all: notes.length,
    };
    const shown = notes.filter((n) => {
      if (tab === "all") return true;
      const s = statusOf(n);
      return tab === "new" ? !s : s === tab;
    });
    const tabs = `<div class="seg" role="tablist">${TABS.map((t) =>
      `<button type="button" role="tab" class="seg__btn js-tab${tab === t.key ? " is-active" : ""}" data-key="${t.key}" aria-selected="${tab === t.key ? "true" : "false"}">${t.label} <span class="fb-tab__n">${counts[t.key] ?? 0}</span></button>`,
    ).join("")}</div>`;
    const list = shown.length
      ? `<div class="fb-list l-stack l-stack--3">${shown.map((n) => noteCard(n, statusOf(n), openIds.has(n.id))).join("")}</div>`
      : `<section class="card-flat"><p class="text-sm text-ink-dim">${
          notes.length === 0
            ? "No feedback yet. When a tester sends a note, it lands here."
            : "Nothing in this view."
        }</p></section>`;
    root.innerHTML = shell(`<div class="l-stack l-stack--4">${tabs}${list}</div>`);

    root.querySelectorAll<HTMLButtonElement>(".js-tab").forEach((b) =>
      b.addEventListener("click", () => { tab = b.dataset.key ?? "new"; paint(); }),
    );
    // The card expands/collapses on click; clicks on its controls don't toggle it.
    root.querySelectorAll<HTMLElement>(".js-item").forEach((item) =>
      item.addEventListener("click", (e) => {
        if (e.target instanceof Element && e.target.closest("button, a")) return;
        const id = item.dataset.id ?? "";
        if (!id) return;
        if (openIds.has(id)) openIds.delete(id); else openIds.add(id);
        item.classList.toggle("is-open");
      }),
    );
    root.querySelectorAll<HTMLButtonElement>(".js-menu").forEach((b) =>
      b.addEventListener("click", (e) => { e.stopPropagation(); openNoteMenu(b); }),
    );
    root.querySelectorAll<HTMLButtonElement>(".js-open-run").forEach((b) =>
      b.addEventListener("click", () => {
        const runId = b.dataset.runId ?? "";
        if (!runId) return;
        pendingRunId = runId;
        ctx.setState({ stageTick: store.stageTick + 1 });
      }),
    );
    root.querySelectorAll<HTMLButtonElement>(".js-copy").forEach((b) =>
      b.addEventListener("click", () => {
        const email = b.dataset.email ?? "";
        if (!email) return;
        void navigator.clipboard.writeText(email).then(
          () => {
            const prev = b.textContent;
            b.textContent = "Copied";
            b.classList.add("is-copied");
            window.setTimeout(() => {
              b.textContent = prev;
              b.classList.remove("is-copied");
            }, 1200);
          },
          () => { void alertAction({ message: "Couldn't copy. Please copy the address manually." }); },
        );
      }),
    );
  };

  // A pending run id means this mount IS the recap navigation.
  const openRunId = pendingRunId;
  pendingRunId = null;
  if (openRunId) { await renderRecap(openRunId); return; }

  root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading the feedback inbox…</p></section>`);

  try {
    const res = await getFeedbackInbox();
    notes = Array.isArray(res?.notes) ? (res.notes as FeedbackNote[]) : [];
  } catch {
    root.innerHTML = shell(`
      <section class="card-flat l-stack l-stack--2">
        <div class="eyebrow">Couldn't load</div>
        <p class="text-sm text-ink-dim">Something went wrong loading the feedback inbox. Please try again.</p>
        <button type="button" class="btn btn--ghost js-retry">Try again</button>
      </section>`);
    root.querySelector(".js-retry")?.addEventListener("click", () => { void mount(root, ctx); });
    return;
  }

  // Housekeeping: drop stored marks for notes that no longer exist.
  const ids = new Set(notes.map((n) => n.id));
  const pruned = Object.fromEntries(Object.entries(statuses).filter(([id]) => ids.has(id))) as Record<string, NoteStatus>;
  if (Object.keys(pruned).length !== Object.keys(statuses).length) {
    statuses = pruned;
    saveStatuses(statuses);
  }

  paint();
};

export const unmount: Unmount = () => { closeRowMenu(); };
