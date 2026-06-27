// Meeting-arcs logic: serialise types for the client, validate + save edits to the
// overlay, reset back to the code default. Never touches req/res or storage — all
// data access goes through the injected repo. validKey/validateArc are pure engine
// validators (no I/O), so they're called directly.

import { validKey, validateArc } from "../../../engine/arc-overlay.ts";
import { badRequest, notFound } from "../../middleware/http-error.ts";
import type { MeetingType } from "../../../engine/one-on-one-types/_shared/meeting-type.types.ts";
import type { ArcsRepo, DiffResult } from "./arcs.repo.ts";

interface SerializedPhase {
  id: string;
  label: string;
  intent: string;
  target_questions: number;
}
export interface SerializedArc {
  slug: string;
  label: string;
  edited: boolean;
  tone_register: string;
  anti_patterns: string[];
  arc: SerializedPhase[];
}

type SaveResult =
  | { ok: true; arc: SerializedArc }
  | { needsConfirm: true; warning: string; orphans: DiffResult };

export interface ArcsService {
  list(): { arcs: SerializedArc[] };
  save(slug: string, body: Record<string, unknown>): SaveResult;
  reset(slug: string): { ok: true; arc: SerializedArc };
}

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object";
}

// Coerce one incoming phase into the stored shape — trims strings and forces
// target_questions to a whole number so validateArc gets clean input.
function normalizePhase(p: unknown): unknown {
  if (!isObjectRecord(p)) return p;
  const n = Number(p.target_questions);
  return {
    id: typeof p.id === "string" ? p.id.trim() : p.id,
    label: typeof p.label === "string" ? p.label.trim() : p.label,
    intent: typeof p.intent === "string" ? p.intent.trim() : "",
    target_questions: Number.isFinite(n) ? Math.trunc(n) : p.target_questions,
  };
}

function warningText(diff: DiffResult): string {
  const ids = diff.removed_ids.length ? `"${diff.removed_ids.join('", "')}"` : "a phase";
  const parts: string[] = [];
  if (diff.intro) parts.push(`${diff.intro} intro`);
  if (diff.openers) parts.push(`${diff.openers} opener`);
  const breakdown = parts.length ? ` (${parts.join(", ")})` : "";
  return `Removing or renaming ${ids} would orphan ${diff.total} question${diff.total === 1 ? "" : "s"}${breakdown} — they'd no longer route to a phase. Save anyway?`;
}

export function createArcsService(repo: ArcsRepo): ArcsService {
  // The slim, client-facing shape of one arc (code default + overlay, merged).
  function serialize(t: MeetingType): SerializedArc {
    const a = repo.getArc(t.label);
    return {
      slug: t.slug,
      label: t.label,
      edited: repo.hasOverlay(t.slug),
      tone_register: a.tone_register || "",
      anti_patterns: Array.isArray(a.anti_patterns) ? a.anti_patterns : [],
      arc: (a.arc || []).map((s) => ({
        id: s.id,
        label: s.label || s.id,
        intent: s.intent || "",
        target_questions: Number.isInteger(s.target_questions) ? s.target_questions : 0,
      })),
    };
  }

  // getArc/serialize key off the Type; map a slug back to its full type object.
  function findType(slug: string): MeetingType | undefined {
    return repo.listTypes().find((t) => t.slug === slug);
  }

  function save(slug: string, body: Record<string, unknown>): SaveResult {
    if (!validKey(slug)) throw notFound("Unknown meeting type");

    // Confirm the slug is a real type and grab its current stage ids for the diff.
    let current;
    try {
      current = repo.getArc(slug);
    } catch {
      throw notFound("Unknown meeting type");
    }

    if (!Array.isArray(body.arc)) {
      throw badRequest("An arc (list of phases) is required.");
    }
    const arc = body.arc.map(normalizePhase);

    const { ok, errors } = validateArc(arc);
    if (!ok) throw badRequest(errors.join(" "));

    const currentStageIds = current.arc.map((s) => s.id);
    const diff = repo.diffStageIds(slug, arc, currentStageIds);

    // Risky save (a removed/renamed id has tagged questions): hold unless confirmed.
    if (diff.total > 0 && !body.confirm) {
      return { needsConfirm: true, warning: warningText(diff), orphans: diff };
    }

    repo.writeOverlay(slug, {
      arc,
      tone_register: typeof body.tone_register === "string" ? body.tone_register : undefined,
      anti_patterns: Array.isArray(body.anti_patterns)
        ? body.anti_patterns.map((s) => String(s).trim()).filter(Boolean)
        : undefined,
    });

    const t = findType(slug);
    if (!t) throw notFound("Unknown meeting type");
    return { ok: true, arc: serialize(t) };
  }

  function reset(slug: string): { ok: true; arc: SerializedArc } {
    if (!validKey(slug)) throw notFound("Unknown meeting type");
    const t = findType(slug);
    if (!t) throw notFound("Unknown meeting type");
    repo.removeOverlay(slug);
    return { ok: true, arc: serialize(t) };
  }

  return {
    list: () => ({ arcs: repo.listTypes().map(serialize) }),
    save,
    reset,
  };
}
