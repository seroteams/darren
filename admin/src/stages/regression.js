// Regression — the rerun board. Eight frozen test managers with the same setup
// and answers every time; rerun them through today's engine and see whether it
// got better or worse.
//
// Two halves. FREE: the offline safety check strip (no AI), same endpoint the
// Test engine shows. PAID: Rerun drives the real engine end to end with the
// case's frozen inputs, then grades it with the same trust checks the terminal
// gate runs. One paid run at a time, server-side.
//
// The AI reviewer column and batch history arrive in later phases and slot into
// the same table.

import {
  getRegressionSuite,
  runRegression,
  startRegressionReruns,
  getRegressionRerunCurrent,
} from "../../../shared/api.js";
import { STAGES, setState } from "../state.ts";
import { escapeHtml as esc } from "../ui/html.js";
import { formatDate } from "../ui/time.ts";
import { icon } from "../ui/icon.js";
import { createSkeleton } from "../ui/skeleton.js";
import { button } from "../ui/button.ts";
import { X, Check, Sparkles } from "lucide";
import {
  batchProgressLine,
  boardSummary,
  committeeCell,
  kindChip,
  lastRerunCell,
  rerunLabel,
  reviewCell,
  thinAnswerNote,
  trustCell,
  trustDetail,
} from "./regression-rows.ts";
import "../styles/design/persona-bench.css"; // the free-safety strip styles
import "../styles/design/test-engine.css"; // the staged run-bar

const TONE_CLASS = { muted: "text-ink-mute", ok: "", bad: "text-negative" };

// The engine stages, in the order the runner drives them. Plain language, not
// the internal stage names.
const RUN_STEPS = ["Setup", "Focus", "Prep", "Interview", "Recap"];

function runStageIndex(label) {
  const l = String(label || "").toLowerCase();
  if (l.includes("brief")) return 4;
  if (l.includes("question")) return 3;
  if (l.includes("prep")) return 2;
  if (l.includes("focus")) return 1;
  return 0; // starting / role profile
}

let pollTimer = null;

export function unmount() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

function cell(c) {
  return `<span class="${TONE_CLASS[c.tone] || ""}">${esc(c.label)}</span>`;
}

function rowHtml(c, canRerun) {
  const chip = kindChip(c.kind);
  const fails = trustDetail(c);
  const thin = thinAnswerNote(c);
  return `
    <tr data-case="${esc(c.id)}">
      <td>
        <div class="l-stack l-stack--1">
          <strong>${esc(c.name)}</strong>${chip ? ` <span class="chip chip--plain">${esc(chip)}</span>` : ""}
          ${c.role ? `<span class="text-sm text-ink-mute">${esc(c.role)}</span>` : ""}
          ${thin ? `<span class="text-sm text-ink-mute">${esc(thin)}</span>` : ""}
        </div>
      </td>
      <td>${esc(c.meetingType)}</td>
      <td>${cell(lastRerunCell(c, formatDate))}</td>
      <td>
        ${cell(trustCell(c))}
        ${fails.length ? `<div class="text-sm text-negative">${fails.map((f) => esc(f)).join("<br>")}</div>` : ""}
      </td>
      <td>${cell(committeeCell(c))}</td>
      <td>${cell(reviewCell(c))}</td>
      <td class="um-actions-td">
        <div class="l-row l-row--2">
          ${c.lastRerun ? button({ label: "Open run", variant: "ghost", size: "sm", hook: "js-open-run" }) : ""}
          ${button({ label: rerunLabel(canRerun), variant: "ghost", size: "sm", hook: "js-rerun", disabled: !canRerun })}
        </div>
      </td>
    </tr>`;
}

