// The guided runner (/guided/:id) — the "Monthly Check-in". A generic stage driver: it loads
// the session, reads its arc from GUIDED_ARCS, and walks arc.stages — it never hardcodes the
// 7 stages (architecture.md §2b). The floating pill nav + the right-hand side panel live in a
// body portal. Everything the manager types/selects auto-saves (debounced PATCH) into the
// session's state jsonb, so a hard reload lands them back where they were. Ported from the
// approved monthly-checkin prototype (since retired).

import type { Mount } from "../../../../admin/src/stages/stage.types.ts";
import { STAGES } from "../../../../admin/src/state.js";
import {
  getGuidedSession,
  patchGuidedSession,
  completeGuidedSession,
  listTrackerItems,
  createTrackerItem,
  updateTrackerItem,
  getBlockScores,
  listGuidedSessionsForPerson,
  guidedWrapupDraft,
} from "../../../../shared/api.js";
import { arcBySlug } from "./guided-arcs.ts";
import {
  GUIDED_STATE_VERSION,
  type BlockScore,
  type GroupedTrackers,
  type GuidedArc,
  type GuidedSessionDto,
  type GuidedState,
} from "./guided.types.ts";
import { STAGE_RENDERERS, STAGE_UI } from "./guided-stages.ts";
import { FEEDBACK, type CopyCtx } from "./coaching-copy.ts";
import { ICONS } from "./guided-icons.ts";
import { panelHtml, type Panel } from "./side-panel.component.ts";
import { renderRecord } from "./record.component.ts";
import { esc } from "./guided-util.ts";
import "./guided.css";

function normalizeState(raw: unknown, arc: GuidedArc): GuidedState {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<GuidedState>;
  const stepRaw = typeof s.step === "number" ? s.step : 0;
  const step = Math.max(0, Math.min(arc.stages.length - 1, stepRaw));
  const visited = Array.isArray(s.visited)
    ? s.visited.filter((n): n is number => typeof n === "number")
    : [];
  return {
    ...s,
    v: typeof s.v === "number" ? s.v : GUIDED_STATE_VERSION,
    arc: arc.slug,
    step,
    visited: visited.length ? visited : [0],
  };
}

