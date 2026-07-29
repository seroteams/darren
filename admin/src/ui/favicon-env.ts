// Which browser-tab icon this page should wear.
//
// Live sites (sero.team, the deployed console) get the sky-blue brand tile.
// A developer's own machine gets the charcoal tile, so a local tab can never be
// mistaken for the real site (Carl, 2026-07-29). The tile is a static file per
// app: favicon.svg (live, sky) and favicon-local.svg (charcoal).
//
// Hostname, not import.meta.env.DEV: the icon has to be right for a signed-out
// visitor on first paint, and a local `preview` of the production bundle is
// still a local tab. Lives in admin/src/ui because it touches the DOM (shared/
// is type-checked as Node-only); the customer app cross-imports it.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

export function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname) || hostname.endsWith(".local");
}

// Derived from the href already on the page so a Vite base path survives.
export function localFaviconHref(href: string): string {
  return href.replace(/favicon\.svg/, "favicon-local.svg");
}

// Swaps the tab icon to the charcoal mark when the page is served locally.
// Live is the default the HTML already carries, so live pages do nothing.
export function applyEnvFavicon(
  doc: Document = document,
  hostname: string = location.hostname,
): void {
  if (!isLocalHost(hostname)) return;
  const link = doc.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) return;
  link.setAttribute("href", localFaviconHref(link.getAttribute("href") ?? "/favicon.svg"));
}
