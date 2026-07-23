// Member Home — the landing page for a plain member, recomposed as a portal
// (design-consolidation Phase 2, audit A5): the shared pageHeader at stage-medium
// width, a top card for the most recent 1:1 about them, the timeline of earlier
// ones with the privacy caption underneath, then Requests and Goals as two
// side-by-side cards (stacking on phones via .l-grid). List-only: meeting type +
// date + which manager; never the manager's notes or briefing — the no-inference
// ruling. Members can't start runs (the server 403s), so there is no Start button.
//
// Pure renders live in ./member-home-view.ts (DOM-free, unit-tested); this file
// owns the mount, CSS imports, data loading and wiring (the team.ts split).

import { getRunsAboutMe, listMyTrackerItems, createMyRequest, updateMyGoal } from "../../../shared/api.js";
import { pageHeader } from "../../../admin/src/ui/page-header.ts";
import { renderRunsSection, renderRequestsCard, renderGoalsCard } from "./member-home-view.ts";
import "../../../admin/src/styles/design/member-runs.css";
import "../../../admin/src/styles/add-person-modal.css"; // the compact boxed input recipe (.apm-field__input) on the member route
import "./member-home.css";

// The member's own requests + goals (monthly-checkin Phase 7). Raise a request; update a
// goal's progress + note. Server-fenced to the member's own person — the UI never sees promises.
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
  host.innerHTML = `<div class="l-grid l-grid--pair l-grid--gap-4">${renderRequestsCard(requests)}${renderGoalsCard(goals)}</div>`;

  host.querySelector(".js-add-req")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = host.querySelector(".js-req-text")?.value?.trim();
    const category = host.querySelector(".js-req-cat")?.value;
    if (!text) return;
    try {
      await createMyRequest({ text, category });
      await loadTrackers(host);
    } catch {
      host.querySelector(".js-add-req")?.insertAdjacentHTML("afterend", `<p class="field__error">Couldn't save that. Try again in a moment.</p>`);
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
        el.insertAdjacentHTML("beforeend", `<p class="field__error">Couldn't save that. Try again in a moment.</p>`);
      }
    });
  });
}

export async function mount(root) {
  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      ${pageHeader({
        eyebrow: "Your space",
        title: "Home",
        lede: "The 1:1s your manager has prepped about you, plus the requests and goals you share with them.",
      })}
      <section class="js-about-me l-stack l-stack--4">
        <p class="text-sm text-ink-mute">Loading…</p>
      </section>
      <div class="js-my-trackers">
        <p class="text-sm text-ink-mute">Loading…</p>
      </div>
    </div>
  `;

  // The list itself: meeting type + who ran it + when. Nothing here ever includes the
  // manager's notes, the briefing, or ratings — that's the privacy ruling, on purpose.
  const host = root.querySelector(".js-about-me");
  try {
    const res = await getRunsAboutMe();
    const runs = (res && res.runs) || [];
    host.innerHTML = renderRunsSection(runs);
  } catch {
    host.innerHTML = `<p class="text-ink-dim">Couldn't load your 1:1s. Please try again in a moment.</p>`;
  }

  await loadTrackers(root.querySelector(".js-my-trackers"));
}

export function unmount() {}
