// Error log — the superadmin's cross-company view of every error users hit (error-log
// Phase 2–4). Wired to GET /api/v1/admin/errors, gated by requireSuperadminRoute: only the
// allowlisted superadmin (Carl) gets a 200; the nav item is hidden for everyone else, but
// that hiding is cosmetic — the 403 is the real wall.
//
// Design-consolidation Phase 6 (audit D11): occurrences group client-side into ISSUES by
// (message + path + environment), so a repeating bug is one row with a count and a last-seen
// time, not a flood. Tabs split Unresolved / Resolved / All (an issue is resolved when every
// occurrence is); the toolbar searches message/path; resolve/reopen acts on the whole group.
// The old per-row checkbox bulk-select went with the flood it existed to mop up.

import "../styles/error-log.css";
import "../styles/pulse-drilldowns.css";
import { STAGES } from "../state.js";
import { pulseCrumbs } from "../ui/pulse-labels.ts";
import { listToolbar } from "../ui/list-toolbar.ts";
import { alertAction as alertJs } from "../ui/confirm.js";
import { getErrorLog, resolveError } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { relTime } from "../ui/time.ts";
import type { Mount, Unmount } from "./stage.types.ts";

const alertAction = alertJs as unknown as (opts: { message: string; confirmLabel?: string }) => Promise<void>;

type ErrorRow = {
  id: string;
  environment: "local" | "production";
  source: "api" | "browser";
  email: string | null;
  userName: string | null;
  company: string | null;
  method: string | null;
  path: string;
  status: number | null;
  errorCode: string | null;
  message: string;
  details: { stack?: string; userAgent?: string } | null;
  resolvedAt: string | null;
  createdAt: string;
};

// One ISSUE = every occurrence of the same (message + path + environment). The rows arrive
// newest-first, so rows[0] is the freshest occurrence and carries the detail we show.
type Issue = {
  key: string;
  rows: ErrorRow[];
  newest: ErrorRow;
  count: number;
  lastSeenMs: number;
  firstSeenMs: number;
  resolved: boolean;
};

function ms(iso: string): number {
  const v = Date.parse(iso);
  return Number.isFinite(v) ? v : 0;
}
function exactWhen(iso: string): string {
  const v = Date.parse(iso);
  return Number.isFinite(v) ? new Date(v).toLocaleString() : iso;
}

export function groupIssues(rows: ErrorRow[]): Issue[] {
  const byKey = new Map<string, ErrorRow[]>();
  for (const r of rows) {
    const key = `${r.message}\n${r.path}\n${r.environment}`;
    const list = byKey.get(key);
    if (list) list.push(r); else byKey.set(key, [r]);
  }
  const issues: Issue[] = [];
  for (const [key, list] of byKey) {
    const times = list.map((r) => ms(r.createdAt));
    issues.push({
      key,
      rows: list,
      newest: list[0]!,
      count: list.length,
      lastSeenMs: Math.max(...times),
      firstSeenMs: Math.min(...times),
      resolved: list.every((r) => !!r.resolvedAt),
    });
  }
  return issues.sort((a, b) => b.lastSeenMs - a.lastSeenMs);
}

function envPill(env: string): string {
  const live = env === "production";
  return `<span class="el-pill el-pill--${live ? "live" : "local"}">${live ? "Live" : "Local"}</span>`;
}
function sourcePill(source: string): string {
  const browser = source === "browser";
  return `<span class="el-pill el-pill--${browser ? "browser" : "api"}">${browser ? "Browser" : "API"}</span>`;
}
function statusPill(row: ErrorRow): string {
  if (row.status && row.status >= 500) return `<span class="el-pill el-pill--err">${row.status}</span>`;
  if (row.status) return `<span class="el-pill el-pill--warn">${row.status}</span>`;
  return `<span class="el-pill el-pill--err">crash</span>`;
}

// The inline detail shown when an issue is opened: full context + the freshest stack, plus
// the group-wide resolve/reopen action. Rendered as a full-width row under its parent.
function detailRow(issue: Issue): string {
  const row = issue.newest;
  const stack = row.details?.stack;
  const ua = row.details?.userAgent;
  const meta = [
    `<span><b>Route:</b> <code>${escapeHtml(row.method ? `${row.method} ${row.path}` : row.path)}</code></span>`,
    row.status ? `<span><b>Status:</b> ${row.status}</span>` : "",
    row.errorCode ? `<span><b>Code:</b> ${escapeHtml(row.errorCode)}</span>` : "",
    `<span><b>Seen:</b> ${issue.count} ${issue.count === 1 ? "time" : "times"}</span>`,
    `<span><b>First:</b> ${escapeHtml(exactWhen(new Date(issue.firstSeenMs).toISOString()))}</span>`,
    `<span><b>Last:</b> ${escapeHtml(exactWhen(new Date(issue.lastSeenMs).toISOString()))}</span>`,
    `<span><b>Latest hit:</b> ${row.userName || row.email ? escapeHtml(row.userName || row.email || "") : "signed out"}${row.company ? ` · ${escapeHtml(row.company)}` : ""}</span>`,
  ].filter(Boolean).join("");
  return `<tr class="el-detail-row"><td colspan="6">
    <div class="el-detail">
      <div class="el-detail__meta">${meta}</div>
      ${stack ? `<pre class="el-stack">${escapeHtml(stack)}</pre>` : `<div class="el-detail__msg">${escapeHtml(row.message)}</div>`}
      ${ua ? `<div class="el-ua"><b>Browser:</b> ${escapeHtml(ua)}</div>` : ""}
      <div class="el-detail__actions">
        <button type="button" class="btn btn--ghost js-resolve" data-key="${escapeHtml(issue.key)}" data-resolved="${issue.resolved ? "1" : ""}">${issue.resolved ? "Reopen" : `Mark resolved${issue.count > 1 ? ` (${issue.count})` : ""}`}</button>
      </div>
    </div>
  </td></tr>`;
}

