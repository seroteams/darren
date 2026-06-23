// Regression — re-grade the saved "key runs" against the current engine and show
// which still behave correctly. Offline, no AI (same check as `npm run replay`).

import { runRegression } from "../api.js";
import { escapeHtml as esc } from "../ui/html.js";

const TAG =
  `<span style="font-size:var(--type-small,14px);color:var(--color-ink-dim,#6b7280);` +
  `background:var(--color-bg,#eef3f7);border:1px solid var(--color-border,#e2e8f0);` +
  `border-radius:999px;padding:1px 8px;margin-left:6px;white-space:nowrap;">safety test</span>`;

export async function mount(root, opts) {
  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Quality</div>
        <h1 class="h1">Regression check</h1>
        <div class="text-ink-dim text-sm max-w-measure">
          Re-checks a set of saved 1:1 runs against the current engine — instantly, with no AI calls — so if a change quietly breaks a safety rule, it shows up here. The runs marked ${TAG} are deliberately tricky cases: a manager's private worry, and a session of one-word answers.
        </div>
      </header>
      <div class="l-stack l-stack--4">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div class="text-ink-mute text-sm js-summary">Checking…</div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="js-confirm" style="font-size:var(--type-small,14px);font-weight:500;opacity:0;transition:opacity 200ms ease;white-space:nowrap;"></span>
            <button class="btn btn--sm js-recheck" type="button" disabled>Re-check all</button>
          </div>
        </div>
        <div class="result-host l-stack l-stack--3" aria-live="polite"></div>
      </div>
    </div>
  `;

  const summaryEl = root.querySelector(".js-summary");
  const recheckBtn = root.querySelector(".js-recheck");
  const confirmEl = root.querySelector(".js-confirm");
  const resultHost = root.querySelector(".result-host");
  let confirmTimer = null;

  async function check() {
    recheckBtn.disabled = true;
    recheckBtn.textContent = "Checking…";
    confirmEl.style.opacity = "0";
    summaryEl.textContent = "Checking…";
    const started = Date.now();
    let data;
    try {
      data = await runRegression();
    } catch (e) {
      console.warn("[regression] check failed:", e);
      summaryEl.textContent = "Couldn't run the check — make sure the dev server (API) is running.";
      resultHost.innerHTML = "";
      recheckBtn.disabled = false;
      recheckBtn.textContent = "Re-check all";
      return;
    }
    // Minimum visible "Checking…" beat — the check is instant and (when nothing's
    // broken) the result is identical, so without this a re-check looks like a no-op.
    const elapsed = Date.now() - started;
    if (elapsed < 600) await new Promise((r) => setTimeout(r, 600 - elapsed));
    render(data);
    flashRows();
    showConfirm(data);
    opts?.refreshRegressionAlert?.(data);   // keep the nav dot in sync, no extra fetch
    recheckBtn.disabled = false;
    recheckBtn.textContent = "Re-check all";
  }

  function render(data) {
    const cases = Array.isArray(data?.cases) ? data.cases : [];
    const s = data?.summary || {};
    const needs = s.regressed || 0;
    const errs = s.error || 0;
    const time = new Date().toLocaleTimeString();
    summaryEl.innerHTML =
      `${cases.length} saved run${cases.length === 1 ? "" : "s"} · ${s.ok || 0} still good` +
      (needs ? ` · <strong style="color:var(--color-negative);">${needs} need${needs === 1 ? "s" : ""} a look</strong>` : "") +
      (errs ? ` · ${errs} error` : "") +
      ` · no AI · last checked ${esc(time)}`;
    resultHost.innerHTML = cases.length
      ? cases.map(rowHtml).join("")
      : `<p class="text-ink-mute">No saved runs yet.</p>`;
  }

  // One-shot ring highlight on each row so the list visibly refreshes on a re-check.
  function flashRows() {
    resultHost.querySelectorAll(".card").forEach((card) => {
      const tone = card.dataset.status === "ok" ? "var(--color-positive)" : "var(--color-negative)";
      card.style.transition = "none";
      card.style.boxShadow = `0 0 0 2px ${tone}`;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          card.style.transition = "box-shadow 700ms ease";
          card.style.boxShadow = "none";
        })
      );
    });
  }

  // Brief, fading confirmation that the re-check ran (only when all-clear; a
  // regression speaks for itself with red rows).
  function showConfirm(data) {
    const s = data?.summary || {};
    if (s.regressed || s.error) return;
    confirmEl.textContent = "✓ all clear";
    confirmEl.style.color = "var(--color-positive)";
    confirmEl.style.opacity = "1";
    clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => { confirmEl.style.opacity = "0"; }, 2200);
  }

  recheckBtn.addEventListener("click", check);
  await check();
}

function rowHtml(c) {
  const err = c.status === "error";
  const good = c.status === "ok";
  const tone = good ? "var(--color-positive)" : "var(--color-negative)";
  const bg = good ? "var(--sero-success-light)" : "var(--sero-error-light)";
  const mark = good ? "✓" : err ? "!" : "✗";
  const statusText = good ? "still good" : err ? "error" : "needs a look";
  const safety = c.kind === "adversarial" ? TAG : "";
  const metaLine = [esc(c.meetingType || ""), c.issue ? esc(c.issue) : ""].filter(Boolean).join(" · ");
  const lines = c.reasons && c.reasons.length ? c.reasons : err && c.error ? [c.error] : [];
  const reasons = lines.length
    ? `<div style="margin-top:5px;font-size:var(--type-small,14px);color:var(--color-negative);">${lines
        .map((r) => `<div>• ${esc(r)}</div>`)
        .join("")}</div>`
    : "";
  return `
    <div class="card" data-status="${esc(c.status || "")}" style="display:flex;align-items:flex-start;gap:12px;padding:0.7rem 1rem;${good ? "" : `border-color:${tone};`}">
      <span aria-hidden="true" style="flex:none;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;color:${tone};background:${bg};">${mark}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:500;">${esc(c.name || c.id)}${safety}</div>
        ${metaLine ? `<div style="font-size:var(--type-small,14px);color:var(--color-ink-mute,#6b7280);margin-top:1px;">${metaLine}</div>` : ""}
        ${reasons}
      </div>
      <span style="flex:none;font-size:var(--type-small,14px);color:${tone};white-space:nowrap;">${statusText}</span>
    </div>`;
}
