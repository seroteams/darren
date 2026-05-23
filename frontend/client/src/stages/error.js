import { STAGES } from "../state.js";

export async function mount(root, { store, setState }) {
  const retryTo = store.retryStage || STAGES.INTAKE;
  root.innerHTML = `
    <div class="stage-inner space-y-6">
      <h1 class="h1">We hit a snag.</h1>
      <div class="error-card">
        <div class="text-ink-dim">${escape(store.error || "Unknown error")}</div>
      </div>
      <div class="flex gap-2">
        <button class="btn js-retry">Try again</button>
        <button class="btn btn--ghost js-restart">Start over</button>
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