export const mount: Mount = async (root, { store, setState }) => {
  const id = store.guidedId || "";
  if (!id) {
    setState({ stage: STAGES.INTAKE });
    return;
  }

  root.innerHTML = `<div class="mcr"><div class="mcr-col"><p class="mcr-sub" style="margin-top:60px">Loading your check-in…</p></div></div>`;

  let dto: GuidedSessionDto;
  try {
    dto = (await getGuidedSession(id)) as GuidedSessionDto;
  } catch (e) {
    setState({
      stage: STAGES.ERROR,
      error: (e as Error)?.message || "Couldn't open this check-in.",
      retryStage: STAGES.GUIDED,
    });
    return;
  }

  const arc = arcBySlug(dto.state?.arc);
  const stages = arc.stages;
  const state = normalizeState(dto.state, arc);
  const copy: CopyCtx = {
    name: (dto.personName || "").split(" ")[0] || dto.personName || "them",
    full: dto.personName || "",
    requestCount: 0,
    goalCount: 0,
  };

  async function loadTrackers(): Promise<GroupedTrackers> {
    try {
      const g = (await listTrackerItems(dto.personId)) as GroupedTrackers;
      return { promises: g.promises ?? [], requests: g.requests ?? [], goals: g.goals ?? [] };
    } catch {
      return { promises: [], requests: [], goals: [] };
    }
  }
  // Previous completed session's engagement (1–5) for the Review "last time: N/5" line.
  async function loadLastEngagement(): Promise<number | null> {
    try {
      const res = (await listGuidedSessionsForPerson(dto.personId)) as { sessions?: GuidedSessionDto[] };
      const prior = (res.sessions ?? [])
        .filter((s) => s.id !== id && s.completedAt && s.engagement != null)
        .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)));
      return prior[0]?.engagement ?? null;
    } catch {
      return null;
    }
  }
  // Block scores for this person — the runner's last-time marker AND the finished record's
  // scores-with-trend. (block_scores are oldest-first, so a later entry wins per block.)
  let rawBlockScores: BlockScore[] = [];
  try {
    const res = (await getBlockScores(dto.personId)) as { scores?: BlockScore[] };
    rawBlockScores = res.scores ?? [];
  } catch {
    rawBlockScores = [];
  }
  const lastScores: Record<string, { score: number; date: string }> = {};
  for (const s of rawBlockScores) lastScores[s.block] = { score: s.score, date: s.createdAt };
  let trackers = await loadTrackers();
  const lastEngagement = await loadLastEngagement();

  // A finished session (completed_at set) renders the read-only one-page record (Phase 6), not
  // the runner — same URL, no nav, no autosave.
  if (dto.completedAt) {
    document.querySelectorAll(".mcr-portal").forEach((n) => n.remove());
    root.innerHTML = renderRecord({ dto, trackers, blockScores: rawBlockScores, copy });
    return;
  }

  let panel: Panel | null = null;
  let saveState: "idle" | "saving" = "idle";
  let dirty = false;
  let saving = false;
  let completed = dto.completedAt != null;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  // Body portal for the always-fixed nav + side panel (independent of any transformed ancestor).
  document.querySelectorAll(".mcr-portal").forEach((n) => n.remove());
  const portal = document.createElement("div");
  portal.className = "mcr-portal";
  document.body.appendChild(portal);

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && panel) {
      panel = null;
      renderPortal();
    }
  };
  const onVis = (): void => {
    if (document.hidden) flushNow();
  };
  document.addEventListener("keydown", onKey);
  document.addEventListener("visibilitychange", onVis);

  // Tear down the portal + listeners (and flush the last edit) when the stage unmounts.
  const obs = new MutationObserver(() => {
    if (!document.body.contains(root)) {
      flushNow();
      portal.remove();
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
      if (saveTimer) clearTimeout(saveTimer);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  // ---- auto-save ----------------------------------------------------------------------------
  const currentStageId = (): string => stages[state.step] ?? stages[0]!;

  function setSavePip(s: "idle" | "saving"): void {
    saveState = s;
    const pip = portal.querySelector<HTMLElement>("[data-save]");
    if (!pip) return;
    pip.dataset.state = s;
    const label = pip.querySelector<HTMLElement>("[data-save-label]");
    if (label) label.textContent = s === "saving" ? "Saving…" : "Saved";
  }

  async function flush(): Promise<void> {
    if (completed || saving || !dirty) return;
    saving = true;
    dirty = false;
    setSavePip("saving");
    try {
      await patchGuidedSession(id, { stage: currentStageId(), state });
    } catch {
      dirty = true; // keep dirty so the next change retries
    } finally {
      saving = false;
      setSavePip("idle");
      if (dirty) scheduleSave();
    }
  }

  function scheduleSave(): void {
    dirty = true;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void flush(), 600);
  }

  function flushNow(): void {
    if (saveTimer) clearTimeout(saveTimer);
    void flush();
  }

  // ---- navigation ---------------------------------------------------------------------------
  function go(step: number): void {
    const clamped = Math.max(0, Math.min(stages.length - 1, step));
    if (!state.visited.includes(state.step)) state.visited.push(state.step);
    state.step = clamped;
    if (!state.visited.includes(clamped)) state.visited.push(clamped);
    panel = null;
    dirty = true;
    render();
    flushNow(); // persist the new position promptly
    void maybeDraftWrapup(); // fires the AI draft if we've just landed on Summary
    root.scrollIntoView({ block: "start" });
  }

  async function complete(): Promise<void> {
    await flush();
    try {
      await completeGuidedSession(id);
      completed = true;
      const note = root.querySelector<HTMLElement>("[data-finish-note]");
      if (note) note.hidden = false;
    } catch (e) {
      setState({
        stage: STAGES.ERROR,
        error: (e as Error)?.message || "Couldn't finish the check-in.",
        retryStage: STAGES.GUIDED,
      });
    }
  }

  // The ONE AI call — fires when the manager reaches Summary and there's no draft yet (or on a
  // manual Regenerate). Cached server-side, so re-entering Summary never re-spends. A failure is
  // surfaced honestly (state.summary.error → "couldn't draft this"), never a hidden rewrite.
  let draftingWrapup = false;
  async function maybeDraftWrapup(force = false): Promise<void> {
    if (completed || stages[state.step] !== "summary" || draftingWrapup) return;
    if (!force && (state.summary?.draft || state.summary?.error)) return;
    draftingWrapup = true;
    render(); // show "Drafting your summary…"
    try {
      const res = (await guidedWrapupDraft(id, force ? { regenerate: true } : {})) as {
        summary: { headline: string; bullets: string[] } | null;
        suggestions: { individual: string[]; team: string[]; company: string[] } | null;
        error?: string;
      };
      if (res.error || !res.summary) {
        state.summary = { ...state.summary, draft: undefined, error: res.error || "couldn't draft this" };
      } else {
        state.summary = { ...state.summary, draft: res.summary, error: undefined };
        if (res.suggestions) state.wrapup = { ...state.wrapup, suggestions: res.suggestions };
      }
      scheduleSave();
    } catch {
      state.summary = { ...state.summary, error: "couldn't draft this" };
    } finally {
      draftingWrapup = false;
      render();
    }
  }

  // ---- side-panel save (create / update a real tracker item) --------------------------------
  async function savePanel(): Promise<void> {
    if (!panel) return;
    const p = panel;
    const val = (name: string): string => {
      const el = portal.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        `[data-field="${name}"]`,
      );
      return el ? el.value.trim() : "";
    };
    try {
      if (p.type === "request") {
        const payload: Record<string, unknown> = { status: val("status") };
        const note = [val("note"), val("nextStep") ? `Next: ${val("nextStep")}` : ""].filter(Boolean).join("\n");
        if (note) payload.note = note;
        await updateTrackerItem(p.id, payload);
      } else if (p.type === "goal") {
        const payload: Record<string, unknown> = { status: val("status"), progress: Number(val("progress")) };
        if (val("note")) payload.note = val("note");
        await updateTrackerItem(p.id, payload);
      } else if (p.type === "add-request") {
        if (!val("text")) return;
        await createTrackerItem(dto.personId, {
          kind: "request",
          text: val("text"),
          category: val("category"),
          note: val("note") || undefined,
          createdSessionId: id,
        });
      } else if (p.type === "add-goal") {
        if (!val("text")) return;
        await createTrackerItem(dto.personId, {
          kind: "goal",
          text: val("text"),
          status: val("status"),
          note: val("note") || undefined,
          createdSessionId: id,
        });
      } else {
        // add-promise
        if (!val("text")) return;
        await createTrackerItem(dto.personId, {
          kind: "promise",
          text: val("text"),
          owner: val("owner"),
          createdSessionId: id,
        });
      }
      trackers = await loadTrackers();
      panel = null;
      render();
    } catch (e) {
      // Keep the panel open (nothing typed is lost) and surface the failure inline — no silent save.
      console.warn("[guided] tracker save failed:", e instanceof Error ? e.message : String(e));
      const foot = portal.querySelector<HTMLElement>(".mcr-panel__foot");
      if (foot && !foot.querySelector(".mcr-panel__err")) {
        const err = document.createElement("span");
        err.className = "mcr-panel__err";
        err.textContent = "Couldn't save — try again.";
        err.style.cssText =
          "color:var(--color-negative-text);font-size:var(--type-body-sm);margin-right:auto;align-self:center;";
        foot.prepend(err);
      }
    }
  }

  // ---- state setters ------------------------------------------------------------------------
  // Dynamic path write (e.g. "catchup.notes", "feedback.lessOf") into the typed draft.
  function setNote(path: string, value: string): void {
    const dot = path.indexOf(".");
    if (dot < 0) return;
    const stage = path.slice(0, dot);
    const field = path.slice(dot + 1);
    const s = state as unknown as Record<string, Record<string, unknown>>;
    s[stage] = { ...(s[stage] ?? {}), [field]: value };
  }

  // ---- render -------------------------------------------------------------------------------
  function tabsHtml(): string {
    return stages
      .map((sid, i) => {
        const st = i === state.step ? "current" : state.visited.includes(i) ? "done" : "todo";
        const meta = STAGE_UI[sid];
        const ic = st === "done" ? ICONS.check : ICONS[meta.icon];
        return `<button type="button" class="mcr-tab" data-step="${i}" data-state="${st}" role="tab"${
          i === state.step ? ' aria-selected="true"' : ""
        }>${ic}<span>${esc(meta.label)}</span></button>`;
      })
      .join("");
  }

  function renderPortal(): void {
    portal.innerHTML = `
      <nav class="mcr-tabs-wrap" aria-label="Stages"><div class="mcr-tabs">${tabsHtml()}</div></nav>
      <div class="mcr-savewrap"><span class="mcr-save" data-save data-state="${saveState}"><span class="mcr-save__dot"></span><span data-save-label>${
        saveState === "saving" ? "Saving…" : "Saved"
      }</span></span></div>
      ${panel ? panelHtml(panel, trackers, copy) : ""}`;
    portal
      .querySelectorAll<HTMLElement>(".mcr-tab")
      .forEach((b) => b.addEventListener("click", () => go(Number(b.dataset.step))));
    portal.querySelectorAll<HTMLElement>("[data-close]").forEach((b) =>
      b.addEventListener("click", () => {
        panel = null;
        renderPortal();
      }),
    );
    portal.querySelector<HTMLElement>("[data-save]")?.addEventListener("click", () => void savePanel());
  }

  function render(): void {
    copy.requestCount = trackers.requests.length;
    copy.goalCount = trackers.goals.length;
    const { title, sub, body } = STAGE_RENDERERS[stages[state.step]!](state, copy, {
      trackers,
      lastScores,
      lastEngagement,
    });
    const banner = completed
      ? `<div class="mcr-done-banner">${ICONS.check}<span>This check-in is complete — view only.</span></div>`
      : "";
    root.innerHTML = `
      <div class="mcr">
        <div class="mcr-col">
          ${banner}
          <h1 class="mcr-h1">${esc(title)}</h1>
          <p class="mcr-sub">${esc(sub)}</p>
          ${body}
        </div>
      </div>`;
    wireContent();
    renderPortal();
  }

  function wireContent(): void {
    root.querySelector<HTMLElement>("[data-next]")?.addEventListener("click", () => go(state.step + 1));
    root.querySelector<HTMLElement>("[data-regen]")?.addEventListener("click", () => void maybeDraftWrapup(true));
    root.querySelector<HTMLElement>("[data-fbnext]")?.addEventListener("click", () => {
      const cur = state.feedback?.fbStep ?? 0;
      state.feedback = { ...state.feedback, fbStep: Math.min(cur + 1, FEEDBACK.length - 1) };
      scheduleSave();
      render();
    });
    root.querySelector<HTMLElement>("[data-finish]")?.addEventListener("click", () => void complete());

    // Catch-up: promise outcome chips (keyed by the real promise id; applied at complete())
    root.querySelectorAll<HTMLElement>(".mcr-chip[data-outcome]").forEach((chip) =>
      chip.addEventListener("click", () => {
        const pid = chip.dataset.outcome ?? "";
        const v = chip.dataset.value ?? "";
        state.catchup = { ...state.catchup, outcomes: { ...state.catchup?.outcomes, [pid]: v } };
        scheduleSave();
        render();
      }),
    );

    // Rating: sliders (update the score readout in place; don't re-render mid-drag)
    root.querySelectorAll<HTMLInputElement>('.mcr-slider input[type="range"]').forEach((r) =>
      r.addEventListener("input", () => {
        const bid = r.dataset.block ?? "";
        const val = Number(r.value);
        state.rating = { ...state.rating, scores: { ...state.rating?.scores, [bid]: val } };
        const n = root.querySelector(`[data-score-for="${bid}"]`);
        if (n) n.textContent = val.toFixed(1);
        scheduleSave();
      }),
    );

    // Rating: per-block note inputs
    root.querySelectorAll<HTMLInputElement>("[data-blocknote]").forEach((inp) =>
      inp.addEventListener("input", () => {
        const bid = inp.dataset.blocknote ?? "";
        state.rating = { ...state.rating, blockNotes: { ...state.rating?.blockNotes, [bid]: inp.value } };
        scheduleSave();
      }),
    );

    // Review: engagement 1–5
    root.querySelectorAll<HTMLElement>("[data-eng]").forEach((d) =>
      d.addEventListener("click", () => {
        state.wrapup = { ...state.wrapup, engagement: Number(d.dataset.eng) };
        scheduleSave();
        render();
      }),
    );

    // Notes textareas → state path (auto-save; flush on blur so a reload can't lose them)
    root.querySelectorAll<HTMLTextAreaElement>("textarea[data-notes]").forEach((ta) => {
      ta.addEventListener("input", () => {
        setNote(ta.dataset.notes ?? "", ta.value);
        scheduleSave();
      });
      ta.addEventListener("blur", () => flushNow());
    });

    // Open the side panel from a request/goal row or an add button
    root.querySelectorAll<HTMLElement>("[data-open]").forEach((b) =>
      b.addEventListener("click", () => {
        const t = b.dataset.open ?? "";
        panel =
          t === "request" || t === "goal"
            ? ({ type: t, id: b.dataset.id ?? "" } as Panel)
            : ({ type: t } as Panel);
        renderPortal();
      }),
    );
  }

  render();
  void maybeDraftWrapup(); // if the session resumed on the Summary stage
};
