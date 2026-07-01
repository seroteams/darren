// Build stamp — a small always-on chip (bottom-right) showing which API build is
// live: the git short SHA + commit time, read from /api/version at boot. The SHA
// matches GitHub, so "check build 1ae7ba4" works in the app and in git. If the
// server is stale, this stays on the old SHA until a restart — that's the tell.
// Click to copy the SHA.

import { getVersion } from "../../../shared/api.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${MONTHS[d.getMonth()]} ${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function createBuildStamp() {
  const el = document.createElement("button");
  el.type = "button";
  el.id = "build-stamp";
  el.tabIndex = -1; // mouse-clickable, but out of the keyboard tab order
  el.title = "Loading build…";
  el.style.cssText = [
    "position:fixed",
    "bottom:8px",
    "right:10px",
    "z-index:9999",
    "font:14px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
    "background:rgba(15,23,42,0.82)",
    "color:#cbd5e1",
    "padding:4px 9px",
    "border-radius:7px",
    "border:1px solid rgba(148,163,184,0.25)",
    "white-space:nowrap",
    "cursor:pointer",
    "opacity:0.55",
    "transition:opacity 120ms",
  ].join(";");
  el.addEventListener("mouseenter", () => { el.style.opacity = "1"; });
  el.addEventListener("mouseleave", () => { el.style.opacity = "0.55"; });

  let sha = "";
  el.addEventListener("click", async () => {
    if (!sha) return;
    try {
      await navigator.clipboard.writeText(sha);
      const prev = el.style.color;
      el.style.color = "#a7f3d0";
      setTimeout(() => { el.style.color = prev || "#cbd5e1"; }, 600);
    } catch { /* clipboard blocked — ignore */ }
  });

  async function load() {
    try {
      const info = await getVersion();
      sha = info.build || "unknown";
      const date = fmtDate(info.committedAt);
      el.innerHTML = `<span style="color:#94a3b8">build</span> <span style="color:#fbbf24">${sha}</span>${date ? ` <span style="color:#94a3b8">· ${date}</span>` : ""}`;
      el.title = [
        `build ${sha}`,
        info.committedAt ? `committed ${info.committedAt}` : null,
        info.bootedAt ? `server booted ${info.bootedAt}` : null,
        "click to copy SHA",
      ].filter(Boolean).join("\n");
    } catch {
      sha = "";
      el.innerHTML = `<span style="color:#94a3b8">build</span> <span style="color:#f87171">offline</span>`;
      el.title = "API unreachable — build unknown";
    }
  }

  load();
  return { el, load };
}
