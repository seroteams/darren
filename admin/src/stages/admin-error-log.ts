// Error log — the superadmin's cross-company view of every error users hit (error-log
// Phase 2–4). Wired to GET /api/v1/admin/errors, gated by requireSuperadminRoute: only the
// allowlisted superadmin (Carl) gets a 200; the nav item is hidden for everyone else, but
// that hiding is cosmetic — the 403 is the real wall. Read-only list, newest first. Each row
// is tagged Local (Carl's dev machine) or Live (the published Sero). Toggles filter by
// environment (Local/Live) and source (API/Browser); a row opens an inline detail (stack +
// context) with a Mark-resolved / Reopen action. Resolved rows hide unless "Show resolved".

import "../styles/error-log.css";
import "../styles/pulse-drilldowns.css";
import { STAGES } from "../state.js";
import { backToPulse } from "../ui/pulse-labels.ts";
import { getErrorLog, resolveError } from "../../../shared/api.js";
import { escapeHtml } from "../ui/html.js";
import { relTime } from "../ui/time.ts";
import type { Mount, Unmount } from "./stage.types.ts";

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
function whenText(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? relTime(ms) : "";
}
function exactWhen(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms).toLocaleString() : iso;
}
function who(row: ErrorRow): string {
  const name = row.userName || row.email;
  if (!name) return `<span class="el-anon">Signed out</span>`;
  const sub = row.company ? `<div class="el-sub">${escapeHtml(row.company)}</div>` : "";
  return `${escapeHtml(name)}${sub}`;
}
function where(row: ErrorRow): string {
  const route = row.method ? `${row.method} ${row.path}` : row.path;
  return `<div class="el-route">${escapeHtml(route)}</div><div class="el-src">${sourcePill(row.source)}</div>`;
}

// The inline detail shown when a row is opened: full context + the stack, plus the resolve
// action. Rendered as a full-width row directly under its parent.
function detailRow(row: ErrorRow): string {
  const stack = row.details?.stack;
  const ua = row.details?.userAgent;
  const resolved = !!row.resolvedAt;
  const meta = [
    `<span><b>Route:</b> <code>${escapeHtml(row.method ? `${row.method} ${row.path}` : row.path)}</code></span>`,
    row.status ? `<span><b>Status:</b> ${row.status}</span>` : "",
    row.errorCode ? `<span><b>Code:</b> ${escapeHtml(row.errorCode)}</span>` : "",
    `<span><b>Who:</b> ${row.email ? escapeHtml(row.email) : "signed out"}${row.company ? ` · ${escapeHtml(row.company)}` : ""}</span>`,
    `<span><b>When:</b> ${escapeHtml(exactWhen(row.createdAt))}</span>`,
    resolved ? `<span><b>Resolved:</b> ${escapeHtml(exactWhen(row.resolvedAt as string))}</span>` : "",
  ].filter(Boolean).join("");
  return `<tr class="el-detail-row"><td colspan="7">
    <div class="el-detail">
      <div class="el-detail__meta">${meta}</div>
      ${stack ? `<pre class="el-stack">${escapeHtml(stack)}</pre>` : `<div class="el-detail__msg">${escapeHtml(row.message)}</div>`}
      ${ua ? `<div class="el-ua"><b>Browser:</b> ${escapeHtml(ua)}</div>` : ""}
      <div class="el-detail__actions">
        <button type="button" class="btn btn--ghost js-resolve" data-id="${escapeHtml(row.id)}" data-resolved="${resolved ? "1" : ""}">${resolved ? "Reopen" : "Mark resolved"}</button>
      </div>
    </div>
  </td></tr>`;
}

function errorRow(row: ErrorRow, open: boolean, selected: Set<string>): string {
  const resolvedTag = row.resolvedAt ? ` <span class="el-pill el-pill--done">resolved</span>` : "";
  const checked = selected.has(row.id) ? " checked" : "";
  const main = `
    <tr class="el-row js-row${row.resolvedAt ? " el-row--resolved" : ""}${open ? " is-open" : ""}" data-id="${escapeHtml(row.id)}">
      <td class="el-check"><input type="checkbox" class="js-check"${checked} data-id="${escapeHtml(row.id)}" aria-label="Select this error"></td>
      <td>${envPill(row.environment)}${resolvedTag}</td>
      <td class="el-when">${escapeHtml(whenText(row.createdAt))}</td>
      <td>${who(row)}</td>
      <td>${where(row)}</td>
      <td class="el-msg">${escapeHtml(row.message)}</td>
      <td class="el-status">${statusPill(row)}</td>
    </tr>`;
  return open ? main + detailRow(row) : main;
}

function table(rows: ErrorRow[], open: Set<string>, selected: Set<string>, allChecked: boolean): string {
  return `
    <div class="um-table-wrap el-panel">
      <table class="um-table el-table">
        <thead>
          <tr>
            <th class="el-check"><input type="checkbox" class="js-check-all"${allChecked ? " checked" : ""} aria-label="Select all shown"></th>
            <th>Where</th><th>When</th><th>Who</th><th>Route / screen</th><th>What went wrong</th><th>Status</th>
          </tr>
        </thead>
        <tbody>${rows.map((r) => errorRow(r, open.has(r.id), selected)).join("")}</tbody>
      </table>
    </div>`;
}

