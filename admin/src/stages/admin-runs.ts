// Runs — the Pulse "Runs this week" drill-down (pulse-drilldowns): every run on the
// site, newest first — external managers, internal Sero accounts and guests, each
// labelled (Carl's call 2026-07-15: show everything, tagged, rather than hide the
// test noise). Wired to GET /api/v1/admin/runs; the header restates the card's exact
// external-this-week number (computed server-side with the tile's own rule) so the
// list and the card can never disagree. Superadmin-only, read-only.

import "../styles/pulse-drilldowns.css";
import { STAGES } from "../state.js";
import { getAdminRuns } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { icon } from "../ui/icon.js";
import { Star } from "lucide";
import { prettyType, prettyStage, dateLabel, backToPulse } from "../ui/pulse-labels.ts";
import { createSkeleton } from "../ui/skeleton.js";
import type { Mount, Unmount } from "./stage.types.ts";

export type AdminRun = {
  id: string;
  userName: string | null;
  company: string | null;
  internal: boolean;
  guest: boolean;
  meetingType: string | null;
  startedAt: number | null;
  lastSeenAt: number;
  finished: boolean;
  stage: string | null;
  rating: { stars: number; note: string; updatedAt: string | null } | null;
};

export function whoCell(r: AdminRun): string {
  const tag = r.guest ? ` <span class="pd-pill pd-pill--guest">guest</span>`
    : r.internal ? ` <span class="pd-pill pd-pill--internal">internal</span>`
    : "";
  const name = r.userName ? escapeHtml(r.userName) : "Guest";
  const company = r.company ? `<span class="pd-sub">${escapeHtml(r.company)}</span>` : "";
  return `${name}${tag}${company}`;
}

export function statusCell(r: AdminRun): string {
  if (r.finished) return `<span class="pd-pill pd-pill--back">finished</span>`;
  const at = r.stage ? ` at ${escapeHtml(prettyStage(r.stage))}` : "";
  return `<span class="pd-pill pd-pill--once">broke off${at}</span>`;
}

export function starsCell(r: AdminRun): string {
  if (!r.rating) return `<span class="text-ink-dim">—</span>`;
  return `<span class="pd-stars" aria-label="rated ${r.rating.stars} out of 5">${icon(Star, { size: 16, fill: "currentColor" })} ${r.rating.stars}</span>`;
}

function runRow(r: AdminRun): string {
  return `
    <tr>
      <td>${whoCell(r)}</td>
      <td>${r.meetingType ? escapeHtml(prettyType(r.meetingType)) : "—"}</td>
      <td>${escapeHtml(dateLabel(r.startedAt ?? r.lastSeenAt))}</td>
      <td>${statusCell(r)}</td>
      <td>${starsCell(r)}</td>
    </tr>`;
}

export const mount: Mount = async (root, { setState }) => {
  const shell = (inner: string) => `
    <div class="l-container l-container--wide l-stack l-stack--6">
      <header class="page-header l-stack l-stack--2">
        ${backToPulse()}
        <h1 class="h1">Runs</h1>
        <div class="text-ink-dim">Every 1:1 prep on the site, newest first — real managers plus internal and guest runs, each tagged.</div>
      </header>
      ${inner}
      <div class="pd-back-bottom">${backToPulse()}</div>
    </div>`;
  const wireBack = () => root.querySelectorAll(".js-back-pulse").forEach((b) =>
    b.addEventListener("click", () => setState({ stage: STAGES.ADMIN_PULSE })));

  const load = async () => {
    root.replaceChildren(createSkeleton(4));
    let runs: AdminRun[] = [];
    let externalThisWeek = 0;
    try {
      const res = await getAdminRuns();
      runs = Array.isArray(res?.runs) ? (res.runs as AdminRun[]) : [];
      externalThisWeek = typeof res?.externalThisWeek === "number" ? res.externalThisWeek : 0;
    } catch {
      root.innerHTML = shell(`
        <section class="card-flat l-stack l-stack--2">
          <div class="eyebrow">Couldn't load</div>
          <p class="text-ink-dim">Something went wrong loading the runs. Please try again.</p>
          <button type="button" class="btn btn--ghost js-retry">Try again</button>
        </section>`);
      wireBack();
      root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
      return;
    }
    if (runs.length === 0) {
      root.innerHTML = shell(`<section class="card-flat"><p class="text-ink-dim">No runs yet — when anyone preps a 1:1, it lands here.</p></section>`);
      wireBack();
      return;
    }
    const count = `<p class="pd-count"><b>${externalThisWeek}</b> external ${externalThisWeek === 1 ? "run" : "runs"} this week — the same number as the Pulse card · ${runs.length} total listed.</p>`;
    root.innerHTML = shell(`
      <section class="l-stack l-stack--3">
        ${count}
        <div class="um-table-wrap">
          <table class="um-table">
            <thead><tr><th>Who</th><th>Type</th><th>Started</th><th>Status</th><th>Rating</th></tr></thead>
            <tbody>${runs.map(runRow).join("")}</tbody>
          </table>
        </div>
      </section>`);
    wireBack();
  };

  await load();
};

export const unmount: Unmount = () => {};
