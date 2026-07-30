// /prepare — the customer-owned prep-brief stage (prepare-variants). One
// brief, no At-a-glance/Full-brief duplication, ONE default layout
// (renderDefaultBrief in preparation-brief.ts, layout L "Arc"). The 12-layout
// lab is for managers + admins AND out of the guest/member download
// (refactor-2026-07 P4): the lab module + its CSS load via dynamic import only
// when the viewer is a manager or an admin, as their own async chunk.
// Render-only: same SSE stream, same payload,
// same stage transitions as the shared screen it replaces
// (admin/src/stages/preparation.js, which the admin console keeps).

import { STAGES, resetSession, isAdmin } from "../../../admin/src/state.ts";
import { exitStage } from "../../../admin/src/ui/landing.ts";
import type { Mount } from "../../../admin/src/stages/stage.types.ts";
import { createOrb } from "../../../admin/src/ui/orb.js";
import { createSkeleton } from "../../../admin/src/ui/skeleton.js";
import { openSse } from "../../../shared/sse.js";
import { revealSequence } from "../../../admin/src/ui/reveal.js";
import { confirmAction } from "../../../admin/src/ui/confirm.js";
import { confirmResetSession } from "../../../admin/src/ui/session-reset.js";
import { icon } from "../../../admin/src/ui/icon.js";
import { Check } from "lucide";
import { createStarRating } from "../../../admin/src/ui/star-rating.js";
import { submitBriefRating } from "../../../shared/api.js";
import {
  briefRatingHtml,
  ctaRowHtml,
  extractSlots,
  formatBriefForCopy,
  isVariantId,
  renderDefaultBrief,
  type BriefSlots,
  type PrepBrief,
} from "./preparation-brief.ts";
import "./preparation.css";

