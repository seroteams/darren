// Member Home — the landing page for a plain member. People-roster Phase 5: the page now
// shows "Your 1:1s" — the 1:1s your manager prepped ABOUT you (list-only: meeting type +
// date + which manager; never the manager's notes or briefing — the no-inference ruling).
// The old "Start a new session" button is gone: members can't start runs (the server
// 403s), so it was a dead end. The admin Home (start.js) is separate and never shown here.

import { getRunsAboutMe } from "../../../shared/api.js";
import { escapeHtml as esc } from "../../../admin/src/ui/html.js";
import { formatDate } from "../../../admin/src/ui/time.ts";

let keyHandler = null;

export async function mount(root) {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Welcome to Sero</h1>
        <div class="text-ink-dim">Your manager uses Sero to prepare your 1:1s. Here's your history.</div>
      </header>

      <section class="card-flat space-y-3">
        <div class="eyebrow">Your 1:1s</div>
        <div class="js-about-me l-stack l-stack--2"><p class="text-sm text-ink-mute">Loading…</p></div>
      </section>
    </div>
  `;

  // The list itself: meeting type + who ran it + when. Nothing here ever includes the
  // manager's notes, the briefing, or ratings — that's the privacy ruling, on purpose.
  const host = root.querySelector(".js-about-me");
  try {
    const res = await getRunsAboutMe();
    const runs = (res && res.runs) || [];
    host.innerHTML = runs.length
      ? runs
          .map((r) => {
            const when = r.completedAt || r.lastSeenAt;
            const who = r.managerName ? ` · with ${esc(r.managerName)}` : "";
            return `<div class="runs-list__row"><span class="text-sm"><strong>${esc(r.meetingType || "1:1")}</strong>${who}</span><span class="text-sm text-ink-dim">${when ? esc(formatDate(when)) : ""}</span></div>`;
          })
          .join("")
      : `<p class="text-ink-dim">Nothing here yet. When your manager preps a 1:1 with you, it shows up here — the date and meeting type, so you always know where things stand.</p>`;
  } catch {
    host.innerHTML = `<p class="text-ink-dim">Couldn't load your 1:1s. Please try again in a moment.</p>`;
  }
}

export function unmount() {
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
  document.querySelector(".modal-backdrop")?.remove();
}
