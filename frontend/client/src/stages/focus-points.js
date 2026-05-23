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
          <div class="eyebrow">Focus points</div>
          <h1 class="h1">What we'll cover</h1>
        </div>
        <button class="btn btn--ghost js-start-fresh" type="button">Start over</button>
      </header>
      <div class="thinking-host min-h-[120px] flex items-center"></div>
      <div class="result-host"></div>
    </div>
  `;
  const thinkingHost = root.querySelector(".thinking-host");
  const resultHost = root.querySelector(".result-host");

  root.querySelector(".js-start-fresh").addEventListener("click", async () => {
    const ok = await confirmAction({ message: "Are you sure?" });
    if (!ok) return;
    resetSession();
    setState({ stage: STAGES.START });
  });

  const orb = createOrb("Choosing focus points…");
  thinkingHost.appendChild(orb.el);

  const sse = openSse(`/api/focus-points/stream?s=${encodeURIComponent(sessionId)}`);
  sse
    .on("thinking", (d) => orb.setLabel(d.label))
    .on("result", async (d) => {
      await orb.exit();
      thinkingHost.remove();
      renderResult(d);
    })
    .on("error", (d) => {
      setState({
        stage: STAGES.ERROR,
        error: d.message || "Focus-point generation failed.",
        retryStage: STAGES.FOCUS_POINTS,
      });
    })
    .onError(() => {
      setState({
        stage: STAGES.ERROR,
        error: "Lost connection while generating focus points.",
        retryStage: STAGES.FOCUS_POINTS,
      });
    })
    .open();

  function renderResult(d) {
    store.focusPoints = d.focus_points;
    store.preparation = null;
    store.preparationRunId = null;

    const selectedIds = new Set();

    resultHost.innerHTML = `
      <div class="space-y-1 mb-6 reveal">
        <div class="text-ink-dim">
          <span class="font-medium text-ink">${escape(store.ctx.name)}</span>
          <span class="text-ink-mute mx-2">·</span>${escape(store.ctx.role)}
          <span class="text-ink-mute mx-2">·</span>${escape(store.ctx.seniority)}
          <span class="text-ink-mute mx-2">·</span>${escape(d.meeting_type)}
        </div>
      </div>
      <div class="focus-select-hint reveal">Pick the ones you want to cover.</div>
      <div class="card reveal focus-point-list">
        ${d.focus_points.map((fp, i) => `
          <div class="js-fp-wrapper">
            <button type="button" class="focus-point focus-point--selectable js-fp-toggle" data-fp-id="${escape(fp.id)}">
              <div class="focus-point__num">${i + 1}</div>
              <div class="focus-point__body">
                <div class="focus-point__label">${escape(fp.label || fp.type || fp.id)}</div>
                ${fp.reason ? `<div class="focus-point__reason">${escape(fp.reason)}</div>` : ""}
              </div>
              <div class="focus-point__check">✓</div>
            </button>
          </div>
        `).join("")}
      </div>
      <div class="flex gap-2 pt-6 reveal">
        <button class="btn js-continue">Prepare briefing</button>
        <button class="btn btn--ghost js-regen">Regenerate</button>
      </div>
    `;

    function syncContinue() {
      const cont = resultHost.querySelector(".js-continue");
      if (cont) cont.disabled = selectedIds.size === 0;
    }

    resultHost.querySelectorAll(".js-fp-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.fpId;
        if (selectedIds.has(id)) {
          selectedIds.delete(id);
          btn.classList.remove("is-selected");
        } else {
          selectedIds.add(id);
          btn.classList.add("is-selected");
        }
        syncContinue();
      });
    });

    const reveals = Array.from(resultHost.querySelectorAll(".reveal"));
    revealSequence(reveals, { stagger: 60, initialDelay: 80 });

    function handleKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") {
        const cont = resultHost.querySelector(".js-continue");
        if (cont && !cont.disabled) cont.click();
      }
    }
    document.addEventListener("keydown", handleKey);

    unmountFn = () => {
      sse.close();
      document.removeEventListener("keydown", handleKey);
    };

    resultHost.querySelector(".js-continue").addEventListener("click", () => {
      store.focusPoints = d.focus_points.filter((fp) => selectedIds.has(fp.id));
      setState({ stage: STAGES.PREPARATION });
    });

    resultHost.querySelector(".js-regen").addEventListener("click", () => {
      sse.close();
      setState({ stage: STAGES.FOCUS_POINTS });
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
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
