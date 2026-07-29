// The question-bank wait. This screen routes straight into the runner
// (stages/questioning.js), so it wears the RUNNER'S layout while it waits rather
// than a centred card: same 50/50 split, same 72px headers, same 560px measure.
// Carl, 2026-07-30 — the old centred interstitial meant the whole page changed
// shape the moment the first question landed.
//
// What that buys, and why each half differs:
//   • Left  — everything except the question itself is already known (the person,
//     the meeting type, the step), so it paints for real. Only the question is a
//     ghost, at the height the real one lands.
//   • Right — the coaching half needs NOTHING from this stream. Its listen-for
//     cues come from the prep brief, which finished two screens ago, so the panel
//     renders in full and can be read during the wait.
//
// The overlay is appended to <body> for the same reason questioning.js does it:
// the stage host sits inside animated/contained shell ancestors, which trap
// position:fixed and shrink the split. Styles: styles/coach-panel.css (.cp-wait).

import { STAGES } from "../state.ts";
import { createOrb } from "../ui/orb.js";
import { escapeHtml } from "../ui/html.js";
import { openSse } from "../../../shared/sse.js";
import { button } from "../ui/button.ts";
import { createSkeleton } from "../ui/skeleton.js";
import { createCoachPanel } from "../ui/coach-panel.ts";
import { renderCtxSegments } from "../ui/notes-panel-utils.js";
import { EXIT_LABEL } from "./questioning-actions.ts";
import { readyAlreadyShown, READY_STEP_LABEL } from "./questioning-ready.ts";

let unmountFn = null;
let waitScreen = null;
const MIN_DISPLAY_MS = 1000;

function dropWaitScreen() {
  if (waitScreen) waitScreen.remove();
  waitScreen = null;
}

export async function mount(root, { store, setState }) {
  start();

  // Renders the waiting screen and opens the stream. Also the retry path: the
  // inline error card calls this again to re-open the stream.
  function start() {
    const mountedAt = Date.now();
    root.innerHTML = "";
    dropWaitScreen();

    const name = store.ctx?.name || "";
    // A fresh 1:1 lands on the walk-in gate, a resumed one on a question. Either
    // way the step name is known now, so the header doesn't fill in late.
    const step = readyAlreadyShown(store.sessionId) ? "" : READY_STEP_LABEL;

    const host = document.createElement("div");
    host.innerHTML = `<div class="cp-screen cp-wait">
        <div class="cp-half cp-half--q">
          <header class="cp-head">
            <div class="cp-head__facts">
              <span class="turn-label cp-head__turn">${escapeHtml(step)}</span>
              <span class="question-session-ctx ctx-segments" aria-label="Session context"></span>
            </div>
            <div class="cp-head__actions">
              <!-- Holds its space from the first frame; there is nothing to wrap up
                   until the meeting has started, so it stays inert until then. -->
              <button class="btn btn--ghost" type="button" disabled>${EXIT_LABEL}</button>
            </div>
          </header>
          <div class="cp-col">
            <div class="thinking-host"></div>
            <div class="question-host"></div>
          </div>
          <div class="cp-foot"></div>
        </div>
        <aside class="cp-half cp-half--coach" aria-label="Coaching. Only you see this">
          <header class="cp-head">
            <div class="cp-toggle" role="tablist" aria-label="Coach panel view">
              <button type="button" class="cp-seg js-coach-seg" data-mode="support" role="tab" aria-selected="true">Support</button>
              <button type="button" class="cp-seg js-coach-seg" data-mode="scores" role="tab" aria-selected="false">Live scores</button>
            </div>
            <span class="cp-privacy">Only you see this. Never ${escapeHtml(name || "them")}.</span>
          </header>
          <div class="cp-col"><div class="coach-host"></div></div>
          <div class="cp-foot"></div>
        </aside>
      </div>`;
    waitScreen = host.firstElementChild;
    document.body.appendChild(waitScreen);

    renderCtxSegments(waitScreen.querySelector(".question-session-ctx"), store.ctx || {}, { compact: true });

    // The real coach panel, not a ghost of one: its Support view is the brief's
    // own listen-for cues, already in the store. Same component the runner
    // mounts, so the half doesn't repaint when the runner takes over.
    const coach = createCoachPanel({
      sessionId: store.sessionId,
      personName: name,
      briefCues: store.preparation?.listenFor,
    });
    waitScreen.querySelector(".coach-host").appendChild(coach.el);
    waitScreen.querySelectorAll(".js-coach-seg").forEach((seg) =>
      seg.addEventListener("click", () => {
        waitScreen.querySelectorAll(".js-coach-seg").forEach((s) =>
          s.setAttribute("aria-selected", String(s === seg)));
        coach.setMode(seg.dataset.mode);
      }));

    // flat: the runner's left column is the POC's bare Typeform look, so the ghost
    // carries no card chrome either (same call questioning.js makes turn to turn).
    waitScreen
      .querySelector(".question-host")
      .appendChild(createSkeleton({ preset: "question", flat: true, label: "Writing your first question" }));

    // No trailing ellipsis: the orb appends its own animated dots.
    const orb = createOrb("Building your questions");
    waitScreen.querySelector(".thinking-host").appendChild(orb.el);

    const sse = openSse(`/api/v1/sessions/${encodeURIComponent(store.sessionId)}/bank/stream`);
    sse
      .on("thinking", (d) => orb.setLabel(d.label))
      .on("ready", async () => {
        await orb.exit();
        const elapsed = Date.now() - mountedAt;
        if (elapsed < MIN_DISPLAY_MS) {
          await new Promise((r) => setTimeout(r, MIN_DISPLAY_MS - elapsed));
        }
        // Drop this overlay BEFORE the runner mounts its own, or the two stack
        // for a frame and the split paints twice.
        dropWaitScreen();
        setState({ stage: STAGES.QUESTIONING, substage: "Q_SHOW", turn: 0 });
      })
      .on("error", (d) => showError(d.message || "Couldn't build your questions. Try again."))
      .onError(() => showError("Lost connection while building questions."))
      .open();

    unmountFn = () => {
      sse.close();
      dropWaitScreen();
    };
  }

  // Inline error card (design-consolidation Phase 3): say what happened here
  // and retry in place — never navigate away to the ERROR stage. The split comes
  // down first: a half-built runner behind an error card reads as a live meeting.
  function showError(message) {
    if (unmountFn) unmountFn();
    unmountFn = null;
    dropWaitScreen();
    root.innerHTML = `
      <div class="stage-medium l-stack l-stack--6">
        <div class="error-card">
          <div class="text-ink">${escapeHtml(message)}</div>
        </div>
        <div class="l-cluster l-cluster--2">
          ${button({ label: "Retry", hook: "js-retry" })}
        </div>
      </div>
    `;
    root.querySelector(".js-retry").addEventListener("click", start);
  }
}

export function unmount() {
  if (unmountFn) unmountFn();
  unmountFn = null;
  dropWaitScreen();
}
