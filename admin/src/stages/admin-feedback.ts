// Feedback inbox — the superadmin's cross-company view of every note testers send via
// the Send-feedback form (feedback-inbox). Wired to GET /api/v1/admin/feedback, gated by
// requireSuperadminRoute: only the allowlisted superadmin (Carl) gets a 200; the nav item
// is hidden for everyone else, but that hiding is cosmetic — the 403 is the real wall.
// Read-only list, newest first, with one action: permanently delete a note (junk cleanup).

import { getFeedbackInbox, deleteFeedbackNote } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { relTime } from "../ui/time.ts";
import type { Mount, Unmount } from "./stage.types.ts";

type FeedbackNote = {
  id: string;
  email: string | null;
  userName: string | null;
  company: string | null;
  page: string | null;
  message: string;
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
function who(note: FeedbackNote): string {
  const name = note.userName || note.email;
  if (!name) return `<span class="text-ink-dim">Unknown</span>`;
  const sub = note.company ? `<div class="text-ink-dim text-sm">${escapeHtml(note.company)}</div>` : "";
  return `${escapeHtml(name)}${sub}`;
}

function noteRow(note: FeedbackNote): string {
  return `
    <tr data-id="${escapeHtml(note.id)}">
      <td title="${escapeHtml(exactWhen(note.createdAt))}">${escapeHtml(whenText(note.createdAt))}</td>
      <td>${who(note)}</td>
      <td>${note.page ? `<code>${escapeHtml(note.page)}</code>` : `<span class="text-ink-dim">—</span>`}</td>
      <td class="fb-note">${escapeHtml(note.message)}</td>
      <td><button type="button" class="btn btn--ghost js-del" data-id="${escapeHtml(note.id)}">Delete</button></td>
    </tr>`;
}

function table(notes: FeedbackNote[]): string {
  return `
    <div class="um-table-wrap">
      <table class="um-table">
        <thead>
          <tr><th>When</th><th>Who</th><th>Screen</th><th>The note</th><th></th></tr>
        </thead>
        <tbody>${notes.map(noteRow).join("")}</tbody>
      </table>
    </div>
    <style>.um-table td.fb-note { white-space: pre-wrap; max-width: 48rem; }</style>`;
}

export const mount: Mount = async (root, ctx) => {
  const shell = (inner: string) =>
    `<div class="l-container l-container--wide l-stack l-stack--6">
      <header class="page-header">
        <h1 class="h1">Feedback inbox</h1>
        <div class="text-ink-dim text-sm">Every note testers send from "Send feedback" — all companies, newest first.</div>
      </header>
      ${inner}
    </div>`;

  let notes: FeedbackNote[] = [];

  const paint = () => {
    root.innerHTML = shell(
      notes.length
        ? table(notes)
        : `<section class="card-flat"><p class="text-sm text-ink-dim">No feedback yet — when a tester sends a note, it lands here.</p></section>`,
    );
    root.querySelectorAll<HTMLButtonElement>(".js-del").forEach((b) =>
      b.addEventListener("click", () => {
        const id = b.dataset.id ?? "";
        if (!id) return;
        if (!window.confirm("Delete this feedback note? This can't be undone.")) return;
        b.disabled = true;
        b.textContent = "Deleting…";
        void (async () => {
          try {
            await deleteFeedbackNote(id);
            notes = notes.filter((n) => n.id !== id);
            paint();
          } catch (err) {
            window.alert((err as { message?: string })?.message || "Couldn't delete that note.");
            b.disabled = false;
            b.textContent = "Delete";
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
