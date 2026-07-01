// Team — the member's people, in one place (member-nav Phase 1). Real content (teammates,
// their prep history) comes later; until then this is an intentional empty state that says
// what will live here and offers the primary action, so nothing reads as half-built.

import { STAGES, store } from "../state.js";
import type { Mount, Unmount } from "./stage.types.ts";

export const mount: Mount = async (root, { setState }) => {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Team</h1>
        <div class="text-ink-dim text-sm">Your team, in one place.</div>
      </header>

      <section class="card-flat space-y-3">
        <div class="eyebrow">Your team will live here</div>
        <p class="text-sm text-ink-dim">Soon this page will show the people you meet with and their prep history. For now, you can prep your next 1:1 from here.</p>
        <button type="button" class="btn js-start">Prep a 1:1</button>
      </section>
    </div>
  `;

  root.querySelector(".js-start")?.addEventListener("click", () => {
    store.scripted = null;
    Object.assign(store.ctx, { name: "", role: "", seniority: "", meetingType: "", meetingTypeIndex: null, notes: "" });
    setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  });
};

export const unmount: Unmount = () => {};
