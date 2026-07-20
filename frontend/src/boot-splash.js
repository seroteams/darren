// Boot splash: the Sero mark plays a game of pong while the app loads, then
// fades out the instant the first screen mounts. Identical twin of
// frontend/src/boot-splash.js — the two apps keep mirrored shells
// (frontend-admin-split), and each Vite root needs its own /src entry for the
// index.html script tag.
//
// A separate tiny entry — not part of main.js — because the CSP blocks inline
// <script> (backend/api/middleware/security-headers.ts), and because the splash
// must not depend on the big bundle to appear: the inline markup paints on HTML
// parse; this module drives the rally and handles the exit.

const splash = document.getElementById("boot-splash");
const root = document.getElementById("root");

// A rally that reads as hand-played, not machine-perfect. The ball keeps a
// steady speed between hits (real pong), but every return varies the pace and
// angle, and each bar is a "hand" that chases the ball on a damped spring — so
// it lags the fast shots, overshoots, and settles, the way a person would.
// SVG viewBox is 0..48. Bars at x=9 / x=32.5 (width 6.5); ball r=5.
function playPong() {
  const ball = splash.querySelector(".bs-ball");
  const padL = splash.querySelector(".bs-pad-l");
  const padR = splash.querySelector(".bs-pad-r");
  if (!ball || !padL || !padR) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const R = 5;
  const LEFT = 15.5 + R;   // left bar inner face + ball radius
  const RIGHT = 32.5 - R;  // right bar inner face - ball radius
  const TOP = 7;
  const BOTTOM = 41;
  const PAD_MAX = 7;       // furthest a bar drifts from its resting centre
  const PAD_CENTRE = 24;   // bar centre in SVG units
  const STIFF = 150;       // spring pull toward target (higher = quicker hand)
  const DAMP = 6;          // spring damping (lower = looser, more overshoot)
  const HAND_MAX = 46;     // cap on hand speed → can't fully catch a fast shot
  const ENGLISH = 0.34;    // how much off-centre contact bends the return

  let x = 24, y = 20;
  let speed = 13;                 // units/sec
  let dir = Math.random() < 0.5 ? -1 : 1;
  let vx = dir * speed * 0.82;
  let vy = (Math.random() < 0.5 ? -1 : 1) * speed * 0.5;
  let lY = 0, lV = 0;             // left bar offset + velocity
  let rY = 0, rV = 0;            // right bar offset + velocity
  let last = 0;

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  // Damped spring toward target, with a hand-speed cap so it can lag.
  function hand(pos, vel, target, dt) {
    let a = (target - pos) * STIFF - vel * DAMP;
    vel += a * dt;
    vel = clamp(vel, -HAND_MAX, HAND_MAX);
    pos += vel * dt;
    if (pos < -PAD_MAX) { pos = -PAD_MAX; vel = 0; }
    if (pos > PAD_MAX) { pos = PAD_MAX; vel = 0; }
    return [pos, vel];
  }

  // Give the ball a new heading after a bar hit: keep it mostly horizontal,
  // add the contact english, and vary the pace a touch — human inconsistency.
  function returnShot(contactOffset) {
    speed = clamp(speed * (0.85 + Math.random() * 0.32), 9.5, 18);
    vy += contactOffset * ENGLISH;
    // renormalise to the new speed, but never let it go near-vertical
    let mag = Math.hypot(vx, vy) || 1;
    vx = (vx / mag) * speed;
    vy = (vy / mag) * speed;
    const minVx = speed * 0.58;
    if (Math.abs(vx) < minVx) {
      vx = Math.sign(vx || 1) * minVx;
      vy = Math.sign(vy || 1) * Math.sqrt(Math.max(speed * speed - vx * vx, 0));
    }
  }

  function step(now) {
    if (!splash.isConnected) return; // removed on dismiss → stop the loop
    if (!last) last = now;
    const dt = Math.min((now - last) / 1000, 0.045); // clamp long/backgrounded frames
    last = now;

    x += vx * dt;
    y += vy * dt;

    if (y <= TOP) { y = TOP; vy = Math.abs(vy); }
    if (y >= BOTTOM) { y = BOTTOM; vy = -Math.abs(vy); }

    if (x <= LEFT) { x = LEFT; vx = Math.abs(vx); returnShot(y - (PAD_CENTRE + lY)); }
    if (x >= RIGHT) { x = RIGHT; vx = -Math.abs(vx); returnShot(y - (PAD_CENTRE + rY)); }

    // The bar facing the incoming ball chases it (with a little aim jitter);
    // the far bar eases back toward centre. Springs give the lag + overshoot.
    const jitter = () => (Math.random() - 0.5) * 1.1;
    const lTarget = vx < 0 ? clamp(y - PAD_CENTRE + jitter(), -PAD_MAX, PAD_MAX) : 0;
    const rTarget = vx > 0 ? clamp(y - PAD_CENTRE + jitter(), -PAD_MAX, PAD_MAX) : 0;
    [lY, lV] = hand(lY, lV, lTarget, dt);
    [rY, rV] = hand(rY, rV, rTarget, dt);

    ball.setAttribute("cx", x.toFixed(2));
    ball.setAttribute("cy", y.toFixed(2));
    padL.setAttribute("transform", `translate(0 ${lY.toFixed(2)})`);
    padR.setAttribute("transform", `translate(0 ${rY.toFixed(2)})`);
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
