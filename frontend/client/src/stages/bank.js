import { STAGES } from "../state.js";
import { createOrb } from "../ui/orb.js";
import { openSse } from "../sse.js";
import { revealOne } from "../ui/reveal.js";
import { createShortcutsOverlay } from "../ui/shortcuts.js";

let unmountFn = null;

export async function mount(root, { store, setState }) {
  root.innerHTML = `
    <div class="stage-inner space-y-8">
      <header class="space-y-1">
        <div class="eyebrow">Question bank</div>
      </header>
      <div class="thinking-host min-h-[120px] flex items-center"></div>
      <div class="ready-host"></div>
    </div>
  `;
  const thinkingHost = root.querySelector(".thinking-host");
  const readyHost = root.querySelector(".ready-host");

  const orb = createOrb("Building your question bank…");
  thinkingHost.appendChild(orb.el);

  const sse = openSse(`/api/bank/stream?s=${encodeURIComponent(store.sessionId)}`);
  sse
    .on("thinking", (d) => orb.setLabel(d.label))
    .on("ready", async (d) => {
      await orb.exit();
      thinkingHost.remove();
      readyHost.innerHTML = `
        <div class="space-y-5 reveal">
          <h1 class="h1">Your question bank is ready.</h1>
          <div class="hint">${d.count ?? "Several"} tailored questions, plus your intro set. Questions adapt as answers come in — we'll re-rank after each one.</div>
          <div class="field-actions">
            <button class="btn js-start">Start the 1:1</button>
          </div>
        </div>
      `;
      revealOne(readyHost.querySelector(".reveal"), 60);

      const startBtn = readyHost.querySelector(".js-start");
      const doStart = () => setState({ stage: STAGES.QUESTIONING, substage: "Q_SHOW", turn: 0 });
      startBtn.addEventListener("click", doStart);

      const overlay = createShortcutsOverlay([{ key: "Enter", label: "Start" }]);

      const onKeyDown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          document.removeEventListener("keydown", onKeyDown);
          overlay.destroy();
          doStart();
        }
      };
      document.addEventListener("keydown", onKeyDown);
      unmountFn = () => {
        sse.close();
        document.removeEventListener("keydown", onKeyDown);
        overlay.destroy();
      };
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
