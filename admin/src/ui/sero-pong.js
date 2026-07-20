// Reusable Sero pong loader motion — the mark plays a game of pong while
// something loads. Extracted from the boot splash (boot-splash.js) so any
// in-app loading surface can reuse the same rally instead of a generic spinner.
//
// It drives an inline SVG version of the Sero mark: two white bars = paddles, the
// dot = ball. Each frame it mutates the ball's cx/cy and the paddles' transform on
// a damped spring, so the hands lag and overshoot like real ones. Static under
// prefers-reduced-motion. The loop stops the moment the SVG leaves the DOM, or when
// the returned stop() is called (whichever comes first).
//
// Twin note: boot-splash.js keeps its OWN copy of this physics on purpose — it's a
// standalone pre-bundle entry that must paint before any module loads, so it can't
// import this. The constants here are kept identical to that copy so the boot mark
// and the in-app loader move the same way.

const NOOP = () => {};

// The LEFT bar plays to win: ~25% of returns it fires a fast corner shot past the
// right bar's reach. The RIGHT bar only defends, reacting a beat late, so the sharp
// shots slip past it (a point to left) and left serves again. Returns stop().
export function drivePong(svg) {
  if (!svg) return NOOP;
  const ball = svg.querySelector(".bs-ball");
  const padL = svg.querySelector(".bs-pad-l");
  const padR = svg.querySelector(".bs-pad-r");
  if (!ball || !padL || !padR) return NOOP;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return NOOP;

  const R = 4;
  const LEFT = 15.5 + R;   // left bar inner face + ball radius
  const RIGHT = 32.5 - R;  // right bar inner face - ball radius
  const WALL = 48 - R;     // right inner wall — where a missed ball dies
  const TOP = 4, BOTTOM = 44;   // ball travel — into the corners past the bar tips
  const C = 24;            // bar resting centre
  const PAD_MAX = 6;       // furthest a bar drifts from centre
  const REACH = 10.5;      // save window at contact; a corner shot past the tip beats it
  const REACT_MS = 70;     // right's reaction lag — it reads where the ball *was*
  const SERVE_MS = 260;    // beat between winning the point and the next serve

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  let x = LEFT, y = C;
  let vx = 21, vy = 0;     // units/sec
  let lY = 0, lV = 0;      // left bar offset + velocity (the winner: quick hand)
  let rY = 0, rV = 0;      // right bar offset + velocity (the loser: slow hand)
  let passing = false;     // ball has beaten the right bar, running to the wall
  let serveAt = 0;         // timestamp of the next serve (0 = live)
  let last = 0;
  let running = true;
  let raf = 0;
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

  // LEFT aims AWAY from wherever the right bar is sitting — sometimes a winner to
  // the far corner, mostly a reachable rally shot so the winners land as punctuation.
  function attack() {
    const rc = C + rY;
    const low = rc < C;
    let targetY;
    if (Math.random() < 0.25) {
      targetY = low ? BOTTOM - Math.random() : TOP + Math.random();
      vx = 26 + Math.random() * 4;
    } else {
      targetY = clamp(C + (low ? 1 : -1) * (5 + Math.random() * 6), TOP + 6, BOTTOM - 6);
      vx = 20 + Math.random() * 4;
    }
    const cross = (RIGHT - LEFT) / vx;
    vy = clamp((targetY - y) / cross, -52, 52);
  }

  // RIGHT scrambling a save back: quick and central — an easy ball for left.
  function defend() {
    vx = -(18 + Math.random() * 4);
    vy = clamp((C - y) * 0.5 + (Math.random() - 0.5) * 6, -14, 14);
  }

  function serve() {
    x = LEFT; y = clamp(C + lY, TOP, BOTTOM);
    passing = false;
    attack();
  }

  function step(now) {
    if (!running || !svg.isConnected) return; // stopped or removed → end the loop
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

    // The bar whose side the ball is on chases it; the other eases to centre. Right
    // reacts a beat late (aims at where the ball was REACT_MS ago), so left's sharp
    // corner shots leave it wrong-footed and beaten at the tip.
    hist.push({ t: now, y });
    while (hist.length > 2 && hist[0].t < now - REACT_MS) hist.shift();
    const laggedY = hist[0].y;
    const jit = () => (Math.random() - 0.5) * 1.0;
    const lTarget = vx < 0 ? clamp(y - C + jit(), -PAD_MAX, PAD_MAX) : 0;
    const rTarget = vx > 0 ? clamp(laggedY - C + jit(), -PAD_MAX, PAD_MAX) : 0;
    [lY, lV] = hand(lY, lV, lTarget, 240, 14, 140, dt);
    [rY, rV] = hand(rY, rV, rTarget, 150, 9, 85, dt);

    ball.setAttribute("cx", x.toFixed(2));
    ball.setAttribute("cy", y.toFixed(2));
    padL.setAttribute("transform", `translate(0 ${lY.toFixed(2)})`);
    padR.setAttribute("transform", `translate(0 ${rY.toFixed(2)})`);
    raf = requestAnimationFrame(step);
  }
  raf = requestAnimationFrame(step);

  return function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
  };
}
