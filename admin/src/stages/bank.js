import { STAGES } from "../state.js";
import { createOrb } from "../ui/orb.js";
import { openSse } from "../../../shared/sse.js";

let unmountFn = null;
const MIN_DISPLAY_MS = 1000;

export async function mount(root, { store, setState }) {
  const mountedAt = Date.now();

  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      <div class="thinking-host min-h-[120px] flex items-center"></div>
    </div>
  `;
  const thinkingHost = root.querySelector(".thinking-host");

  const orb = createOrb("Building questions…");
  thinkingHost.appendChild(orb.el);

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
    .on("error", (d) => {
      setState({
        stage: STAGES.ERROR,
        error: d.message || "Question generation failed.",
        retryStage: STAGES.BANK,
      });
    })
    .onError(() => {
      setState({
        stage: STAGES.ERROR,
        error: "Lost connection while building questions.",
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
