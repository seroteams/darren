import { STAGES } from "../state.js";
import { createAxesPanel } from "../ui/axes.js";
import { revealSequence, revealOne, sleep } from "../ui/reveal.js";

const WHEN_ORDER = ["today", "this week", "this month", "next 1:1"];

export async function mount(root, { store, setState }) {
  const b = store.briefing;
  if (!b) {
    setState({ stage: STAGES.EVAL });
    return;
  }

  // Celebration wash (fixed-position overlay, fades once)
  const wash = document.createElement("div");
  wash.className = "celebration-wash";
  document.body.appendChild(wash);
  requestAnimationFrame(() => wash.classList.add("is-active"));
  setTimeout(() => wash.remove(), 1600);

  root.innerHTML = `
    <div class="stage-wide max-w-measure mx-auto space-y-12 relative z-10 py-8">
      <header class="space-y-4">
        <div class="eyebrow reveal">Briefing · For ${escape(store.ctx.name)}</div>
        <h1 class="briefing-headline reveal"></h1>
      </header>

      <section class="space-y-3 bullets-section">
        <div class="eyebrow reveal">What stood out</div>
        <div class="card bullets-host"></div>
      </section>

      <section class="space-y-3 paragraph-section reveal-soft">
        <div class="eyebrow">What we understood</div>
        <p class="text-ink text-lg leading-relaxed max-w-measure paragraph-body"></p>
      </section>

      <section class="space-y-4 axes-section">
        <div class="eyebrow reveal">Where things sit</div>
        <div class="card axes-mount"></div>
        <div class="axis-meanings space-y-2 max-w-measure"></div>
      </section>

      <section class="space-y-4 brutal-host"></section>

      <section class="space-y-3 actions-section">
        <div class="eyebrow reveal">What to do next</div>
        <div class="card actions-host"></div>
      </section>

      <section class="space-y-3 watch-section">
        <div class="eyebrow reveal">Reminders</div>
        <div class="card watch-host"></div>
      </section>

      <footer class="pt-6 flex gap-2 items-center">
        <button class="btn js-restart">Complete 1:1</button>
        <button class="btn btn--ghost js-copy-review hidden">Copy review prompt</button>
        <span class="js-copy-confirm text-sm text-ink-mute" style="opacity:0; transition: opacity 0.2s;">Copied</span>
      </footer>
    </div>
  `;

  // --- 1) Eyebrow + hero headline (t = 0 → 400ms)
  const initialReveals = Array.from(root.querySelectorAll("header .reveal"));
  revealSequence(initialReveals, { stagger: 80, initialDelay: 80 });

  // Headline: typeset the string cleanly; subtle reveal (blur-in rather than split-letters — feels editorial, not gimmicky)
  const headline = root.querySelector(".briefing-headline");
  headline.textContent = b.headline || "Briefing";

  await sleep(400);

  // --- 2) Bullets (t ≈ 400ms+)
  const bulletsEyebrow = root.querySelector(".bullets-section .eyebrow");
  revealOne(bulletsEyebrow, 0);
  const bulletsHost = root.querySelector(".bullets-host");
  const bullets = (b.summary_bullets || []).map((text) => {
    const row = document.createElement("div");
    row.className = "bullet reveal";
    row.innerHTML = `<div class="bullet__mark">●</div><div>${escape(text)}</div>`;
    bulletsHost.appendChild(row);
    return row;
  });
  revealSequence(bullets, { stagger: 70, initialDelay: 100 });

  // --- 3) Understanding paragraph
  await sleep(bullets.length * 70 + 300);
  const para = root.querySelector(".paragraph-body");
  para.textContent = b.understanding_paragraph || "";
  root.querySelector(".paragraph-section").classList.add("is-in");

  // --- 4) Axes with celebratory spring settle
  await sleep(500);
  revealOne(root.querySelector(".axes-section .eyebrow"), 0);
  const axes = createAxesPanel({ celebrate: true });
  root.querySelector(".axes-mount").appendChild(axes.el);
  axes.renderInitial([
    { id: "wellbeing", score: -1 }, { id: "engagement", score: -1 },
    { id: "clarity", score: 0 }, { id: "growth", score: 0 },
  ]);
  await sleep(120);

  const axesList = (b.axes || []).map((a) => ({
    id: a.id,
    label: a.id,
    score: a.score,
    lastDelta: 0,
  }));
  const known = new Set(axesList.map((a) => a.id));
  const AXIS_SEED = { wellbeing: -1, engagement: -1, clarity: 0, growth: 0 };
  for (const id of ["wellbeing", "engagement", "clarity", "growth"]) {
    if (!known.has(id)) axesList.push({ id, label: id, score: AXIS_SEED[id], lastDelta: 0 });
  }
  axes.update(axesList, { showDelta: false });

  // Axis meanings (subtle, under the card)
  const meanings = (b.axes || []).filter((a) => a.meaning);
  if (meanings.length) {
    const mwrap = root.querySelector(".axis-meanings");
    mwrap.innerHTML = meanings
      .map((a) => `
        <div class="text-sm text-ink-dim reveal-soft">
          <span class="eyebrow mr-2" style="color: var(--color-accent-dark);">${escape(cap(a.id))}</span>${escape(a.meaning)}
        </div>
      `).join("");
    setTimeout(() => {
      mwrap.querySelectorAll(".reveal-soft").forEach((el) => el.classList.add("is-in"));
    }, 900);
  }

  // --- 5) Brutal truths, one at a time
  await sleep(1400);
  const brutalHost = root.querySelector(".brutal-host");
  const truths = [
    { eyebrow: `About ${escape(store.ctx.name || "them")}`, text: b.brutal_truth_employee || "" },
    { eyebrow: "About you", text: b.brutal_truth_manager || "" },
  ];
  for (const t of truths) {
    if (!t.text) continue;
    const card = document.createElement("div");
    card.className = "brutal";
    card.innerHTML = `
      <div class="brutal__eyebrow">${t.eyebrow}</div>
      <div class="brutal__body">${escape(t.text)}</div>
    `;
    brutalHost.appendChild(card);
    revealOne(card, 50);
    await sleep(420);
  }

  // --- 6) Next actions, grouped by `when`
  const actions = b.next_actions || [];
  if (actions.length) {
    await sleep(400);
    revealOne(root.querySelector(".actions-section .eyebrow"), 0);
    const host = root.querySelector(".actions-host");
    const sortedActions = [...actions].sort((a, b) => whenRank(a.when) - whenRank(b.when));
    sortedActions.forEach((a, i) => {
      const row = document.createElement("div");
      row.className = "action-group reveal";
      row.innerHTML = `
        <div class="action-when">${escape(a.when || "")}</div>
        <div class="action-body">${escape(a.action || "")}</div>
      `;
      host.appendChild(row);
      revealOne(row, 100 + i * 70);
    });
  } else {
    root.querySelector(".actions-section").remove();
  }

  // --- 7) Watch-for items
  const watch = b.watch_for || [];
  if (watch.length) {
    await sleep(actions.length * 70 + 300);
    revealOne(root.querySelector(".watch-section .eyebrow"), 0);
    const host = root.querySelector(".watch-host");
    watch.forEach((text, i) => {
      const row = document.createElement("div");
      row.className = "watch-item reveal";
      row.innerHTML = `<div class="watch-item__mark">◆</div><div>${escape(text)}</div>`;
      host.appendChild(row);
      revealOne(row, 100 + i * 70);
    });
  } else {
    root.querySelector(".watch-section").remove();
  }

  root.querySelector(".js-restart").addEventListener("click", () => {
    setState({ stage: STAGES.LEXICON_REVIEW });
  });

  // "Copy review prompt" — only shown when there are notes to discuss.
  const copyBtn = root.querySelector(".js-copy-review");
  const copyConfirm = root.querySelector(".js-copy-confirm");
  if ((store.notes || []).length && store.sessionDir) {
    copyBtn.classList.remove("hidden");
    copyBtn.addEventListener("click", async () => {
      const notesPath = `${store.sessionDir}\\notes.md`;
      const prompt = [
        `Read ${notesPath}.`,
        "",
        "These are my notes from a Sero run, tagged by stage. Save the key recurring themes to memory (treat them as feedback about the app, not about me). Then ask me one focused question at a time about the issues I raised so we can decide what changes to make to the prompts and copy.",
      ].join("\n");
      try {
        await navigator.clipboard.writeText(prompt);
        copyConfirm.style.opacity = "1";
        setTimeout(() => { copyConfirm.style.opacity = "0"; }, 1500);
      } catch (e) {
        console.warn("[briefing] clipboard write failed:", e.message);
      }
    });
  }
}

export function unmount() { /* nothing */ }

function whenRank(w) {
  const i = WHEN_ORDER.indexOf(w);
  return i === -1 ? WHEN_ORDER.length : i;
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function escape(s) {
  return String(s == null ? "" : s)
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
