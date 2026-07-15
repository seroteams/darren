// Feedback inbox — the superadmin's cross-company view of every note testers send via
// the Send-feedback form (feedback-inbox). Wired to GET /api/v1/admin/feedback, gated by
// requireSuperadminRoute: only the allowlisted superadmin (Carl) gets a 200; the nav item
// is hidden for everyone else, but that hiding is cosmetic — the 403 is the real wall.
// Read-only list, newest first, with one action: permanently delete a note (junk cleanup).

import "../styles/feedback-inbox.css";
import "../styles/pulse-drilldowns.css";
import { STAGES } from "../state.js";
import { backToPulse } from "../ui/pulse-labels.ts";
import { getFeedbackInbox, deleteFeedbackNote } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { relTime } from "../ui/time.ts";
import { icon } from "../ui/icon.js";
import { Trash2, Mail, MessageSquare, ClipboardCheck } from "lucide";
import { noteKind, FEEDBACK_KINDS } from "../ui/feedback-kinds.ts";
import type { FeedbackKind } from "../ui/feedback-kinds.ts";
import type { Mount, Unmount } from "./stage.types.ts";

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

// One feedback note as a message card: avatar · name·company · time + delete on top,
// the email (with a Copy button) on its own line, the note full-width, source/verdict
// pills below when present. The email row is skipped when the name already IS the email.
function noteCard(note: FeedbackNote): string {
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
  const body = note.message
    ? `<div class="fb-note">${escapeHtml(note.message)}</div>`
    : note.verdict
      ? `<div class="fb-note text-ink-dim">(tap only — no comment)</div>`
      : "";
  const src = sourcePill(note);
  const ver = verdictPill(note);
  const pills = src || ver ? `<div class="fb-pills">${src}${ver}</div>` : "";
  return `
    <article class="fb-item" data-id="${escapeHtml(note.id)}">
      <div class="fb-avatar" aria-hidden="true">${escapeHtml(initialOf(note))}</div>
      <div class="fb-body">
        <div class="fb-head">
          <div class="fb-head__who"><span class="fb-name">${escapeHtml(name)}</span>${company}${typeChip(note)}</div>
          <div class="fb-head__meta">
            <span class="fb-time" title="${escapeHtml(exactWhen(note.createdAt))}">${escapeHtml(whenText(note.createdAt))}</span>
            <button type="button" class="fb-del js-del" data-id="${escapeHtml(note.id)}" aria-label="Delete note" title="Delete note">${icon(Trash2, { size: 16 })}</button>
          </div>
        </div>
        ${emailRow}
        ${body}
        ${pills}
      </div>
    </article>`;
}

function feedList(notes: FeedbackNote[]): string {
  return `<div class="fb-list l-stack l-stack--3">${notes.map(noteCard).join("")}</div>`;
}

export const mount: Mount = async (root, ctx) => {
  root.classList.add("fb-stage"); // top-align so the page doesn't jump when a row is deleted
  const shell = (inner: string) =>
    `<div class="l-container l-container--wide l-stack l-stack--6">
      <header class="page-header l-stack l-stack--2">
        ${backToPulse()}
        <h1 class="h1">Feedback inbox</h1>
        <div class="text-ink-dim text-sm">Every note testers send from "Send feedback" — all companies, newest first.</div>
      </header>
      ${inner}
      <div class="pd-back-bottom">${backToPulse()}</div>
    </div>`;
  // Delegated so it survives every innerHTML repaint (pulse-drilldowns back button).
  root.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest(".js-back-pulse")) ctx.setState({ stage: STAGES.ADMIN_PULSE });
  });

  let notes: FeedbackNote[] = [];

  const paint = () => {
    root.innerHTML = shell(
      notes.length
        ? feedList(notes)
        : `<section class="card-flat"><p class="text-sm text-ink-dim">No feedback yet — when a tester sends a note, it lands here.</p></section>`,
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
          () => window.alert("Couldn't copy — please copy the address manually."),
        );
      }),
    );
    root.querySelectorAll<HTMLButtonElement>(".js-del").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.id ?? "";
        if (!id) return;
        if (!window.confirm("Delete this feedback note? This can't be undone.")) return;
        b.disabled = true;
        b.classList.add("is-busy");
        void (async () => {
          try {
            await deleteFeedbackNote(id);
            notes = notes.filter((n) => n.id !== id);
            paint();
          } catch (err) {
            window.alert((err as { message?: string })?.message || "Couldn't delete that note.");
            b.disabled = false;
            b.classList.remove("is-busy");
          }
        })();
      }),
    );
  };

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

  paint();
};

export const unmount: Unmount = () => {};
