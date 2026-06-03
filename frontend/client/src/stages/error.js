import { STAGES } from "../state.js";

export async function mount(root, { store, setState }) {
  const retryTo = store.retryStage || STAGES.INTAKE;
  const technical = store.error || "Unknown error";
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--6">
      <h1 class="h1">We hit a snag.</h1>
      <div class="error-card">
        <div class="text-ink">Something went wrong on this step. You can retry or start a new session.</div>
        <details class="error-details mt-3">
          <summary class="text-sm text-ink-dim cursor-pointer">Technical details</summary>
          <div class="text-ink-dim text-sm mt-2">${escape(technical)}</div>
        </details>
      </div>
      <div class="space-y-2">
        <div class="text-ink-mute text-sm">What you can do:</div>
        <div class="l-cluster l-cluster--2">
          <button class="btn js-retry">Retry this step</button>
          <button class="btn btn--ghost js-restart">New session</button>
        </div>
      </div>
    </div>
  `;
  root.querySelector(".js-retry").addEventListener("click", () => {
    setState({ error: null, stage: retryTo });
  });
  root.querySelector(".js-restart").addEventListener("click", () => {
    try { localStorage.removeItem("seroSessionId"); } catch {}
    setState({ error: null, sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
  });
}

export function unmount() { /* nothing */ }

function escape(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