function issueRow(issue: Issue, open: boolean): string {
  const row = issue.newest;
  const resolvedTag = issue.resolved ? ` <span class="el-pill el-pill--done">resolved</span>` : "";
  const main = `
    <tr class="el-row js-row${issue.resolved ? " el-row--resolved" : ""}${open ? " is-open" : ""}"
        data-key="${escapeHtml(issue.key)}"
        data-search="${escapeHtml(`${row.message} ${row.path}`.toLowerCase())}">
      <td class="el-msg"><div class="el-msg__text">${escapeHtml(row.message)}</div></td>
      <td>${envPill(row.environment)}<div class="el-route">${escapeHtml(row.method ? `${row.method} ${row.path}` : row.path)}</div></td>
      <td>${sourcePill(row.source)}</td>
      <td><span class="chip chip--plain" title="${issue.count} ${issue.count === 1 ? "occurrence" : "occurrences"}">${issue.count}</span></td>
      <td class="el-when">${escapeHtml(relTime(issue.lastSeenMs))}</td>
      <td class="el-status">${statusPill(row)}${resolvedTag}</td>
    </tr>`;
  return open ? main + detailRow(issue) : main;
}

function table(issues: Issue[], open: Set<string>): string {
  return `
    <div class="um-table-wrap el-panel">
      <table class="um-table el-table">
        <thead>
          <tr>
            <th>What went wrong</th><th>Where</th><th>Source</th><th>Times</th><th>Last seen</th><th>Status</th>
          </tr>
        </thead>
        <tbody>${issues.map((i) => issueRow(i, open.has(i.key))).join("")}</tbody>
      </table>
    </div>`;
}

