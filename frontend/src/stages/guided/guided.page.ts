// The guided runner (/guided/:id) — the "Monthly Check-in". A generic stage driver: it loads
// the session, reads its arc from GUIDED_ARCS, and walks arc.stages — it never hardcodes the
// 7 stages (architecture.md §2b). Renders inside the standard app shell (design-consolidation
// P5 F10): stage-inner column, a top stepper in the session-topbar's .stage-step language,
// page-header + h1, shared .btn primitives, and the shared save pip. Only the right-hand side
// panel still lives in a body portal. Everything the manager types/selects auto-saves
// (debounced PATCH) into the session's state jsonb, so a hard reload lands them back where
// they were.

import type { Mount } from "../../../../admin/src/stages/stage.types.ts";
import { STAGES } from "../../../../admin/src/state.js";
import { breadcrumb } from "../../../../admin/src/ui/breadcrumb.ts";
import { createSavePip } from "../../../../admin/src/ui/save-pip.ts";
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

  root.innerHTML = `<div class="stage-inner"><p class="text-ink-dim">Loading your check-in…</p></div>`;

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

  // Breadcrumb origin so the check-in isn't a nav dead-end (both the runner and the finished
  // record). Team › {name} › Monthly Check-in; the person crumb re-opens their page. Dropping
  // to two crumbs when there's no linked person. Clicks wired via wireCrumbs after each render.
  const crumbsHtml = breadcrumb(
    dto.personId
      ? [{ label: "Team", nav: "team" }, { label: dto.personName || "Person", nav: "person" }, { label: "Monthly Check-in" }]
      : [{ label: "Team", nav: "team" }, { label: "Monthly Check-in" }],
  );
  const wireCrumbs = (): void => {
    root.querySelectorAll<HTMLButtonElement>(".js-crumb").forEach((c) =>
      c.addEventListener("click", () => {
        if (c.dataset.nav === "team") setState({ personKey: null, stage: STAGES.TEAM });
        else if (c.dataset.nav === "person") setState({ personKey: dto.personId, stage: STAGES.PERSON_DETAIL });
      }),
    );
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
    document.querySelectorAll(".gd-portal").forEach((n) => n.remove());
    root.innerHTML = renderRecord({ dto, trackers, blockScores: rawBlockScores, copy }, crumbsHtml);
    wireCrumbs();
    return;
  }

  let panel: Panel | null = null;
  let dirty = false;
  let saving = false;
  let completed = dto.completedAt != null;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  // Body portal for the side panel only (independent of any transformed ancestor).
  document.querySelectorAll(".gd-portal").forEach((n) => n.remove());
  const portal = document.createElement("div");
  portal.className = "gd-portal";
  document.body.appendChild(portal);

  // The shared "Saved / Saving…" pip — created once, re-slotted into the header each render
  // (it keeps its own state across re-renders).
  const pip = createSavePip();

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
    pip.set(s);
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
      const foot = portal.querySelector<HTMLElement>(".gd-panel__foot");
      if (foot && !foot.querySelector(".gd-panel__err")) {
        const err = document.createElement("span");
        err.className = "gd-panel__err";
        err.textContent = "Couldn't save. Try again.";
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
  // The top stepper — the session topbar's .stage-step/.stage-rail language (ui/session-topbar.js):
  // visited stages are done (check, clickable), the one you're on is current, unvisited stages
  // ahead are upcoming and inert. Clickable steps are real buttons, so keyboard works for free.
  function stepperHtml(): string {
    return stages
      .map((sid, i) => {
        const st = i === state.step ? "current" : state.visited.includes(i) ? "done" : "upcoming";
        const reached = st !== "upcoming";
        const rail =
          i > 0
            ? `<span class="stage-rail ${reached ? "is-filled" : "is-empty"}" aria-hidden="true"></span>`
            : "";
        const node =
          st === "done"
            ? `<span class="stage-step__check">${ICONS.check}</span>`
            : `<span class="stage-step__dot" aria-hidden="true"></span>`;
        const inner = `${node}<span class="stage-step__label">${esc(STAGE_UI[sid].label)}</span>`;
        if (st === "done") {
          return `${rail}<button type="button" class="stage-step is-done stage-step--clickable" data-step="${i}">${inner}</button>`;
        }
        return `${rail}<span class="stage-step is-${st}"${st === "current" ? ' aria-current="step"' : ""}>${inner}</span>`;
      })
      .join("");
  }

  function renderPortal(): void {
    portal.innerHTML = panel ? panelHtml(panel, trackers, copy) : "";
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
      ? `<div class="gd-done-banner">${ICONS.check}<span>This check-in is complete. View only.</span></div>`
      : "";
    root.innerHTML = `
      <div class="stage-inner l-stack l-stack--6 gd">
        ${crumbsHtml}
        <nav class="gd-stepper" aria-label="Check-in stages">${stepperHtml()}</nav>
        ${banner}
        <header class="page-header l-stack l-stack--2">
          <div class="page-header__row">
            <h1 class="h1">${esc(title)}</h1>
            <div class="page-header__actions" data-pip-slot></div>
          </div>
          <p class="page-header__lede">${esc(sub)}</p>
        </header>
        <div class="gd-stage">${body}</div>
      </div>`;
    root.querySelector("[data-pip-slot]")?.appendChild(pip.el);
    // The strip scrolls without a visible bar — keep the current step in view.
    root.querySelector(".gd-stepper .is-current")?.scrollIntoView({ block: "nearest", inline: "center" });
    wireContent();
    wireCrumbs();
    renderPortal();
  }

  function wireContent(): void {
    root.querySelectorAll<HTMLElement>(".gd-stepper [data-step]").forEach((b) =>
      b.addEventListener("click", () => go(Number(b.dataset.step))),
    );
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
    root.querySelectorAll<HTMLElement>(".gd-chip[data-outcome]").forEach((chip) =>
      chip.addEventListener("click", () => {
        const pid = chip.dataset.outcome ?? "";
        const v = chip.dataset.value ?? "";
        state.catchup = { ...state.catchup, outcomes: { ...state.catchup?.outcomes, [pid]: v } };
        scheduleSave();
        render();
      }),
    );

    // Rating: sliders (update the score readout in place; don't re-render mid-drag)
    root.querySelectorAll<HTMLInputElement>('.gd-slider input[type="range"]').forEach((r) =>
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
