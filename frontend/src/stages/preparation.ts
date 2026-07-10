// /prepare — the customer-owned prep-brief stage (prepare-variants). One
// brief, no At-a-glance/Full-brief duplication, five switchable layout
// variants behind an internal-admin-only switcher. Render-only: same SSE
// stream, same payload, same stage transitions as the shared screen it
// replaces (admin/src/stages/preparation.js, which the admin console keeps).

import { STAGES, resetSession, isAdmin } from "../../../admin/src/state.js";
import type { Mount } from "../../../admin/src/stages/stage.types.ts";
import { createOrb } from "../../../admin/src/ui/orb.js";
import { createSkeleton } from "../../../admin/src/ui/skeleton.js";
import { openSse } from "../../../shared/sse.js";
import { revealSequence } from "../../../admin/src/ui/reveal.js";
import { confirmAction } from "../../../admin/src/ui/confirm.js";
import { confirmResetSession } from "../../../admin/src/ui/session-reset.js";
import { icon } from "../../../admin/src/ui/icon.js";
import { Check } from "lucide";
import {
  ctaRowHtml,
  extractSlots,
  formatBriefForCopy,
  isVariantId,
  readVariant,
  renderBrief,
  variantSwitchHtml,
  writeVariant,
  type BriefSlots,
  type PrepBrief,
  type StorageLike,
} from "./preparation-brief.ts";
import "./preparation.css";

function storage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const mount: Mount = async (root, { store, setState }) => {
  const sessionId = store.sessionId || "";

  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Prep brief</div>
        <div class="page-header__row">
          <h1 class="h1">What to walk in with</h1>
          <div class="pv-header-tools">
            ${isAdmin(store.user) ? variantSwitchHtml(readVariant(storage())) : ""}
            <button class="link js-start-fresh" type="button">Reset session</button>
          </div>
        </div>
        <p class="text-ink-dim">The core issue, your opener, and what to listen for.</p>
      </header>
      <div class="thinking-host min-h-[120px] flex items-center"></div>
      <div class="result-host"></div>
    </div>
  `;
  const thinkingHost = root.querySelector<HTMLElement>(".thinking-host");
  const resultHost = root.querySelector<HTMLElement>(".result-host");
  if (!thinkingHost || !resultHost) return;

  root.querySelector(".js-start-fresh")?.addEventListener("click", async () => {
    const ok = await confirmResetSession(confirmAction);
    if (!ok) return;
    resetSession();
    setState({ stage: STAGES.START });
  });

  let lastBrief: PrepBrief | null = null;

  // Layout switcher (internal admin only) — the header outlives every
  // re-render, so this listener is wired once. Re-renders from the loaded
  // payload; never refetches.
  const switcher = root.querySelector<HTMLSelectElement>(".js-variant");
  switcher?.addEventListener("change", () => {
    const v = switcher.value;
    if (!isVariantId(v)) return;
    writeVariant(storage(), v);
    if (lastBrief) renderResult(false);
  });

  const orb = createOrb("Preparing your prep brief…");
  thinkingHost.appendChild(orb.el);
  resultHost.appendChild(createSkeleton(3));

  const sse = openSse(`/api/v1/sessions/${encodeURIComponent(sessionId)}/preparation/stream`);
  sse
    .on("thinking", (d: { label: string }) => orb.setLabel(d.label))
    .on("result", async (d: { brief: PrepBrief; runId: string }) => {
      await orb.exit();
      thinkingHost.remove();
      setState({ preparation: d.brief, preparationRunId: d.runId });
      lastBrief = d.brief;
      renderResult(true);
    })
    .on("error", (d: { message?: string }) => {
      setState({
        stage: STAGES.ERROR,
        error: d.message || "Preparation briefing failed.",
        retryStage: STAGES.PREPARATION,
      });
    })
    .onError(() => {
      setState({
        stage: STAGES.ERROR,
        error: "Lost connection while generating the prep brief.",
        retryStage: STAGES.PREPARATION,
      });
    })
    .open();

  function renderResult(animate: boolean) {
    if (!lastBrief || !resultHost) return;
    const slots = extractSlots(lastBrief, store.ctx?.name || "");
    const briefHtml = renderBrief(readVariant(storage()), slots);
    const cta = ctaRowHtml();
    resultHost.innerHTML = animate
      ? `<div class="space-y-6"><div class="reveal">${briefHtml}</div><div class="reveal">${cta}</div></div>`
      : `<div class="space-y-6">${briefHtml}${cta}</div>`;
    if (animate) {
      revealSequence(Array.from(resultHost.querySelectorAll(".reveal")), {
        stagger: 80,
        initialDelay: 80,
      });
    }
    wireResultHandlers(slots);
  }

  // innerHTML replaces the CTA row on every variant switch, so its listeners
  // re-wire per render.
  function wireResultHandlers(slots: BriefSlots) {
    if (!resultHost) return;
    resultHost.querySelector(".js-copy-all-prep")?.addEventListener("click", (e) => {
      copyBrief(slots, e.currentTarget as HTMLButtonElement);
    });
    resultHost.querySelector(".js-continue")?.addEventListener("click", () => {
      setState({ stage: STAGES.BANK });
    });
    resultHost.querySelector(".js-restart")?.addEventListener("click", async () => {
      const ok = await confirmResetSession(confirmAction, { to: STAGES.INTAKE });
      if (!ok) return;
      try {
        localStorage.removeItem("seroSessionId");
      } catch {
        /* storage blocked */
      }
      resetSession();
      setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
    });
  }

  async function copyBrief(slots: BriefSlots, btn: HTMLButtonElement) {
    const text = formatBriefForCopy(slots, store.ctx);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const prev = btn.textContent;
      btn.innerHTML = "Copied " + icon(Check, { size: 16 });
      setTimeout(() => {
        btn.textContent = prev;
      }, 1500);
    } catch (e) {
      console.warn("[preparation] clipboard write failed:", (e as Error).message);
    }
  }

  // Enter advances to the next step (matches the focus-points page). Wired
  // once per mount — not per render, so variant switches can't stack copies.
  function handleKey(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Enter") {
      const cont = resultHost?.querySelector<HTMLButtonElement>(".js-continue");
      if (cont && !cont.disabled) cont.click();
    }
  }
  document.addEventListener("keydown", handleKey);

  unmountFn = () => {
    sse.close();
    document.removeEventListener("keydown", handleKey);
  };
};

let unmountFn: (() => void) | null = null;
export function unmount(): void {
  if (unmountFn) unmountFn();
  unmountFn = null;
}
