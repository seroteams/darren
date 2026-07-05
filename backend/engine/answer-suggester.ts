// Note helper for solo test runs: given the run's persona + the question on
// screen, draft a few sample manager notes — the shorthand a manager would jot
// about the report's reply — that the operator can click to fill the notes box.
// Testing aid only — the web UI gates it behind dev mode.

import { modelFor } from "./models.ts";
import { callAI, parseAIJson } from "./ai-client.ts";
import type { TranscriptEntry } from "../shared/session.types.ts";
import { asRecord } from "../shared/guards.ts";
import { formatScenarioPack } from "./scenario-pack.ts";
import type { ScenarioPack } from "./scenario-pack.ts";

// Model JSON is unknown until checked — narrow with these instead of trusting shapes.

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

// The slot names are prompt scaffolding; the model sometimes echoes them as a
// prefix ("INCIDENT — …"). Strip the label, keep the note.
const SLOT_LABEL = /^(incident|guarded|off-?script)\b[\s:—–-]*/i;

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
- Draft EXACTLY 3 notes, each with a different job:
  1) INCIDENT — a concrete thing that happened: name the project or person, what slipped or landed.
  2) GUARDED — the report keeping it short or deflecting; vague on purpose is fine for this one.
  3) OFF-SCRIPT — something real the situation notes DON'T mention, drawn from the report's world.
  Never write the job label into the note itself (no "INCIDENT —" prefixes) — just the note.
- One line per note; 6–22 words each (hard max 28). No multi-paragraph scripts.
- Capture the report's content, not your plan: note what they said/do, not "I'd ask her to…" or "what would help her…".
- Banned openers: Yeah, Yes, OK, So, Well, Honestly.
- Banned fog words: friction, alignment, bandwidth, dynamics — name the actual thing instead.
- Notes 1 and 3 must contain a named specific: a project, a person, a number, or a quoted phrase.
- Reuse at least one substantive word from your question in each note.
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
  const trimmed = stripBannedOpener(String(text || "").replace(SLOT_LABEL, ""));
  if (!trimmed) return null;
  const wc = wordCount(trimmed);
  if (wc < MIN_WORDS || wc > MAX_WORDS) return null;
  if (referencesFirstPerson(trimmed)) return null;
  return trimmed;
}

// Anti-vagueness lint: a note is "concrete" when it carries a specific — a
// number, a quoted phrase, or a name (capitalized word past a sentence start) —
// and none of the fog words that make a note read generic. Set-level gate only:
// no single note is rejected for vagueness (the GUARDED slot is vague on purpose);
// a too-vague SET triggers one retry.
const FOG_WORDS = /\b(friction|alignment|bandwidth|dynamics)\b/i;

function isConcrete(text: string): boolean {
  const s = String(text || "");
  if (FOG_WORDS.test(s)) return false;
  if (/\d/.test(s)) return true;
  if (/"[^"]{2,}"|“[^”]+”/.test(s)) return true;
  for (const fragment of s.split(/[.!?;:]/)) {
    const tokens = fragment.trim().split(/\s+/).filter(Boolean);
    if (tokens.slice(1).some((t) => /^[A-Z]/.test(t))) return true;
  }
  return false;
}

function hasEnoughConcrete(answers: string[]): boolean {
  if (answers.length < 2) return false;
  return answers.filter(isConcrete).length >= answers.length - 1;
}

function scoreAnswers(list: string[]): number {
  return (hasEnoughConcrete(list) ? 100 : 0) + list.filter(isConcrete).length * 10 + list.length;
}

function pickBetterAnswers(first: string[], retry: string[]): string[] {
  return scoreAnswers(retry) > scoreAnswers(first) ? retry : first;
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
  scenarioPack?: ScenarioPack | null;
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
  scenarioPack,
  retryHint,
}: BuildUserMessageInput): string {
  const lines = [
    `The report: ${name || "the employee"}, ${seniority || ""} ${role || ""}`.trim(),
    `Meeting type: ${meetingType || "1:1"}`,
    `Your private situation notes: ${notes && notes.trim() ? notes.trim() : "(none)"}`,
  ];
  if (scenarioPack) {
    lines.push(``, formatScenarioPack(scenarioPack));
  }
  lines.push(
    ``,
    `Conversation so far:`,
    recentTranscript(transcript),
    ``,
    `You just asked:`,
    `"${question}"`,
  );
  if (questionLabel && questionLabel !== question) {
    lines.push(`Question label: ${questionLabel}`);
  }
  if (questionDescription && questionDescription.trim()) {
    lines.push(`Context: ${questionDescription.trim()}`);
  }
  lines.push(
    ``,
    `Draft the 3 notes — one per job: incident, guarded, off-script (6-22 words each, one line, third person about the report). Return the JSON now.`
  );
  if (scenarioPack) {
    lines.push(`Ground every note in the report's world above — reuse its names; don't invent new projects or people.`);
  }
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
    scenarioPack,
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
    scenarioPack,
  };

  const answers = await callOnce(buildUserMessage(base), { model });
  if (answers.length >= 2 && hasEnoughConcrete(answers)) return answers.slice(0, 3);

  const retryHint =
    answers.length < 2
      ? "Your last output was too long, too short, used banned openers, or slipped into the report's first-person voice. Each note must be ONE line, 6-22 words, in THIRD PERSON as a manager's shorthand about the report (never I/my/me), capturing what they said."
      : "Your last notes were too vague. Rewrite them: all but the GUARDED one must name a specific — a project, a person, a number, or a quoted phrase — and none may use the fog words friction, alignment, bandwidth, dynamics.";
  const retry = await callOnce(buildUserMessage({ ...base, retryHint }), { model });

  return pickBetterAnswers(answers, retry).slice(0, 3);
}

export {
  suggestAnswers,
  sanitizeAnswer,
  filterAnswers,
  referencesFirstPerson,
  wordCount,
  isConcrete,
  hasEnoughConcrete,
  pickBetterAnswers,
  buildUserMessage,
  MIN_WORDS,
  MAX_WORDS,
  TARGET_MIN,
  TARGET_MAX,
};
