// Dev-only badge — shows current stage, source file, and primary data endpoint.
// Mounted from main.js; never rendered in production builds.

const STAGE_META = {
  INTAKE:       { file: "stages/intake.js",        data: "/api/meeting-types, /api/start" },
  FOCUS_POINTS: { file: "stages/focus-points.js",  data: "/api/focus-points/stream" },
  PREPARATION:  { file: "stages/preparation.js",   data: "/api/preparation/stream" },
  BANK:         { file: "stages/bank.js",          data: "/api/bank/stream" },
  QUESTIONING:  { file: "stages/questioning.js",   data: "/api/plan/stream, /api/question, /api/answer" },
  EVAL:         { file: "stages/eval.js",          data: "/api/evaluation/stream" },
  BRIEFING:     { file: "stages/briefing.js",      data: "—" },
  ERROR:        { file: "stages/error.ts",         data: "—" },
};

export function createDevBadge() {
  const el = document.createElement("div");
  el.id = "dev-badge";
  el.style.cssText = [
    "position:relative",
    "font:10px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
    "background:rgba(15,23,42,0.85)",
    "color:#e2e8f0",
    "padding:5px 7px",
    "border-radius:5px",
    "border:1px solid rgba(148,163,184,0.25)",
    "white-space:nowrap",
    "overflow:hidden",
    "text-overflow:ellipsis",
    "cursor:pointer",
  ].join(";");

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.title = "Copy stage debug info";
  copyBtn.style.cssText = [
    "position:absolute",
    "top:4px",
    "right:4px",
    "background:transparent",
    "border:none",
    "color:#94a3b8",
    "cursor:pointer",
    "padding:2px",
    "font:inherit",
    "line-height:1",
    "opacity:0",
    "transition:opacity 120ms",
  ].join(";");
  copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  el.appendChild(copyBtn);
  el.addEventListener("mouseenter", () => { copyBtn.style.opacity = "1"; });
  el.addEventListener("mouseleave", () => { copyBtn.style.opacity = "0"; });

  let plainText = "";
  async function copy() {
    if (!plainText) return;
    try {
      await navigator.clipboard.writeText(plainText);
      const original = copyBtn.style.color;
      copyBtn.style.color = "#a7f3d0";
      setTimeout(() => { copyBtn.style.color = original || "#94a3b8"; }, 600);
    } catch {}
  }
  copyBtn.addEventListener("click", (e) => { e.stopPropagation(); copy(); });
  el.addEventListener("click", copy);

  function render(stage) {
    const meta = STAGE_META[stage] || { file: "?", data: "?" };
    const stageStr = stage || "—";
    plainText = `[DEV] stage ${stageStr}\nfile ${meta.file}\ndata ${meta.data}`;
    el.innerHTML = `
      <div><span style="color:#94a3b8">DEV</span> <span style="color:#fbbf24">${stageStr}</span></div>
      <div><span style="color:#94a3b8">file</span>  <span style="color:#e2e8f0">${meta.file}</span></div>
      <div><span style="color:#94a3b8">data</span>  <span style="color:#a7f3d0">${meta.data}</span></div>
    `;
    el.appendChild(copyBtn);
  }

  return { el, render };
}
