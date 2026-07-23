import { STAGES } from "../state.js";
import { createOrb } from "../ui/orb.js";
import { createSkeleton } from "../ui/skeleton.js";
import { openSse } from "../../../shared/sse.js";
import { revealOne } from "../ui/reveal.js";
import { renderCtxSegments } from "../ui/notes-panel-utils.js";
import { setSelectedFocus } from "../../../shared/api.js";
import { escapeCopy as escape } from "../ui/html.js";
import { wizardFooter } from "../ui/wizard-footer.ts";
import { focusPointCardHtml, selectedNote } from "./focus-points-card.ts";

export async function mount(root, { store, setState }) {
  const sessionId = store.sessionId;
  // No per-screen "Discard prep" (audit F3): the exit lives in the topbar's
  // "This 1:1" menu, which is live from this stage onward.
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Focus areas</div>
        <h1 class="h1">What we'll cover</h1>
        <p class="text-ink-dim">Pick what this 1:1 should cover.</p>
      </header>
      <div class="thinking-host min-h-[120px] flex items-center"></div>
      <div class="result-host"></div>
    </div>
  `;
  const thinkingHost = root.querySelector(".thinking-host");
  const resultHost = root.querySelector(".result-host");

  let sse = null;

  // On mount, consume the one-shot regenerate flag (set by the Regenerate
  // action) exactly as before; a retry after an error re-runs the SAME load.
  const regenerate = store.regenerateFocusPoints;
  if (regenerate) setState({ regenerateFocusPoints: false });

  function startLoad(regen) {
    if (sse) sse.close();
    thinkingHost.hidden = false;
    thinkingHost.replaceChildren();
    resultHost.replaceChildren();
    const orb = createOrb("Reading your notes…");
    thinkingHost.appendChild(orb.el);
    resultHost.appendChild(createSkeleton(4));

    const streamQs = regen ? "?regenerate=1" : "";
    sse = openSse(`/api/v1/sessions/${encodeURIComponent(sessionId)}/focus-points/stream${streamQs}`);
    sse
      .on("thinking", (d) => orb.setLabel(d.label))
      .on("result", async (d) => {
        await orb.exit();
        thinkingHost.replaceChildren();
        thinkingHost.hidden = true;
        renderResult(d);
      })
      .on("error", (d) => {
        showError(d.message || "Couldn't pull your focus areas together. Try again. Your notes are safe.", regen);
      })
      .onError(() => {
        showError("Lost connection while generating focus areas.", regen);
      })
      .open();
  }

  // Inline error card + retry (audit flow finding 8): stay on this screen and
  // re-run the same load instead of navigating away to the ERROR stage.
  function showError(message, regen) {
    if (sse) sse.close();
    thinkingHost.replaceChildren();
    thinkingHost.hidden = true;
    resultHost.innerHTML = `
      <div class="l-stack l-stack--6">
        <div class="error-card">
          <div class="text-ink">${escape(message)}</div>
          <div class="text-ink-dim text-sm mt-2">Your notes are safe. You can retry this step.</div>
        </div>
        <div class="l-cluster l-cluster--2">
          <button class="btn js-retry" type="button">Retry</button>
        </div>
      </div>
    `;
    resultHost.querySelector(".js-retry").addEventListener("click", () => startLoad(regen));
  }

  function renderResult(d) {
    store.focusPoints = d.focus_points;
    store.preparation = null;
    store.preparationRunId = null;

    const selectedIds = new Set();

    // ONE fade for the whole result block (audit F5) — no staggered reveal.
    // Regenerate is a quiet text action beside the list header, so the footer's
    // blue Continue stays the screen's one primary.
    resultHost.innerHTML = `
      <div class="reveal">
        <div class="space-y-1 mb-6">
          <div class="ctx-segments focus-ctx text-ink-dim"></div>
        </div>
        <div class="card-flat space-y-2 mb-5">
          <div class="eyebrow">Your notes</div>
          <p class="text-ink-dim">${escape(store.ctx?.notes || "(no notes added)")}</p>
        </div>
        <div class="l-cluster l-cluster--2 mb-3">
          ${store.scripted ? `<div class="focus-select-hint">Choose what the prep brief should emphasise. Replay questions stay fixed.</div>` : `<div class="focus-select-hint">Select at least one topic for this 1:1.</div>`}
          <button type="button" class="link text-ink-dim text-sm js-regen">Regenerate focus areas</button>
        </div>
        <div class="focus-point-list" role="group" aria-label="Focus areas">
          ${d.focus_points.map((fp, i) => focusPointCardHtml(fp, i)).join("")}
        </div>
        <div class="pt-6">
          ${wizardFooter({
            back: {},
            primary: { label: "Continue to prep brief", disabled: true },
            note: selectedNote(0),
          })}
        </div>
      </div>
    `;

    const ctxEl = resultHost.querySelector(".focus-ctx");
    renderCtxSegments(ctxEl, {
      ...store.ctx,
      meetingType: d.meeting_type || store.ctx.meetingType,
    });

    const contBtn = resultHost.querySelector(".js-wf-continue");
    const noteEl = resultHost.querySelector(".wizard-footer__note");

    function syncSelection() {
      contBtn.disabled = selectedIds.size === 0;
      noteEl.textContent = selectedNote(selectedIds.size);
    }

    resultHost.querySelectorAll(".js-fp-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.fpId;
        if (selectedIds.has(id)) {
          selectedIds.delete(id);
          btn.classList.remove("is-selected");
          btn.setAttribute("aria-checked", "false");
        } else {
          selectedIds.add(id);
          btn.classList.add("is-selected");
          btn.setAttribute("aria-checked", "true");
        }
        syncSelection();
      });
    });

    revealOne(resultHost.querySelector(".reveal"));

    syncSelection();

    contBtn.addEventListener("click", async () => {
      const ids = Array.from(selectedIds);
      if (!ids.length) return;
      contBtn.disabled = true;
      try {
        await setSelectedFocus(sessionId, ids);
      } catch (e) {
        console.warn("[focus-points] selected focus save failed:", e.message);
      }
      store.focusPoints = d.focus_points.filter((fp) => selectedIds.has(fp.id));
      setState({ stage: STAGES.PREPARATION });
    });

    // Footer Back returns to the last setup step with the notes still there —
    // the intake reads them straight back out of store.ctx.
    resultHost.querySelector(".js-wf-back").addEventListener("click", () => {
      sse.close();
      setState({ stage: STAGES.INTAKE, substage: "NOTES" });
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

  startLoad(regenerate);
  unmountFn = () => { if (sse) sse.close(); };
}

let unmountFn = null;
export function unmount() {
  if (unmountFn) unmountFn();
  unmountFn = null;
}
