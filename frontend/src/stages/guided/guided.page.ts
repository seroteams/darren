// /guided/:id — the Monthly Check-in runner (monthly-one-on-one Phase 1). A guided,
// manager-walked 1:1: seven stages, a floating pill nav always visible, debounced
// auto-save into guided_sessions.state, and reload-resume by URL id. Its own runner,
// entirely separate from the AI-interview flow.
//
// STAGE-CONFIG-DRIVEN (the extensibility seam): the stage list + order come from the
// arc (guided-arcs.ts), NEVER hardcoded here — so a second guided arc is a config entry
// reusing the same stage content. The nav + side panel live in a body portal so they're
// truly fixed on every stage (same approach as the approved prototype).

import { STAGES } from "../../../../admin/src/state.js";
import type { Mount, Unmount } from "../../../../admin/src/stages/stage.types.ts";
import { getGuidedSession, patchGuidedSession, completeGuidedSession } from "../../../../shared/api.js";
import { DEFAULT_GUIDED_ARC, type GuidedStageId } from "./guided-arcs.ts";
import { emptyDraft, type GuidedDraft, type GuidedSession } from "./guided.types.ts";
import { stageHtml, panelHtml, STAGE_META, ICONS, type PanelState } from "./guided-content.ts";
import "./guided.css";

type SaveState = "saved" | "saving" | "error";

// Only one guided session mounts at a time; the teardown closure is stashed here so the
// module-level unmount() (called by the router) can reach it.
let activeCleanup: (() => void) | null = null;

function normalizeDraft(state: unknown): GuidedDraft {
  if (state && typeof state === "object") {
    const s = state as GuidedDraft;
    return { ...s, v: typeof s.v === "number" ? s.v : 1 };
  }
  return emptyDraft();
}

// Resume index from the saved stage marker. A completed ("done") session opens on the
// last stage (Review); an unknown marker falls back to the first stage.
function stageIndex(stage: string, stages: readonly GuidedStageId[]): number {
  const i = stages.indexOf(stage as GuidedStageId);
  if (i >= 0) return i;
  return stage === "done" ? stages.length - 1 : 0;
}

