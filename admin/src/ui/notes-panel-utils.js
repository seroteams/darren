import { STAGES } from "../state.js";
import { escapeHtml } from "./html.js";

export const STAGE_LABEL = {
  FOCUS_POINTS: "Focus areas",
  PREPARATION: "Prep brief",
  BANK: "Questions",
  QUESTIONING: "During the meeting",
  EVAL: "Pulling it together",
  BRIEFING: "Recap",
};

export function groupNotes(notes) {
  const out = [];
  for (const n of notes) {
    const stem = String(n.question_stem || "").trim();
    const base =
      n.stage === STAGES.QUESTIONING && n.turn
        ? `${STAGE_LABEL.QUESTIONING}. Q${n.turn}`
        : STAGE_LABEL[n.stage] || n.stage || "–";
    const head =
      n.stage === STAGES.QUESTIONING && stem ? `${base} · ${stem}` : base;
    const last = out[out.length - 1];
    if (last && last.head === head) last.items.push(n);
    else out.push({ head, items: [n] });
  }
  return out;
}

export function fmtTime(ts) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function cryptoId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function cssEscape(s) {
  if (window.CSS && CSS.escape) return CSS.escape(s);
  return String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

export { escapeHtml };

export function attachAutoGrow(ta) {
  const grow = () => {
    const cs = getComputedStyle(ta);
    const line = parseFloat(cs.lineHeight) || 22;
    const rows = parseInt(ta.getAttribute("rows"), 10) || 3;
    const pad =
      parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const minH = rows * line + (Number.isFinite(pad) ? pad : 0);
    const max = 12 * line;
    ta.style.height = "auto";
    const h = Math.max(minH, Math.min(ta.scrollHeight, max));
    ta.style.height = h + "px";
  };
  ta.addEventListener("input", grow);
  requestAnimationFrame(grow);
  return grow;
}

export function renderCtxSegments(ctxEl, ctx) {
  const segments = [ctx.name, ctx.seniority, ctx.role, ctx.meetingType]
    .map((v) => (v == null ? "" : String(v).trim()))
    .filter(Boolean);
  if (!segments.length) {
    ctxEl.innerHTML = "";
    ctxEl.classList.add("is-empty");
    return;
  }
  ctxEl.classList.remove("is-empty");
  ctxEl.innerHTML = segments
    .map((s, i) => `<span${i === 0 ? ' class="is-strong"' : ""}>${escapeHtml(s)}</span>`)
    .join('<span class="sep">·</span>');
}
