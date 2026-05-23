// Axis bars. Handles per-turn (live) and briefing (celebrate) modes.
// Visual scale clamps to ±6; true scores pass through untouched.

const AXIS_ORDER = ["wellbeing", "engagement", "clarity", "growth"];
const AXIS_LABELS = {
  wellbeing: "Wellbeing",
  engagement: "Engagement",
  clarity: "Clarity",
  growth: "Growth",
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

  // Render with scores but no animation. Used on briefing first paint.
  function renderInitial(axes) {
    for (const a of axes) {
      const row = rows.get(a.id);
      if (!row) continue;
      row.setScoreInstant(a.score);
    }
  }

  // Animate each axis to its new score. `delta` drives the chip. Stagger applied.
  function update(axes, { showDelta = true } = {}) {
    axes.forEach((a, i) => {
      const row = rows.get(a.id);
      if (!row) return;
      const delay = i * 60; // --stagger
      setTimeout(() => row.animateTo(a.score, showDelta ? a.lastDelta : 0), delay);
    });
  }
}

function createRow(id, celebrate) {
  const el = document.createElement("div");
  el.className = "axis";
  el.setAttribute("data-axis", id);
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

  function setFill(score) {
    const clamped = Math.max(-VISUAL_MAX, Math.min(VISUAL_MAX, score));
    const ratio = Math.abs(clamped) / VISUAL_MAX;
    // Reset class state
    fill.classList.remove("axis__fill--neutral", "axis__fill--positive", "axis__fill--negative", "axis__fill--celebrate");
    if (celebrate) fill.classList.add("axis__fill--celebrate");

    if (score === 0) {
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

  function setValueText(score) {
    const signed = score > 0 ? `+${score}` : `${score}`;
    // Preserve chip
    value.firstChild.nodeValue = signed;
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

  function setScoreInstant(score) {
    current = score;
    setFill(score);
    setValueText(score);
    showOffscale(score);
  }

  function animateTo(targetScore, delta) {
    const from = current;
    const to = targetScore;
    current = to;

    // Chip: show for ~`dur-hero`, then fade
    if (delta && delta !== 0) {
      const signed = delta > 0 ? `+${delta}` : `${delta}`;
      deltaChip.textContent = signed;
      deltaChip.classList.add("axis__delta--visible");
      setTimeout(() => deltaChip.classList.remove("axis__delta--visible"), 1400);
    }

    setFill(to);
    showOffscale(to);

    // Count-up
    if (REDUCE_MOTION || from === to) {
      setValueText(to);
      return;
    }
    const start = performance.now();
    const DUR = 1200;
    function tick(now) {
      const t = Math.min(1, (now - start) / DUR);
      const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart ≈ ease-out-expo feel
      const n = Math.round(from + (to - from) * eased);
      setValueText(n);
      if (t < 1) requestAnimationFrame(tick);
      else setValueText(to);
    }
    requestAnimationFrame(tick);
  }

  return { el, setScoreInstant, animateTo };
}