// The staged progress bar: steps light up as the engine advances, and during the
// Interview step the fill grows question by question so it never looks stuck.
function runBarHtml(job) {
  const running = job.status === "running";
  const done = job.status === "done";
  const failed = job.status === "failed";

  const current = done ? RUN_STEPS.length : runStageIndex(job.stageLabel);
  const inInterview = running && current === 3 && job.turn && job.total;
  const withinFrac = inInterview ? Math.min(1, job.turn / job.total) : 0;
  const pct = done
    ? 100
    : failed
      ? (current / RUN_STEPS.length) * 100
      : Math.max(5, ((current + withinFrac) / RUN_STEPS.length) * 100);

  const steps = RUN_STEPS.map((label, i) => {
    let cls = "run-step--todo";
    let glyph = String(i + 1);
    if (done || i < current) {
      cls = "run-step--done";
      glyph = icon(Check, { size: 16 });
    } else if (failed && i === current) {
      cls = "run-step--failed";
      glyph = "!";
    } else if (running && i === current) {
      cls = "run-step--active";
    }
    return `<div class="run-step ${cls}"><span class="run-step__dot">${glyph}</span><span class="run-step__label">${esc(label)}</span></div>`;
  }).join("");

  const fillCls = done ? "run-bar__fill--done" : failed ? "run-bar__fill--failed" : "run-bar__fill--running";
  const which = batchProgressLine(job);

  let status;
  if (done) {
    const cost = typeof job.costUsd === "number" ? ` · about $${job.costUsd.toFixed(2)} in AI` : "";
    const stopped = job.stoppedOnCeiling ? " · stopped at the spending limit" : "";
    status = `<span class="bench-status--good">${icon(Sparkles, { size: 16 })} Finished${esc(cost)}${esc(stopped)}</span>`;
  } else if (failed) {
    status = `<span class="bench-status--bad">Rerun failed: ${esc(job.error || "unknown error")}</span>`;
  } else {
    const turn = inInterview ? `. Question ${job.turn} of ${job.total}` : "";
    status = `<span class="text-ink-dim">${esc(which ? which + " . " : "")}${esc(job.stageLabel || "Working…")}${esc(turn)}</span>`;
  }

  return `
    <div class="run-bar" data-state="${done ? "done" : failed ? "failed" : "running"}">
      <div class="run-steps">${steps}</div>
      <div class="run-bar__track"><div class="run-bar__fill ${fillCls}" style="width:${pct.toFixed(1)}%;"></div></div>
      <div class="run-bar__status">${status}</div>
    </div>`;
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
      <div class="run-host"></div>
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
  const runHost = root.querySelector(".run-host");

  let canRerun = true;

  async function paint() {
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
    canRerun = board?.canRerun !== false;

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
          ${
            canRerun
              ? "A rerun costs about $0.35 in AI and takes 1 to 2 minutes. One at a time."
              : "Paid reruns are switched off on the live site. The safety check above still runs here."
          }
        </p>
      </div>`;

    resultHost.querySelectorAll(".js-rerun").forEach((btn) => {
      btn.addEventListener("click", () => {
        const caseId = btn.closest("tr")?.dataset.case;
        if (caseId) void startRerun(caseId);
      });
    });
    resultHost.querySelectorAll(".js-open-run").forEach((btn) => {
      btn.addEventListener("click", () => {
        const caseId = btn.closest("tr")?.dataset.case;
        const row = cases.find((c) => c.id === caseId);
        if (row?.lastRerun?.runId) setState({ stage: STAGES.REVIEW_RUN, runId: row.lastRerun.runId });
      });
    });
  }

  async function startRerun(caseId) {
    runHost.innerHTML = `<div class="card">Starting…</div>`;
    try {
      await startRegressionReruns([caseId]);
    } catch (e) {
      runHost.innerHTML = `<div class="card"><span class="bench-status--bad">${esc(e?.message || "Couldn't start the rerun.")}</span></div>`;
      return;
    }
    poll();
  }

  function poll() {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = setTimeout(async () => {
      let job;
      try {
        job = await getRegressionRerunCurrent();
      } catch {
        return; // a dropped poll is not worth shouting about; the next one retries
      }
      if (!job || job.status === "idle") return;
      runHost.innerHTML = `<div class="card">${runBarHtml(job)}</div>`;
      if (job.status === "running") {
        poll();
      } else {
        // Finished (or failed): repaint the table so the row shows its verdict.
        await paint();
      }
    }, 2000);
  }

  await paint();

  // A rerun started before this screen was opened should still be visible.
  try {
    const job = await getRegressionRerunCurrent();
    if (job?.status === "running") {
      runHost.innerHTML = `<div class="card">${runBarHtml(job)}</div>`;
      poll();
    }
  } catch { /* best effort */ }
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
