// The shared app shell (refactor-2026-07 P7) — everything the admin and customer
// entries did IDENTICALLY: mount the standing chrome, render one stage at a time,
// recover from a stale-chunk import, keep the URL in step with the store, and
// rehydrate a live session by id.
//
// What is NOT here, deliberately: each app's boot() gate and its popstate rules.
// Those genuinely differ (the admin app is internal-only and bounces managers out;
// the customer app has a guest lane and a member home), and pretending otherwise
// would be the drift this module exists to end.
//
// The real divergences are injected, so they read as configuration instead of
// hiding as copy-paste drift:
//   - `loaders`     — the stage map, which is the whole point of the split: the
//                     customer bundle must never import the internal toolset.
//   - `syncUrl`     — each app has its OWN router.js (different stage->path rules).
//   - `fadeStages`  — the admin shell cross-dissolves between screens; the
//                     customer shell doesn't (its CSS never shipped).
//   - `mountDeps`   — extra deps merged into every stage's mount ctx (the admin
//                     app passes refreshRegressionAlert; the customer app has no
//                     regression check).
// appNav + profileBadge are passed in as instances too: each app builds its own
// (different module / flags) but the shell owns the render loop that drives them.

import { STAGES, store, subscribe, setState, resetSession } from "./state.ts";
import { createDevBadge } from "./ui/dev-badge.js";
import { createBuildStamp } from "./ui/build-stamp.js";
import { createSessionTopbar } from "./ui/session-topbar.js";
import { createNotesPanel } from "./ui/notes-panel.js";
import { installGlobalErrorReporter, reportError } from "./ui/error-reporter.js";
import { getSession } from "../../shared/api.js";

// A failed lazy import almost always means a stale tab: a new deploy replaced
// the hashed route chunks this bundle references and deleted the old ones, so
// the import 404s and the server's SPA fallback returns index.html — which the
// browser rejects as a module ("MIME type text/html" / "Failed to fetch
// dynamically imported module"). One full reload fetches the fresh index.html +
// new chunk hashes and the screen renders. The one-shot flag (cleared on the
// next clean render) stops a reload loop if a deploy is genuinely broken.
const CHUNK_RELOAD_FLAG = "seroChunkReload";

function isStaleChunkError(e) {
  const msg = (e && e.message) || "";
  return /dynamically imported module|Importing a module script failed|module script/i.test(msg);
}

export function defaultSubstage(stage) {
  if (stage === STAGES.INTAKE) return "NAME";
  if (stage === STAGES.QUESTIONING) return "Q_SHOW";
  return null;
}

// Resume a live session from its id: pull the snapshot and drop it into the
// store, so a reload lands back on the real stage instead of the front door.
// A snapshot that carries promises means the promises step already happened —
// never re-show it. An empty array is a valid "confirmed none"; only
// null/absent means it hasn't happened yet.
export async function rehydrateById(id) {
  try {
    const snap = await getSession(id);
    if (!snap || !snap.sessionId) {
      try { localStorage.removeItem("seroSessionId"); } catch { /* storage blocked */ }
      return false;
    }
    try { localStorage.setItem("seroSessionId", id); } catch { /* storage blocked */ }
    setState({
      sessionId: snap.sessionId,
      stage: snap.stage,
      substage: defaultSubstage(snap.stage),
      turn: snap.turn || 0,
      totalBudget: snap.totalBudget || 8,
      ctx: snap.ctx || store.ctx,
      focusPoints: snap.focusPoints?.focus_points || null,
      preparation: snap.preparation?.brief || null,
      preparationRunId: snap.preparation?.runId || null,
      axes: snap.axes || [],
      briefing: snap.briefing || null,
      notes: snap.notes || [],
      sessionDir: snap.sessionDir || null,
      createdAt: snap.createdAt ?? null,
      completedAt: snap.completedAt ?? snap.briefing?.completedAt ?? null,
      skipBriefingAnimation: snap.stage === STAGES.BRIEFING && !!snap.briefing,
      scripted: snap.scripted || null,
      promises: snap.promises ?? null,
      promisesConfirmed: snap.promises != null,
    });
    return true;
  } catch (e) {
    console.warn("[rehydrateById] failed:", e);
    return false;
  }
}

/**
 * Mount the standing chrome and start the render loop.
 *
 * @param {object}   opts
 * @param {object}   opts.loaders        stage id -> () => import(module)
 * @param {Function} opts.syncUrl        this app's router syncUrl
 * @param {object}   opts.appNav         this app's nav instance (already created)
 * @param {object}   opts.profileBadge   this app's profile badge instance
 * @param {boolean} [opts.fadeStages]    cross-dissolve between screens (admin only)
 * @param {object}  [opts.mountDeps]     extra deps merged into every mount ctx
 */
