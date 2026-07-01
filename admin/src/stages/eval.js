import { STAGES } from "../state.js";
import { createOrb } from "../ui/orb.js";
import { openSse } from "../../../shared/sse.js";

let unmountFn = null;

export async function mount(root, { store, setState }) {
  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      <div class="flex items-center justify-center min-h-[40dvh]">
        <div class="thinking-host flex items-center justify-center"></div>
      </div>
    </div>
  `;
  const thinkingHost = root.querySelector(".thinking-host");
  const orb = createOrb("Writing briefing…");
  thinkingHost.appendChild(orb.el);

  const sse = openSse(`/api/evaluation/stream?s=${encodeURIComponent(store.sessionId)}`);
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
    .on("error", (d) => {
      setState({
        stage: STAGES.ERROR,
        error: d.message || "Evaluation failed.",
        retryStage: STAGES.EVAL,
      });
    })
    .onError(() => {
      setState({
        stage: STAGES.ERROR,
        error: "Lost connection during synthesis.",
        retryStage: STAGES.EVAL,
      });
    })
    .open();

  unmountFn = () => sse.close();
}

export function unmount() {
  if (unmountFn) unmountFn();
  unmountFn = null;
}
