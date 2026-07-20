// Boot splash: the Sero mark plays a real game of pong while the app loads,
// then fades out the instant the first screen mounts. Identical twin of
// frontend/src/boot-splash.js — the two apps keep mirrored shells
// (frontend-admin-split), and each Vite root needs its own /src entry for the
// index.html script tag.
//
// A separate tiny entry — not part of main.js — because the CSP blocks inline
// <script> (backend/api/middleware/security-headers.ts), and because the splash
// must not depend on the big bundle to appear: the inline markup paints on HTML
// parse; this module drives the ball and handles the exit.

const splash = document.getElementById("boot-splash");
const root = document.getElementById("root");

// The mark is a pong court (viewBox 0..48): two paddles at x=9 and x=32.5
// (width 6.5), one ball (r=5). The ball rallies in the gap between the paddles'
// inner faces and bounces off the court top/bottom; on each hit that paddle
// steps toward the ball, like a real return. Reduced-motion → static mark.
function playPong() {
  const ball = splash.querySelector(".bs-ball");
  const padL = splash.querySelector(".bs-pad-l");
  const padR = splash.querySelector(".bs-pad-r");
  if (!ball || !padL || !padR) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const R = 5;
  const LEFT = 15.5 + R;   // left paddle inner face + ball radius
  const RIGHT = 32.5 - R;  // right paddle inner face - ball radius
  const TOP = 8;
  const BOTTOM = 40;

  let x = 24;
  let y = 18.5;
  let vx = 11; // units per second
  let vy = 8;
  let padLUp = false;
  let padRUp = false;
  let last = 0;

  function step(now) {
    if (!splash.isConnected) return; // removed on dismiss → stop the loop
    if (!last) last = now;
    const dt = Math.min((now - last) / 1000, 0.05); // clamp long/backgrounded frames
    last = now;

    x += vx * dt;
    y += vy * dt;

    if (y <= TOP) { y = TOP; vy = Math.abs(vy); }
    if (y >= BOTTOM) { y = BOTTOM; vy = -Math.abs(vy); }

    if (x <= LEFT) {
      x = LEFT; vx = Math.abs(vx);
      padLUp = !padLUp;
      padL.style.transform = `translateY(${padLUp ? 3 : -3}px)`;
    }
    if (x >= RIGHT) {
      x = RIGHT; vx = -Math.abs(vx);
      padRUp = !padRUp;
      padR.style.transform = `translateY(${padRUp ? -3 : 3}px)`;
    }

    ball.setAttribute("cx", x.toFixed(2));
    ball.setAttribute("cy", y.toFixed(2));
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function dismiss() {
  splash.classList.add("is-done"); // opacity 0 over .45s (see inline CSS)
  setTimeout(() => splash.remove(), 500);
}

if (splash && root) {
  playPong();
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
