import { STAGES } from "../state.js";
import { createOrb } from "../ui/orb.js";
import { createSkeleton } from "../ui/skeleton.js";
import { flowInterstitial } from "../ui/flow-interstitial.ts";
import { escapeHtml } from "../ui/html.js";
import { openSse } from "../../../shared/sse.js";

let unmountFn = null;

export async function mount(root, { store, setState }) {
  start();

  // Renders the shared waiting screen and opens the stream. Also the retry
  // path: the inline error card calls this again to re-open the stream.
  function start() {
    root.innerHTML = `
      <div class="stage-medium l-stack l-stack--8">
        ${flowInterstitial({ step: "Recap" })}
      </div>
    `;
    const orb = createOrb("Writing your recap…");
    root.querySelector(".js-fi-orb").appendChild(orb.el);
    root.querySelector(".js-fi-skeleton").appendChild(createSkeleton(3));

    const sse = openSse(`/api/v1/sessions/${encodeURIComponent(store.sessionId)}/evaluation/stream`);
    sse
      .on("thinking", (d) => orb.setLabel(d.label))
      .on("briefing", async (d) => {
        await orb.exit();
        store.briefing = d;
        setState({
          briefing: d,
          stage: STAGES.BRIEFING,
          completedAt: d.completedAt ?? store.completedAt ?? null,
        });
      })
      .on("error", (d) => showError(d.message || "Couldn't finish your recap. Try again."))
      .onError(() => showError("Lost connection while pulling your recap together. Try again."))
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
