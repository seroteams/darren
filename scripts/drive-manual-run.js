#!/usr/bin/env node
// Drive a full run through the live API (no browser) to verify engine changes
// end-to-end. Manual mode by default; --scripted <personaId> runs the frozen
// scripted lane instead. Prints the session id so the run can be inspected.
//   node scripts/drive-manual-run.js [--base http://localhost:3001] [--scripted daniel-ruiz]

const BASE = (() => {
  const i = process.argv.indexOf("--base");
  return i > -1 ? process.argv[i + 1] : "http://localhost:3001";
})();

const SCRIPTED_PERSONA = (() => {
  const i = process.argv.indexOf("--scripted");
  return i > -1 ? process.argv[i + 1] : null;
})();

const ANSWERS = [
  // Substantive, varied answers designed to exercise scoring paths:
  // strong signal, deficiency-as-request, misalignment, and a concrete thread.
  "wants to talk about the design review backlog before anything else",
  "energy is low, says the last three weeks were all cleanup and reviews, nothing of her own",
  "the checkout redesign is hers but she found out scope was cut in a meeting she wasn't in",
  "says more clarity on scope would help, and hearing about changes before they're locked in",
  "she thinks the priority is polish, her lead keeps asking for new explorations, not aligned",
  "misses doing discovery work, asked twice if research time could be protected",
  "wants to mentor the new junior designer, would drop one review slot to make room",
  "agreed to write up the scope gaps and bring them next week",
];

async function json(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

function post(url, payload) {
  return fetch(`${BASE}${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(json);
}

function get(url) {
  return fetch(`${BASE}${url}`).then(json);
}

// Minimal SSE consumer: resolves with {event: data} map once a terminal event
// arrives (any of `until`), rejects on `error` events that are not recoverable.
async function sse(url, until = ["done"]) {
  const res = await fetch(`${BASE}${url}`);
  if (!res.ok) throw new Error(`SSE ${url} → HTTP ${res.status}`);
  const seen = {};
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return seen;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) > -1) {
      const frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const ev = /^event: (.+)$/m.exec(frame)?.[1];
      const dataRaw = /^data: (.+)$/m.exec(frame)?.[1];
      if (!ev) continue;
      let data = {};
      try { data = dataRaw ? JSON.parse(dataRaw) : {}; } catch { /* keep {} */ }
      seen[ev] = data;
      if (ev === "error" && data.recoverable === false) {
        await reader.cancel();
        throw new Error(`stage error: ${data.message}`);
      }
      if (until.includes(ev)) {
        await reader.cancel();
        return seen;
      }
    }
  }
}

async function main() {
  const types = await get("/api/meeting-types");
  const labels = (types.types || []).map((t) => t.label);

  let startPayload;
  if (SCRIPTED_PERSONA) {
    const bench = await get("/api/persona-bench");
    const persona = (bench.personas || []).find((p) => p.id === SCRIPTED_PERSONA);
    if (!persona) throw new Error(`persona ${SCRIPTED_PERSONA} not in bench`);
    const mtIndex = Math.max(0, labels.indexOf(persona.meeting_type));
    startPayload = {
      name: persona.name,
      role: persona.role,
      seniority: persona.seniority,
      meetingTypeIndex: mtIndex,
      notes: persona.notes,
      mode: "scripted",
      personaId: persona.id,
      runLabel: "batch1-verify-scripted",
    };
    console.log(`scripted persona: ${persona.id} (${persona.meeting_type})`);
  } else {
    const mtIndex = Math.max(0, labels.findIndex((l) => /bi-?weekly/i.test(l)));
    console.log(`meeting type: ${labels[mtIndex]} (index ${mtIndex})`);
    startPayload = {
      name: "Maya",
      role: "Senior product designer",
      seniority: "Senior",
      meetingTypeIndex: mtIndex,
      notes: "She has seemed flat in crits lately and her PRs on the design system slowed down.",
      mode: "manual",
      runLabel: "batch1-verify",
    };
  }

  const start = await post("/api/start", startPayload);
  const s = start.sessionId;
  console.log(`session: ${s}`);

  const fp = await sse(`/api/focus-points/stream?s=${s}`, ["done"]);
  const points = fp.result?.focusPoints || fp.result?.focus_points || [];
  console.log(`focus points: ${points.map((p) => p.id).join(", ")}`);
  const pick = points.slice(0, 2).map((p) => p.id);
  await post("/api/focus-points/select", { sessionId: s, focusPointIds: pick });
  console.log(`selected: ${pick.join(", ")}`);

  await sse(`/api/preparation/stream?s=${s}`, ["done"]);
  console.log("preparation: ok");
  await sse(`/api/bank/stream?s=${s}`, ["done"]);
  console.log("bank: ok");

  let i = 0;
  const askedAliases = [];
  for (;;) {
    const q = await get(`/api/question?s=${s}`);
    if (q.done) break;
    askedAliases.push(q.question.alias);
    const answer = SCRIPTED_PERSONA
      ? q.scripted?.answer ?? q.scripted?.fallback ?? "(skipped)"
      : ANSWERS[i] || ANSWERS[ANSWERS.length - 1];
    console.log(`turn ${q.turn}/${q.total}: [${q.question.alias}] ${q.question.name}`);
    console.log(`   answer: ${answer}`);
    await post("/api/answer", {
      sessionId: s,
      answer,
      answerSource: SCRIPTED_PERSONA ? (q.scripted?.answer ? "scripted" : "fallback") : "manual",
      alias: q.question.alias,
    });
    const plan = await sse(`/api/plan/stream?s=${s}`, ["done", "next"]);
    const axes = plan.axes?.axes || [];
    const issues = plan.axes?.issues;
    console.log(
      `   axes: ${axes.map((a) => `${a.id}:${a.score}`).join(" ")}` +
        (issues?.length ? `\n   issues: ${issues.join(" | ")}` : "")
    );
    if (plan.done) break;
    i += 1;
    if (i > 24) throw new Error("runaway loop");
  }

  console.log("evaluation: running");
  const ev = await sse(`/api/evaluation/stream?s=${s}`, ["done"]);
  const b = ev.briefing || {};
  console.log(`headline: ${b.headline}`);
  console.log(`asked aliases: ${askedAliases.join(" ")}`);
  console.log(`session id: ${s} — inspect logs/<month>/<run dir> matching this id`);
}

main().catch((e) => {
  console.error("DRIVER FAILED:", e.message);
  process.exit(1);
});
