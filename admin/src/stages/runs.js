// Runs — the member's own finished preps (member-nav Phase 1). The real list arrives in
// member-nav Phase 2 (scoped to them, wired to /runs/mine). Until then this is an
// intentional empty state that says what will appear here and offers the primary action,
// so nothing reads as half-built. Distinct from the admin Library, which lists the whole
// company's runs and stays admin-only.

import { STAGES, store } from "../state.js";

export async function mount(root, { setState }) {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Runs</h1>
        <div class="text-ink-dim text-sm">Your past prep sessions.</div>
      </header>

      <section class="card-flat space-y-3">
        <div class="eyebrow">No runs yet</div>
        <p class="text-sm text-ink-dim">Your finished 1:1 preps will appear here. Start your first one and it'll show up in this list.</p>
        <button type="button" class="btn js-start">Start a 1:1</button>
      </section>
    </div>
  `;

  root.querySelector(".js-start").addEventListener("click", () => {
    store.scripted = null;
    Object.assign(store.ctx, { name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" });
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  });
}

export function unmount() {}
