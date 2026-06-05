import { STAGES, resetSession } from "../state.js";
import { createOrb } from "../ui/orb.js";
import { openSse } from "../sse.js";
import { revealSequence } from "../ui/reveal.js";
import { confirmAction } from "../ui/confirm.js";
import { confirmResetSession } from "../ui/session-reset.js";

export async function mount(root, { store, setState }) {
  const sessionId = store.sessionId;

  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <div class="page-header__row">
          <div class="eyebrow">Pre-meeting brief</div>
          <button class="btn btn--ghost js-start-fresh" type="button">Reset session</button>
        </div>
      </header>
      <div class="thinking-host min-h-[120px] flex items-center"></div>
      <div class="result-host"></div>
    </div>
  `;
  const thinkingHost = root.querySelector(".thinking-host");
  const resultHost   = root.querySelector(".result-host");

  root.querySelector(".js-start-fresh").addEventListener("click", async () => {
    const ok = await confirmResetSession(confirmAction);
    if (!ok) return;
    resetSession();
    setState({ stage: STAGES.START });
  });

  const orb = createOrb("Preparing your prep brief…");
  thinkingHost.appendChild(orb.el);

  const sse = openSse(`/api/preparation/stream?s=${encodeURIComponent(sessionId)}`);
  sse
    .on("thinking", (d) => orb.setLabel(d.label))
    .on("result", async (d) => {
      await orb.exit();
      thinkingHost.remove();
      setState({ preparation: d.brief, preparationRunId: d.runId });
      renderResult(d.brief);
    })
    .on("error", (d) => {
      setState({
        stage: STAGES.ERROR,
        error: d.message || "Preparation briefing failed.",
        retryStage: STAGES.PREPARATION,
      });
    })
    .onError(() => {
      setState({
        stage: STAGES.ERROR,
        error: "Lost connection while generating the prep brief.",
        retryStage: STAGES.PREPARATION,
      });
    })
    .open();

  function renderResult(brief) {
    const sections = [
      { label: "Likely theme",     key: "coreIssue",       type: "paragraph" },
      { label: "Say this first",   key: "openingQuestion", type: "callout" },
      { label: "Listen for",       key: "listenFor",       type: "bullets" },
      { label: "Avoid",            key: "avoid",           type: "bullets" },
      { label: "Success looks like", key: "goodOutcome",   type: "paragraph" },
      { label: "Suggested action", key: "suggestedAction", type: "paragraph" },
    ];

    function renderField(type, value) {
      if (type === "bullets" && Array.isArray(value)) {
        return `<ul class="prep-list">${value.map(item => `<li>${escape(item)}</li>`).join("")}</ul>`;
      }
      if (type === "callout") {
        return `<blockquote class="prep-callout">${escape(value || "")}</blockquote>`;
      }
      return `<p class="text-ink leading-relaxed">${escape(value || "")}</p>`;
    }

    resultHost.innerHTML = `
      <div class="space-y-6">
        <div class="briefing-section-head reveal">
          <div class="eyebrow">Prep brief ready</div>
          <button type="button" class="btn btn--ghost btn--sm js-copy-all-prep">Copy all</button>
        </div>
        ${sections.map((s) => `
          <div class="reveal">
            <div class="eyebrow mb-2">${s.label}</div>
            <div class="card">
              ${renderField(s.type, brief[s.key])}
            </div>
          </div>
        `).join("")}
        <div class="l-cluster l-cluster--2 pt-2 reveal">
          <button class="btn js-continue">Generate interview questions</button>
          <button class="btn btn--ghost js-restart">New session</button>
        </div>
      </div>
    `;

    const reveals = Array.from(resultHost.querySelectorAll(".reveal"));
    revealSequence(reveals, { stagger: 80, initialDelay: 80 });

    resultHost.querySelector(".js-copy-all-prep").addEventListener("click", () => {
      copyPrepBrief(brief, store.ctx, resultHost.querySelector(".js-copy-all-prep"));
    });

    resultHost.querySelector(".js-continue").addEventListener("click", () => {
      setState({ stage: STAGES.BANK });
    });

    resultHost.querySelector(".js-restart").addEventListener("click", async () => {
      const ok = await confirmResetSession(confirmAction, { to: STAGES.INTAKE });
      if (!ok) return;
      try { localStorage.removeItem("seroSessionId"); } catch {}
      resetSession();
      setState({ sessionId: null, stage: STAGES.INTAKE, substage: "NAME" });
    });
  }

  unmountFn = () => sse.close();
}

let unmountFn = null;
export function unmount() {
  if (unmountFn) unmountFn();
  unmountFn = null;
}

function escape(s) {
  return String(s == null ? "" : s)
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PREP_SECTIONS = [
  { label: "Likely theme", key: "coreIssue" },
  { label: "Say this first", key: "openingQuestion" },
  { label: "Listen for", key: "listenFor" },
  { label: "Avoid", key: "avoid" },
  { label: "Success looks like", key: "goodOutcome" },
  { label: "Suggested action", key: "suggestedAction" },
];

function formatPrepBriefForCopy(brief, ctx) {
  const lines = ["Pre-meeting brief"];
  const who = [ctx?.name, ctx?.role, ctx?.seniority, ctx?.meetingType].filter(Boolean).join(" · ");
  if (who) lines.push(who);
  const notes = (ctx?.notes || "").trim();
  if (notes) {
    lines.push("", "Context notes", notes);
  }
  lines.push("");
  for (const { label, key } of PREP_SECTIONS) {
    const value = brief[key];
    if (value == null) continue;
    if (Array.isArray(value) && !value.length) continue;
    if (!Array.isArray(value) && !String(value).trim()) continue;
    lines.push(label);
    if (Array.isArray(value)) {
      value.forEach((item) => lines.push(`- ${item}`));
    } else {
      lines.push(String(value).trim());
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

async function copyPrepBrief(brief, ctx, btn) {
  const text = formatPrepBriefForCopy(brief, ctx);
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const prev = btn.textContent;
    btn.textContent = "Copied ✓";
    setTimeout(() => { btn.textContent = prev; }, 1500);
  } catch (e) {
    console.warn("[preparation] clipboard write failed:", e.message);
  }
}
