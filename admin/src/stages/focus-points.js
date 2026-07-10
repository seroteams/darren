import { STAGES, resetSession } from "../state.js";
import { createOrb } from "../ui/orb.js";
import { createSkeleton } from "../ui/skeleton.js";
import { openSse } from "../../../shared/sse.js";
import { revealSequence } from "../ui/reveal.js";
import { confirmAction } from "../ui/confirm.js";
import { confirmResetSession } from "../ui/session-reset.js";
import { renderCtxSegments } from "../ui/notes-panel-utils.js";
import { setSelectedFocus } from "../../../shared/api.js";
import { escapeCopy as escape } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { Check } from "lucide";

export async function mount(root, { store, setState }) {
  const sessionId = store.sessionId;
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Focus areas</div>
        <div class="page-header__row">
          <h1 class="h1">What we'll cover</h1>
          <button class="btn btn--ghost js-start-fresh" type="button">Reset session</button>
        </div>
        <p class="text-ink-dim">Pick what this 1:1 should cover.</p>
      </header>
      <div class="thinking-host min-h-[120px] flex items-center"></div>
      <div class="result-host"></div>
    </div>
  `;
  const thinkingHost = root.querySelector(".thinking-host");
  const resultHost = root.querySelector(".result-host");

  root.querySelector(".js-start-fresh").addEventListener("click", async () => {
    const ok = await confirmResetSession(confirmAction);
    if (!ok) return;
    resetSession();
    setState({ stage: STAGES.START });
  });

  const orb = createOrb("Analysing context…");
  thinkingHost.appendChild(orb.el);
  resultHost.appendChild(createSkeleton(4));

  const regenerate = store.regenerateFocusPoints;
  if (regenerate) setState({ regenerateFocusPoints: false });

  const streamQs = regenerate ? "?regenerate=1" : "";
  const sse = openSse(`/api/v1/sessions/${encodeURIComponent(sessionId)}/focus-points/stream${streamQs}`);
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
        error: "Lost connection while generating focus areas.",
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
        <div class="ctx-segments focus-ctx text-ink-dim"></div>
      </div>
      <div class="card-flat space-y-2 mb-5 reveal">
        <div class="eyebrow">Your notes</div>
        <p class="text-ink-dim">${escape(store.ctx?.notes || "(no notes added)")}</p>
      </div>
      ${store.scripted ? `<div class="focus-select-hint reveal">Choose what the prep brief should emphasise. Replay questions stay fixed.</div>` : `<div class="focus-select-hint reveal">Select at least one topic for this 1:1.</div>`}
      <div class="card reveal focus-point-list">
        ${d.focus_points.map((fp, i) => `
          <div class="js-fp-wrapper">
            <button type="button" class="focus-point focus-point--selectable js-fp-toggle" data-fp-id="${escape(fp.id)}" aria-pressed="false" title="${escape(fp.reason || "")}">
              <div class="focus-point__num">${i + 1}</div>
              <div class="focus-point__body">
                <div class="focus-point__label">${escape(fp.label || fp.type || fp.id)}</div>
                ${fp.reason ? `<div class="focus-point__reason">${escape(focusReason(fp.reason))}</div>` : ""}
                ${evidenceTag(fp)}
              </div>
              <div class="focus-point__check" aria-hidden="true"></div>
            </button>
          </div>
        `).join("")}
      </div>
      <div class="l-cluster l-cluster--2 pt-6 reveal focus-actions">
        <button class="btn js-continue">Continue to prep brief</button>
        <button type="button" class="btn btn--ghost js-copy-focus">Copy focus areas</button>
        <button class="btn btn--ghost js-regen">Regenerate focus areas</button>
      </div>
    `;

    const ctxEl = resultHost.querySelector(".focus-ctx");
    renderCtxSegments(ctxEl, {
      ...store.ctx,
      meetingType: d.meeting_type || store.ctx.meetingType,
    });

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
          btn.setAttribute("aria-pressed", "false");
        } else {
          selectedIds.add(id);
          btn.classList.add("is-selected");
          btn.setAttribute("aria-pressed", "true");
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

    syncContinue();

    resultHost.querySelector(".js-continue").addEventListener("click", async () => {
      const ids = Array.from(selectedIds);
      if (!ids.length) return;
      const btn = resultHost.querySelector(".js-continue");
      btn.disabled = true;
      try {
        await setSelectedFocus(sessionId, ids);
      } catch (e) {
        console.warn("[focus-points] selected focus save failed:", e.message);
      }
      store.focusPoints = d.focus_points.filter((fp) => selectedIds.has(fp.id));
      setState({ stage: STAGES.PREPARATION });
    });

    resultHost.querySelector(".js-copy-focus").addEventListener("click", () => {
      copyFocusPoints(d.focus_points, store.ctx, resultHost.querySelector(".js-copy-focus"));
    });

    resultHost.querySelector(".js-regen").addEventListener("click", () => {
      sse.close();
      setState({
        regenerateFocusPoints: true,
        stageTick: store.stageTick + 1,
        focusPoints: null,
        preparation: null,
        preparationRunId: null,
      });
    });
  }

  unmountFn = () => sse.close();
}

let unmountFn = null;
export function unmount() {
  if (unmountFn) unmountFn();
  unmountFn = null;
}

function focusReason(text) {
  const trimmed = String(text == null ? "" : text).trim();
  if (!trimmed) return "";
  const first = trimmed.match(/^(.+?[.!?])(?:\s|$)/)?.[1];
  return first || trimmed;
}

// Plain-language evidence tag: where this point came from, so the manager
// knows how much weight to put on it. Quiet text, no badge chrome.
function evidenceTag(fp) {
  if (!fp || !fp.source) return "";
  const text =
    fp.source === "signal"
      ? fp.confidence === "high"
        ? "from your note, clearly stated"
        : "from your note"
      : "common for this level";
  return `<div class="focus-point__evidence text-xs text-ink-mute">${text}</div>`;
}

function formatFocusPointsForCopy(focusPoints, ctx) {
  const lines = ["What we'll cover"];
  const who = [ctx?.name, ctx?.seniority, ctx?.role, ctx?.meetingType].filter(Boolean).join(" · ");
  if (who) lines.push(who);
  lines.push("");
  focusPoints.forEach((fp, i) => {
    lines.push(`${i + 1}. ${fp.label || fp.type || fp.id}`);
    if (fp.reason) lines.push(String(fp.reason).trim());
    lines.push("");
  });
  return lines.join("\n").trim();
}

async function copyFocusPoints(focusPoints, ctx, btn) {
  const text = formatFocusPointsForCopy(focusPoints, ctx);
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const prev = btn.textContent;
    btn.innerHTML = "Copied " + icon(Check, { size: 16 });
    setTimeout(() => { btn.textContent = prev; }, 1500);
  } catch (e) {
    console.warn("[focus-points] clipboard write failed:", e.message);
  }
}

