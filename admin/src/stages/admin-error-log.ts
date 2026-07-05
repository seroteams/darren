// Error log — the superadmin's cross-company view of every error users hit (error-log
// Phase 2). Wired to GET /api/v1/admin/errors, gated by requireSuperadminRoute: only the
// allowlisted superadmin (Carl) gets a 200; the nav item is hidden for everyone else, but
// that hiding is cosmetic — the 403 is the real wall. Read-only list, newest first. Each
// row is tagged Local (Carl's dev machine) or Live (the published Sero), so one screen
// shows both. Row detail, filters, and mark-resolved arrive in Phase 4.

import { getErrorLog } from "../../../shared/api.js";
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
  createdAt: string;
};

// Where it ran: the leading tag. Live = a real user on the published Sero; Local = Carl's
// own machine while building.
function envPill(env: string): string {
  const live = env === "production";
  return `<span class="el-pill el-pill--${live ? "live" : "local"}">${live ? "Live" : "Local"}</span>`;
}
function sourcePill(source: string): string {
  const browser = source === "browser";
  return `<span class="el-pill el-pill--${browser ? "browser" : "api"}">${browser ? "Browser" : "API"}</span>`;
}
// A browser crash has no HTTP status; show a word. An API error shows its code.
function statusPill(row: ErrorRow): string {
  if (row.status && row.status >= 500) return `<span class="el-pill el-pill--err">${row.status}</span>`;
  if (row.status) return `<span class="el-pill el-pill--warn">${row.status}</span>`;
  return `<span class="el-pill el-pill--err">crash</span>`;
}
function whenText(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? relTime(ms) : "";
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
function errorRow(row: ErrorRow): string {
  return `
    <tr>
      <td>${envPill(row.environment)}</td>
      <td class="el-when">${escapeHtml(whenText(row.createdAt))}</td>
      <td>${who(row)}</td>
      <td>${where(row)}</td>
      <td class="el-msg">${escapeHtml(row.message)}</td>
      <td class="el-status">${statusPill(row)}</td>
    </tr>`;
}
function table(rows: ErrorRow[]): string {
  return `
    <div class="um-table-wrap">
      <table class="um-table el-table">
        <thead>
          <tr>
            <th>Where</th><th>When</th><th>Who</th><th>Route / screen</th><th>What went wrong</th><th>Status</th>
          </tr>
        </thead>
        <tbody>${rows.map(errorRow).join("")}</tbody>
      </table>
    </div>`;
}

export const mount: Mount = async (root) => {
  const shell = (inner: string) =>
    `<div class="l-container l-container--wide l-stack l-stack--6">
      <header class="page-header">
        <h1 class="h1">Error log</h1>
        <div class="text-ink-dim text-sm">Everything that broke — your local dev and the live Sero, newest first.</div>
      </header>
      ${inner}
    </div>`;

  const errorCard = `
    <section class="card-flat l-stack l-stack--2">
      <div class="eyebrow">Couldn't load</div>
      <p class="text-sm text-ink-dim">Something went wrong loading the error log. Please try again.</p>
      <button type="button" class="btn btn--ghost js-retry">Try again</button>
    </section>`;

  const load = async () => {
    root.innerHTML = shell(`<section class="card-flat"><p class="text-sm text-ink-dim">Loading the error log…</p></section>`);
    let rows: ErrorRow[];
    try {
      const res = await getErrorLog();
      rows = Array.isArray(res?.errors) ? (res.errors as ErrorRow[]) : [];
    } catch {
      root.innerHTML = shell(errorCard);
      root.querySelector(".js-retry")?.addEventListener("click", () => { void load(); });
      return;
    }
    if (rows.length === 0) {
      root.innerHTML = shell(
        `<section class="card-flat"><p class="text-sm text-ink-dim">No errors logged yet — nothing's broken.</p></section>`,
      );
      return;
    }
    root.innerHTML = shell(table(rows));
  };

  await load();
};

export const unmount: Unmount = () => {};
