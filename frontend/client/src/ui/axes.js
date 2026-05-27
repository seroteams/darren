// Axis bars. Handles per-turn (live) and briefing (celebrate) modes.
// Visual scale clamps to ±6; true scores pass through untouched.

export const AXIS_ORDER = ["wellbeing", "engagement", "clarity", "growth"];
const AXIS_LABELS = {
  wellbeing: "Wellbeing",
  engagement: "Engagement",
  clarity: "Clarity",
  growth: "Growth",
};
// Seeded baselines — mirrors backend axes catalogue. Wellbeing/engagement
// start slightly negative so a session "earns" positive movement.
export const AXIS_SEED = {
  wellbeing: -1,
  engagement: -1,
  clarity: 0,
  growth: 0,
};
const VISUAL_MAX = 6;

// Allow prefers-reduced-motion to skip count-up; we still snap to final number.
const REDUCE_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createAxesPanel({ celebrate = false } = {}) {
  const el = document.createElement("div");
  el.className = "space-y-1";
  const rows = new Map();
  for (const id of AXIS_ORDER) {
    const row = createRow(id, celebrate);
    rows.set(id, row);
    el.appendChild(row.el);
  }
  return { el, update, renderInitial };

  function historyLenFor(axis) {
    if (typeof axis.historyLen === "number") return axis.historyLen;
    return celebrate ? 1 : 0;
  }

  // Render with scores but no animation. Used on briefing first paint.
  function renderInitial(axes) {
    for (const a of axes) {
      const row = rows.get(a.id);
      if (!row) continue;
      row.setScoreInstant(a.score, historyLenFor(a));
    }
  }

  // Animate each axis to its new score. `delta` drives the chip. Stagger applied.
  function update(axes, { showDelta = true } = {}) {
    axes.forEach((a, i) => {
      const row = rows.get(a.id);
      if (!row) return;
      const delay = i * 60; // --stagger
      setTimeout(
        () => row.animateTo(a.score, showDelta ? a.lastDelta : 0, historyLenFor(a)),
        delay
      );
    });
  }
}

function createRow(id, celebrate) {
  const seed = AXIS_SEED[id] ?? 0;
  const el = document.createElement("div");
  el.className = "axis";
  el.setAttribute("data-axis", id);
  el.setAttribute("title", `Seeded at ${seed > 0 ? "+" + seed : seed}. Moves with answers.`);
  el.innerHTML = `
    <div class="axis__label">${AXIS_LABELS[id] || id}</div>
    <div class="axis__track" aria-hidden="true">
      <div class="axis__midline"></div>
      <div class="axis__fill axis__fill--neutral"></div>
    </div>
    <div class="axis__value num-tabular" aria-live="polite">0<span class="axis__delta"></span></div>
  `;
  const track = el.querySelector(".axis__track");
  const fill = el.querySelector(".axis__fill");
  const value = el.querySelector(".axis__value");
  const deltaChip = el.querySelector(".axis__delta");

  let current = 0;
  let offscaleBadge = null;

  function isBaseline(score, historyLen) {
    return score === seed && historyLen === 0;
  }

  function setFill(score, { baseline = false } = {}) {
    const clamped = Math.max(-VISUAL_MAX, Math.min(VISUAL_MAX, score));
    const ratio = Math.abs(clamped) / VISUAL_MAX;
    // Reset class state
    fill.classList.remove("axis__fill--neutral", "axis__fill--positive", "axis__fill--negative", "axis__fill--celebrate");
    if (celebrate) fill.classList.add("axis__fill--celebrate");

    if (baseline) {
      fill.classList.add("axis__fill--neutral");
      fill.style.transform = "scaleX(1)";
      return;
    }
    if (score > 0) {
      fill.classList.add("axis__fill--positive");
    } else {
      fill.classList.add("axis__fill--negative");
    }
    fill.style.transform = `scaleX(${ratio})`;
  }

  function setValueText(score, { baseline = false } = {}) {
    value.classList.toggle("axis__value--baseline", !!baseline);
    const text = baseline ? "—" : (score > 0 ? `+${score}` : `${score}`);
    // Preserve chip
    value.firstChild.nodeValue = text;
  }

  function showOffscale(score) {
    removeOffscaleBadge();
    if (Math.abs(score) <= VISUAL_MAX) return;
    const caret = document.createElement("span");
    caret.className = `axis__caret ${score > 0 ? "axis__caret--right" : "axis__caret--left"} pulse-caret`;
    caret.textContent = "▸";
    track.appendChild(caret);
    const off = document.createElement("span");
    off.className = "axis__offscale";
    off.textContent = "(off-scale)";
    value.appendChild(off);
    offscaleBadge = { caret, off };
  }

  function removeOffscaleBadge() {
    if (!offscaleBadge) return;
    offscaleBadge.caret.remove();
    offscaleBadge.off.remove();
    offscaleBadge = null;
  }

  function setScoreInstant(score, historyLen = 0) {
    current = score;
    const baseline = isBaseline(score, historyLen);
    setFill(score, { baseline });
    setValueText(score, { baseline });
    if (!baseline) showOffscale(score);
    else removeOffscaleBadge();
  }

  function animateTo(targetScore, delta, historyLen = 0) {
    const from = current;
    const to = targetScore;
    current = to;
    const baseline = isBaseline(to, historyLen);

    // Chip: show for ~`dur-hero`, then fade
    if (delta && delta !== 0) {
      const signed = delta > 0 ? `+${delta}` : `${delta}`;
      deltaChip.textContent = signed;
      deltaChip.classList.add("axis__delta--visible");
      setTimeout(() => deltaChip.classList.remove("axis__delta--visible"), 1400);
    }

    setFill(to, { baseline });
    if (!baseline) showOffscale(to);
    else removeOffscaleBadge();

    // Count-up
    if (REDUCE_MOTION || from === to) {
      setValueText(to, { baseline });
      return;
    }
    const start = performance.now();
    const DUR = 1200;
    function tick(now) {
      const t = Math.min(1, (now - start) / DUR);
      const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart ≈ ease-out-expo feel
      const n = Math.round(from + (to - from) * eased);
      const midBaseline = isBaseline(n, historyLen);
      setValueText(n, { baseline: midBaseline });
      if (t < 1) requestAnimationFrame(tick);
      else setValueText(to, { baseline });
    }
    requestAnimationFrame(tick);
  }

  return { el, setScoreInstant, animateTo };
}
