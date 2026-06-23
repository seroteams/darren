import { STAGES } from "../state.js";
import { getLexiconScope } from "../api.js";
import { buildPayloadFromStore, buildQaReviewPromptFromStore, mountRunDebrief } from "../ui/run-debrief.js";

export async function mount(root, { store, setState, resetSession }) {
  root.innerHTML = `
    <div class="stage-wide l-stack l-stack--6">
      <header class="page-header">
        <div class="eyebrow">Session review</div>
        <h1 class="h1">How this run went</h1>
        <p class="text-ink-dim text-sm">API time = model calls only · wall clock = your full session length</p>
      </header>
      <div class="run-debrief-mount"></div>
      <footer class="pt-2 l-cluster l-cluster--2 items-center">
        <button type="button" class="btn js-copy-prompt">Copy QA prompt</button>
        <button type="button" class="btn btn--ghost js-continue">Continue to phrase library</button>
        <span class="js-copy-confirm text-sm text-ink-mute" style="opacity:0; transition: opacity 0.2s;">Copied ✓</span>
      </footer>
    </div>
  `;

  const debriefMount = root.querySelector(".run-debrief-mount");
  const payload = buildPayloadFromStore(store, store.briefing);
  mountRunDebrief(debriefMount, payload);

  const continueBtn = root.querySelector(".js-continue");

  const copyBtn = root.querySelector(".js-copy-prompt");
  const copyConfirm = root.querySelector(".js-copy-confirm");
  copyBtn.addEventListener("click", async () => {
    const text = buildQaReviewPromptFromStore(store, store.briefing);
    try {
      await navigator.clipboard.writeText(text);
      copyConfirm.style.opacity = "1";
      setTimeout(() => { copyConfirm.style.opacity = "0"; }, 1500);
    } catch (e) {
      console.warn("[run-debrief] clipboard write failed:", e.message);
    }
  });

  continueBtn.addEventListener("click", async () => {
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

    resetSession();
    setState({ stage: STAGES.START });
  });

  try {
    const data = await getLexiconScope(store.sessionId);
    if (!data?.eligible) continueBtn.textContent = "Done";
  } catch {
    continueBtn.textContent = "Done";
  }
}

export function unmount() {}
