// Renders the right-rail "Sent" and "Reply" tabs: what the AI was given for the
// current stage and what it sent back. Reads the run's logged stage I/O via
// GET /api/runs/:id/stages (the live run's sessionId IS the run id). Shows raw
// text exactly as logged — nothing is reworded or hidden (engine-honesty rule);
// "what shipped" appears only where a post-processed copy was actually logged.

import { getRunStages, getStagePreview, getSessionRules } from "../../../shared/api.js";
import { STAGES } from "../state.js";
import { escapeHtml } from "./html.js";

// Live stage -> the folder it logs to.
const STAGE_KEY = {
  [STAGES.FOCUS_POINTS]: "01-focus-points",
  [STAGES.PREPARATION]: "01b-preparation",
  [STAGES.BANK]: "03-question-bank",
  [STAGES.QUESTIONING]: "04-dynamic-answers",
  [STAGES.EVAL]: "05-evaluation",
};

// Friendly labels for the inputs we recognise. Unknown keys fall back to a
// humanised version of the key — we never drop a field.
const INPUT_LABEL = {
  name: "Name",
  role: "Role",
  seniority: "Seniority",
  meetingType: "Meeting type",
  notes: "Your private notes",
  managerNotes: "Your private notes",
  model: "Model",
  focusPoints: "Focus points offered",
  selectedFocus: "Focus points picked",
  selectedFocusPoints: "Focus points picked",
  prep: "Prep brief",
  preparation: "Prep brief",
  transcript: "Conversation so far",
  axisState: "Running scores",
  axes: "Scoring dimensions",
  roleProfile: "Role profile",
};

function humanise(key) {
  return String(key)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function isEmpty(v) {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v).length === 0;
  return false;
}

