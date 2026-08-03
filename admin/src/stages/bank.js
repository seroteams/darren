// The question-bank stage. This screen routes straight into the runner
// (stages/questioning.js), so it wears the RUNNER'S layout rather than a centred
// card: same 50/50 split, same 72px headers, same 560px measure. Carl,
// 2026-07-30 — the old centred interstitial meant the whole page changed shape
// the moment the first question landed.
//
// It leads with the WALK-IN GATE, not a wait (Carl, 2026-07-30). The gate needs
// nothing from this stream — its two reasons come from the prep brief, which
// finished a screen ago — so it goes up straight away and the bank generates
// behind it while the manager reads. Tapping "Start the meeting" hands over
// instantly if the bank already landed, and only then falls back to the ghost.
// The gate is marked shown here (sessionStorage), so questioning.js's own
// showReadyGate skips it and the card is never seen twice.
//
// What each half is doing, and why they differ:
//   • Left  — everything except the question itself is already known (the person,
//     the meeting type, the step), so it paints for real. Only the question is a
//     ghost, at the height the real one lands.
//   • Right — the coaching half needs NOTHING from this stream either. Same prep
//     brief, so the panel renders in full and can be read while the bank builds.
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
import { revealOne } from "../ui/reveal.js";
import { EXIT_LABEL } from "./questioning-actions.ts";
import { readyCardHtml, readyAlreadyShown, markReadyShown, READY_STEP_LABEL, offerActionsFor } from "./questioning-ready.ts";
import { loadPriorActions, openActionCount } from "./prior-actions.ts";
import { segmentOneLabel } from "../ui/coach-panel-state.ts";
import { getPriorRecap } from "../../../shared/api.js";

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
    root.innerHTML = "";
    dropWaitScreen();

    const name = store.ctx?.name || "";
    // A fresh 1:1 leads with the walk-in gate; a resumed one has already had it,
    // so it goes straight to the ghost and back to the question it left off on.
    // Either way the step name is known now, so the header doesn't fill in late.
    const gateFirst = !readyAlreadyShown(store.sessionId);
    const step = gateFirst ? READY_STEP_LABEL : "";

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

    // The walk-in glance (last-one-to-one P3). This stage never runs a question,
    // so it only ever turns the glance ON; the runner stands it down at question 1.
    // The label lives in coach-panel-state.ts because questioning.js draws the same
    // header and the two must not drift.
    const seg1 = waitScreen.querySelector('.js-coach-seg[data-mode="support"]');
    function showGlance(prior) {
      if (!seg1 || !coach.setPriorRecap || !coach.setPriorRecap(prior)) return;
      seg1.textContent = segmentOneLabel(true);
      seg1.dataset.mode = "last";
      seg1.setAttribute("aria-selected", "true");
      waitScreen.querySelector('.js-coach-seg[data-mode="scores"]')?.setAttribute("aria-selected", "false");
    }

    const thinkingHost = waitScreen.querySelector(".thinking-host");
    const questionHost = waitScreen.querySelector(".question-host");

    let orb = null;
    let orbLabel = "Building your questions"; // last label the stream sent, for a late orb
    let bankReady = false;
    let handedOver = false;
    let waitShownAt = 0; // when the ghost went up; stays 0 while the gate is on screen

    // The ghost: the loading mark inline above a question-shaped placeholder, at
    // the height the real one lands. Only reached when the manager taps Start
    // before the bank has finished — or on a resumed run, which has no gate.
    function showWait() {
      waitShownAt = Date.now();
      questionHost.innerHTML = "";
      thinkingHost.hidden = false;
      thinkingHost.innerHTML = "";
      // flat: the runner's left column is the POC's bare Typeform look, so the ghost
      // carries no card chrome either (same call questioning.js makes turn to turn).
      questionHost.appendChild(createSkeleton({ preset: "question", flat: true, label: "Writing your first question" }));
      // No trailing ellipsis: the orb appends its own animated dots.
      orb = createOrb(orbLabel);
      thinkingHost.appendChild(orb.el);
    }

    // The walk-in gate, rendered from the runner's own module so the card can't
    // drift between the two stages. Hiding the empty thinking host keeps the
    // column's gap off a card that has no loading mark above it.
    //
    // `openActions` is how many of last time's agreed actions are still open. It
    // is read before this runs (see start()) because the offer has to be there
    // from the first paint — a second button that appears late is the "header
    // fills in late" fault in a different coat.
    function showGate(openActions) {
      thinkingHost.hidden = true;
      const card = document.createElement("div");
      card.className = "cp-q cp-ready space-y-4 reveal";
      card.innerHTML = readyCardHtml({ name, brief: store.preparation, openActions });
      questionHost.appendChild(card);
      revealOne(card, 40);
      const leave = (reviewFirst) => {
        if (handedOver || waitShownAt) return; // one tap only
        // Stamped here, so questioning.js's own showReadyGate skips it and the
        // manager never reads the same card twice. The choice rides the store,
        // because the runner mounts as a separate stage.
        markReadyShown(store.sessionId);
        store.reviewActionsFirst = reviewFirst;
        if (bankReady) {
          enterRunner();
          return;
        }
        showWait();
      };
      card.querySelector(".js-wf-continue").addEventListener("click", () => leave(false));
      card.querySelector(".js-review-actions")?.addEventListener("click", () => leave(true));
    }

    async function enterRunner() {
      if (handedOver) return;
      handedOver = true;
      if (orb) await orb.exit();
      // Only the ghost carries a minimum on screen — a one-frame flash of it is
      // worse than never showing it. A tap that lands on an already-built bank
      // waits for nothing at all, which is the whole point of leading with the gate.
      const shown = waitShownAt ? Date.now() - waitShownAt : MIN_DISPLAY_MS;
      if (shown < MIN_DISPLAY_MS) {
        await new Promise((r) => setTimeout(r, MIN_DISPLAY_MS - shown));
      }
      // Drop this overlay BEFORE the runner mounts its own, or the two stack
      // for a frame and the split paints twice.
      dropWaitScreen();
      setState({ stage: STAGES.QUESTIONING, substage: "Q_SHOW", turn: 0 });
    }

    if (!gateFirst) showWait();

    const sse = openSse(`/api/v1/sessions/${encodeURIComponent(store.sessionId)}/bank/stream`);
    sse
      .on("thinking", (d) => {
        orbLabel = d.label;
        if (orb) orb.setLabel(d.label);
      })
      .on("ready", () => {
        bankReady = true;
        // While the gate is still up the manager's tap is the hand-over, not the
        // stream — landing the bank must never yank the card out from under them.
        if (waitShownAt) enterRunner();
      })
      .on("error", (d) => showError(d.message || "Couldn't build your questions. Try again."))
      .onError(() => showError("Lost connection while building questions."))
      .open();

    // The gate goes up AFTER the stream is open, so reading last time's open
    // actions costs the manager nothing: the bank is already generating behind
    // the empty column while this one small GET lands. It degrades to zero, so
    // the card always arrives — with the offer if there is one, without if not.
    if (gateFirst) {
      // Both reads together, so the panel is never a Support view that swaps under
      // the manager mid-read (last-one-to-one P3). Each degrades to nothing on its
      // own, so the card always arrives.
      Promise.all([
        loadPriorActions(store),
        getPriorRecap(store.sessionId).then((r) => r?.prior ?? null).catch(() => null),
      ]).then(([prior, recap]) => {
        // The run may have moved on while this was in flight: handed over, fallen
        // back to the ghost, or errored (which detaches this whole screen).
        if (handedOver || waitShownAt || !questionHost.isConnected) return;
        showGlance(recap);
        const n = openActionCount(prior);
        showGate(offerActionsFor(store.ctx?.meetingType, n) ? n : 0);
      });
    }

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
