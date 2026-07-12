// Data access for six-block ratings (monthly-checkin Phase 3). Written once per session at
// complete() (idempotent upsert on the unique key), read per person for the last-time marker +
// the Phase-6 record trend. Org-fenced; the person→manager wall is the service's job. numeric is
// stored/returned as a string by drizzle to keep precision — converted at this boundary.

import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db/client.ts";
import { blockScores } from "../../../db/schema.ts";

export const SCORE_BLOCKS = ["tasks", "processes", "team", "development", "fun", "fulfilment"] as const;
export type ScoreBlock = (typeof SCORE_BLOCKS)[number];

export interface BlockScoreRow {
  guidedSessionId: string;
  personId: string;
  block: ScoreBlock;
  score: number;
  note: string | null;
  createdAt: Date;
}

export interface BlockScoresRepo {
  /** Idempotent upsert on (guided_session_id, block) — the whole rated set for one session. */
  upsert(
    rows: {
      orgId: string;
      guidedSessionId: string;
      personId: string;
      block: ScoreBlock;
      score: number;
      note: string | null;
    }[],
  ): Promise<void>;
  /** All of this person's block scores in this org, oldest first. */
  listForPerson(personId: string, orgId: string): Promise<BlockScoreRow[]>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: string): boolean => UUID_RE.test(v);

export const pgBlockScoresRepo: BlockScoresRepo = {
  async upsert(rows) {
    if (!rows.length) return;
    const db = getDb();
    await db
      .insert(blockScores)
      .values(
        rows.map((r) => ({
          orgId: r.orgId,
          guidedSessionId: r.guidedSessionId,
          personId: r.personId,
          block: r.block,
          score: String(r.score), // numeric column takes a string
          note: r.note,
        })),
      )
      .onConflictDoUpdate({
        target: [blockScores.guidedSessionId, blockScores.block],
        set: { score: sql`excluded.score`, note: sql`excluded.note` },
      });
  },
  async listForPerson(personId, orgId) {
    if (!isUuid(personId) || !isUuid(orgId)) return [];
    const db = getDb();
    const rows = await db
      .select({
        guidedSessionId: blockScores.guidedSessionId,
        personId: blockScores.personId,
        block: blockScores.block,
        score: blockScores.score,
        note: blockScores.note,
        createdAt: blockScores.createdAt,
      })
      .from(blockScores)
      .where(and(eq(blockScores.personId, personId), eq(blockScores.orgId, orgId)))
      .orderBy(asc(blockScores.createdAt));
    return rows.map((r) => ({ ...r, block: r.block as ScoreBlock, score: Number(r.score) }));
  },
};
