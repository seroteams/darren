import { STAGES } from "../state.js";
import { createOrb } from "../ui/orb.js";
import { openSse } from "../sse.js";

let unmountFn = null;

export async function mount(root, { store, setState }) {
  root.innerHTML = `
    <div class="stage-inner space-y-8">
      <header class="space-y-1 text-center max-w-sm mx-auto">
        <div class="eyebrow">Synthesis</div>
        <h1 class="h1">Writing your briefing</h1>
      </header>
      <div class="flex items-center justify-center min-h-[40dvh]">
        <div class="space-y-5 text-center">
          <div class="thinking-host flex items-center justify-center"></div>
          <div class="text-ink-dim text-sm max-w-sm mx-auto">Sero is turning the conversation into a post-meeting briefing. This takes a few seconds.</div>
        </div>
      </div>
    </div>
  `;
  const thinkingHost = root.querySelector(".thinking-host");
  const orb = createOrb("Writing your briefing…");
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
