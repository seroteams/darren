// Personas — browse the demo people Sero practises on (the persona bench). The
// same set powers the homepage demo dropdown and the Regression safety suite, so
// this is one consistent cast across the app. Read-only.

import { getPersonaBench, runRegression } from "../api.js";
import { escapeHtml as esc } from "../ui/html.js";

export async function mount(root) {
  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Team</div>
        <h1 class="h1">Personas</h1>
        <div class="text-ink-dim text-sm max-w-measure">
          The demo people Sero practises on. The same set powers the homepage demo dropdown and the Regression safety suite — one consistent cast across the app.
        </div>
      </header>
      <div class="thinking-host min-h-[60px] flex items-center text-ink-mute">Loading personas…</div>
      <div class="result-host l-stack l-stack--3"></div>
    </div>
  `;

  const thinkingHost = root.querySelector(".thinking-host");
  const resultHost = root.querySelector(".result-host");

  let personas = [];
  try {
    const res = await getPersonaBench();
    personas = Array.isArray(res) ? res : res.personas || [];
  } catch (e) {
    console.warn("[personas] fetch failed:", e);
    thinkingHost.textContent = "Couldn't load personas — make sure the dev server is running.";
    return;
  }

  // Which personas are also in the regression suite (cross-link badge). Optional.
  let suiteIds = new Set();
  try {
    const reg = await runRegression();
    suiteIds = new Set((reg.cases || []).map((c) => c.id));
  } catch { /* badge is best-effort */ }

  thinkingHost.remove();
  if (!personas.length) {
    resultHost.innerHTML = `<p class="text-ink-mute">No personas defined.</p>`;
    return;
  }
  resultHost.innerHTML = personas.map((p) => cardHtml(p, suiteIds.has(p.id))).join("");
}

function cardHtml(p, inSuite) {
  const title = esc(p.displayName || p.name || p.id);
  const sub = [p.role, p.seniority].filter(Boolean).map(esc).join(" · ");
  const meta = [p.meeting_type, p.issue].filter(Boolean).map(esc).join(" · ");
  const badge = inSuite
    ? `<span style="font-size:var(--type-small,0.78rem);color:var(--color-positive);background:var(--sero-success-light);border-radius:999px;padding:1px 9px;margin-left:8px;white-space:nowrap;">in regression suite</span>`
    : "";
  const script = Array.isArray(p.script) ? p.script : [];
  const scriptHtml = script.length
    ? `<details style="margin-top:8px;">
         <summary style="cursor:pointer;font-size:var(--type-small,0.82rem);color:var(--color-ink-mute,#6b7280);">View the scripted conversation (${script.length} turns)</summary>
         <div class="l-stack l-stack--2" style="margin-top:8px;">
           ${script
             .map(
               (s) =>
                 `<div style="font-size:var(--type-small,0.85rem);"><div style="color:var(--color-ink-mute,#6b7280);">${esc(s.name || s.alias || "")}</div><div>${esc(s.answer || "")}</div></div>`
             )
             .join("")}
         </div>
       </details>`
    : "";
  return `
    <div class="card" style="padding:0.85rem 1.1rem;">
      <div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <div style="font-weight:500;">${title}${badge}</div>
        <div style="font-size:var(--type-small,0.82rem);color:var(--color-ink-mute,#6b7280);">${sub}</div>
      </div>
      <div style="font-size:var(--type-small,0.85rem);color:var(--color-ink-dim,#4b5563);margin-top:2px;">${meta}</div>
      ${scriptHtml}
    </div>`;
}
