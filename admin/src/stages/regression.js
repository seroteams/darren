// Regression — the rerun board. Eight frozen test managers with the same setup
// and answers every time; rerun them through today's engine and see whether it
// got better or worse.
//
// Phase 1 is the free half: the suite listing plus the existing offline safety
// check (no AI, no cost). The paid Rerun button, the AI reviewer column and the
// batch history arrive in later phases and slot into the same table.
//
// The free strip is the same GET /api/v1/regression/run the Test engine screen
// shows — one check, two places to see it.

import { getRegressionSuite, runRegression } from "../../../shared/api.js";
import { escapeHtml as esc } from "../ui/html.js";
import { formatDate } from "../ui/time.ts";
import { icon } from "../ui/icon.js";
import { createSkeleton } from "../ui/skeleton.js";
import { button } from "../ui/button.ts";
import { X } from "lucide";
import {
  boardSummary,
  committeeCell,
  kindChip,
  lastRerunCell,
  rerunLabel,
  reviewCell,
  trustCell,
} from "./regression-rows.ts";
import "../styles/design/persona-bench.css"; // the free-safety strip styles live here

const TONE_CLASS = { muted: "text-ink-mute", ok: "", bad: "text-negative" };

function cell(c) {
  const cls = TONE_CLASS[c.tone] || "";
  return `<span class="${cls}">${esc(c.label)}</span>`;
}

function rowHtml(c, canRerun) {
  const chip = kindChip(c.kind);
  return `
    <tr>
      <td>
        <div class="l-stack l-stack--1">
          <strong>${esc(c.name)}</strong>${chip ? ` <span class="chip chip--plain">${esc(chip)}</span>` : ""}
          ${c.role ? `<span class="text-sm text-ink-mute">${esc(c.role)}</span>` : ""}
        </div>
      </td>
      <td>${esc(c.meetingType)}</td>
      <td>${cell(lastRerunCell(c, formatDate))}</td>
      <td>${cell(trustCell(c))}</td>
      <td>${cell(committeeCell(c))}</td>
      <td>${cell(reviewCell(c))}</td>
      <td class="um-actions-td">
        ${button({ label: rerunLabel(canRerun), variant: "ghost", size: "sm", disabled: true })}
      </td>
    </tr>`;
}

export async function mount(root, opts = {}) {
  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Build</div>
        <h1 class="h1">Regression</h1>
        <div class="text-ink-dim max-w-measure">
          Eight frozen test managers, with the same setup and answers every time. Rerun them through
          today's engine to see whether it got better or worse.
        </div>
      </header>
      <div class="safety-strip-host"></div>
      <div class="thinking-host min-h-[60px]"></div>
      <div class="result-host"></div>
    </div>
  `;

  mountSafetyStrip(root.querySelector(".safety-strip-host"), opts);

  const thinkingHost = root.querySelector(".thinking-host");
  thinkingHost.replaceChildren(
    createSkeleton({
      preset: "table",
      rows: 8,
      cols: ["stack", "text:14ch", "text:10ch", "text:8ch", "text:8ch", "text:8ch", "actions"],
      label: "Loading the test cases",
    }),
  );
  const resultHost = root.querySelector(".result-host");

  let board;
  try {
    board = await getRegressionSuite();
  } catch (e) {
    console.warn("[regression] fetch failed:", e);
    thinkingHost.textContent = "Couldn't load the test cases. Make sure the dev server is running.";
    return;
  }

  thinkingHost.remove();

  const cases = Array.isArray(board?.cases) ? board.cases : [];
  const canRerun = board?.canRerun !== false;

  if (!cases.length) {
    resultHost.innerHTML = `<p class="text-ink-mute">No test cases found in the frozen suite.</p>`;
    return;
  }

  resultHost.innerHTML = `
    <div class="l-stack l-stack--3">
      <p class="text-sm text-ink-mute">${esc(boardSummary(cases))}</p>
      <div class="um-table-wrap">
        <table class="um-table">
          <thead>
            <tr>
              <th>Case</th><th>Meeting</th><th>Last rerun</th>
              <th>Trust</th><th>Committee</th><th>Your review</th>
              <th class="um-actions-th"><span class="sr-only">Rerun</span></th>
            </tr>
          </thead>
          <tbody>
            ${cases.map((c) => rowHtml(c, canRerun)).join("")}
          </tbody>
        </table>
      </div>
      <p class="text-sm text-ink-mute">
        Reruns arrive in the next step. The safety check above is free and runs today.
      </p>
    </div>`;
}

// The free offline check, shown the same way the Test engine shows it: a summary
// line, a Re-check button, and only the rows that need a look. Costs nothing.
async function mountSafetyStrip(host, opts) {
  if (!host) return;
  host.innerHTML = `
    <div class="card bench-safety">
      <div class="bench-safety__row">
        <div class="text-sm">
          <strong>Free safety check</strong> <span class="text-ink-mute">(no AI)</span>
         . <span class="js-safety-summary text-ink-mute">checking…</span>
        </div>
        ${button({ label: "Re-check", variant: "ghost", size: "sm", hook: "js-safety-recheck", disabled: true })}
      </div>
      <div class="js-safety-fails l-stack l-stack--2 bench-safety__fails"></div>
    </div>`;

  const summaryEl = host.querySelector(".js-safety-summary");
  const recheckBtn = host.querySelector(".js-safety-recheck");
  const failsEl = host.querySelector(".js-safety-fails");

  async function check() {
    recheckBtn.disabled = true;
    summaryEl.textContent = "checking…";
    let data;
    try {
      data = await runRegression();
    } catch {
      summaryEl.textContent = "couldn't run the check. Is the API running?";
      recheckBtn.disabled = false;
      return;
    }
    const s = data?.summary || {};
    const list = Array.isArray(data?.cases) ? data.cases : [];
    const needs = s.regressed || 0;
    const errs = s.error || 0;
    summaryEl.innerHTML =
      `${s.ok || 0} still good` +
      (needs ? ` · <strong class="bench-safety__alert">${needs} need${needs === 1 ? "s" : ""} a look</strong>` : "") +
      (errs ? ` · ${errs} error` : "") +
      ` · last checked ${esc(new Date().toLocaleTimeString())}`;
    const bad = list.filter((c) => c.status !== "ok");
    failsEl.innerHTML = bad
      .map(
        (c) =>
          `<div class="bench-safety__fail text-sm">${icon(X, { size: 16 })} ${esc(c.name || c.id)}${
            (c.reasons || []).length ? ": " + esc(c.reasons[0]) : ""
          }</div>`,
      )
      .join("");
    opts?.refreshRegressionAlert?.(data); // keep the nav dot in sync, no extra fetch
    recheckBtn.disabled = false;
  }

  recheckBtn.addEventListener("click", check);
  await check();
}