// The bulk-action bar shown above the table once one or more rows are ticked: how many are
// selected, a one-click Resolve, and a Clear. Resolve fires the per-row endpoint for each id.
function bulkBar(count: number): string {
  if (count < 1) return "";
  return `<div class="el-bulkbar">
      <span class="el-bulkbar__count">${count} selected</span>
      <span class="el-bulkbar__spacer"></span>
      <button type="button" class="btn btn--ghost btn--sm js-bulk-clear">Clear</button>
      <button type="button" class="btn btn--cta btn--sm js-bulk-resolve">Mark ${count} resolved</button>
    </div>`;
}

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
        ${backToPulse()}
        <h1 class="h1">Error log</h1>
        <div class="text-ink-dim">Everything that broke. Your local dev and the live Sero, newest first. Click a row for the full detail.</div>
      </header>
      ${inner}
      <div class="pd-back-bottom">${backToPulse()}</div>
    </div>`;
  // Delegated so it survives every innerHTML repaint (pulse-drilldowns back button).
  root.addEventListener("click", (e) => {
    if (e.target instanceof Element && e.target.closest(".js-back-pulse")) setState({ stage: STAGES.ADMIN_PULSE });
  });

  const errorCard = `
    <section class="card-flat l-stack l-stack--2">
      <div class="eyebrow">Couldn't load</div>
      <p class="text-ink-dim">Something went wrong loading the error log. Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`;

  let allRows: ErrorRow[] = [];
  let env = "all";
  let source = "all";
  let showResolved = false;
  const open = new Set<string>();
  const selected = new Set<string>(); // ids ticked for bulk resolve
  let shownIds: string[] = []; // ids currently visible under the active filters (for select-all)

  const wire = () => {
    root.querySelectorAll<HTMLButtonElement>(".js-seg").forEach((b) =>
      b.addEventListener("click", () => {
        const val = b.dataset.val ?? "all";
        if (b.dataset.group === "env") env = val; else source = val;
        paint();
      }),
    );
    root.querySelector(".js-resolved")?.addEventListener("click", () => { showResolved = !showResolved; paint(); });
    root.querySelectorAll<HTMLElement>(".js-row").forEach((r) =>
      r.addEventListener("click", (e) => {
        if (e.target instanceof Element && e.target.closest(".el-check")) return; // let the checkbox act alone
        const id = r.dataset.id;
        if (!id) return;
        if (open.has(id)) open.delete(id); else open.add(id);
        paint();
      }),
    );
    root.querySelectorAll<HTMLInputElement>(".js-check").forEach((cb) =>
      cb.addEventListener("change", () => {
        const id = cb.dataset.id ?? "";
        if (cb.checked) selected.add(id); else selected.delete(id);
        paint();
      }),
    );
    root.querySelector<HTMLInputElement>(".js-check-all")?.addEventListener("change", (e) => {
      const on = (e.target as HTMLInputElement).checked;
      shownIds.forEach((id) => { if (on) selected.add(id); else selected.delete(id); });
      paint();
    });
    root.querySelector(".js-bulk-clear")?.addEventListener("click", () => { selected.clear(); paint(); });
    root.querySelector(".js-bulk-resolve")?.addEventListener("click", () => {
      const ids = [...selected];
      if (!ids.length) return;
      void (async () => {
        const results = await Promise.allSettled(ids.map((id) => resolveError(id, true)));
        let failed = 0;
        results.forEach((res, i) => {
          if (res.status === "fulfilled") {
            const r = allRows.find((x) => x.id === ids[i]);
            if (r) r.resolvedAt = new Date().toISOString();
            selected.delete(ids[i]);
          } else {
            failed += 1;
          }
        });
        if (failed) window.alert(`Couldn't resolve ${failed} of ${ids.length}. Those stay selected.`);
        paint();
      })();
    });
    root.querySelectorAll<HTMLButtonElement>(".js-resolve").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = b.dataset.id ?? "";
        const currently = b.dataset.resolved === "1";
        void (async () => {
          try {
            await resolveError(id, !currently);
            const r = allRows.find((x) => x.id === id);
            if (r) r.resolvedAt = currently ? null : new Date().toISOString();
            paint();
          } catch (err) {
            window.alert((err as { message?: string })?.message || "Couldn't update that error.");
          }
        })();
      }),
    );
    root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
  };

  const paint = () => {
    const envCounts = {
      all: allRows.length,
      local: allRows.filter((r) => r.environment === "local").length,
      production: allRows.filter((r) => r.environment === "production").length,
    };
    const shown = allRows.filter(
      (r) =>
        (env === "all" || r.environment === env) &&
        (source === "all" || r.source === source) &&
        (showResolved || !r.resolvedAt),
    );
    shownIds = shown.map((r) => r.id);
    const allChecked = shownIds.length > 0 && shownIds.every((id) => selected.has(id));
    const controls = `
      <div class="el-controls">
        <div class="el-control"><span class="el-control__label">Where</span>${segbar("env", env, ENV_FILTERS, envCounts)}</div>
        <div class="el-control"><span class="el-control__label">Source</span>${segbar("src", source, SRC_FILTERS, null)}</div>
        <button type="button" class="el-filter el-resolved-toggle js-resolved${showResolved ? " is-active" : ""}" aria-pressed="${showResolved ? "true" : "false"}">Show resolved</button>
      </div>`;
    const body = shown.length
      ? table(shown, open, selected, allChecked)
      : `<section class="card-flat"><p class="text-ink-dim">No errors match this view.</p></section>`;
    root.innerHTML = shell(`${controls}${bulkBar(selected.size)}${body}`);
    wire();
    // Partial selection → the header checkbox shows the dash (indeterminate) rather than a tick.
    const checkAll = root.querySelector<HTMLInputElement>(".js-check-all");
    if (checkAll) checkAll.indeterminate = !allChecked && shownIds.some((id) => selected.has(id));
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
    env = "all";
    source = "all";
    showResolved = false;
    open.clear();
    paint();
  };

  await load();
};

export const unmount: Unmount = () => {};