export const mount: Mount = async (root, { store, setState }) => {
  const id = store.guidedId;
  if (!id) { setState({ stage: STAGES.START }); return; }

  root.innerHTML = `<div class="mcr"><div class="mcr-col"><p class="mcr-sub">Opening your Monthly Check-in…</p></div></div>`;

  let session: GuidedSession | null = null;
  try {
    session = (await getGuidedSession(id)) as GuidedSession | null;
  } catch (e) {
    setState({ stage: STAGES.ERROR, error: e instanceof Error ? e.message : "Couldn't open this Monthly Check-in", retryStage: STAGES.START });
    return;
  }
  if (!session) { setState({ stage: STAGES.START, guidedId: null }); return; }

  const arc = DEFAULT_GUIDED_ARC;
  const stages = arc.stages;
  const draft = normalizeDraft(session.state);
  let step = stageIndex(session.stage, stages);
  const visited = new Set<number>();
  for (let i = 0; i <= step; i++) visited.add(i);
  let panel: PanelState | null = null;
  let saveState: SaveState = "saved";
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  // ---- body portal: nav + side panel (fixed on every stage) --------------------------
  document.querySelectorAll(".mcr-portal").forEach((n) => n.remove());
  const portal = document.createElement("div");
  portal.className = "mcr-portal";
  document.body.appendChild(portal);

  const currentStageId = (): GuidedStageId => stages[step]!;

  // ---- auto-save ---------------------------------------------------------------------
  function setPip(next: SaveState): void {
    saveState = next;
    const pip = portal.querySelector<HTMLElement>(".mcr-pip");
    if (pip) { pip.dataset.state = next; const label = pip.querySelector("span:last-child"); if (label) label.textContent = pipLabel(); }
  }
  function pipLabel(): string {
    return saveState === "saving" ? "Saving…" : saveState === "error" ? "Not saved" : "Saved";
  }
  async function save(keepalive = false): Promise<void> {
    setPip("saving");
    try {
      if (keepalive) {
        // Survive an unload (hard reload / tab close) — a plain fetch would be killed.
        const res = await fetch(`/api/v1/guided-sessions/${encodeURIComponent(id!)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: currentStageId(), state: draft }),
          keepalive: true,
        });
        if (!res.ok) throw new Error(String(res.status));
      } else {
        await patchGuidedSession(id!, { stage: currentStageId(), state: draft });
      }
      setPip("saved");
    } catch {
      setPip("error");
    }
  }
  function scheduleSave(): void {
    clearTimeout(saveTimer);
    setPip("saving");
    saveTimer = setTimeout(() => { void save(); }, 600);
  }
  async function flush(): Promise<void> {
    clearTimeout(saveTimer);
    await save();
  }

  // ---- draft setters -----------------------------------------------------------------
  // Path setter for the plain notes textareas ("catchup.notes", "summary.text", …).
  function setSave(path: string, value: string): void {
    const [group, key] = path.split(".");
    if (!group || !key) return;
    const bag = draft as unknown as Record<string, Record<string, unknown>>;
    (bag[group] ??= {})[key] = value;
  }
  function readSave(path: string): string {
    const [group, key] = path.split(".");
    if (!group || !key) return "";
    const bag = draft as unknown as Record<string, Record<string, unknown> | undefined>;
    const v = bag[group]?.[key];
    return typeof v === "string" ? v : "";
  }

  // ---- navigation --------------------------------------------------------------------
  async function go(i: number): Promise<void> {
    visited.add(step);
    step = Math.max(0, Math.min(stages.length - 1, i));
    visited.add(step);
    panel = null;
    render();
    root.scrollIntoView({ block: "start" });
    await flush(); // persist the new stage marker + draft
  }

  async function finish(): Promise<void> {
    await flush();
    const note = root.querySelector<HTMLElement>("[data-finish-note]");
    try {
      await completeGuidedSession(id!);
      if (note) note.hidden = false;
      // Phase 6 adds the real finished record + list merge; for now, back to Home.
      setTimeout(() => setState({ stage: STAGES.START, guidedId: null }), 1500);
    } catch {
      if (note) { note.hidden = false; note.textContent = "Couldn't save — check your connection and try again."; }
    }
  }

  // ---- render ------------------------------------------------------------------------
  const tabsHtml = (): string =>
    stages.map((sid, i) => {
      const st = i === step ? "current" : visited.has(i) ? "done" : "todo";
      const meta = STAGE_META[sid];
      const ic = st === "done" ? ICONS.check : ICONS[meta.icon];
      return `<button type="button" class="mcr-tab" data-step="${i}" data-state="${st}" role="tab"${i === step ? ' aria-selected="true"' : ""}>${ic}<span>${meta.label}</span></button>`;
    }).join("");

  const renderPortal = (): void => {
    portal.innerHTML = `
      <nav class="mcr-tabs-wrap" aria-label="Stages">
        <div class="mcr-pip" data-state="${saveState}"><span class="mcr-pip__dot"></span><span>${pipLabel()}</span></div>
        <div class="mcr-tabs">${tabsHtml()}</div>
      </nav>
      ${panel ? panelHtml(panel) : ""}`;
    portal.querySelectorAll<HTMLElement>(".mcr-tab").forEach((b) =>
      b.addEventListener("click", () => { void go(Number(b.dataset.step)); }));
    portal.querySelectorAll<HTMLElement>("[data-close]").forEach((b) =>
      b.addEventListener("click", () => { panel = null; renderPortal(); }));
  };

  const render = (): void => {
    const s = stageHtml(currentStageId(), draft);
    root.innerHTML = `
      <div class="mcr">
        <div class="mcr-col">
          <h1 class="mcr-h1">${s.title}</h1>
          <p class="mcr-sub">${s.sub}</p>
          ${s.body}
        </div>
      </div>`;
    wireContent();
    renderPortal();
  };

  function wireContent(): void {
    root.querySelector("[data-next]")?.addEventListener("click", () => { void go(step + 1); });
    root.querySelector("[data-finish]")?.addEventListener("click", () => { void finish(); });
    root.querySelector("[data-fbnext]")?.addEventListener("click", () => {
      draft.feedback ??= {};
      draft.feedback.fbStep = (draft.feedback.fbStep ?? 0) + 1;
      scheduleSave();
      render();
    });

    // Plain notes textareas — value from draft, auto-save on input.
    root.querySelectorAll<HTMLTextAreaElement>("[data-save]").forEach((el) => {
      const path = el.dataset.save ?? "";
      el.value = readSave(path);
      el.addEventListener("input", () => { setSave(path, el.value); scheduleSave(); });
    });

    // Catch-up promise outcome chips.
    root.querySelectorAll<HTMLElement>(".mcr-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        draft.catchup ??= {};
        draft.catchup.outcomes ??= {};
        draft.catchup.outcomes[chip.dataset.item ?? ""] = chip.dataset.value ?? "";
        scheduleSave();
        render();
      });
    });

    // Rating sliders + per-block note inputs.
    root.querySelectorAll<HTMLInputElement>('.mcr-slider input[type="range"]').forEach((r) => {
      r.addEventListener("input", () => {
        const b = r.dataset.block ?? "";
        draft.rating ??= {};
        draft.rating.scores ??= {};
        draft.rating.scores[b] = Number(r.value);
        const n = root.querySelector<HTMLElement>(`[data-score-for="${b}"]`);
        if (n) n.textContent = Number(r.value).toFixed(1);
        scheduleSave();
      });
    });
    root.querySelectorAll<HTMLInputElement>("[data-note-block]").forEach((el) => {
      const b = el.dataset.noteBlock ?? "";
      const notes = draft.rating?.notes ?? {};
      if (typeof notes[b] === "string") el.value = notes[b];
      el.addEventListener("input", () => {
        draft.rating ??= {};
        draft.rating.notes ??= {};
        draft.rating.notes[b] = el.value;
        scheduleSave();
      });
    });

    // Engagement (private review).
    root.querySelectorAll<HTMLElement>("[data-eng]").forEach((d) => {
      d.addEventListener("click", () => {
        draft.wrapup ??= {};
        draft.wrapup.engagement = Number(d.dataset.eng);
        scheduleSave();
        render();
      });
    });

    // Open the side panel from a request/goal row or an add button.
    root.querySelectorAll<HTMLElement>("[data-open]").forEach((b) => {
      b.addEventListener("click", () => {
        const t = b.dataset.open;
        if (t === "request" || t === "goal") panel = { type: t, i: Number(b.dataset.i) };
        else if (t === "add-request" || t === "add-goal") panel = { type: t };
        renderPortal();
      });
    });
  }

  // ---- lifecycle ---------------------------------------------------------------------
  const onKey = (e: KeyboardEvent): void => { if (e.key === "Escape" && panel) { panel = null; renderPortal(); } };
  const onHide = (): void => { if (document.visibilityState === "hidden") void save(true); };
  const onPageHide = (): void => { void save(true); };
  document.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onPageHide);

  const cleanup = (): void => {
    clearTimeout(saveTimer);
    void save(true); // flush anything pending on the way out
    document.removeEventListener("keydown", onKey);
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onPageHide);
    portal.remove();
  };
  activeCleanup = cleanup;

  render();
};

export const unmount: Unmount = () => {
  activeCleanup?.();
  activeCleanup = null;
};
