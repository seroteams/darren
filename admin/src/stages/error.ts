import { STAGES } from "../state.js";
import { escapeHtml as escape } from "../ui/html.js";
import { reportError } from "../ui/error-reporter.js";
import type { Mount, Unmount } from "./stage.types.ts";

export const mount: Mount = async (root, { store, setState }) => {
  const retryTo = store.retryStage || STAGES.INTAKE;
  // Record the raw error for the Error log (error-log Phase 3); deduped/throttled
  // in the reporter. "Unknown error" only when we truly have nothing.
  const technical = store.error || "Unknown error";
  reportError(technical);
  // Show the manager the actual message — every consumer sets store.error to a plain
  // sentence ("This is taking longer than usual. Please try again.", "Lost connection
  // while generating the prep brief.", etc.). It used to be buried under a "Technical
  // details" fold behind a generic line, so the one thing that told them what to do
  // was the one thing they couldn't see.
  const shown = store.error || "Something went wrong on this step.";
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--6">
      <h1 class="h1">We hit a snag.</h1>
      <div class="error-card">
        <div class="text-ink">${escape(shown)}</div>
        <div class="text-ink-dim text-sm mt-2">You can retry this step, or start a new 1:1.</div>
      </div>
      <div class="space-y-2">
        <div class="l-cluster l-cluster--2">
          <button class="btn js-retry">Retry this step</button>
          <button class="btn btn--ghost js-restart">Start a new 1:1</button>
        </div>
      </div>
    </div>
  `;
  root.querySelector(".js-retry")?.addEventListener("click", () => {
    setState({ error: null, stage: retryTo });
  });
  root.querySelector(".js-restart")?.addEventListener("click", () => {
    try { localStorage.removeItem("seroSessionId"); } catch {}
    setState({ error: null, sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  });
};

export const unmount: Unmount = () => { /* nothing */ };
