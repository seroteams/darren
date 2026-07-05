// Persona-run job state + guard rails: start a scripted full-engine run for one
// persona and report how it's going. One job at a time — the single active slot
// is the cost backstop (every run spends real OpenAI money). The runner itself
// is an injected boundary, so this file never touches the engine or the network.

import { badRequest, notFound, conflict } from "../../middleware/http-error.ts";

export type JobStatus = "idle" | "running" | "done" | "failed";

export interface RunnerProgress {
  stageLabel?: string;
  turn?: number;
  total?: number;
}

export interface RunnerHooks {
  onSession(sessionId: string): void;
  onProgress(p: RunnerProgress): void;
}

/** The injected engine boundary — drives one full scripted run to completion. */
export type PersonaRunner = (
  input: { personaId: string; orgId: string | null },
  hooks: RunnerHooks
) => Promise<{ sessionId: string | null; costUsd: number | null }>;

export interface PersonaRunsDeps {
  loadPersona: (id: string | null | undefined) => { id: string; script: readonly unknown[] } | null;
  hasApiKey: () => boolean;
  runner: PersonaRunner;
  now?: () => number;
}

export interface PersonaRunJob {
  status: JobStatus;
  personaId: string | null;
  sessionId: string | null;
  stageLabel: string | null;
  turn: number | null;
  total: number | null;
  startedAt: number | null;
  finishedAt: number | null;
  error: string | null;
  costUsd: number | null;
}

export interface PersonaRunsService {
  start(personaId: unknown, orgId: string | null): Promise<{ personaId: string }>;
  current(): PersonaRunJob;
}

const IDLE: PersonaRunJob = {
  status: "idle",
  personaId: null,
  sessionId: null,
  stageLabel: null,
  turn: null,
  total: null,
  startedAt: null,
  finishedAt: null,
  error: null,
  costUsd: null,
};

export function createPersonaRunsService(deps: PersonaRunsDeps): PersonaRunsService {
  const now = deps.now ?? Date.now;
  let job: PersonaRunJob = { ...IDLE };

  return {
    // async so validation errors reject (controllers await), even though the run
    // itself is deliberately NOT awaited — the caller polls current() instead.
    start: async (rawPersonaId, orgId) => {
      const personaId = typeof rawPersonaId === "string" ? rawPersonaId : "";
      if (!personaId) throw badRequest("personaId required");
      if (job.status === "running") {
        throw conflict("a run is already going — wait for it to finish");
      }
      const persona = deps.loadPersona(personaId);
      if (!persona) throw notFound("no persona with that id");
      if (!persona.script.length) throw badRequest("this persona has no scripted answers");
      if (!deps.hasApiKey()) {
        throw conflict("OPENAI_API_KEY is not set — the engine can't run");
      }

      job = { ...IDLE, status: "running", personaId, stageLabel: "Starting", startedAt: now() };
      const started = job; // guard: only this run may write its own job slot

      const hooks: RunnerHooks = {
        onSession: (sessionId) => {
          if (job === started) job.sessionId = sessionId;
        },
        onProgress: (p) => {
          if (job !== started) return;
          if (p.stageLabel !== undefined) job.stageLabel = p.stageLabel;
          if (p.turn !== undefined) job.turn = p.turn;
          if (p.total !== undefined) job.total = p.total;
        },
      };

      deps
        .runner({ personaId, orgId }, hooks)
        .then((r) => {
          if (job !== started) return;
          job.status = "done";
          job.sessionId = r.sessionId ?? job.sessionId;
          job.costUsd = r.costUsd;
          job.finishedAt = now();
        })
        .catch((e: unknown) => {
          if (job !== started) return;
          job.status = "failed";
          job.error = e instanceof Error ? e.message : String(e);
          job.finishedAt = now();
        });

      return { personaId };
    },

    current: () => ({ ...job }),
  };
}
