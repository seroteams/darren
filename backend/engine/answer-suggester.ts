// Note helper for solo test runs: given the run's persona + the question on
// screen, draft a few sample manager notes — the shorthand a manager would jot
// about the report's reply — that the operator can click to fill the notes box.
// Testing aid only — the web UI gates it behind dev mode.

import { modelFor } from "./models.ts";
import { callAI, parseAIJson } from "./ai-client.ts";
import type { TranscriptEntry } from "../shared/session.types.ts";

// Model JSON is unknown until checked — narrow with these instead of trusting shapes.
function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}
function asRecord(v: unknown): Record<string, unknown> {
  return isObjectRecord(v) ? v : {};
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    answers: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["answers"],
  additionalProperties: false,
};

const MIN_WORDS = 5;
const MAX_WORDS = 28;
const TARGET_MIN = 6;
const TARGET_MAX = 22;

const BANNED_OPENER =
  /^(yeah|yes|yep|ok|okay|so|well|um|honestly)\b[\s,—–-]*/i;

// The manager jots notes ABOUT the report in the third person. A first-person
// pronoun means the model slipped into the report's own voice ("I check the main
// screens…") — which is the old self-report model, not a manager note. Reject any
// such answer outright so the fixtures stay in note voice.
const FIRST_PERSON_SELF =
  /\b(i|i'm|i've|i'd|i'll|my|me|mine|myself)\b/i;

function referencesFirstPerson(text: string): boolean {
  return FIRST_PERSON_SELF.test(String(text || ""));
}

const SYSTEM = `You ARE the manager, taking notes in a 1:1. You asked the report a question; now jot down the shorthand note you'd write about how they replied. The operator clicks one to test the system.

Voice — manager's shorthand notes about the report:
- Clipped sentences. Fragment-OK mini-sentences, not telegraphic, not full prose.
- Mostly subjectless — lead with the verb; name or pronoun only when needed. ("Checks main screens. Doesn't check edge cases before sharing.")
- THIRD PERSON about the report. NEVER first person: no "I", "my", "me" — that's the report's own voice, not your note.
- Use "→" for cause/result and "—" for a trailing detail when it fits.

Rules:
- Draft 2–3 notes capturing what the report likely said to THIS question — dense enough to drive the planner, short enough to scan in one glance.
- One line per note; 6–22 words each (hard max 28). No multi-paragraph scripts.
- Capture the report's content, not your plan: note what they said/do, not "I'd ask her to…" or "what would help her…".
- Banned openers: Yeah, Yes, OK, So, Well, Honestly.
- Concrete: name a project, person, or specific from the persona when it fits.
- Reuse at least one substantive word from your question in each note.
- Give 2–3 DISTINCT reads: open/forthcoming, mildly guarded, or a concrete detail surfaced.
- Stay consistent with your private situation notes; never quote them verbatim.
- Realistic: no crisis, no one-word notes, no hostility.
Return strict JSON only: {"answers": ["...", "..."]}. No prose, no markdown.`;

function wordCount(text: string): number {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function stripBannedOpener(text: string): string {
  let s = String(text || "").trim();
  let prev;
  do {
    prev = s;
    s = s.replace(BANNED_OPENER, "").trim();
  } while (s !== prev && BANNED_OPENER.test(s));
  return s;
}

function sanitizeAnswer(text: string): string | null {
  const trimmed = stripBannedOpener(text);
  if (!trimmed) return null;
  const wc = wordCount(trimmed);
  if (wc < MIN_WORDS || wc > MAX_WORDS) return null;
  if (referencesFirstPerson(trimmed)) return null;
  return trimmed;
}

function filterAnswers(rawList: unknown): string[] {
  const list: readonly unknown[] = Array.isArray(rawList) ? rawList : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const a of list) {
    if (typeof a !== "string") continue;
    const clean = sanitizeAnswer(a);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= 3) break;
  }
  return out;
}

function recentTranscript(transcript: TranscriptEntry[] | undefined, limit = 4): string {
  const turns = (transcript || []).slice(-limit);
  if (!turns.length) return "(this is the first question)";
  return turns
    .map((t) => {
      const a = t.skipped ? "(skipped)" : t.answer || "(no note)";
      return `You asked: ${t.question?.name || "(question)"}\nNote: ${a}`;
    })
    .join("\n\n");
}

interface SuggestAnswersInput {
  name?: string;
  role?: string;
  seniority?: string;
  meetingType?: string;
  notes?: string;
  question: string;
  questionLabel?: string;
  questionDescription?: string;
  transcript?: TranscriptEntry[];
}

interface BuildUserMessageInput extends SuggestAnswersInput {
  retryHint?: string;
}

function buildUserMessage({
  name,
  role,
  seniority,
  meetingType,
  notes,
  question,
  questionLabel,
  questionDescription,
  transcript,
  retryHint,
}: BuildUserMessageInput): string {
  const lines = [
    `The report: ${name || "the employee"}, ${seniority || ""} ${role || ""}`.trim(),
    `Meeting type: ${meetingType || "1:1"}`,
    `Your private situation notes: ${notes && notes.trim() ? notes.trim() : "(none)"}`,
    ``,
    `Conversation so far:`,
    recentTranscript(transcript),
    ``,
    `You just asked:`,
    `"${question}"`,
  ];
  if (questionLabel && questionLabel !== question) {
    lines.push(`Question label: ${questionLabel}`);
  }
  if (questionDescription && questionDescription.trim()) {
    lines.push(`Context: ${questionDescription.trim()}`);
  }
  lines.push(
    ``,
    `Draft 2-3 short manager notes (6-22 words each, one line, third person about the report). Return the JSON now.`
  );
  if (retryHint) {
    lines.push(``, retryHint);
  }
  return lines.join("\n");
}

async function callOnce(user: string, { model }: { model: string }): Promise<string[]> {
  const raw = await callAI({
    system: SYSTEM,
    user,
    schema: RESPONSE_SCHEMA,
    schemaName: "answer_suggestions",
    temperature: 0.75,
    model,
    costLabel: "aux-answer-suggest",
  });
  const parsed = asRecord(parseAIJson(raw, "Answer suggester", ["answers"]));
  return filterAnswers(parsed.answers);
}

async function suggestAnswers(
  {
    name,
    role,
    seniority,
    meetingType,
    notes,
    question,
    questionLabel,
    questionDescription,
    transcript,
  }: SuggestAnswersInput,
  { model = modelFor("bank") }: { model?: string } = {}
): Promise<string[]> {
  const base: BuildUserMessageInput = {
    name,
    role,
    seniority,
    meetingType,
    notes,
    question,
    questionLabel,
    questionDescription,
    transcript,
  };

  let answers = await callOnce(buildUserMessage(base), { model });
  if (answers.length >= 2) return answers;

  const retryHint =
    "Your last output was too long, too short, used banned openers, or slipped into the report's first-person voice. Each note must be ONE line, 6-22 words, in THIRD PERSON as a manager's shorthand about the report (never I/my/me), capturing what they said.";
  const retry = await callOnce(buildUserMessage({ ...base, retryHint }), { model });
  if (retry.length > answers.length) answers = retry;

  return answers.slice(0, 3);
}

export {
  suggestAnswers,
  sanitizeAnswer,
  filterAnswers,
  referencesFirstPerson,
  wordCount,
  MIN_WORDS,
  MAX_WORDS,
  TARGET_MIN,
  TARGET_MAX,
};
