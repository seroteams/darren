import { STAGES } from "../state.js";
import { createOrb } from "../ui/orb.js";
import { openSse } from "../sse.js";

let unmountFn = null;

export async function mount(root, { store, setState }) {
  root.innerHTML = `
    <div class="stage-inner space-y-8">
      <div class="thinking-host min-h-[120px] flex items-center"></div>
    </div>
  `;
  const thinkingHost = root.querySelector(".thinking-host");

  const orb = createOrb("Preparing your questions…");
  thinkingHost.appendChild(orb.el);

  const sse = openSse(`/api/bank/stream?s=${encodeURIComponent(store.sessionId)}`);
  sse
    .on("thinking", (d) => orb.setLabel(d.label))
    .on("ready", async () => {
      await orb.exit();
      setState({ stage: STAGES.QUESTIONING, substage: "Q_SHOW", turn: 0 });
    })
    .on("error", (d) => {
      setState({
        stage: STAGES.ERROR,
        error: d.message || "Bank generation failed.",
        retryStage: STAGES.BANK,
      });
    })
    .onError(() => {
      setState({
        stage: STAGES.ERROR,
        error: "Lost connection while building the question bank.",
        retryStage: STAGES.BANK,
      });
    })
    .open();

  unmountFn = () => sse.close();
}

export function unmount() {
  if (unmountFn) unmountFn();
  unmountFn = null;
}
