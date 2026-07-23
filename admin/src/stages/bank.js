import { STAGES } from "../state.js";
import { createOrb } from "../ui/orb.js";
import { createSkeleton } from "../ui/skeleton.js";
import { flowInterstitial } from "../ui/flow-interstitial.ts";
import { escapeHtml } from "../ui/html.js";
import { openSse } from "../../../shared/sse.js";

let unmountFn = null;
const MIN_DISPLAY_MS = 1000;

export async function mount(root, { store, setState }) {
  start();

  // Renders the shared waiting screen and opens the stream. Also the retry
  // path: the inline error card calls this again to re-open the stream.
  function start() {
    const mountedAt = Date.now();

    root.innerHTML = `
      <div class="stage-medium l-stack l-stack--8">
        ${flowInterstitial({ step: "Questions" })}
      </div>
    `;
    const orb = createOrb("Building questions…");
    root.querySelector(".js-fi-orb").appendChild(orb.el);
    root.querySelector(".js-fi-skeleton").appendChild(createSkeleton(3));

    const sse = openSse(`/api/v1/sessions/${encodeURIComponent(store.sessionId)}/bank/stream`);
    sse
      .on("thinking", (d) => orb.setLabel(d.label))
      .on("ready", async () => {
        await orb.exit();
        const elapsed = Date.now() - mountedAt;
        if (elapsed < MIN_DISPLAY_MS) {
          await new Promise((r) => setTimeout(r, MIN_DISPLAY_MS - elapsed));
        }
        setState({ stage: STAGES.QUESTIONING, substage: "Q_SHOW", turn: 0 });
      })
      .on("error", (d) => showError(d.message || "Couldn't build your questions. Try again."))
      .onError(() => showError("Lost connection while building questions."))
      .open();

    unmountFn = () => sse.close();
  }

  // Inline error card (design-consolidation Phase 3): say what happened here
  // and retry in place — never navigate away to the ERROR stage.
  function showError(message) {
    if (unmountFn) unmountFn();
    unmountFn = null;
    root.innerHTML = `
      <div class="stage-medium l-stack l-stack--6">
        <div class="error-card">
          <div class="text-ink">${escapeHtml(message)}</div>
        </div>
        <div class="l-cluster l-cluster--2">
          <button type="button" class="btn js-retry">Retry</button>
        </div>
      </div>
    `;
    root.querySelector(".js-retry").addEventListener("click", start);
  }
}

export function unmount() {
  if (unmountFn) unmountFn();
  unmountFn = null;
}
