// What each finished stage of a run looked like, as HTML.
//
// Lifted out of the old ui/stage-review.js overlay (stage-back-nav P1) so the
// same renderers can be shown as a full page instead of a popup. They are pure
// `(store, run) => html` functions: no DOM, no fetching, no setState. `run` is a
// getRunFull() result, needed only for the Q&A transcript, which the store does
// not hold.
//
// Class names are deliberately unchanged (`stage-review__*`) — the stylesheet
// that dresses them, styles/design/stage-review.css, is shared with the run
// detail screens and renaming would have been churn for nothing.

import { escapeHtml as esc } from "./html.js";

export function emptyBlock(msg) {
  return `<p class="stage-review__empty caption">${esc(msg)}</p>`;
}

function head(title) {
  return `<div class="stage-review__section-title">${esc(title)}</div>`;
}

export const SECTIONS = {
  INTAKE(store, run) {
    const ctx = store?.ctx || run?.ctx || {};
    const rows = [
      ["Name", ctx.name],
      ["Role", ctx.role],
      ["Seniority", ctx.seniority],
      ["Meeting type", ctx.meetingType],
    ].filter(([, v]) => v);
    if (!rows.length && !ctx.notes) return emptyBlock("No setup details recorded.");
    return `
      ${head("Setup")}
      <dl class="stage-review__facts">
        ${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}
      </dl>
      ${ctx.notes ? `<div class="stage-review__card"><div class="eyebrow">What Sero should know</div><p>${esc(ctx.notes)}</p></div>` : ""}
    `;
  },

  FOCUS_POINTS(store, run) {
    const fps = store?.focusPoints || run?.focusPoints || [];
    if (!fps.length) return emptyBlock("No focus areas recorded.");
    return `
      ${head("Focus areas")}
      <div class="stage-review__list">
        ${fps.map((fp, i) => `
          <div class="stage-review__row">
            <div class="stage-review__num">${i + 1}</div>
            <div>
              <div class="stage-review__row-title">${esc(fp.label || fp.type || fp.id)}</div>
              ${fp.reason ? `<div class="stage-review__row-sub">${esc(fp.reason)}</div>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  },

  PREPARATION(store) {
    const b = store?.preparation;
    if (!b) return emptyBlock("Prep brief not available for this session.");
    const sections = [
      ["Likely theme", b.coreIssue],
      ["Say this first", b.openingQuestion],
      ["Listen for", b.listenFor],
      ["Avoid", b.avoid],
      ["Success looks like", b.goodOutcome],
      ["Suggested action", b.suggestedAction],
    ];
    return `
      ${head("Prep brief")}
      ${sections.map(([label, val]) => {
        if (val == null || (Array.isArray(val) && !val.length) || (!Array.isArray(val) && !String(val).trim())) return "";
        const inner = Array.isArray(val)
          ? `<ul class="stage-review__bullets">${val.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
          : `<p>${esc(val)}</p>`;
        return `<div class="stage-review__card"><div class="eyebrow">${esc(label)}</div>${inner}</div>`;
      }).join("")}
    `;
  },

  // The prepared question bank isn't persisted separately, so "Questions" shows
  // the questions that were actually put to the user (from the transcript).
  BANK(store, run) {
    const turns = (run?.turns || []).filter((t) => t.name || t.alias);
    if (!turns.length) return emptyBlock("No questions recorded yet.");
    return `
      ${head(`Questions asked (${turns.length})`)}
      <ol class="stage-review__qlist">
        ${turns.map((t) => `<li>${esc(t.name || t.alias)}${t.skipped ? ' <span class="caption">(skipped)</span>' : ""}</li>`).join("")}
      </ol>
    `;
  },

  QUESTIONING(store, run) {
    const turns = run?.turns || [];
    if (!turns.length) return emptyBlock("No Q&A recorded yet.");
    return `
      ${head(`Live Q&A (${turns.length})`)}
      <div class="stage-review__qa">
        ${turns.map((t) => `
          <div class="stage-review__turn">
            <div class="stage-review__q">${esc(t.name || t.alias || "")}</div>
            <div class="stage-review__a">${t.skipped ? "<em>(skipped)</em>" : esc(t.answer || "")}</div>
            ${t.note ? `<div class="stage-review__row-sub">Note: ${esc(t.note)}</div>` : ""}
          </div>
        `).join("")}
      </div>
    `;
  },

  EVAL(store, run) {
    const b = store?.briefing || run?.briefing;
    const v = run?.verdict;
    if (!b && !v) return emptyBlock("No synthesis recorded.");
    const axes = (b?.axes || []).filter((a) => a.meaning || a.score != null);
    return `
      ${head("Synthesis")}
      ${b?.understanding_paragraph ? `<div class="stage-review__card"><div class="eyebrow">What we understood</div><p>${esc(b.understanding_paragraph)}</p></div>` : ""}
      ${axes.length ? `
        <div class="stage-review__card">
          <div class="eyebrow">Final read</div>
          ${axes.map((a) => `
            <div class="stage-review__axis">
              <span class="stage-review__axis-name">${esc(cap(a.id))}${a.score === 0 ? " · not read" : ""}</span>
              ${a.meaning ? `<span class="stage-review__axis-meaning">${esc(a.meaning)}</span>` : ""}
            </div>
          `).join("")}
        </div>` : ""}
      ${v ? `<div class="stage-review__card"><div class="eyebrow">Verdict</div><p><strong>${esc(v.verdict)}</strong>${v.issue_type ? ` · ${esc(v.issue_type)}` : ""}</p>${v.note ? `<p class="stage-review__row-sub">${esc(v.note)}</p>` : ""}</div>` : ""}
    `;
  },

  BRIEFING(store, run) {
    const b = store?.briefing || run?.briefing;
    if (!b) return emptyBlock("No recap recorded.");
    const bullets = b.summary_bullets || [];
    const actions = b.next_actions || [];
    const watch = b.watch_for || [];
    return `
      ${head("Recap")}
      ${b.headline ? `<p class="stage-review__headline">${esc(b.headline)}</p>` : ""}
      ${bullets.length ? `<div class="stage-review__card"><div class="eyebrow">What stood out</div><ul class="stage-review__bullets">${bullets.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      ${b.understanding_paragraph ? `<div class="stage-review__card"><div class="eyebrow">What we understood</div><p>${esc(b.understanding_paragraph)}</p></div>` : ""}
      ${b.brutal_truth_employee ? `<div class="stage-review__card"><div class="eyebrow">Honest read:${esc(store?.ctx?.name || "them")}</div><p>${esc(b.brutal_truth_employee)}</p></div>` : ""}
      ${b.brutal_truth_manager ? `<div class="stage-review__card"><div class="eyebrow">Honest read:You</div><p>${esc(b.brutal_truth_manager)}</p></div>` : ""}
      ${actions.length ? `<div class="stage-review__card"><div class="eyebrow">What to do next</div><ul class="stage-review__bullets">${actions.map((a) => `<li>${esc(capWhen(a.when))}${a.when ? ": " : ""}${esc(a.action || "")}</li>`).join("")}</ul></div>` : ""}
      ${watch.length ? `<div class="stage-review__card"><div class="eyebrow">Reminders</div><ul class="stage-review__bullets">${watch.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
    `;
  },
};

// Render one stage's recap, or a plain note when the key isn't one we cover.
export function renderStageRecap(stageKey, store, run) {
  return SECTIONS[stageKey]
    ? SECTIONS[stageKey](store, run)
    : emptyBlock("Nothing to show for this stage.");
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function capWhen(w) {
  const s = String(w || "").trim();
  if (!s) return "";
  if (s === "next 1:1") return "Next 1:1";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
