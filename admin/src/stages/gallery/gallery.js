// Screen Gallery — /gallery (internal-only, local-only; gated like /test + /design).
// A tree of EVERY screen in the app on the left; click one and the REAL screen module
// mounts on the right, filled with your local data. Because it mounts the real modules
// with the real deps, a design change to a screen's source lands on the actual site —
// there are no copies to keep in sync. Each screen also has a one-click "Copy design
// prompt" that puts a ready-to-paste chat prompt (file path + live URL) on the clipboard.
//
// The tree is read from ../../stage-loaders.js (the same registry main.js boots from), so
// a newly-added screen appears here automatically. Labels/grouping come from ./screens.js.

import { loaders } from "../../stage-loaders.js";
import { withBase, replaceUrl } from "../../router.js";
import {
  GROUPS, SCREENS, HIDDEN, EXTRA_LOADERS, designPrompt,
} from "./screens.js";

// Every loadable screen = the boot registry + the customer-app-only extras.
const REGISTRY = { ...loaders, ...EXTRA_LOADERS };

// The currently-open child screen, so we can unmount it before mounting the next one.
let active = { key: null, mod: null, host: null };

// ---- helpers ---------------------------------------------------------------

function humanize(key) {
  const s = key.toLowerCase().replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const metaFor = (key) => SCREENS[key] || { label: humanize(key), group: "unsorted" };

// The repo-relative source path of a screen, derived from its lazy loader. In Vite dev the
// import specifier is already resolved to a served URL — either base-prefixed
// ("/admin/src/stages/briefing.js") or, for cross-package files, an absolute "/@fs/…" path
// ("/admin/@fs/C:/…/frontend/src/stages/team.ts"). Normalise both to a repo path by
// anchoring on the first top-level package dir. A `file:` override in SCREENS wins.
function importPathOf(loaderFn) {
  const m = String(loaderFn).match(/import\(\s*["']([^"']+)["']\s*\)/);
  return m ? m[1] : null;
}
function fileFor(key) {
  const m = SCREENS[key];
  if (m && m.file) return m.file;
  const fn = EXTRA_LOADERS[key] || loaders[key];
  let spec = fn ? importPathOf(fn) : null;
  if (!spec) return "(source unknown)";
  spec = spec.split("?")[0];                    // drop Vite's ?t= cache-bust query
  const fs = spec.indexOf("/@fs/");
  if (fs >= 0) spec = spec.slice(fs + 5);       // cross-package: keep the absolute path after /@fs/
  const anchor = spec.match(/(?:^|\/)(admin|frontend|shared|backend)\/.*/);
  return anchor ? anchor[0].replace(/^\//, "") : spec.replace(/^\//, "");
}
const screenIdOf = (key) => key.toLowerCase();
const liveUrlFor = (key) => window.location.origin + withBase(`/gallery/${screenIdOf(key)}`);

// Ordered [{ group, label, items:[key,...] }] for the tree — GROUPS order, SCREENS order
// within each group, with any un-annotated loadable stage falling into "New / unsorted".
function buildTree() {
  const loadable = Object.keys(REGISTRY).filter((k) => !HIDDEN.has(k));
  const declared = Object.keys(SCREENS);
  const unsorted = loadable.filter((k) => !SCREENS[k]);
  return GROUPS.map((g) => {
    const items = g.id === "unsorted"
      ? unsorted
      : declared.filter((k) => loadable.includes(k) && metaFor(k).group === g.id);
    return { ...g, items };
  }).filter((g) => g.items.length);
}

// ---- styles ----------------------------------------------------------------

const STYLE = `
  .gal { display:flex; min-height:calc(100vh - var(--app-nav-h)); }
  .gal__tree { width:264px; flex:none; border-right:1px solid var(--color-border);
    background:var(--color-surface); padding:var(--sero-space-4) var(--sero-space-3);
    overflow:auto; position:sticky; top:0; align-self:flex-start; max-height:100vh; }
  .gal__filter { width:100%; font:inherit; font-size:14px; color:var(--color-ink);
    background:var(--color-surface); border:1px solid var(--color-border);
    border-radius:var(--radius-input); padding:8px 12px; margin-bottom:var(--sero-space-3); }
  .gal__filter:focus-visible { outline:none; box-shadow:var(--shadow-focus); }
  .gal__grp { font-size:14px; font-weight:600; color:var(--color-ink-dim);
    letter-spacing:0.04em; text-transform:uppercase; margin:var(--sero-space-4) 4px var(--sero-space-1); }
  .gal__grp:first-child { margin-top:0; }
  .gal__item { display:flex; align-items:center; justify-content:space-between; gap:8px;
    width:100%; text-align:left; font:inherit; font-size:14px; color:var(--color-ink);
    background:none; border:0; border-radius:var(--radius-button); padding:7px 10px; cursor:pointer; }
  .gal__item:hover { background:var(--color-surface-2); }
  .gal__item:focus-visible { outline:none; box-shadow:var(--shadow-focus); }
  .gal__item.is-on { background:var(--color-accent-soft); color:var(--color-accent-dark); font-weight:600; }
  .gal__tag { font-size:14px; background:var(--sero-gold-200); color:var(--sero-gold-900);
    border-radius:9999px; padding:1px 8px; white-space:nowrap; }
  .gal__pane { flex:1; min-width:0; display:flex; flex-direction:column; }
  .gal__bar { display:flex; align-items:center; gap:var(--sero-space-3); flex-wrap:wrap;
    padding:var(--sero-space-3) var(--sero-space-5); border-bottom:1px solid var(--color-border);
    background:var(--color-surface); }
  .gal__bar-id { min-width:0; }
  .gal__bar-title { font-family:var(--type-family-display); font-size:20px; font-weight:600;
    color:var(--color-ink); line-height:1.2; }
  .gal__bar-file { font-family:var(--font-mono); font-size:14px; color:var(--color-ink-dim);
    word-break:break-all; }
  .gal__bar-actions { margin-left:auto; display:flex; gap:var(--sero-space-2); align-items:center; }
  .gal__banner { font-size:14px; color:var(--sero-gold-900); background:var(--sero-gold-200);
    padding:6px var(--sero-space-5); }
  .gal__host { flex:1; overflow:auto; }
  .gal__placeholder { display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:var(--sero-space-2); height:100%; min-height:320px; color:var(--color-ink-dim);
    text-align:center; padding:var(--sero-space-6); }
  .gal__placeholder h2 { font-family:var(--type-family-display); font-size:22px; color:var(--color-ink); }
  .gal__needs { font-size:14px; color:var(--sero-gold-900); background:var(--sero-gold-200);
    border-radius:9999px; padding:2px 10px; }
`;

// ---- mount -----------------------------------------------------------------

export async function mount(node, deps) {
  const tree = buildTree();

  node.innerHTML = `
    <style>${STYLE}</style>
    <div class="gal">
      <nav class="gal__tree" aria-label="All screens">
        <input class="gal__filter" type="search" placeholder="Type a screen name…  e.g. brief" aria-label="Filter screens" />
        <div class="js-tree"></div>
      </nav>
      <div class="gal__pane">
        <div class="gal__banner">⚡ Preview of real screens — buttons are live against your local test data. This page is hidden and never shows on the live site.</div>
        <div class="gal__bar">
          <div class="gal__bar-id">
            <div class="gal__bar-title js-title">Screen Gallery</div>
            <div class="gal__bar-file js-file">Pick a screen on the left to preview it.</div>
          </div>
          <div class="gal__bar-actions js-actions"></div>
        </div>
        <div class="gal__host js-host">
          <div class="gal__placeholder">
            <h2>Every screen, in one place</h2>
            <p>Choose a screen on the left. It opens here filled with your local data — edit its design and the change lands on the real app.</p>
          </div>
        </div>
      </div>
    </div>`;

  const treeEl = node.querySelector(".js-tree");
  const filterEl = node.querySelector(".gal__filter");
  const hostEl = node.querySelector(".js-host");
  const titleEl = node.querySelector(".js-title");
  const fileEl = node.querySelector(".js-file");
  const actionsEl = node.querySelector(".js-actions");

  // --- build the tree DOM ---
  treeEl.innerHTML = tree.map((g) => `
    <div class="gal__group" data-group="${g.id}">
      <div class="gal__grp">${g.label}</div>
      ${g.items.map((key) => {
        const m = metaFor(key);
        return `<button type="button" class="gal__item" data-screen="${key}" data-label="${m.label.toLowerCase()}">
          <span>${m.label}</span>
          ${m.needsData ? `<span class="gal__tag">needs data</span>` : ""}
        </button>`;
      }).join("")}
    </div>`).join("");

  // --- filter box ---
  filterEl.addEventListener("input", () => {
    const q = filterEl.value.trim().toLowerCase();
    treeEl.querySelectorAll(".gal__group").forEach((grp) => {
      let anyVisible = false;
      grp.querySelectorAll(".gal__item").forEach((item) => {
        const hit = !q || item.dataset.label.includes(q);
        item.style.display = hit ? "" : "none";
        if (hit) anyVisible = true;
      });
      grp.style.display = anyVisible ? "" : "none";
    });
  });

  // --- open a screen into the host ---
  async function openScreen(key) {
    if (!REGISTRY[key]) return;

    // unmount whatever is currently mounted
    if (active.mod && typeof active.mod.unmount === "function") {
      try { await active.mod.unmount(active.host); } catch (e) { console.error("[gallery] unmount", e); }
    }
    active = { key: null, mod: null, host: null };

    // reflect selection in the tree + URL + store (no notify → gallery isn't torn down)
    treeEl.querySelectorAll(".gal__item").forEach((b) =>
      b.classList.toggle("is-on", b.dataset.screen === key));
    deps.store.galleryScreen = key;
    replaceUrl(`/gallery/${screenIdOf(key)}`);

    const m = metaFor(key);
    const file = fileFor(key);
    titleEl.textContent = m.label;
    fileEl.textContent = file;

    // header actions: copy-prompt + (in Phase 1) a needs-data note
    actionsEl.innerHTML = `
      ${m.needsData ? `<span class="gal__needs" title="Phase 2 will seed a demo session so this fills in">empty until Phase 2</span>` : ""}
      <button type="button" class="btn btn--ghost js-copy">Copy design prompt</button>`;
    actionsEl.querySelector(".js-copy").addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const text = designPrompt({ label: m.label, file, url: liveUrlFor(key) });
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = "Copied ✓";
        setTimeout(() => { btn.textContent = "Copy design prompt"; }, 1600);
      } catch {
        btn.textContent = "Copy failed";
        setTimeout(() => { btn.textContent = "Copy design prompt"; }, 1600);
      }
    });

    // mount the real screen with the real deps
    hostEl.innerHTML = "";
    const host = document.createElement("div");
    host.className = "stage";
    hostEl.appendChild(host);
    try {
      const mod = await REGISTRY[key]();
      await mod.mount(host, deps);
      active = { key, mod, host };
    } catch (err) {
      console.error("[gallery] failed to mount", key, err);
      host.innerHTML = `<div class="gal__placeholder"><h2>Couldn't open ${m.label}</h2>
        <p>This screen errored while loading. The console has the details.</p></div>`;
    }
  }

  node.querySelectorAll(".gal__item").forEach((b) =>
    b.addEventListener("click", () => openScreen(b.dataset.screen)));

  // deep link / reload: open the requested screen straight away
  const wanted = deps.store.galleryScreen;
  if (wanted && REGISTRY[wanted]) openScreen(wanted);
}

export async function unmount() {
  if (active.mod && typeof active.mod.unmount === "function") {
    try { await active.mod.unmount(active.host); } catch (e) { console.error("[gallery] unmount", e); }
  }
  active = { key: null, mod: null, host: null };
}
