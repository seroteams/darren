// Member Home — the landing page for a plain member (member-nav Phase 1; reworked in
// people-roster Phase 5). Members can't START a 1:1 (the old button was a dead 403) —
// instead this shows "Your 1:1s": the sessions their MANAGER ran about them, via the
// person↔account link. List-only by the privacy ruling: meeting type + date + which
// manager. No notes, no briefing, no detail view.

import { STAGES, store, isAdmin } from "../state.js";
import { getClonableRuns, cloneRun, listRunsAboutMe } from "../../../shared/api.js";
import { escapeHtml as esc } from "../ui/html.js";
import { formatDate } from "../ui/time.ts";

export async function mount(root, { setState }) {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Welcome to Sero</h1>
        <div class="text-ink-dim text-sm">Your 1:1s, in one place.</div>
      </header>

      <section class="card-flat space-y-3">
        <div class="eyebrow">Your 1:1s</div>
        <div class="js-about l-stack l-stack--2">
          <p class="text-sm text-ink-dim">Loading…</p>
        </div>
      </section>
    </div>
  `;

  const host = root.querySelector(".js-about");
  try {
    const res = await listRunsAboutMe();
    const runs = Array.isArray(res?.runs) ? res.runs : [];
    if (!runs.length) {
      host.innerHTML = `<p class="text-sm text-ink-dim">Nothing here yet. When your manager preps a 1:1 with you, it shows up here.</p>`;
    } else {
      host.innerHTML = runs
        .map((r) => {
          const bits = [
            `<span class="text-sm"><strong>${esc(r.meetingType || "1:1")}</strong></span>`,
            r.managerName ? `<span class="text-sm text-ink-dim">with ${esc(r.managerName)}</span>` : "",
            r.lastSeenAt ? `<span class="text-sm text-ink-dim">${esc(formatDate(r.lastSeenAt))}</span>` : "",
          ].filter(Boolean);
          return `<div class="card-flat runs-list__row"><span class="l-cluster l-cluster--2">${bits.join(" · ")}</span></div>`;
        })
        .join("");
    }
  } catch {
    host.innerHTML = `<p class="text-sm text-ink-dim">Couldn't load your 1:1s. Please try again later.</p>`;
  }

  // A quick way to walk a full run without the intake + Q&A: copies a finished run into a
  // new one you own, so it drops straight into "Runs". Free (file copy, nothing generated).
  // Shown to admins, and to any logged-in user in dev builds — so the test manager account
  // we use for QA (member@seroteams.com, a plain member) gets it too. Stripped from prod
  // for real members (import.meta.env.DEV is false there).
  if (import.meta.env.DEV || isAdmin(store.user)) {
    const section = root.querySelector(".card-flat");
    const dev = document.createElement("button");
    dev.type = "button";
    dev.className = "btn btn--ghost js-prefill";
    dev.textContent = "Prefill a run (dev)";
    dev.style.marginLeft = "8px";
    section.appendChild(dev);
    dev.addEventListener("click", () => openPrefillPicker(setState));
  }
}

// The dev prefill picker: list finished runs, pick one, clone it, jump into the copy.
function openPrefillPicker(setState) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "card modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.innerHTML = `
    <div class="h3">Prefill a run</div>
    <p class="text-sm text-ink-dim">Pick a finished run to copy into a new one you can walk through. Free — nothing is generated.</p>
    <div class="js-list l-stack l-stack--2" style="max-height:50vh;overflow:auto;margin-top:8px;">
      <p class="text-sm text-ink-mute">Loading…</p>
    </div>
    <div class="modal__actions"><button class="btn btn--ghost js-close" type="button">Close</button></div>
  `;
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  const list = modal.querySelector(".js-list");
  const close = () => backdrop.remove();
  modal.querySelector(".js-close").addEventListener("click", close);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });

  getClonableRuns()
    .then((res) => {
      const runs = (res && res.runs) || [];
      if (!runs.length) {
        list.innerHTML = `<p class="text-sm text-ink-mute">No finished runs to copy yet.</p>`;
        return;
      }
      list.innerHTML = runs
        .map((r) => {
          const c = r.ctx || {};
          const label = [c.name, c.role, c.meetingType].filter(Boolean).map(esc).join(" · ") || esc(r.headline || r.id);
          return `<button class="btn btn--ghost js-pick" type="button" data-id="${esc(r.id)}" style="text-align:left;justify-content:flex-start;">${label}</button>`;
        })
        .join("");
      list.querySelectorAll(".js-pick").forEach((btn) => {
        btn.addEventListener("click", async () => {
          list.innerHTML = `<p class="text-sm text-ink-dim">Prefilling…</p>`;
          try {
            const { id } = await cloneRun(btn.getAttribute("data-id"));
            close();
            setState({ myRunId: id, stage: STAGES.RUN_DETAIL });
          } catch (e) {
            list.innerHTML = `<p class="text-sm" style="color:var(--color-negative)">Couldn't prefill: ${esc(e.message || "error")}</p>`;
          }
        });
      });
    })
    .catch((e) => {
      list.innerHTML = `<p class="text-sm" style="color:var(--color-negative)">Couldn't load runs: ${esc(e.message || "error")}</p>`;
    });
}

export function unmount() {
  document.querySelector(".modal-backdrop")?.remove();
}
