import * as runDebrief from "@sero/run-debrief";

const { buildRunDebriefPayload, buildQaReviewPrompt } = runDebrief;

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    if (btn) {
      const prev = btn.getAttribute("aria-label");
      btn.classList.add("is-copied");
      btn.setAttribute("aria-label", "Copied");
      setTimeout(() => {
        btn.classList.remove("is-copied");
        if (prev) btn.setAttribute("aria-label", prev);
      }, 1200);
    }
  } catch (e) {
    console.warn("[run-debrief] clipboard failed:", e.message);
  }
}

function makeCopyBtn(label, getText) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn--ghost btn--sm";
  btn.textContent = label;
  btn.addEventListener("click", () => copyText(getText(), btn));
  return btn;
}

function makeStat(label, value, sub) {
  const el = document.createElement("div");
  el.className = "run-log__stat card-flat";
  el.innerHTML = `
    <div class="caption run-log__stat-label">${escapeHtml(label)}</div>
    <div class="run-log__stat-value num-tabular">${escapeHtml(value)}</div>
    <div class="caption run-log__stat-sub">${escapeHtml(sub)}</div>
  `;
  return el;
}

export function buildPayloadFromStore(store, briefing) {
  return buildRunDebriefPayload({
    sessionId: store.sessionId,
    sessionDir: store.sessionDir,
    notes: store.notes || [],
    cost: briefing?.cost,
    createdAt: store.createdAt,
    completedAt: briefing?.completedAt ?? store.completedAt,
    meetingType: store.ctx?.meetingType,
    surface: "web",
  });
}

export function buildQaReviewPromptFromStore(store, briefing) {
  const payload = buildPayloadFromStore(store, briefing);
  return buildQaReviewPrompt({
    ctx: store.ctx,
    payload,
    sessionDir: store.sessionDir,
  });
}

export function mountRunDebrief(host, payload) {
  if (!host || !payload) return;

  const section = document.createElement("section");
  section.className = "run-log reveal-soft";
  section.setAttribute("aria-labelledby", "run-log-title");

  section.innerHTML = `
    <header class="run-log__head">
      <div class="run-log__head-left">
        <div id="run-log-title" class="eyebrow">Session review</div>
        <div class="run-log__id num-tabular"></div>
      </div>
      <div class="run-log__actions"></div>
    </header>
    <div class="run-log__stats"></div>
    <div class="run-log__grid">
      <div class="run-log__block run-log__block--retest">
        <div class="run-log__block-label">CLI replay</div>
        <p class="run-log__disclaimer">Replays a scenario file through the CLI — not this session's live answers.</p>
        <div class="run-log__commands" role="group" aria-label="Smoke test commands"></div>
        <div class="run-log__scenario-pill caption"></div>
      </div>
      <div class="run-log__block run-log__block--folder">
        <div class="run-log__block-label">Log on disk</div>
        <button type="button" class="run-log__path num-tabular"></button>
        <p class="caption text-ink-mute">Click path to copy — open in your file manager</p>
        <div class="run-log__tree" aria-label="Log folder structure"></div>
      </div>
    </div>
    <div class="run-log__notes-wrap"></div>
    <button type="button" class="run-log__tip caption"></button>
  `;

  section.querySelector(".run-log__id").textContent = payload.sessionId || "—";

  const actions = section.querySelector(".run-log__actions");
  actions.appendChild(
    makeCopyBtn("Copy path", () => payload.logDirCopy)
  );
  actions.appendChild(
    makeCopyBtn("Copy test", () => payload.smokeCommandBlock)
  );

  const stats = section.querySelector(".run-log__stats");
  const api = payload.apiDuration;
  stats.appendChild(
    makeStat(
      "API time",
      api.label,
      api.callCount ? `${api.callCount} call${api.callCount === 1 ? "" : "s"}` : "—"
    )
  );
  stats.appendChild(
    makeStat(
      "Wall clock",
      payload.hasWallClock ? payload.wallDuration.label : "—",
      payload.hasWallClock ? "session" : "after eval"
    )
  );
  stats.appendChild(
    makeStat(
      "Notes",
      payload.noteCount ? String(payload.noteCount) : "0",
      payload.noteCount ? "notes.md" : "none"
    )
  );

  if (payload.cost) {
    stats.appendChild(
      makeStat(
        "Session cost (dev)",
        formatUsd(payload.cost.usd_total),
        `${formatTokens(payload.cost.total_tokens)} tokens · ${payload.cost.call_count} call${payload.cost.call_count === 1 ? "" : "s"}`
      )
    );
  }

  const cmdHost = section.querySelector(".run-log__commands");
  const line1 = document.createElement("div");
  line1.className = "run-log__cmd-line";
  line1.textContent = payload.smokeNpm;
  const line2 = document.createElement("div");
  line2.className = "run-log__cmd-line";
  line2.textContent = payload.smokeNode;
  cmdHost.appendChild(line1);
  cmdHost.appendChild(line2);

  const pill = section.querySelector(".run-log__scenario-pill");
  pill.textContent = payload.smokeScenario;

  const pathBtn = section.querySelector(".run-log__path");
  pathBtn.textContent = payload.tree.root;
  pathBtn.title = "Copy log folder path";
  pathBtn.addEventListener("click", () => copyText(payload.logDirCopy, pathBtn));

  const treeHost = section.querySelector(".run-log__tree");
  for (const line of payload.tree.lines) {
    const row = document.createElement("div");
    row.className = `run-log__tree-line${line.isStage ? " run-log__tree-line--stage" : ""}`;
    row.innerHTML = `<span class="run-log__tree-prefix">${line.prefix}</span> ${escapeHtml(line.text)}`;
    treeHost.appendChild(row);
  }

  const notesWrap = section.querySelector(".run-log__notes-wrap");
  if (payload.noteCount > 0) {
    const block = document.createElement("div");
    block.className = "run-log__notes card-flat";
    block.innerHTML = `<div class="run-log__block-label">Your notes</div>`;
    const list = document.createElement("div");
    list.className = "run-log__notes-list";
    for (const n of payload.notes) {
      const row = document.createElement("div");
      row.className = "run-log__note-row";
      row.title = n.title;
      row.innerHTML = `
        <span class="run-log__note-time caption num-tabular">${escapeHtml(n.time)}</span>
        <span class="run-log__note-stage">${escapeHtml(n.stageLabel)}</span>
        <span class="run-log__note-text">${escapeHtml(n.text)}</span>
      `;
      list.appendChild(row);
    }
    block.appendChild(list);
    const foot = document.createElement("p");
    foot.className = "caption run-log__notes-foot";
    foot.textContent = `Saved to ${payload.notesMdPath}`;
    block.appendChild(foot);
    notesWrap.appendChild(block);
  } else {
    const empty = document.createElement("p");
    empty.className = "run-log__notes-empty caption";
    empty.textContent =
      "No notes captured — use the notes panel during the run.";
    notesWrap.appendChild(empty);
  }

  const tip = section.querySelector(".run-log__tip");
  tip.textContent = `Tip: ${payload.reviewrunTip}`;
  tip.title = "Copy reviewrun command";
  tip.addEventListener("click", () => copyText(payload.reviewrunTip, tip));

  host.appendChild(section);
  requestAnimationFrame(() => section.classList.add("is-in"));
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
