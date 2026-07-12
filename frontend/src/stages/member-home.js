// Member Home — the landing page for a plain member. People-roster Phase 5: the page now
// shows "Your 1:1s" — the 1:1s your manager prepped ABOUT you (list-only: meeting type +
// date + which manager; never the manager's notes or briefing — the no-inference ruling).
// The old "Start a new session" button is gone: members can't start runs (the server
// 403s), so it was a dead end. The admin Home (start.js) is separate and never shown here.

import { getRunsAboutMe, listMyTrackerItems, createMyRequest, updateMyGoal } from "../../../shared/api.js";
import { escapeHtml as esc } from "../../../admin/src/ui/html.js";
import { formatDate } from "../../../admin/src/ui/time.ts";
import "../../../admin/src/styles/design/member-runs.css";

const REQ_STATUS = { new: "New", in_progress: "In progress", resolved: "Resolved" };

// The member's own requests + goals (monthly-checkin Phase 7). Raise a request; update a goal's
// progress + note. Server-fenced to the member's own person — the UI never sees promises.
async function loadTrackers(host) {
  if (!host) return;
  let data;
  try {
    data = await listMyTrackerItems();
  } catch {
    host.innerHTML = `<p class="text-ink-dim">Couldn't load your requests &amp; goals.</p>`;
    return;
  }
  const requests = (data && data.requests) || [];
  const goals = (data && data.goals) || [];
  host.innerHTML = `
    <div class="l-stack l-stack--4">
      <div>
        <h3 class="text-sm" style="font-weight:600;margin-bottom:.5rem">Your requests</h3>
        ${
          requests.length
            ? requests
                .map(
                  (r) =>
                    `<div class="card-flat" style="padding:.7rem 1rem;margin-bottom:.5rem"><div class="text-sm">${esc(r.text)}</div><div class="text-sm text-ink-mute">${esc(REQ_STATUS[r.status] || r.status)}</div></div>`,
                )
                .join("")
            : `<p class="text-sm text-ink-mute">No requests yet.</p>`
        }
        <form class="js-add-req" style="margin-top:.5rem;display:flex;flex-wrap:wrap;gap:.5rem">
          <input class="js-req-text" type="text" placeholder="Raise a request…" style="flex:1 1 12rem;padding:.5rem .7rem;border:1px solid var(--color-border,#e3e8ee);border-radius:8px;font-size:15px" />
          <select class="js-req-cat" style="padding:.5rem;border:1px solid var(--color-border,#e3e8ee);border-radius:8px;font-size:15px"><option value="growth_development">Growth &amp; development</option><option value="ideas_suggestions">Ideas &amp; suggestions</option><option value="concerns_feedback">Concerns &amp; feedback</option></select>
          <button type="submit" style="padding:.5rem 1rem;border-radius:8px;border:0;background:var(--sero-primary-700,#5aa9e6);color:#fff;font-weight:600;cursor:pointer">Add</button>
        </form>
      </div>
      <div>
        <h3 class="text-sm" style="font-weight:600;margin-bottom:.5rem">Your goals</h3>
        ${
          goals.length
            ? goals
                .map(
                  (g) =>
                    `<div class="card-flat js-goal" data-id="${esc(g.id)}" style="padding:.7rem 1rem;margin-bottom:.5rem">
                      <div class="text-sm">${esc(g.text)}</div>
                      <div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-top:.4rem">
                        <input class="js-goal-pct" type="number" min="0" max="100" value="${Number(g.progress) || 0}" style="width:5rem;padding:.4rem;border:1px solid var(--color-border,#e3e8ee);border-radius:8px" /><span class="text-sm text-ink-mute">%</span>
                        <input class="js-goal-note" type="text" placeholder="Add an update…" style="flex:1 1 10rem;padding:.4rem .7rem;border:1px solid var(--color-border,#e3e8ee);border-radius:8px" />
                        <button type="button" class="js-goal-save" style="padding:.4rem .9rem;border-radius:8px;border:1px solid var(--sero-primary-500,#a5cfef);background:#fff;color:var(--sero-primary-800,#1b5d91);font-weight:600;cursor:pointer">Save</button>
                      </div>
                    </div>`,
                )
                .join("")
            : `<p class="text-sm text-ink-mute">No goals yet — your manager sets these with you in your 1:1.</p>`
        }
      </div>
    </div>`;

  host.querySelector(".js-add-req")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = host.querySelector(".js-req-text")?.value?.trim();
    const category = host.querySelector(".js-req-cat")?.value;
    if (!text) return;
    try {
      await createMyRequest({ text, category });
      await loadTrackers(host);
    } catch {
      host.querySelector(".js-add-req")?.insertAdjacentHTML("afterend", `<p class="text-sm" style="color:#a3372c">Couldn't add — try again.</p>`);
    }
  });
  host.querySelectorAll(".js-goal").forEach((el) => {
    el.querySelector(".js-goal-save")?.addEventListener("click", async () => {
      const id = el.dataset.id;
      const progress = Number(el.querySelector(".js-goal-pct")?.value);
      const note = el.querySelector(".js-goal-note")?.value?.trim();
      try {
        await updateMyGoal(id, { progress, note });
        await loadTrackers(host);
      } catch {
        el.insertAdjacentHTML("beforeend", `<p class="text-sm" style="color:#a3372c">Couldn't save — try again.</p>`);
      }
    });
  });
}

let keyHandler = null;

export async function mount(root) {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Welcome to Sero</h1>
        <div class="text-ink-dim">Your manager uses Sero to prepare your 1:1s. Here's your history.</div>
      </header>

      <section class="member-runs">
        <div class="eyebrow" style="margin-bottom:1rem">Your 1:1s</div>
        <div class="js-about-me"><p class="text-sm text-ink-mute">Loading…</p></div>
      </section>

      <section class="member-runs">
        <div class="eyebrow" style="margin-bottom:1rem">Requests &amp; goals</div>
        <div class="js-my-trackers"><p class="text-sm text-ink-mute">Loading…</p></div>
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
      ? `<ol class="member-runs__timeline">${runs
          .map((r) => {
            const when = r.completedAt || r.lastSeenAt;
            const type = esc(r.meetingType || "1:1");
            const meta = r.managerName ? `<span class="member-runs__meta">with ${esc(r.managerName)}</span>` : "";
            return `<li class="member-runs__entry">
              <div class="member-runs__head">
                <span class="member-runs__type">${type}</span>
                <time class="member-runs__when">${when ? esc(formatDate(when)) : ""}</time>
              </div>
              ${meta}
            </li>`;
          })
          .join("")}</ol>`
      : `<p class="text-ink-dim">Nothing here yet. When your manager preps a 1:1 with you, it shows up here — the date and meeting type, so you always know where things stand.</p>`;
  } catch {
    host.innerHTML = `<p class="text-ink-dim">Couldn't load your 1:1s. Please try again in a moment.</p>`;
  }

  await loadTrackers(root.querySelector(".js-my-trackers"));
}

export function unmount() {
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
  document.querySelector(".modal-backdrop")?.remove();
}
