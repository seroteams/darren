// Thin controller — raw HTTP (this serves files, not JSON). Asks the service what
// to do, then writes the response: 302 redirect, 403, 404, or stream the file.

import type { RequestContext } from "../../router.ts";
import { createLibraryService } from "./library.service.ts";
import { fileLibraryRepo } from "./library.repo.ts";

const service = createLibraryService();
const repo = fileLibraryRepo;

// The prefix this request came in on (/api/v1/library), so the bare-path
// redirect keeps the index's relative links under the right base.
function libraryBase(pathname: string): string {
  const i = pathname.indexOf("/library");
  return i >= 0 ? pathname.slice(0, i) + "/library" : "/api/v1/library";
}

export default async function library(c: RequestContext): Promise<void> {
  const plan = service.plan(c.params.rest);

  if (plan.kind === "redirect") {
    c.res.writeHead(302, { Location: libraryBase(c.url.pathname) + "/" });
    c.res.end();
    return;
  }
  if (plan.kind === "forbidden") {
    c.res.writeHead(403, { "Content-Type": "text/plain" });
    c.res.end("Forbidden");
    return;
  }

  const size = await repo.statFile(plan.filePath);
  if (size === null) {
    c.res.writeHead(404, { "Content-Type": "text/plain" });
    c.res.end("Not found. Run `npm run review` to generate the library.");
    return;
  }
  c.res.writeHead(200, {
    "Content-Type": plan.mime,
    "Content-Length": size,
    "Cache-Control": "no-cache",
  });
  repo.openStream(plan.filePath).pipe(c.res);
}
