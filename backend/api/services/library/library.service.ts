// Library path logic: decide what a request under /library/<rest> should do —
// redirect (bare path), forbidden (path traversal), or serve a resolved file
// with its MIME type. Pure + testable; no fs here (that's the repo) and no
// req/res. The safe-join guard keeps a crafted path from escaping the logs root.

import path from "node:path";
import { LOGS_ROOT } from "../../../engine/session.ts";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

const ROOT = path.resolve(LOGS_ROOT);

function safeJoin(target: string): string | null {
  const resolved = path.resolve(ROOT, "." + target);
  return resolved === ROOT || resolved.startsWith(ROOT + path.sep) ? resolved : null;
}

export type LibraryPlan =
  | { kind: "redirect" }
  | { kind: "forbidden" }
  | { kind: "serve"; filePath: string; mime: string };

export interface LibraryService {
  plan(rest: string | undefined): LibraryPlan;
}

export function createLibraryService(): LibraryService {
  return {
    plan(rest) {
      if (rest === undefined || rest === "") return { kind: "redirect" };
      let target = decodeURIComponent(rest);
      if (target === "/") target = "/index.html";
      const filePath = safeJoin(target);
      if (!filePath) return { kind: "forbidden" };
      const ext = path.extname(filePath).toLowerCase();
      return { kind: "serve", filePath, mime: MIME[ext] || "application/octet-stream" };
    },
  };
}
