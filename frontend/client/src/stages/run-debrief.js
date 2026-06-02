import { STAGES } from "../state.js";
import { getLexiconScope } from "../api.js";
import { buildPayloadFromStore, mountRunDebrief } from "../ui/run-debrief.js";

export async function mount(root, { store, setState, resetSession }) {
  root.innerHTML = `
    <div class="stage-inner space-y-6">
      <header class="space-y-1">
        <div class="eyebrow">Run log</div>
        <h1 class="h1">How it went</h1>
      </header>
      <div class="run-debrief-mount"></div>
      <footer class="pt-2 flex gap-2 items-center">
        <button type="button" class="btn js-continue">Continue</button>
      </footer>
    </div>
  `;

  const debriefMount = root.querySelector(".run-debrief-mount");
  mountRunDebrief(debriefMount, buildPayloadFromStore(store, store.briefing));

  root.querySelector(".js-continue").addEventListener("click", async () => {
    let eligible = false;
    try {
      const data = await getLexiconScope(store.sessionId);
      eligible = Boolean(data?.eligible);
    } catch (e) {
      console.warn("[run-debrief] lexicon scope check failed:", e.message);
    }

    if (eligible) {
      setState({ stage: STAGES.LEXICON_REVIEW });
      return;
    }

    try { localStorage.removeItem("seroSessionId"); } catch {}
    resetSession();
    setState({ stage: STAGES.INTAKE, substage: "NAME" });
  });
}

export function unmount() {}
