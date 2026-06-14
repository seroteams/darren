// Meeting arcs — a browsable home for every 1:1 type's arc (its phases, the tone
// it's asked in, and the anti-patterns to avoid). Read-only for now; editing lands
// in the next phase. All five types stack on one page; open any to see its shape.

import { getArcs } from "../api.js";
import { escapeHtml as esc } from "../ui/html.js";

const STYLE = `
<style>
  .arc-card { padding: 0; overflow: hidden; }
  .arc-card__head { display:flex; align-items:center; gap:10px; width:100%; padding:14px 16px;
    background:none; border:none; cursor:pointer; text-align:left; color:var(--color-ink); }
  .arc-card__chev { transition: transform .15s ease; color:var(--color-ink-mute); flex:none; }
  .arc-card[data-open="true"] .arc-card__chev { transform: rotate(90deg); }
  .arc-card__meta { margin-left:auto; font-size:.8rem; color:var(--color-ink-mute); }
  .arc-edited { font-size:.7rem; font-weight:500; padding:2px 8px; border-radius:6px;
    background:var(--sero-gold-200); color:var(--sero-gold-800); }
  .arc-chips { display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:0 16px 14px 40px; }
  .arc-chip { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.72rem;
    padding:2px 8px; border-radius:6px; background:var(--sero-soft-200); color:var(--color-ink-dim);
    border:1px solid var(--color-border); }
  .arc-chip__sep { color:var(--color-ink-mute); }
  .arc-body { padding:4px 16px 16px; border-top:1px solid var(--color-border); }
  .arc-sec { font-size:.7rem; letter-spacing:.04em; text-transform:uppercase;
    color:var(--color-ink-mute); margin:14px 0 8px; }
  .arc-phase { display:flex; align-items:flex-start; gap:10px; padding:8px 0;
    border-bottom:1px solid var(--color-border); }
  .arc-phase:last-child { border-bottom:none; }
  .arc-phase__id { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:.72rem;
    padding:2px 7px; border-radius:6px; background:var(--sero-soft-200); color:var(--color-ink-dim);
    flex:none; margin-top:1px; }
  .arc-phase__main { flex:1; min-width:0; }
  .arc-phase__label { font-weight:500; color:var(--color-ink); }
  .arc-phase__intent { font-size:.85rem; color:var(--color-ink-dim); margin-top:2px; }
  .arc-phase__q { flex:none; font-size:.75rem; color:var(--color-ink-mute); white-space:nowrap; margin-top:2px; }
  .arc-anti { margin:0; padding-left:18px; color:var(--color-ink-dim); font-size:.85rem; }
  .arc-anti li { margin:3px 0; }
</style>`;

const CHEV = `<svg class="arc-card__chev" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>`;

export async function mount(root) {
  root.innerHTML = `
    ${STYLE}
    <div class="stage-medium l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Configure</div>
        <h1 class="h1">Meeting arcs</h1>
        <div class="text-ink-dim text-sm max-w-measure">
          The phases each 1:1 moves through, with the tone they're asked in and the patterns to avoid. Open any meeting to see its full shape. Editing is coming next.
        </div>
      </header>
      <div class="thinking-host min-h-[60px] flex items-center text-ink-mute">Loading meeting arcs…</div>
      <div class="result-host l-stack l-stack--4"></div>
    </div>
  `;

  const thinkingHost = root.querySelector(".thinking-host");
  const resultHost = root.querySelector(".result-host");

  let arcs = [];
  try {
    const res = await getArcs();
    arcs = Array.isArray(res?.arcs) ? res.arcs : [];
  } catch (e) {
    console.warn("[meeting-arcs] fetch failed:", e);
    thinkingHost.textContent = "Couldn't load meeting arcs — try again in a moment.";
    return;
  }

  thinkingHost.remove();

  if (!arcs.length) {
    resultHost.innerHTML = `<p class="text-ink-mute">No meeting types found.</p>`;
    return;
  }

  // First card open by default; the rest collapsed to a phase-chip summary.
  const open = new Set([arcs[0].slug]);
  resultHost.innerHTML = arcs.map((a) => cardHtml(a, open.has(a.slug))).join("");

  resultHost.addEventListener("click", (e) => {
    const head = e.target.closest(".arc-card__head");
    if (!head) return;
    const card = head.closest(".arc-card");
    const slug = card?.dataset.slug;
    if (!slug) return;
    if (open.has(slug)) open.delete(slug);
    else open.add(slug);
    card.outerHTML = cardHtml(arcs.find((a) => a.slug === slug), open.has(slug));
  });
}

function totalQuestions(arc) {
  return (arc.arc || []).reduce((n, p) => n + (Number(p.target_questions) || 0), 0);
}

function cardHtml(a, isOpen) {
  const phases = Array.isArray(a.arc) ? a.arc : [];
  const meta = `${phases.length} ${phases.length === 1 ? "phase" : "phases"} · ${totalQuestions(a)} questions`;
  const edited = a.edited ? `<span class="arc-edited">edited</span>` : "";

  const chips = phases
    .map((p) => `<span class="arc-chip">${esc(p.id)}</span>`)
    .join(`<span class="arc-chip__sep">→</span>`);

  const body = isOpen ? bodyHtml(a, phases) : "";
  const peek = isOpen ? "" : `<div class="arc-chips">${chips}</div>`;

  return `
    <section class="card arc-card" data-slug="${esc(a.slug)}" data-open="${isOpen}">
      <button type="button" class="arc-card__head" aria-expanded="${isOpen}">
        ${CHEV}
        <span class="h3" style="margin:0;">${esc(a.label)}</span>
        ${edited}
        <span class="arc-card__meta">${meta}</span>
      </button>
      ${peek}
      ${body}
    </section>`;
}

function bodyHtml(a, phases) {
  const phaseRows = phases
    .map(
      (p) => `
      <div class="arc-phase">
        <span class="arc-phase__id">${esc(p.id)}</span>
        <div class="arc-phase__main">
          <div class="arc-phase__label">${esc(p.label || p.id)}</div>
          ${p.intent ? `<div class="arc-phase__intent">${esc(p.intent)}</div>` : ""}
        </div>
        <span class="arc-phase__q">${Number(p.target_questions) || 0} q</span>
      </div>`
    )
    .join("");

  const anti = Array.isArray(a.anti_patterns) && a.anti_patterns.length
    ? `<div class="arc-sec">Anti-patterns</div>
       <ul class="arc-anti">${a.anti_patterns.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
    : "";

  const tone = a.tone_register
    ? `<div class="arc-sec">Tone</div><p class="text-ink-dim" style="font-size:.85rem; margin:0;">${esc(a.tone_register)}</p>`
    : "";

  return `
    <div class="arc-body">
      <div class="arc-sec">Phases</div>
      ${phaseRows}
      ${tone}
      ${anti}
    </div>`;
}
