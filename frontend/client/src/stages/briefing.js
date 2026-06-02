import { STAGES } from "../state.js";
import { createAxesPanel } from "../ui/axes.js";
import { revealSequence, revealOne, sleep } from "../ui/reveal.js";

const WHEN_ORDER = ["today", "this week", "this month", "next 1:1"];

export async function mount(root, { store, setState, resetSession }) {
  const b = store.briefing;
  const fastPath = !!store.skipBriefingAnimation;
  if (fastPath) setState({ skipBriefingAnimation: false });

  if (!b) {
    root.innerHTML = `
      <div class="stage-inner space-y-6">
        <h1 class="h1">Briefing not available</h1>
        <div class="error-card">
          <div class="text-ink-dim">This session has no saved briefing. You can restart evaluation or begin a new run.</div>
        </div>
        <div class="flex gap-2">
          <button class="btn js-retry-eval" type="button">Run evaluation again</button>
          <button class="btn btn--ghost js-restart" type="button">Start over</button>
        </div>
      </div>
    `;
    root.querySelector(".js-retry-eval").addEventListener("click", () => {
      setState({ stage: STAGES.EVAL, error: null });
    });
    root.querySelector(".js-restart").addEventListener("click", () => {
      try { localStorage.removeItem("seroSessionId"); } catch {}
      resetSession();
      setState({ stage: STAGES.INTAKE, substage: "NAME" });
    });
    return;
  }

  if (!fastPath) {
    const wash = document.createElement("div");
    wash.className = "celebration-wash";
    document.body.appendChild(wash);
    requestAnimationFrame(() => wash.classList.add("is-active"));
    setTimeout(() => wash.remove(), 1600);
  }

  root.innerHTML = `
    <div class="stage-wide max-w-wide mx-auto briefing-page relative z-10 py-8">
      <header class="briefing-block space-y-4">
        <div class="eyebrow reveal">Briefing · For ${escape(store.ctx.name)}</div>
        <h1 class="briefing-headline reveal"></h1>
      </header>

      <section class="briefing-block bullets-section space-y-3">
        <div class="eyebrow reveal">What stood out</div>
        <div class="card bullets-host"></div>
      </section>

      <div class="briefing-grid briefing-grid--pair">
        <section class="briefing-block paragraph-section space-y-3 reveal-soft">
          <div class="eyebrow">What we understood</div>
          <p class="briefing-prose paragraph-body"></p>
        </section>

        <section class="briefing-block axes-section space-y-4">
          <div class="eyebrow reveal">Where things sit</div>
          <p class="text-xs text-ink-dim max-w-measure reveal">Final read after the conversation — scores reflect meaning in answers, not word count or typing style.</p>
          <div class="card axes-mount"></div>
          <div class="axis-meanings space-y-2"></div>
        </section>
      </div>

      <section class="briefing-block brutal-host"></section>

      <div class="briefing-grid briefing-grid--pair">
        <section class="briefing-block actions-section space-y-3">
          <div class="eyebrow reveal">What to do next</div>
          <div class="card actions-host"></div>
        </section>

        <section class="briefing-block watch-section space-y-3">
          <div class="briefing-section-head">
            <div class="eyebrow reveal">Reminders</div>
            <button type="button" class="btn btn--ghost btn--sm js-copy-all-reminders hidden">Copy all</button>
          </div>
          <div class="card watch-host"></div>
        </section>
      </div>

      <div class="run-cost text-sm text-ink-dim pt-2"></div>

      <footer class="pt-2 flex gap-2 items-center">
        <button class="btn js-restart">Complete 1:1</button>
        <button class="btn btn--ghost js-copy-review hidden">Copy review prompt</button>
        <span class="js-copy-confirm text-sm text-ink-mute" style="opacity:0; transition: opacity 0.2s;">Copied</span>
      </footer>
    </div>
  `;

  const pause = (ms) => (fastPath ? Promise.resolve() : sleep(ms));

  // --- 1) Eyebrow + hero headline
  const initialReveals = Array.from(root.querySelectorAll("header .reveal"));
  if (fastPath) initialReveals.forEach((el) => el.classList.add("is-in"));
  else revealSequence(initialReveals, { stagger: 80, initialDelay: 80 });

  const headline = root.querySelector(".briefing-headline");
  headline.textContent = b.headline || "Briefing";

  await pause(400);

  // --- 2) Bullets (t ≈ 400ms+)
  const bulletsEyebrow = root.querySelector(".bullets-section .eyebrow");
  if (fastPath) bulletsEyebrow.classList.add("is-in");
  else revealOne(bulletsEyebrow, 0);
  const bulletsHost = root.querySelector(".bullets-host");
  const bullets = (b.summary_bullets || []).map((text) => {
    const row = document.createElement("div");
    row.className = "bullet reveal";
    row.innerHTML = `<div class="bullet__mark">●</div><div>${escape(text)}</div>`;
    bulletsHost.appendChild(row);
    return row;
  });
  if (fastPath) bullets.forEach((el) => el.classList.add("is-in"));
  else revealSequence(bullets, { stagger: 70, initialDelay: 100 });

  await pause(fastPath ? 0 : bullets.length * 70 + 300);
  const para = root.querySelector(".paragraph-body");
  para.textContent = b.understanding_paragraph || "";
  root.querySelector(".paragraph-section").classList.add("is-in");

  await pause(fastPath ? 0 : 500);
  const axesEyebrow = root.querySelector(".axes-section .eyebrow");
  if (fastPath) axesEyebrow.classList.add("is-in");
  else revealOne(axesEyebrow, 0);
  const axes = createAxesPanel({ celebrate: true });
  root.querySelector(".axes-mount").appendChild(axes.el);
  axes.renderInitial([
    { id: "wellbeing", score: -1 }, { id: "engagement", score: -1 },
    { id: "clarity", score: 0 }, { id: "growth", score: 0 },
  ]);
  await pause(fastPath ? 0 : 120);

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
    if (fastPath) {
      mwrap.querySelectorAll(".reveal-soft").forEach((el) => el.classList.add("is-in"));
    } else {
      setTimeout(() => {
        mwrap.querySelectorAll(".reveal-soft").forEach((el) => el.classList.add("is-in"));
      }, 900);
    }
  }

  await pause(fastPath ? 0 : 1400);
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
    if (fastPath) card.classList.add("is-in");
    else {
      revealOne(card, 50);
      await pause(420);
    }
  }

  // --- 6) Next actions, grouped by `when`
  const actions = b.next_actions || [];
  if (actions.length) {
    await pause(fastPath ? 0 : 400);
    const actionsEyebrow = root.querySelector(".actions-section .eyebrow");
    if (fastPath) actionsEyebrow.classList.add("is-in");
    else revealOne(actionsEyebrow, 0);
    const host = root.querySelector(".actions-host");
    const sortedActions = [...actions].sort((a, b) => whenRank(a.when) - whenRank(b.when));
    sortedActions.forEach((a, i) => {
      const row = createCopyableRow({
        className: "action-group",
        mark: "",
        bodyHtml: `
          <div class="action-when">${escape(a.when || "")}</div>
          <div class="action-body">${escape(a.action || "")}</div>
        `,
        copyText: formatActionCopy(a),
      });
      host.appendChild(row);
      if (fastPath) row.classList.add("is-in");
      else revealOne(row, 100 + i * 70);
    });
  } else {
    root.querySelector(".actions-section").remove();
  }

  // --- 7) Watch-for items
  const watch = b.watch_for || [];
  if (watch.length) {
    await pause(fastPath ? 0 : actions.length * 70 + 300);
    const watchEyebrow = root.querySelector(".watch-section .eyebrow");
    if (fastPath) watchEyebrow.classList.add("is-in");
    else revealOne(watchEyebrow, 0);
    const host = root.querySelector(".watch-host");
    const copyAllBtn = root.querySelector(".js-copy-all-reminders");
    copyAllBtn.classList.remove("hidden");
    copyAllBtn.addEventListener("click", () => {
      copySnippet(watch.join("\n"), copyAllBtn, "Copied all");
    });
    watch.forEach((text, i) => {
      const row = createCopyableRow({
        className: "watch-item",
        mark: "◆",
        bodyHtml: `<div class="watch-item__text">${escape(text)}</div>`,
        copyText: text,
      });
      host.appendChild(row);
      if (fastPath) row.classList.add("is-in");
      else revealOne(row, 100 + i * 70);
    });
  } else {
    root.querySelector(".watch-section").remove();
  }

  const costHost = root.querySelector(".run-cost");
  if (b.cost && costHost) {
    costHost.textContent = formatRunCost(b.cost);
  } else if (costHost) {
    costHost.remove();
  }

  root.querySelector(".js-restart").addEventListener("click", () => {
    setState({ stage: STAGES.RUN_DEBRIEF });
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

function formatActionCopy(a) {
  const when = String(a.when || "").trim();
  const action = String(a.action || "").trim();
  if (!when) return action;
  const label = when.charAt(0).toUpperCase() + when.slice(1);
  return `${label}: ${action}`;
}

function createCopyableRow({ className, mark, bodyHtml, copyText }) {
  const row = document.createElement("div");
  row.className = `${className} copyable-row reveal`;
  row.innerHTML = `
    ${mark ? `<div class="copyable-row__mark">${mark}</div>` : ""}
    <div class="copyable-row__content">${bodyHtml}</div>
    <button type="button" class="copy-snippet-btn" title="Copy" aria-label="Copy">${COPY_ICON}</button>
  `;
  row.querySelector(".copy-snippet-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    copySnippet(copyText, e.currentTarget);
  });
  return row;
}

const COPY_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

async function copySnippet(text, btn, doneLabel = "Copied") {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const prev = btn.getAttribute("aria-label");
    btn.classList.add("is-copied");
    btn.setAttribute("aria-label", doneLabel);
    setTimeout(() => {
      btn.classList.remove("is-copied");
      btn.setAttribute("aria-label", prev || "Copy");
    }, 1200);
  } catch (e) {
    console.warn("[briefing] clipboard write failed:", e.message);
  }
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function formatUsd(usd) {
  if (usd == null || Number.isNaN(usd)) return "—";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}

function formatTokens(n) {
  if (!n) return "0";
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}M`;
}

function formatRunCost(c) {
  const parts = [
    `Run cost ${formatUsd(c.usd_total)}`,
    `${formatTokens(c.total_tokens)} tokens`,
    `${c.call_count} call${c.call_count === 1 ? "" : "s"}`,
  ];
  let line = parts.join(" · ");
  if (c.unknown_price_calls > 0) {
    line += ` · ${c.unknown_price_calls} unpriced`;
  }
  return line;
}

function escape(s) {
  return String(s == null ? "" : s)
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
