// Looking back at a finished stage of a live run (stage-back-nav P1).
//
// Clicking a completed step in the run top bar used to open a read-only popup.
// It now navigates here: a real screen in the shell's own render loop, not an
// overlay stacked on the live one. Nothing on it can change the run.
//
// It deliberately has NO url of its own (the ERROR-stage pattern in router.js),
// so the address bar keeps pointing at the live stage and a reload lands the
// user back on their run rather than on a look-back. Remembering the look-back
// position across a reload is a separate job.
//
// Why this is one screen rather than re-mounting the seven stage modules in a
// "read-only" mode: three of the seven were never screens. bank.js and eval.js
// are interstitials that fire a stream and auto-advance, and questioning.js
// shows one question at a time off a turn pointer. Re-mounting them on a
// finished run would chain BANK -> QUESTIONING -> EVAL and dump the user on the
// recap. So every stage shows what it produced, from cached state, and no
// stage module is re-entered at all.
//
// The store is the source for setup / focus areas / prep brief / recap; the Q&A
// transcript is not held there, so it comes from getRunFull once.

import { STAGES } from "../state.ts";
import { renderStageRecap } from "../ui/stage-recap-sections.js";
import { TOPBAR_STAGES } from "../ui/stage-labels.js";
import { escapeHtml as esc } from "../ui/html.js";
import { skeletonHtml } from "../ui/skeleton.js";
import { icon } from "../ui/icon.js";
import { getRunFull } from "../../../shared/api.js";
import { Eye } from "lucide";
import "../styles/design/stage-lookback.css";

const labelFor = (key) => (TOPBAR_STAGES.find(([k]) => k === key) || [, key])[1];

// Stages whose content comes from the run transcript rather than the store.
// Only these are worth waiting on a fetch for.
const NEEDS_RUN = new Set([STAGES.BANK, STAGES.QUESTIONING, STAGES.EVAL]);

export async function mount(root, { store, setState }) {
  const stageKey = store.lookbackStage;
  const backTo = store.lookbackReturn || STAGES.BRIEFING;

  // Landed here without a stage to look at (a hand-typed URL, or a reload after
  // the run was cleared). Go back to where the run is rather than show a husk.
  if (!stageKey) {
    setState({ stage: backTo, lookbackStage: null, stageTick: store.stageTick + 1 });
    return;
  }

  root.innerHTML = `
    <div class="lookback">
      <div class="lookback__band">
        <span class="lookback__eye">${icon(Eye, { size: 16 })}</span>
        <span class="lookback__what">Looking back at <strong>${esc(labelFor(stageKey))}</strong>. Nothing here can change.</span>
        <button type="button" class="lookback__back js-lookback-back">Back to ${esc(labelFor(backTo))}</button>
      </div>
      <div class="lookback__body">${NEEDS_RUN.has(stageKey) ? skeletonHtml(3) : renderStageRecap(stageKey, store, null)}</div>
    </div>
  `;

  root.querySelector(".js-lookback-back").addEventListener("click", () => {
    setState({ stage: backTo, lookbackStage: null, lookbackReturn: null, stageTick: store.stageTick + 1 });
  });

  if (!NEEDS_RUN.has(stageKey)) return;

  let run = null;
  if (store.sessionId) {
    try {
      run = await getRunFull(store.sessionId);
    } catch (e) {
      console.warn("[stage-lookback] getRunFull failed:", e.message);
    }
  }
  // The user may have navigated away while that was in flight.
  const body = root.querySelector(".lookback__body");
  if (body) body.innerHTML = renderStageRecap(stageKey, store, run);
}

export function unmount() {
  /* nothing to tear down: no streams, no timers, no body-level portals */
}
