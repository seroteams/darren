// Screen Gallery — /gallery (internal-only, local-only; gated like /test + /design).
// A design "edit mode": entered from the Screens icon in the left rail. A soft-yellow
// toolbar pins full-width across the very top (above the rail — the rail and content shift
// down beneath it); its "Screens ▾" dropdown lists EVERY screen in the app, grouped. Pick
// one and the REAL screen module mounts below, filled with your local data. Because it mounts
// the real modules with the real deps, a design change to a screen's source lands on the
// actual site — there are no copies to keep in sync. Each screen also has a one-click
// "Copy design prompt" (file path + live URL) for starting a design chat.
//
// The list is read from ../../stage-loaders.js (the same registry main.js boots from), so a
// newly-added screen appears here automatically. Labels/grouping come from ./screens.js.

import { ChevronDown } from "lucide";
import { loaders } from "../../stage-loaders.js";
import { withBase, replaceUrl } from "../../router.js";
import { icon } from "../../ui/icon.js";
import { GROUPS, SCREENS, HIDDEN, EXTRA_LOADERS, designPrompt } from "./screens.js";

// Every loadable screen = the boot registry + the customer-app-only extras.
const REGISTRY = { ...loaders, ...EXTRA_LOADERS };

// Held across the stage's life so unmount can tear them down.
let active = { key: null, mod: null, host: null }; // the mounted child screen
let editBar = null;                                // the fixed top toolbar (lives in <body>)
let awayHandler = null;                            // click-away closer for the dropdown

// ---- helpers ---------------------------------------------------------------