function pretty(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function placeholder(text) {
  return `<p class="stage-io__empty">${escapeHtml(text)}</p>`;
}

// A labelled value: short scalars inline, anything structured in a <pre>.
function field(label, value) {
  if (isEmpty(value)) return "";
  const scalar = typeof value !== "object";
  const body = scalar
    ? `<div class="stage-io__val">${escapeHtml(String(value))}</div>`
    : `<pre class="stage-io__pre">${escapeHtml(pretty(value))}</pre>`;
  return `<div class="stage-io__field"><div class="stage-io__label">${escapeHtml(label)}</div>${body}</div>`;
}

// A copyable code block with a header + Copy button.
function block(title, text, { open = false, details = false } = {}) {
  if (isEmpty(text)) return "";
  const inner = `
    <div class="stage-io__block-head">
      <span class="stage-io__block-title">${escapeHtml(title)}</span>
      <button type="button" class="stage-io__copy js-copy">Copy</button>
    </div>
    <pre class="stage-io__pre">${escapeHtml(text)}</pre>`;
  if (details) {
    return `<details class="stage-io__block stage-io__details"${open ? " open" : ""}>
      <summary class="stage-io__summary">${escapeHtml(title)}</summary>
      <div class="stage-io__copyrow"><button type="button" class="stage-io__copy js-copy">Copy</button></div>
      <pre class="stage-io__pre">${escapeHtml(text)}</pre>
    </details>`;
  }
  return `<div class="stage-io__block">${inner}</div>`;
}

function latestTurn(stage) {
  const turns = stage?.turns || [];
  return turns.length ? turns[turns.length - 1] : null;
}

// Before a stage runs there's nothing logged yet — show the exact text we're
// ABOUT to send, assembled with zero API calls. Open by default: seeing it is
// the whole point. Clearly marked as not-yet-sent so it's never mistaken for a
// confirmed send.
function renderPreview(preview) {
  const note = `<p class="stage-io__note">Not sent yet. This is the exact text we'll send the moment this step runs. Nothing has left your machine.</p>`;
  const model = field("Model", preview.model);
  const promptFile = field("Prompt file", preview.promptFile);
  const prompt = block("Show exact text we're about to send (preview. Not yet sent)", preview.prompt, { details: true, open: true });
  return `${note}<div class="stage-io__fields">${model}${promptFile}</div>${prompt}`;
}

function renderSent(stage, preview) {
  // A preview means "not sent yet" — the before-send text (incl. the live draft on
  // questioning). It takes precedence: when we have it, that's what "Sending" shows.
  if (preview && preview.prompt) return renderPreview(preview);
  if (!stage) return placeholder("Waiting for this stage to run…");
  // Live Q&A: the prompt embeds everything, so show the turn header + the prompt.
  if (stage.turns) {
    const t = latestTurn(stage);
    if (!t) return placeholder("Waiting for the first question…");
    const head = field(`Question ${t.turn}`, t.question || "(no question text)") + field("Their answer", t.skipped ? "(skipped)" : t.answer);
    const prompt = t.prompt
      ? block("Show exact text sent to the model", t.prompt, { details: true })
      : placeholder("This run didn't save the exact prompt for this question.");
    return head + prompt;
  }
  const inputs = stage.inputs || {};
  const fields = Object.entries(inputs)
    .map(([k, v]) => field(INPUT_LABEL[k] || humanise(k), v))
    .join("");
  const ctx = fields || placeholder("No inputs were logged for this stage.");
  const prompt = stage.prompt
    ? block("Show exact text sent to the model", stage.prompt, { details: true })
    : "";
  return `<div class="stage-io__fields">${ctx}</div>${prompt}`;
}

function renderReply(stage) {
  if (!stage) return placeholder("Waiting for this stage to run…");
  if (stage.turns) {
    const t = latestTurn(stage);
    if (!t) return placeholder("Waiting for the first question…");
    return (
      field(`Question ${t.turn}`, t.question || "(no question text)") +
      (block("Raw reply", pretty(t.raw), { open: true }) || placeholder("No reply logged for this question."))
    );
  }
  const raw = block("Raw reply", pretty(stage.raw), { open: true });
  const final =
    "final" in stage
      ? block("What shipped (after processing)", pretty(stage.final))
      : `<p class="stage-io__note">No separate processed copy was logged for this stage. The raw reply is what was used.</p>`;
  return (raw || placeholder("No reply was logged for this stage.")) + final;
}

// One guardrail line: bold title + plain explanation.
function ruleLine(r) {
  return `<div class="stage-io__field"><div class="stage-io__val"><strong>${escapeHtml(r.title)}</strong>. ${escapeHtml(r.detail)}</div></div>`;
}

// The "Rules" pane: guardrails active for this meeting type + what fired last turn.
function renderRules(data) {
  if (!data) return placeholder("Rules show up once a 1:1 is running.");
  const active = (data.active || []).map(ruleLine).join("");
  const mt = data.meetingType ? ` · ${escapeHtml(data.meetingType)}` : "";
  let html = `<div class="stage-io__label">Active for this 1:1${mt}</div>${active || placeholder("No special rules.")}`;
  if (data.lastTurn) {
    const fired = (data.lastTurn.fired || []).map(ruleLine).join("");
    html +=
      `<div class="stage-io__label">What fired last turn (turn ${escapeHtml(String(data.lastTurn.turn))})</div>` +
      (fired || `<p class="stage-io__note">Nothing special fired. A clean turn.</p>`);
  }
  return html;
}

export function createStageDataController() {
  const sentEl = document.createElement("div");
  sentEl.className = "stage-io";
  const replyEl = document.createElement("div");
  replyEl.className = "stage-io";
  const rulesEl = document.createElement("div");
  rulesEl.className = "stage-io";

  let token = 0;
  let key = null; // `${sessionId}|${stageKey}|${turn}|${draft}`
  let stage = null;
  let preview = null;
  // Questioning + empty draft: the "Sending" pane invites you to type instead of
  // showing "Waiting…" — there's genuinely nothing to send until you write something.
  let qEmptyDraft = false;
  // On questioning, "Received" reads as "the AI's reply to your last answer", so a
  // turn-less state is "nothing back yet", not "waiting for this stage to run".
  let isQuestioning = false;

  function paint() {
    sentEl.innerHTML = qEmptyDraft
      ? placeholder("Start typing your answer above. This fills in live with the exact text we'll send the AI.")
      : renderSent(stage, preview);
    replyEl.innerHTML =
      isQuestioning && !latestTurn(stage)
        ? placeholder("Nothing back yet. The AI's reply to your last answer shows here.")
        : renderReply(stage);
  }

  async function fetchStage(sessionId, stageKey, liveStage, draft, baseChanged) {
    const my = ++token;
    const isQ = liveStage === STAGES.QUESTIONING;
    qEmptyDraft = isQ && !draft;
    isQuestioning = isQ;
    // Only blank to "Loading…" when the stage/turn changed — not on every keystroke
    // of the draft (that would flicker). A draft-only change repaints in place.
    if (baseChanged) {
      sentEl.innerHTML = placeholder("Loading…");
      replyEl.innerHTML = placeholder("Loading…");
      try {
        const { stages } = await getRunStages(sessionId);
        if (my !== token) return;
        stage = stages.find((s) => s.key === stageKey) || null;
      } catch {
        if (my !== token) return;
        stage = null;
      }
    }
    // Questioning shows a LIVE "Sending" preview built from the draft answer as you
    // type. Other stages preview only before they've logged their real send.
    preview = null;
    const wantPreview = isQ ? Boolean(draft) : !stage;
    if (wantPreview) {
      try {
        const p = await getStagePreview(sessionId, liveStage, isQ ? draft : undefined);
        if (my !== token) return;
        if (p && p.prompt) preview = p;
      } catch {
        if (my !== token) return;
      }
    }
    paint();
  }

  let rulesToken = 0;
  let rulesLoadedKey = null;
  async function fetchRules(sessionId, turn) {
    // Rules only change turn-to-turn — skip re-fetching on every keystroke/state tick.
    const nextKey = `${sessionId}|${turn || 0}`;
    if (nextKey === rulesLoadedKey) return;
    const my = ++rulesToken;
    rulesEl.innerHTML = placeholder("Loading…");
    try {
      const data = await getSessionRules(sessionId);
      if (my !== rulesToken) return;
      rulesLoadedKey = nextKey;
      rulesEl.innerHTML = renderRules(data);
    } catch {
      if (my !== rulesToken) return;
      rulesEl.innerHTML = placeholder("Couldn't load the rules.");
    }
  }

  // Called by the rail on every state change and on tab switches. We only do
  // work when an AI tab is showing, so it stays cheap during normal use.
  function render({ sessionId, stage: liveStage, turn, draftAnswer }, activeTab) {
    if (activeTab === "rules") {
      if (sessionId) fetchRules(sessionId, turn);
      else rulesEl.innerHTML = placeholder("Rules show up once a 1:1 is running.");
      return;
    }
    if (activeTab !== "sent" && activeTab !== "reply") return;
    const stageKey = STAGE_KEY[liveStage];
    if (!sessionId || !stageKey) {
      stage = null;
      preview = null;
      qEmptyDraft = false;
      isQuestioning = false;
      token++; // cancel any in-flight fetch
      sentEl.innerHTML = placeholder("This step doesn't send anything to the AI.");
      replyEl.innerHTML = placeholder("This step doesn't send anything to the AI.");
      key = null;
      return;
    }
    // The draft only matters on questioning — it's what makes "Sending" live.
    const draft = liveStage === STAGES.QUESTIONING ? String(draftAnswer || "") : "";
    const baseKey = `${sessionId}|${stageKey}|${turn || 0}`;
    const nextKey = `${baseKey}|${draft}`;
    if (nextKey === key) {
      paint();
      return;
    }
    const baseChanged = key === null || !key.startsWith(`${baseKey}|`);
    key = nextKey;
    fetchStage(sessionId, stageKey, liveStage, draft, baseChanged);
  }

  // Copy: grab the nearest block's <pre> text. Delegated on both panes.
  function onCopyClick(e) {
    const btn = e.target.closest(".js-copy");
    if (!btn) return;
    const wrap = btn.closest(".stage-io__block, .stage-io__details");
    const pre = wrap && wrap.querySelector(".stage-io__pre");
    if (!pre) return;
    navigator.clipboard.writeText(pre.textContent || "").then(
      () => {
        const prev = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => { btn.textContent = prev; }, 1200);
      },
      () => { btn.textContent = "Copy failed"; }
    );
  }
  sentEl.addEventListener("click", onCopyClick);
  replyEl.addEventListener("click", onCopyClick);

  return { sentEl, replyEl, rulesEl, render };
}
