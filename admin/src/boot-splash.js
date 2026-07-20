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

// A real match, not a friendly knock-up. The LEFT bar is trying to win: every
// return it fires fast to the corner AWAY from where the right bar is sitting.
// The RIGHT bar only defends — a slower, scrambling hand that lags the sharp
// shots and sometimes can't reach, so the ball slips past it (a point to left)
// and left serves again. Each bar is a damped spring, so both lag and overshoot
// like a real hand. SVG viewBox is 0..48; bars at x=9 / x=32.5 (w 6.5), ball r=5.
function playPong() {
  const ball = splash.querySelector(".bs-ball");
  const padL = splash.querySelector(".bs-pad-l");
  const padR = splash.querySelector(".bs-pad-r");
  if (!ball || !padL || !padR) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const R = 4;
  const LEFT = 15.5 + R;   // left bar inner face + ball radius
  const RIGHT = 32.5 - R;  // right bar inner face - ball radius
  const WALL = 48 - R;     // right inner wall — where a missed ball dies
  const TOP = 4, BOTTOM = 44;   // ball travel — reaches past the bar tips into the corners
  const C = 24;            // bar resting centre
  const PAD_MAX = 6;       // furthest a bar drifts from centre
  const REACH = 10.5;      // save window at contact; a corner shot past the tip beats it
  const REACT_MS = 150;    // right's reaction lag — it reads where the ball *was*
  const SERVE_MS = 430;    // beat between winning the point and the next serve

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  let x = LEFT, y = C;
  let vx = 8.5, vy = 0;    // units/sec
  let lY = 0, lV = 0;      // left bar offset + velocity (the winner: quick hand)
  let rY = 0, rV = 0;      // right bar offset + velocity (the loser: slow hand)
  let passing = false;     // ball has beaten the right bar, running to the wall
  let serveAt = 0;         // timestamp of the next serve (0 = live)
  let last = 0;
  const hist = [];         // recent {t, y} so right can react a beat late

  // Damped spring toward a target with a hand-speed cap → lag + overshoot.
  function hand(pos, vel, target, stiff, damp, capV, dt) {
    vel += ((target - pos) * stiff - vel * damp) * dt;
    vel = clamp(vel, -capV, capV);
    pos += vel * dt;
    if (pos < -PAD_MAX) { pos = -PAD_MAX; vel = 0; }
    if (pos > PAD_MAX) { pos = PAD_MAX; vel = 0; }
    return [pos, vel];
  }

  // LEFT is playing to win. ~40% of returns it goes for the kill: a fast shot
  // to the far corner, past the reach of the right bar. The rest it keeps in
  // play — a reachable rally shot — so the winners land as punctuation, not a
  // metronome. Either way it aims AWAY from wherever the right bar is sitting.
  function attack() {
    const rc = C + rY;                                   // where right is now
    const low = rc < C;                                  // right is high → aim low
    let targetY, cross;
    if (Math.random() < 0.4) {                           // go for the winner
      targetY = low ? BOTTOM - Math.random() : TOP + Math.random();
      vx = 8.8 + Math.random() * 1.8;                    // extra pace
    } else {                                             // keep the rally alive
      targetY = clamp(C + (low ? 1 : -1) * (5 + Math.random() * 6), TOP + 6, BOTTOM - 6);
      vx = 6.6 + Math.random() * 1.6;
    }
    cross = (RIGHT - LEFT) / vx;                         // time to reach right
    vy = clamp((targetY - y) / cross, -22, 22);          // steep line to the target
  }

  // RIGHT scrambling a save back: slow and central — an easy ball for left.
  function defend() {
    vx = -(4.6 + Math.random() * 1.4);                   // going left, gentler
    vy = clamp((C - y) * 0.5 + (Math.random() - 0.5) * 3, -5.5, 5.5);
  }

  function serve() {
    x = LEFT; y = clamp(C + lY, TOP, BOTTOM);
    passing = false;
    attack();
  }

  function step(now) {
    if (!splash.isConnected) return; // removed on dismiss → stop the loop
    if (!last) last = now;
    const dt = Math.min((now - last) / 1000, 0.045);
    last = now;

    if (serveAt) { if (now >= serveAt) { serveAt = 0; serve(); } }
    else {
      x += vx * dt;
      y += vy * dt;

      if (y <= TOP) { y = TOP; vy = Math.abs(vy); }
      if (y >= BOTTOM) { y = BOTTOM; vy = -Math.abs(vy); }

      // Left never loses — it always digs the ball out and swings again.
      if (x <= LEFT && vx < 0) { x = LEFT; attack(); }

      if (!passing && x >= RIGHT && vx > 0) {
        if (Math.abs(y - (C + rY)) <= REACH) { x = RIGHT; defend(); } // save
        else { passing = true; }                                     // beaten
      }
      if (passing && x >= WALL) { serveAt = now + SERVE_MS; }         // point, left
    }

    // The bar whose side the ball is on chases it; the other eases to centre.
    // Left reads the ball live and moves decisively. Right reacts a beat late —
    // it aims at where the ball was REACT_MS ago — so left's sharp corner shots
    // and post-bounce redirects leave it wrong-footed and beaten at the tip.
    hist.push({ t: now, y });
    while (hist.length > 2 && hist[0].t < now - REACT_MS) hist.shift();
    const laggedY = hist[0].y;
    const jit = () => (Math.random() - 0.5) * 1.0;
    const lTarget = vx < 0 ? clamp(y - C + jit(), -PAD_MAX, PAD_MAX) : 0;
    const rTarget = vx > 0 ? clamp(laggedY - C + jit(), -PAD_MAX, PAD_MAX) : 0;
    [lY, lV] = hand(lY, lV, lTarget, 190, 13, 70, dt);
    [rY, rV] = hand(rY, rV, rTarget, 60, 6, 22, dt);

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
