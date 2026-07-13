// The saved draft shape (monthly-one-on-one Phase 1). Every stage writes under its own
// key; all reads are DEFENSIVE (missing key ⇒ empty stage) so a session created under one
// arc still opens if the arc later changes. `v` is the schema version — a shape change
// bumps it and back-fills. This is exactly what the guided_sessions.state jsonb holds.

export interface GuidedDraft {
  v: number;
  catchup?: { notes?: string; outcomes?: Record<string, string> };
  requests?: { notes?: string };
  rating?: { scores?: Record<string, number>; notes?: Record<string, string> };
  feedback?: { fbStep?: number; less?: string; more?: string; learn?: string };
  goals?: { notes?: string };
  summary?: { text?: string };
  wrapup?: { engagement?: number | null; privateNotes?: string };
}

/** The session as the API returns it (guided-sessions.service GuidedSessionView). */
export interface GuidedSession {
  id: string;
  personId: string;
  personName: string;
  stage: string;
  state: GuidedDraft;
  engagement: number | null;
  completedAt: string | null;
}

/** A persistent tracker item (promise/request/goal) — the trackers API shape (Phase 2). */
export interface TrackerHistoryEvent {
  at: string;
  text: string;
}
export interface TrackerView {
  id: string;
  kind: string;
  text: string;
  owner: string | null;
  category: string | null;
  status: string;
  progress: number | null;
  history: TrackerHistoryEvent[];
  createdSessionId: string | null;
}
export interface GroupedTrackers {
  promises: TrackerView[];
  requests: TrackerView[];
  goals: TrackerView[];
}
export function emptyTrackers(): GroupedTrackers {
  return { promises: [], requests: [], goals: [] };
}

/** One stage's rendered content. */
export interface StageView {
  title: string;
  sub: string;
  body: string;
}

export function emptyDraft(): GuidedDraft {
  return { v: 1 };
}
