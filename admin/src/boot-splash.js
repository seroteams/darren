// Fades out the instant boot splash (inline in index.html) once the app mounts
// its first screen. Identical twin of frontend/src/boot-splash.js — the two
// apps keep mirrored shells (frontend-admin-split), and each Vite root needs
// its own /src entry for the index.html script tag.
//
// A separate tiny entry — not part of main.js — because the CSP blocks inline
// <script> (backend/api/middleware/security-headers.ts), and because the splash
// must not depend on the big bundle to appear: the inline markup paints on HTML
// parse; this module only handles the exit.

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
