import { STAGES } from "../state.js";
import { createAxesPanel } from "../ui/axes.js";
import { revealSequence, revealOne, sleep } from "../ui/reveal.js";
import { postVerdict } from "../api.js";

const WHEN_ORDER = ["today", "this week", "this month", "next 1:1"];

export async function mount(root, { store, setState, resetSession }) {
  const b = store.briefing;
  const fastPath = !!store.skipBriefingAnimation;
  if (fastPath) setState({ skipBriefingAnimation: false });

  if (!b) {
    root.innerHTML = `
      <div class="stage-inner l-stack l-stack--6">
        <h1 class="h1">Briefing not available</h1>
        <div class="error-card">
          <div class="text-ink-dim">This session has no saved briefing. You can restart evaluation or begin a new run.</div>
        </div>
        <div class="l-cluster l-cluster--2">
          <button class="btn js-retry-eval" type="button">Run evaluation again</button>
          <button class="btn btn--ghost js-restart" type="button">New session</button>
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
        <div class="briefing-section-head">
          <div class="eyebrow reveal">Briefing · For ${escape(store.ctx.name)}</div>
          <button type="button" class="btn btn--ghost btn--sm js-copy-all-briefing">Copy all</button>
        </div>
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
          <div class="eyebrow reveal" title="Scores reflect meaning in answers, not word count or typing style">Final read</div>
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

      ${store.scripted ? `
      <section class="briefing-block verdict-block card space-y-3">
        <div class="eyebrow">Test lane · verdict</div>
        <div class="verdict-row">
          <button type="button" class="btn btn--ghost js-verdict" data-v="keep">Keep</button>
          <button type="button" class="btn btn--ghost js-verdict" data-v="fix">Fix</button>
          <button type="button" class="btn btn--ghost js-verdict" data-v="block">Block</button>
        </div>
        <label class="block">
          <span class="eyebrow">Issue type</span>
          <select class="bench-select js-issue-type">
            <option value="">(none)</option>
            <option value="too_generic">too generic</option>
            <option value="wrong_level">wrong level</option>
            <option value="bad_tone">bad tone</option>
            <option value="over_inferred">over inferred</option>
            <option value="missed_focus">missed focus</option>
            <option value="weak_action">weak action</option>
          </select>
        </label>
        <label class="block">
          <span class="eyebrow">Note</span>
          <input class="input js-verdict-note" type="text" autocomplete="off" placeholder="what's wrong, in one line" />
        </label>
        <span class="js-verdict-confirm text-sm text-ink-mute" style="opacity:0; transition: opacity 0.2s;">Saved</span>
      </section>` : ""}

      <footer class="pt-2 l-cluster l-cluster--2 items-center">
        <button class="btn js-restart">Review this session</button>
        <button class="btn btn--ghost js-copy-review hidden">Copy QA prompt</button>
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
  // A score of 0 means "not enough signal to read this axis" (final-evaluation
  // axis_meaning_rules) — render it as an unread baseline, not a measured 0, so
  // a quiet session doesn't look like a flat verdict.
  axes.renderInitial([
    { id: "wellbeing", score: -1 }, { id: "engagement", score: -1 },
    { id: "clarity", score: 0, noRead: true }, { id: "growth", score: 0, noRead: true },
  ]);
  await pause(fastPath ? 0 : 120);

  const axesList = (b.axes || []).map((a) => ({
    id: a.id,
    label: a.id,
    score: a.score,
    lastDelta: 0,
    noRead: a.score === 0,
  }));
  const known = new Set(axesList.map((a) => a.id));
  const AXIS_SEED = { wellbeing: -1, engagement: -1, clarity: 0, growth: 0 };
  for (const id of ["wellbeing", "engagement", "clarity", "growth"]) {
    // An axis the evaluator omitted was not read — never fabricate a measured bar.
    if (!known.has(id)) axesList.push({ id, label: id, score: AXIS_SEED[id], lastDelta: 0, noRead: true });
  }
  axes.update(axesList, { showDelta: false });

  // Axis meanings (subtle, under the card). Only axes we actually read get a
  // line; the score-0 "not read" axes are collapsed into one quiet caption so
  // the panel doesn't repeat "didn't surface enough" at full weight.
  const readAxes = (b.axes || []).filter((a) => a.meaning && a.score !== 0);
  const unreadAxes = (b.axes || []).filter((a) => a.score === 0);
  if (readAxes.length || unreadAxes.length) {
    const mwrap = root.querySelector(".axis-meanings");
    const meaningRows = readAxes
      .map((a) => `
        <div class="text-sm text-ink-dim reveal-soft">
          <span class="eyebrow mr-2" style="color: var(--color-accent-dark);">${escape(cap(a.id))}</span>${escape(a.meaning)}
        </div>
      `);
    if (unreadAxes.length) {
      const names = unreadAxes.map((a) => cap(a.id));
      const list = names.length > 1
        ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
        : names[0];
      meaningRows.push(`
        <div class="text-sm text-ink-mute reveal-soft">${escape(list)} — not enough signal to read this session.</div>
      `);
    }
    mwrap.innerHTML = meaningRows.join("");
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
    { eyebrow: `Honest read — ${escape(store.ctx.name || "them")}`, text: b.brutal_truth_employee || "" },
    { eyebrow: "Honest read — you", text: b.brutal_truth_manager || "" },
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
          <div class="action-when">${escape(capWhen(a.when))}</div>
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
        mark: "●",
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

  root.querySelector(".js-copy-all-briefing").addEventListener("click", () => {
    copyFullBriefing(b, store.ctx, root.querySelector(".js-copy-all-briefing"));
  });

  root.querySelector(".js-restart").addEventListener("click", () => {
    setState({ stage: STAGES.RUN_DEBRIEF });
  });

  // Scripted test lane: capture the structured verdict (ground truth for Suggest-fix).
  if (store.scripted) {
    const verdictBtns = [...root.querySelectorAll(".js-verdict")];
    const issueSel = root.querySelector(".js-issue-type");
    const noteInput = root.querySelector(".js-verdict-note");
    const confirm = root.querySelector(".js-verdict-confirm");
    let chosen = null;
    async function save() {
      if (!chosen) return;
      try {
        await postVerdict(store.sessionId, {
          verdict: chosen,
          issue_type: issueSel.value || null,
          note: noteInput.value || null,
        });
        confirm.style.opacity = "1";
        setTimeout(() => { confirm.style.opacity = "0"; }, 1500);
      } catch (e) {
        console.warn("[briefing] verdict save failed:", e.message);
      }
    }
    verdictBtns.forEach((b) => b.addEventListener("click", () => {
      chosen = b.dataset.v;
      verdictBtns.forEach((x) => x.classList.toggle("is-active", x === b));
      save();
    }));
    issueSel.addEventListener("change", save);
    noteInput.addEventListener("change", save);
  }

  // "Copy review prompt" — only shown when there are notes to discuss.
  const copyBtn = root.querySelector(".js-copy-review");
  const copyConfirm = root.querySelector(".js-copy-confirm");
  if ((store.notes || []).length && store.sessionDir) {
    copyBtn.classList.remove("hidden");
    copyBtn.addEventListener("click", async () => {
      const notesPath = `${String(store.sessionDir).replace(/\\/g, "/")}/notes.md`;
      const prompt = [
        `Open notes.md in the session folder (${notesPath}).`,
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

function capWhen(w) {
  const s = String(w || "").trim();
  if (!s) return "";
  if (s === "next 1:1") return "Next 1:1";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function whenRank(w) {
  const i = WHEN_ORDER.indexOf(w);
  return i === -1 ? WHEN_ORDER.length : i;
}

function formatActionCopy(a) {
  const when = String(a.when || "").trim();
  const action = String(a.action || "").trim();
  if (!when) return action;
  return `${capWhen(when)}: ${action}`;
}

function formatBriefingForCopy(b, ctx) {
  const lines = [];
  const name = (ctx?.name || "").trim();
  lines.push(name ? `Briefing · For ${name}` : "Briefing");

  const headline = String(b.headline || "").trim();
  if (headline) {
    lines.push("", headline);
  }

  const bullets = b.summary_bullets || [];
  if (bullets.length) {
    lines.push("", "What stood out");
    bullets.forEach((item) => lines.push(`- ${item}`));
  }

  const para = String(b.understanding_paragraph || "").trim();
  if (para) {
    lines.push("", "What we understood", para);
  }

  const axes = b.axes || [];
  if (axes.length) {
    lines.push("", "Final read");
    for (const a of axes) {
      const label = cap(a.id);
      if (a.score === 0) {
        lines.push(`${label} (not read — not enough signal)`);
        continue;
      }
      const score = a.score != null ? ` (${a.score})` : "";
      lines.push(`${label}${score}`);
      if (a.meaning) lines.push(String(a.meaning).trim());
    }
  }

  const empTruth = String(b.brutal_truth_employee || "").trim();
  if (empTruth) {
    lines.push("", `Honest read — ${name || "them"}`, empTruth);
  }

  const mgrTruth = String(b.brutal_truth_manager || "").trim();
  if (mgrTruth) {
    lines.push("", "Honest read — you", mgrTruth);
  }

  const actions = b.next_actions || [];
  if (actions.length) {
    lines.push("", "What to do next");
    [...actions]
      .sort((x, y) => whenRank(x.when) - whenRank(y.when))
      .forEach((a) => lines.push(`- ${formatActionCopy(a)}`));
  }

  const watch = b.watch_for || [];
  if (watch.length) {
    lines.push("", "Reminders");
    watch.forEach((item) => lines.push(`- ${item}`));
  }

  return lines.join("\n").trim();
}

async function copyFullBriefing(briefing, ctx, btn) {
  const text = formatBriefingForCopy(briefing, ctx);
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const prev = btn.textContent;
    btn.textContent = "Copied ✓";
    setTimeout(() => { btn.textContent = prev; }, 1500);
  } catch (e) {
    console.warn("[briefing] clipboard write failed:", e.message);
  }
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

function escape(s) {
  return String(s == null ? "" : s)
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
