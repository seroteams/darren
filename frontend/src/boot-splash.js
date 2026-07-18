// Fades out the instant boot splash (inline in index.html) once the app mounts
// its first screen. A separate tiny entry — not part of main.js — because the
// CSP blocks inline <script> (backend/api/middleware/security-headers.ts), and
// because the splash must not depend on the big bundle to appear: the inline
// markup paints on HTML parse; this module only handles the exit.
//
// "First screen mounted" = #root gains a child (main.js renderStage appends the
// stage <section>). Watching the DOM instead of app state keeps this decoupled
// from boot(): whichever stage wins — landing, login, a rehydrated mid-run
// screen, even the error stage — the splash cross-fades into it.

const splash = document.getElementById("boot-splash");
const root = document.getElementById("root");

function dismiss() {
  splash.classList.add("is-done"); // opacity 0 over .45s (see inline CSS)
  setTimeout(() => splash.remove(), 500);
}

if (splash && root) {
  if (root.childElementCount > 0) {
    dismiss(); // HMR / re-eval: a screen is already up
  } else {
    const mo = new MutationObserver(() => {
      if (root.childElementCount > 0) {
        mo.disconnect();
        dismiss();
      }
    });
    mo.observe(root, { childList: true });
  }
}
