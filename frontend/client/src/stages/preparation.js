import { STAGES, resetSession } from "../state.js";
import { createOrb } from "../ui/orb.js";
import { openSse } from "../sse.js";
import { revealSequence } from "../ui/reveal.js";
import { confirmAction } from "../ui/confirm.js";

export async function mount(root, { store, setState }) {
  const sessionId = store.sessionId;

  root.innerHTML = `
    <div class="stage-inner space-y-8">
      <header class="flex items-baseline justify-between">
        <div class="space-y-1">
          <div class="eyebrow">Preparation</div>
          <div class="text-ink-dim text-sm">Your briefing for ${escape(store.ctx.name || "this 1:1")}.</div>
        </div>
        <button class="btn btn--ghost js-start-fresh" type="button">Start over</button>
      </header>
      <div class="thinking-host min-h-[120px] flex items-center"></div>
      <div class="result-host"></div>
    </div>
  `;
  const thinkingHost = root.querySelector(".thinking-host");
  const resultHost   = root.querySelector(".result-host");

  root.querySelector(".js-start-fresh").addEventListener("click", async () => {
    const ok = await confirmAction({ message: "Are you sure?" });
    if (!ok) return;
    resetSession();
    setState({ stage: STAGES.START });
  });

  const orb = createOrb("Preparing your briefing…");
  thinkingHost.appendChild(orb.el);

  const sse = openSse(`/api/preparation/stream?s=${encodeURIComponent(sessionId)}`);
  sse
    .on("thinking", (d) => orb.setLabel(d.label))
    .on("result", async (d) => {
      await orb.exit();
      thinkingHost.remove();
      setState({ preparation: d.brief, preparationRunId: d.runId });
      renderResult(d.brief);
    })
    .on("error", (d) => {
      setState({
        stage: STAGES.ERROR,
        error: d.message || "Preparation briefing failed.",
        retryStage: STAGES.PREPARATION,
      });
    })
    .onError(() => {
      setState({
        stage: STAGES.ERROR,
        error: "Lost connection while generating the preparation briefing.",
        retryStage: STAGES.PREPARATION,
      });
    })
    .open();

  function renderResult(brief) {
    const sections = [
      { label: "Probable theme",   key: "coreIssue",       type: "paragraph" },
      { label: "Opener",           key: "openingQuestion", type: "callout" },
      { label: "Listen for",       key: "listenFor",       type: "bullets" },
      { label: "Avoid",            key: "avoid",           type: "bullets" },
      { label: "Good outcome",     key: "goodOutcome",     type: "paragraph" },
      { label: "Suggested action", key: "suggestedAction", type: "paragraph" },
    ];

    function renderField(type, value) {
      if (type === "bullets" && Array.isArray(value)) {
        return `<ul class="prep-list">${value.map(item => `<li>${escape(item)}</li>`).join("")}</ul>`;
      }
      if (type === "callout") {
        return `<blockquote class="prep-callout">${escape(value || "")}</blockquote>`;
      }
      return `<p class="text-ink leading-relaxed">${escape(value || "")}</p>`;
    }

    resultHost.innerHTML = `
      <div class="space-y-6">
        ${sections.map((s) => `
          <div class="reveal">
            <div class="eyebrow mb-2">${s.label}</div>
            <div class="card">
              ${renderField(s.type, brief[s.key])}
            </div>
          </div>
        `).join("")}
        <div class="flex gap-2 pt-2 reveal">
          <button class="btn js-continue">Build question bank</button>
          <button class="btn btn--ghost js-restart">Start over</button>
        </div>
      </div>
    `;

    const reveals = Array.from(resultHost.querySelectorAll(".reveal"));
    revealSequence(reveals, { stagger: 80, initialDelay: 80 });

    resultHost.querySelector(".js-continue").addEventListener("click", () => {
      setState({ stage: STAGES.BANK });
    });

    resultHost.querySelector(".js-restart").addEventListener("click", () => {
      try { localStorage.removeItem("seroSessionId"); } catch {}
      setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
    });
  }

  unmountFn = () => sse.close();
}

let unmountFn = null;
export function unmount() {
  if (unmountFn) unmountFn();
  unmountFn = null;
}

function escape(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