export function startShell({ loaders, syncUrl, appNav, profileBadge, fadeStages = false, mountDeps = {} }) {
  const root = document.getElementById("root");
  // Catch browser crashes / unhandled rejections and forward them to the Error
  // log (error-log Phase 3).
  installGlobalErrorReporter();

  const devBadge = import.meta.env.DEV ? createDevBadge() : null;

  // Always-on build stamp (which API build is live) — see ui/build-stamp.js.
  document.body.appendChild(createBuildStamp().el);

  const topbar = createSessionTopbar({ store, setState, resetSession });
  document.body.appendChild(topbar.el);
  document.body.appendChild(appNav.el);
  document.body.appendChild(profileBadge.el);

  const notesPanel = createNotesPanel({ store, setState });
  document.body.appendChild(notesPanel.el);
  if (devBadge) notesPanel.mountDevBadge(devBadge.el);

  let current = { stage: null, mod: null, node: null };
  let renderChain = Promise.resolve();

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Quick fade-out of the outgoing stage node. Resolves when the fade ends (or
  // immediately under reduced-motion / on first paint). Renders are serialized by
  // renderChain, so the outgoing and incoming stages never coexist — this reads as
  // a clean cross-dissolve, not two stacked screens.
  function fadeOutStage(node) {
    if (!fadeStages || !node || !node.parentNode || reducedMotion.matches) return Promise.resolve();
    return new Promise((resolve) => {
      node.classList.add("stage-exit");
      requestAnimationFrame(() => node.classList.add("is-out"));
      let done = false;
      const finish = () => { if (done) return; done = true; resolve(); };
      node.addEventListener("transitionend", finish, { once: true });
      setTimeout(finish, 200); // safety net if transitionend never fires
    });
  }

  async function renderStage(nextStage) {
    if (!loaders[nextStage]) {
      console.error("[main] unknown stage:", nextStage);
      return;
    }
    // Fade the outgoing stage out first (admin), then unmount + remove it.
    await fadeOutStage(current.node);
    if (current.mod && typeof current.mod.unmount === "function") {
      try { await current.mod.unmount(current.node); } catch (e) { console.error(e); }
    }
    if (current.node && current.node.parentNode) current.node.remove();

    // Mount next
    const mod = await loaders[nextStage]();
    const node = document.createElement("section");
    node.className = "stage stage-enter";
    root.appendChild(node);
    // Every screen starts at the top — the previous screen's scroll position was
    // carrying over, so the new screen opened mid-page (phone walk 2026-07-11).
    window.scrollTo(0, 0);
    requestAnimationFrame(() => node.classList.add("is-in"));
    current = { stage: nextStage, mod, node };
    if (devBadge) devBadge.render(nextStage);
    await mod.mount(node, { store, setState, resetSession, rehydrateById, ...mountDeps });
    // Rendered cleanly, so this tab is on the current build — clear the reload
    // guard so a future stale-chunk failure can trigger a fresh recovery.
    try { sessionStorage.removeItem(CHUNK_RELOAD_FLAG); } catch { /* storage blocked */ }
  }

  function enqueueRender(nextStage) {
    renderChain = renderChain
      .then(() => renderStage(nextStage))
      .catch((e) => {
        if (isStaleChunkError(e) && !sessionStorage.getItem(CHUNK_RELOAD_FLAG)) {
          try { sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1"); } catch { /* storage blocked */ }
          location.reload();
          return;
        }
        console.error("[main] render failed:", e);
        reportError((e && e.message) || "Stage render failed");
      });
  }

  let routedStage = null;
  let routedTick = null;
  subscribe((s) => {
    topbar.render({
      ctx: s.ctx, stage: s.stage, sessionId: s.sessionId, user: s.user,
      // Look-back position, so the rail can mark the stage being viewed while
      // still drawing the run's real progress (stage-back-nav P1).
      lookbackStage: s.lookbackStage, lookbackReturn: s.lookbackReturn,
    });
    appNav.render({ stage: s.stage, user: s.user });
    profileBadge.render({ stage: s.stage, user: s.user });
    notesPanel.render(s);
    if (s.stage !== routedStage || s.stageTick !== routedTick) {
      // Remember where we came from so the Privacy note's Back link returns there.
      if (s.stage === STAGES.PRIVACY && routedStage && routedStage !== STAGES.PRIVACY) {
        store.privacyBack = routedStage;
      }
      routedStage = s.stage;
      routedTick = s.stageTick;
      syncUrl(s);
      enqueueRender(s.stage);
    }
  });

  return { root, devBadge, enqueueRender, rehydrateById };
}