type LabModule = typeof import("./preparation-lab.ts");

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const mount: Mount = async (root, { store, setState }) => {
  const sessionId = store.sessionId || "";
  // The layout picker (switcher + 11 non-default variants) belongs to everyone
  // who runs 1:1s: managers and admins (Carl, 2026-07-27). Guests and members
  // get the default layout with no switcher, so the lab stays out of their
  // bundle. The chosen layout persists per browser (readVariant/writeVariant).
  const lab = isAdmin(store.user);

  root.innerHTML = `
    <div class="stage-reading l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Prep brief</div>
        <div class="page-header__row">
          <h1 class="h1">What to walk in with</h1>
          <div class="pv-header-tools">
            <button class="link js-start-fresh" type="button">Discard prep</button>
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
    setState({ stage: exitStage(store.user, store.memberHome, store.guestHome) });
  });

  let lastBrief: PrepBrief | null = null;
  // The score this manager has given the brief, 0 until they tap. Survives the
  // re-renders that the layout switcher triggers (see mountBriefRating).
  let briefStars = 0;
  let labMod: LabModule | null = null;
  let labCleanup: (() => void) | null = null;
  let labSwitchOpen: () => boolean = () => false;
  let labSwitchClose: () => void = () => {};

  // The lab arrives as its own chunk, admins only; a failed chunk load leaves
  // the customer default rendering — the lab is tooling, never load-bearing.
  // The CSS rides as its own dynamic import (not inside preparation-lab.ts)
  // so node:test can import that module without a CSS loader.
  if (lab) {
    void Promise.all([import("./preparation-lab.ts"), import("./preparation-lab.css")])
      .then(([mod]) => {
        labMod = mod;
        wireLabSwitcher(mod);
        if (lastBrief) renderResult(false);
      })
      .catch((e) => console.warn("[preparation] layout lab failed to load:", (e as Error).message));
  }

  // Layout switcher (internal-admin lab only) — a trigger chip that opens a
  // popover of preview tiles, injected once the lab chunk lands. The header
  // outlives every re-render, so this wires once and re-renders from the
  // loaded payload; never refetches.
  function wireLabSwitcher(mod: LabModule) {
    const tools = root.querySelector<HTMLElement>(".pv-header-tools");
    if (!tools) return;
    tools.insertAdjacentHTML("afterbegin", mod.variantSwitchHtml(mod.readVariant(storage(), true)));
    const trigger = tools.querySelector<HTMLButtonElement>(".js-variant-trigger");
    const pop = tools.querySelector<HTMLElement>(".js-variant-pop");
    const valueEl = tools.querySelector<HTMLElement>(".js-variant-value");
    const tiles = Array.from(tools.querySelectorAll<HTMLButtonElement>(".js-variant-tile"));
    const switchIsOpen = () => pop?.classList.contains("is-open") ?? false;
    const setSwitchOpen = (open: boolean) => {
      pop?.classList.toggle("is-open", open);
      trigger?.classList.toggle("is-open", open);
      trigger?.setAttribute("aria-expanded", String(open));
    };
    labSwitchOpen = switchIsOpen;
    labSwitchClose = () => setSwitchOpen(false);
    trigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      setSwitchOpen(!switchIsOpen());
    });
    tiles.forEach((tile) =>
      tile.addEventListener("click", () => {
        const v = tile.dataset.id;
        if (!isVariantId(v)) return;
        mod.writeVariant(storage(), v);
        if (valueEl) valueEl.textContent = mod.VARIANTS.find((o) => o.id === v)?.label ?? "";
        tiles.forEach((t) => {
          const on = t.dataset.id === v;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-checked", String(on));
        });
        setSwitchOpen(false);
        if (lastBrief) renderResult(false);
      }),
    );
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (switchIsOpen() && trigger && pop && !pop.contains(t) && !trigger.contains(t)) setSwitchOpen(false);
    };
    document.addEventListener("click", onDocClick);
    labCleanup = () => document.removeEventListener("click", onDocClick);
  }

  const orb = createOrb("Preparing your prep brief…");
  thinkingHost.appendChild(orb.el);
  // The brief lands as a sheet of headed slots, so ghost those, not grey cards.
  resultHost.appendChild(createSkeleton({ preset: "sections", rows: 4, label: "Preparing your prep brief" }));

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
        error: d.message || "Couldn't write your prep brief. Try again. Your notes are safe.",
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
    // Customers always get the one default layout; the lab (if its chunk has
    // landed) honours the admin's stored choice.
    const briefHtml = labMod
      ? labMod.renderBrief(labMod.readVariant(storage(), true), slots)
      : renderDefaultBrief(slots);
    const rate = briefRatingHtml();
    const cta = ctaRowHtml();
    resultHost.innerHTML = animate
      ? `<div class="space-y-6"><div class="reveal">${briefHtml}</div><div class="reveal">${rate}</div><div class="reveal">${cta}</div></div>`
      : `<div class="space-y-6">${briefHtml}${rate}${cta}</div>`;
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
    resultHost.querySelector(".js-wf-continue")?.addEventListener("click", () => {
      setState({ stage: STAGES.BANK });
    });
    resultHost.querySelector(".js-wf-back")?.addEventListener("click", () => {
      setState({ stage: STAGES.FOCUS_POINTS });
    });
    wireArcTabs();
    mountBriefRating();
  }

  // The brief's out-of-5 tap (brief-star-rating). innerHTML rebuilds this host on
  // every render, so the score lives in `briefStars` out here: without that, an
  // admin flipping layout would wipe a score the manager had already given.
  // Saving is fire-and-forget on purpose — a dead save must never stand between
  // the manager and "Start 1:1 questions", so a failure leaves the stars filled
  // and says nothing.
  function mountBriefRating() {
    const host = resultHost?.querySelector<HTMLElement>(".js-brief-rating-host");
    if (!host) return;
    const status = resultHost?.querySelector<HTMLElement>(".js-brief-rating-status") ?? null;
    if (status && briefStars) status.textContent = "Thanks";
    const rating = createStarRating({
      initialStars: briefStars,
      ariaLabel: "How good is this brief? 1 to 5 stars",
      onChange: (stars: number) => {
        briefStars = stars;
        if (status) status.textContent = "Thanks";
        void submitBriefRating(sessionId, stars).catch(() => {});
      },
    });
    host.replaceChildren(rating.el);
  }

  // Arc's Before/During/After segmented control (phones only; lab layout L).
  // The tablist and its phase panes share data-pane; clicking a tab shows its
  // phase, hides the rest. Re-wired per render since innerHTML rebuilds the
  // brief each time.
  function wireArcTabs() {
    if (!resultHost) return;
    const tabs = Array.from(resultHost.querySelectorAll<HTMLButtonElement>(".pv-l__tab"));
    const panes = Array.from(resultHost.querySelectorAll<HTMLElement>(".pv-l__phase"));
    if (!tabs.length) return;
    tabs.forEach((tab) =>
      tab.addEventListener("click", () => {
        const pane = tab.dataset.pane;
        tabs.forEach((t) => {
          const on = t === tab;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", String(on));
        });
        panes.forEach((p) => p.classList.toggle("is-active", p.dataset.pane === pane));
      }),
    );
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
    if (e.key === "Escape" && labSwitchOpen()) {
      labSwitchClose();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Enter") {
      const cont = resultHost?.querySelector<HTMLButtonElement>(".js-wf-continue");
      if (cont && !cont.disabled) cont.click();
    }
  }
  document.addEventListener("keydown", handleKey);

  unmountFn = () => {
    sse.close();
    document.removeEventListener("keydown", handleKey);
    if (labCleanup) labCleanup();
  };
};

let unmountFn: (() => void) | null = null;
export function unmount(): void {
  if (unmountFn) unmountFn();
  unmountFn = null;
}
