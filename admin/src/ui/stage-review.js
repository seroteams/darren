// Read-only review overlay. Opened from the top-bar breadcrumb so the user can
// look back at any completed stage (Setup … Briefing) without leaving — or
// re-running — the live one-way run. It NEVER calls setState({ stage }); it
// only reads cached store fields plus getRunFull(sessionId) for the Q&A
// transcript, which the store does not hold.

import { getRunFull } from "../../../shared/api.js";
import { TOPBAR_STAGES } from "./stage-labels.js";
import { escapeHtml as esc } from "./html.js";
import { icon } from "./icon.js";
import { X } from "lucide";

export function createStageReview({ store } = {}) {
  let overlay = null;
  let escHandler = null;
  let run = null; // cached getRunFull result
  let runId = null; // session it was fetched for

  function close() {
    if (overlay) { overlay.remove(); overlay = null; }
    if (escHandler) { document.removeEventListener("keydown", escHandler); escHandler = null; }
  }

  async function open(stageKey) {
    close();

    overlay = document.createElement("div");
    overlay.className = "stage-review";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Session review");
    overlay.innerHTML = `
      <div class="stage-review__backdrop"></div>
      <div class="stage-review__panel">
        <header class="stage-review__head">
          <div class="stage-review__nav" role="tablist" aria-label="Review sections"></div>
          <button type="button" class="stage-review__close" aria-label="Close review">${icon(X, { size: 16 })}</button>
        </header>
        <div class="stage-review__body"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector(".stage-review__backdrop").addEventListener("click", close);
    overlay.querySelector(".stage-review__close").addEventListener("click", close);
    escHandler = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", escHandler);

    renderNav(stageKey);
    const body = overlay.querySelector(".stage-review__body");
    body.innerHTML = `<p class="stage-review__loading caption">Loading session…</p>`;

    // Fetch the full run once per session; reuse the cache on re-open.
    if (store?.sessionId && (run == null || runId !== store.sessionId)) {
      try {
        run = await getRunFull(store.sessionId);
        runId = store.sessionId;
      } catch (e) {
        console.warn("[stage-review] getRunFull failed:", e.message);
      }
    }
    // The overlay may have been closed while awaiting.
    if (!overlay) return;
    renderSection(stageKey);
  }

  function renderNav(activeKey) {
    const nav = overlay.querySelector(".stage-review__nav");
    nav.innerHTML = TOPBAR_STAGES
      .map(([key, label]) =>
        `<button type="button" role="tab" class="stage-review__tab${key === activeKey ? " is-active" : ""}" data-stage="${key}" aria-selected="${key === activeKey}">${esc(label)}</button>`
      )
      .join("");
    nav.querySelectorAll(".stage-review__tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        renderNav(btn.dataset.stage);
        renderSection(btn.dataset.stage);
      });
    });
  }

  function renderSection(stageKey) {
    const body = overlay.querySelector(".stage-review__body");
    const html = SECTIONS[stageKey] ? SECTIONS[stageKey](store, run) : emptyBlock("Nothing to show for this stage.");
    body.innerHTML = html;
    body.scrollTop = 0;
  }

  return { open, close, el: () => overlay };
}

// --- Section renderers -------------------------------------------------------

function emptyBlock(msg) {
  return `<p class="stage-review__empty caption">${esc(msg)}</p>`;
}

function head(title) {
  return `<div class="stage-review__section-title">${esc(title)}</div>`;
}

const SECTIONS = {
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
      ${b.brutal_truth_employee ? `<div class="stage-review__card"><div class="eyebrow">Honest read — ${esc(store?.ctx?.name || "them")}</div><p>${esc(b.brutal_truth_employee)}</p></div>` : ""}
      ${b.brutal_truth_manager ? `<div class="stage-review__card"><div class="eyebrow">Honest read — you</div><p>${esc(b.brutal_truth_manager)}</p></div>` : ""}
      ${actions.length ? `<div class="stage-review__card"><div class="eyebrow">What to do next</div><ul class="stage-review__bullets">${actions.map((a) => `<li>${esc(capWhen(a.when))}${a.when ? ": " : ""}${esc(a.action || "")}</li>`).join("")}</ul></div>` : ""}
      ${watch.length ? `<div class="stage-review__card"><div class="eyebrow">Reminders</div><ul class="stage-review__bullets">${watch.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
    `;
  },
};

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function capWhen(w) {
  const s = String(w || "").trim();
  if (!s) return "";
  if (s === "next 1:1") return "Next 1:1";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
