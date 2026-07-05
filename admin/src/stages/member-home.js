// Member Home — the landing page for a plain member (member-nav Phase 1). Keeps it
// simple: a welcome and one clear way to start a prep session. The admin Home
// (start.js) is a separate, heavier page and is never shown to a member.

import { STAGES, store, isAdmin } from "../state.js";
import { getClonableRuns, cloneRun } from "../../../shared/api.js";
import { escapeHtml as esc } from "../ui/html.js";

let keyHandler = null;

export async function mount(root, { setState }) {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Welcome to Sero</h1>
        <div class="text-ink-dim text-sm">Prep for your next 1:1 in a few minutes.</div>
      </header>

      <section class="card-flat space-y-3">
        <div class="eyebrow">Start here</div>
        <p class="text-sm">Sero walks you through a quick prep and writes a briefing you can use in the meeting. Here's how it goes:</p>
        <p class="text-sm text-ink-dim">1 &middot; Tell Sero who you're meeting and what's on your mind.</p>
        <p class="text-sm text-ink-dim">2 &middot; Answer a few short questions.</p>
        <p class="text-sm text-ink-dim">3 &middot; Get a briefing to guide the 1:1.</p>
        <button type="button" class="btn js-start">Start a new session</button>
      </section>
    </div>
  `;

  function startNew() {
    store.scripted = null;
    Object.assign(store.ctx, { personId: null, name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" });
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  }

  root.querySelector(".js-start").addEventListener("click", startNew);

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

  keyHandler = (e) => {
    if (document.querySelector(".modal-backdrop")) return; // don't fire while the picker is open
    if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
    if (e.key === "Enter") { e.preventDefault(); startNew(); }
  };
  window.addEventListener("keydown", keyHandler);
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
  if (keyHandler) {
    window.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }
  document.querySelector(".modal-backdrop")?.remove();
}