function humanize(key) {
  const s = key.toLowerCase().replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const metaFor = (key) => SCREENS[key] || { label: humanize(key), group: "unsorted" };

// The repo-relative source path of a screen, derived from its lazy loader. In Vite dev the
// import specifier is already resolved to a served URL — either base-prefixed
// ("/admin/src/stages/briefing.js") or, for cross-package files, an absolute "/@fs/…" path.
// Normalise both to a repo path by anchoring on the first top-level package dir. A `file:`
// override in SCREENS wins.
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
  spec = spec.split("?")[0];
  const fs = spec.indexOf("/@fs/");
  if (fs >= 0) spec = spec.slice(fs + 5);
  const anchor = spec.match(/(?:^|\/)(admin|frontend|shared|backend)\/.*/);
  return anchor ? anchor[0].replace(/^\//, "") : spec.replace(/^\//, "");
}
const screenIdOf = (key) => key.toLowerCase();
const liveUrlFor = (key) => window.location.origin + withBase(`/gallery/${screenIdOf(key)}`);

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
// The bar is fixed to the very top of the viewport; body.gallery-edit shifts the rail,
// content and top-right badge down by the bar height so nothing hides under it.

const STYLE = `
  body.gallery-edit { --gal-bar-h: 56px; }
  body.gallery-edit .app-nav { top: var(--gal-bar-h); }
  body.gallery-edit #root { padding-top: var(--gal-bar-h); }
  body.gallery-edit .profile-badge { top: calc(var(--gal-bar-h) + var(--sero-space-2)); }
  body.gallery-edit .session-topbar { top: var(--gal-bar-h); }

  .gal-editbar { position:fixed; top:0; left:0; right:0; height:var(--gal-bar-h, 56px);
    background:var(--sero-gold-100); border-bottom:1px solid var(--sero-gold-400);
    box-shadow:var(--shadow-lift); z-index:var(--sero-z-toast, 80); }
  .gal-editbar__inner { display:flex; align-items:center; gap:var(--sero-space-3);
    height:100%; padding:0 var(--sero-space-5); }
  .gal__spark { font-size:16px; line-height:1; cursor:default; }

  .gal__dropdown { position:relative; }
  .gal__screens-btn { display:inline-flex; align-items:center; gap:8px; font:inherit; font-size:15px;
    font-weight:600; color:var(--sero-gold-900); background:var(--sero-gold-200);
    border:1px solid var(--sero-gold-400); border-radius:var(--radius-button); padding:8px 14px; cursor:pointer; }
  .gal__screens-btn:hover { background:var(--sero-gold-300); }
  .gal__screens-btn:focus-visible { outline:none; box-shadow:var(--shadow-focus); }
  .gal__caret { transition:transform .18s ease; display:inline-flex; align-items:center; }
  .gal__dropdown.is-open .gal__caret { transform:rotate(180deg); }
  .gal__menu { position:absolute; top:calc(100% + 8px); left:0; width:360px; max-height:78vh;
    overflow:auto; background:var(--sero-gold-100); border:1px solid var(--sero-gold-400);
    border-radius:var(--radius-card); box-shadow:var(--shadow-lift); padding:var(--sero-space-3);
    z-index:var(--sero-z-popover, 60); display:none; }
  .gal__dropdown.is-open .gal__menu { display:block; }
  .gal__filter { width:100%; font:inherit; font-size:14px; color:var(--color-ink);
    background:var(--color-surface); border:1px solid var(--sero-gold-400);
    border-radius:var(--radius-input); padding:8px 12px; margin-bottom:var(--sero-space-2);
    position:sticky; top:0; }
  .gal__filter:focus-visible { outline:none; box-shadow:var(--shadow-focus); }
  .gal__grp { display:flex; align-items:center; gap:6px; font-size:14px; font-weight:600;
    color:var(--sero-gold-900); letter-spacing:0.04em; text-transform:uppercase;
    margin:var(--sero-space-3) 4px var(--sero-space-1); }
  .gal__grp svg { opacity:.7; flex:none; }
  .gal__group:first-child .gal__grp { margin-top:2px; }
  .gal__item { display:flex; align-items:center; justify-content:space-between; gap:8px;
    width:100%; text-align:left; font:inherit; font-size:14px; color:var(--color-ink);
    background:none; border:0; border-radius:var(--radius-button); padding:7px 10px; cursor:pointer; }
  .gal__item:hover { background:var(--sero-gold-300); }
  .gal__item:focus-visible { outline:none; box-shadow:var(--shadow-focus); }
  .gal__item.is-on { background:var(--sero-gold-400); font-weight:600; }
  .gal__tag { font-size:14px; background:var(--color-surface); color:var(--sero-gold-900);
    border:1px solid var(--sero-gold-400); border-radius:9999px; padding:0 8px; white-space:nowrap; }

  .gal__bar-id { min-width:0; line-height:1.2; }
  .gal__bar-title { font-family:var(--type-family-display); font-size:18px; font-weight:600;
    color:var(--color-ink); }
  .gal__bar-file { font-family:var(--font-mono); font-size:14px; color:var(--sero-gold-900);
    opacity:.85; word-break:break-all; }
  .gal__bar-actions { margin-left:auto; display:flex; gap:var(--sero-space-2); align-items:center; }
  .gal__needs { font-size:14px; color:var(--sero-gold-900); background:var(--sero-gold-200);
    border:1px solid var(--sero-gold-400); border-radius:9999px; padding:2px 10px; }

  .gal__host { min-height:calc(100vh - var(--gal-bar-h, 56px)); }
  .gal__placeholder { display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:var(--sero-space-2); min-height:60vh; color:var(--color-ink-dim); text-align:center;
    padding:var(--sero-space-6); }
  .gal__placeholder h2 { font-family:var(--type-family-display); font-size:22px; color:var(--color-ink); }
  @media (prefers-reduced-motion: reduce) { .gal__caret { transition:none; } }
`;

// ---- mount -----------------------------------------------------------------

export async function mount(node, deps) {
  const tree = buildTree();

  // Stage node holds only the picked screen; the toolbar is a separate fixed bar in <body>.
  node.innerHTML = `
    <div class="gal__host js-host">
      <div class="gal__placeholder">
        <h2>Every screen, in one place</h2>
        <p>Click the yellow <strong>Screens</strong> button up top and pick a page. It opens here filled with your local data. Edit its design and the change lands on the real app.</p>
      </div>
    </div>`;

  // Remove any stray bar from a previous mount, then build the fixed edit-mode toolbar.
  if (editBar) editBar.remove();
  editBar = document.createElement("div");
  editBar.className = "gal-editbar";
  editBar.innerHTML = `
    <style>${STYLE}</style>
    <div class="gal-editbar__inner">
      <span class="gal__spark" title="Preview of real screens. Buttons are live against your local test data. This page is hidden and never shows on the live site.">⚡</span>
      <div class="gal__dropdown js-dropdown">
        <button type="button" class="gal__screens-btn js-screens" aria-haspopup="true" aria-expanded="false">
          Screens <span class="gal__caret" aria-hidden="true">${icon(ChevronDown, { size: 16 })}</span>
        </button>
        <div class="gal__menu" role="menu">
          <input class="gal__filter" type="search" placeholder="Type a screen name…  e.g. brief" aria-label="Filter screens" />
          <div class="js-tree"></div>
        </div>
      </div>
      <div class="gal__bar-id">
        <div class="gal__bar-title js-title">Screen Gallery</div>
        <div class="gal__bar-file js-file">Pick a page to preview it.</div>
      </div>
      <div class="gal__bar-actions js-actions"></div>
    </div>`;
  document.body.appendChild(editBar);
  document.body.classList.add("gallery-edit");

  const hostEl = node.querySelector(".js-host");
  const dropdownEl = editBar.querySelector(".js-dropdown");
  const screensBtn = editBar.querySelector(".js-screens");
  const treeEl = editBar.querySelector(".js-tree");
  const filterEl = editBar.querySelector(".gal__filter");
  const titleEl = editBar.querySelector(".js-title");
  const fileEl = editBar.querySelector(".js-file");
  const actionsEl = editBar.querySelector(".js-actions");

  // --- dropdown open/close ---
  const openMenu = () => { dropdownEl.classList.add("is-open"); screensBtn.setAttribute("aria-expanded", "true"); filterEl.focus(); };
  const closeMenu = () => { dropdownEl.classList.remove("is-open"); screensBtn.setAttribute("aria-expanded", "false"); };
  screensBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownEl.classList.contains("is-open") ? closeMenu() : openMenu();
  });
  awayHandler = (e) => { if (!dropdownEl.contains(e.target)) closeMenu(); };
  document.addEventListener("click", awayHandler);
  editBar.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

  // --- build the grouped list ---
  treeEl.innerHTML = tree.map((g) => `
    <div class="gal__group" data-group="${g.id}">
      <div class="gal__grp">${icon(ChevronDown, { size: 14 })}${g.label}</div>
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

    if (active.mod && typeof active.mod.unmount === "function") {
      try { await active.mod.unmount(active.host); } catch (e) { console.error("[gallery] unmount", e); }
    }
    active = { key: null, mod: null, host: null };

    treeEl.querySelectorAll(".gal__item").forEach((b) =>
      b.classList.toggle("is-on", b.dataset.screen === key));
    deps.store.galleryScreen = key;
    replaceUrl(`/gallery/${screenIdOf(key)}`);
    closeMenu();

    const m = metaFor(key);
    const file = fileFor(key);
    titleEl.textContent = m.label;
    fileEl.textContent = file;

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

  treeEl.querySelectorAll(".gal__item").forEach((b) =>
    b.addEventListener("click", () => openScreen(b.dataset.screen)));

  // deep link / reload: open the requested screen straight away
  const wanted = deps.store.galleryScreen;
  if (wanted && REGISTRY[wanted]) openScreen(wanted);
}

export async function unmount() {
  // Tear the edit-mode chrome down FIRST so leaving the gallery restores normal layout even
  // if a child unmount throws.
  if (awayHandler) { document.removeEventListener("click", awayHandler); awayHandler = null; }
  if (editBar) { editBar.remove(); editBar = null; }
  document.body.classList.remove("gallery-edit");
  if (active.mod && typeof active.mod.unmount === "function") {
    try { await active.mod.unmount(active.host); } catch (e) { console.error("[gallery] unmount", e); }
  }
  active = { key: null, mod: null, host: null };
}