const TABS = [
  { key: "unresolved", label: "Unresolved" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
] as const;
const ENV_FILTERS = [
  { key: "all", label: "All" },
  { key: "local", label: "Local" },
  { key: "production", label: "Live" },
] as const;
const SRC_FILTERS = [
  { key: "all", label: "All" },
  { key: "api", label: "API" },
  { key: "browser", label: "Browser" },
] as const;

function segbar(group: string, active: string, opts: ReadonlyArray<{ key: string; label: string }>, counts: Record<string, number> | null): string {
  return `<div class="el-filters" role="tablist">
    ${opts.map((o) =>
      `<button type="button" role="tab" class="el-filter js-seg${active === o.key ? " is-active" : ""}" data-group="${group}" data-val="${o.key}" aria-selected="${active === o.key ? "true" : "false"}">${o.label}${counts ? ` <span class="el-filter__n">${counts[o.key] ?? 0}</span>` : ""}</button>`,
    ).join("")}
  </div>`;
}

export const mount: Mount = async (root, { setState }) => {
  root.classList.add("el-stage"); // top-align this page so filter switches don't jump it (see error-log.css)
  const shell = (inner: string) =>
    `<div class="l-container l-container--wide l-stack l-stack--6">
      <header class="page-header l-stack l-stack--2">
        ${pulseCrumbs('Error log')}
        <h1 class="h1">Error log</h1>
        <div class="text-ink-dim">Everything that broke, grouped into issues. Your local dev and the live Sero, freshest first. Click a row for the full detail.</div>
      </header>
      ${inner}
    </div>`;
  // Delegated so it survives every innerHTML repaint (pulse-drilldowns back button).
  root.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest('.js-crumb[data-nav="pulse"]')) setState({ stage: STAGES.ADMIN_PULSE });
  });

  const errorCard = `
    <section class="card-flat l-stack l-stack--2">
      <div class="eyebrow">Couldn't load</div>
      <p class="text-ink-dim">Something went wrong loading the error log. Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`;

  let allRows: ErrorRow[] = [];
  let tab: string = "unresolved";
  let env = "all";
  let source = "all";
  let q = "";
  const open = new Set<string>();

  // Hidden-toggle search over the painted rows (typing never repaints the input away).
  // Hiding an issue row also hides its open detail row, and the count stays honest.
  const applySearch = () => {
    let visible = 0;
    root.querySelectorAll<HTMLTableRowElement>(".js-row").forEach((row) => {
      const hit = !q || (row.dataset.search || "").includes(q);
      row.hidden = !hit;
      const next = row.nextElementSibling;
      if (next instanceof HTMLTableRowElement && next.classList.contains("el-detail-row")) next.hidden = !hit;
      if (hit) visible++;
    });
    const count = root.querySelector<HTMLElement>(".list-toolbar__count");
    if (count) count.textContent = `${visible} ${visible === 1 ? "issue" : "issues"}`;
    const noMatch = root.querySelector<HTMLElement>(".js-no-match");
    if (noMatch) noMatch.hidden = visible > 0;
  };

  const wire = () => {
    root.querySelectorAll<HTMLButtonElement>(".js-seg").forEach((b) =>
      b.addEventListener("click", () => {
        const val = b.dataset.val ?? "all";
        if (b.dataset.group === "tab") tab = val;
        else if (b.dataset.group === "env") env = val;
        else source = val;
        paint();
      }),
    );
    root.querySelectorAll<HTMLElement>(".js-row").forEach((r) =>
      r.addEventListener("click", () => {
        const key = r.dataset.key;
        if (!key) return;
        if (open.has(key)) open.delete(key); else open.add(key);
        paint();
      }),
    );
    // Resolve / reopen the WHOLE issue: the action fires the per-row endpoint for each of
    // the group's occurrences (resolve touches only the still-open ones).
    root.querySelectorAll<HTMLButtonElement>(".js-resolve").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const key = b.dataset.key ?? "";
        const reopening = b.dataset.resolved === "1";
        const issue = groupIssues(allRows).find((i) => i.key === key);
        if (!issue) return;
        const targets = reopening ? issue.rows.filter((r) => r.resolvedAt) : issue.rows.filter((r) => !r.resolvedAt);
        void (async () => {
          const results = await Promise.allSettled(targets.map((r) => resolveError(r.id, !reopening)));
          let failed = 0;
          results.forEach((res, i) => {
            if (res.status === "fulfilled") {
              const target = targets[i];
              if (target) target.resolvedAt = reopening ? null : new Date().toISOString();
            } else {
              failed += 1;
            }
          });
          paint();
          if (failed) await alertAction({ message: `Couldn't update ${failed} of ${targets.length} occurrences. The rest went through.` });
        })();
      }),
    );
    root.querySelector<HTMLInputElement>(".js-lt-search")?.addEventListener("input", (e) => {
      q = (e.target as HTMLInputElement).value.trim().toLowerCase();
      applySearch();
    });
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
  };

  const paint = () => {
    const issues = groupIssues(allRows);
    const afterEnvSrc = issues.filter(
      (i) =>
        (env === "all" || i.newest.environment === env) &&
        (source === "all" || i.rows.some((r) => r.source === source)),
    );
    const tabCounts = {
      unresolved: afterEnvSrc.filter((i) => !i.resolved).length,
      resolved: afterEnvSrc.filter((i) => i.resolved).length,
      all: afterEnvSrc.length,
    };
    const envCounts = {
      all: issues.length,
      local: issues.filter((i) => i.newest.environment === "local").length,
      production: issues.filter((i) => i.newest.environment === "production").length,
    };
    const shown = afterEnvSrc.filter(
      (i) => tab === "all" || (tab === "resolved" ? i.resolved : !i.resolved),
    );
    const toolbar = listToolbar({
      search: { placeholder: "Search message or path" },
      count: { n: shown.length, noun: "issue" },
    });
    const controls = `
      <div class="el-controls">
        ${segbar("tab", tab, TABS, tabCounts)}
        <div class="el-control"><span class="el-control__label">Where</span>${segbar("env", env, ENV_FILTERS, envCounts)}</div>
        <div class="el-control"><span class="el-control__label">Source</span>${segbar("src", source, SRC_FILTERS, null)}</div>
      </div>`;
    const body = shown.length
      ? table(shown, open)
      : `<section class="card-flat"><p class="text-ink-dim">No issues match this view.</p></section>`;
    const noMatch = shown.length
      ? `<p class="text-ink-dim js-no-match" hidden>No issues match that search.</p>`
      : "";
    root.innerHTML = shell(`${toolbar}${controls}${body}${noMatch}`);
    wire();
    const search = root.querySelector<HTMLInputElement>(".js-lt-search");
    if (search && q) { search.value = q; applySearch(); }
  };

  const load = async () => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading the error log…</p></section>`);
    try {
      const res = await getErrorLog();
      allRows = Array.isArray(res?.errors) ? (res.errors as ErrorRow[]) : [];
    } catch {
      root.innerHTML = shell(errorCard);
      root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
      return;
    }
    if (allRows.length === 0) {
      root.innerHTML = shell(
        `<section class="card-flat"><p class="text-ink-dim">No errors logged yet. Nothing's broken.</p></section>`,
      );
      return;
    }
    tab = "unresolved";
    env = "all";
    source = "all";
    q = "";
    open.clear();
    paint();
  };

  await load();
};

export const unmount: Unmount = () => {};
