# Phase 001 · Step 01 — Add the "my runs" API client call

## 1. Goal (plain)
Give the front-end one small function it can call to fetch **the logged-in manager's own**
finished 1:1s. The backend already serves them at `GET /api/v1/runs/mine`; nothing on the
page can reach it yet because there's no client function for it.

## 2. What you'll have when it's done
- A new `listMyRuns()` function in [shared/api.js](../../../shared/api.js), sitting beside the
  existing run calls (`listRecentRuns`, `getFinishedRuns`).
- It calls `GET /api/v1/runs/mine` and returns the parsed JSON `{ runs: [...] }`.
- Nothing visually changes yet — this is the plumbing the next step wires the page to.

## 3. A grounding example (before → after)
- **Before:** the page has no way to ask "what are *my* runs?" — only the admin-only
  whole-company calls exist.
- **After:** `const { runs } = await listMyRuns();` returns this manager's own list, e.g.
  `[{ id, headline, ctx: { name, role, seniority, meetingType }, lastSeenAt }]`.

## 4. The technical detail
In [shared/api.js](../../../shared/api.js), add next to `getFinishedRuns` (~line 148):

```js
// The logged-in member's OWN finished 1:1s (member-nav). Fenced server-side by
// company AND user, so a member only ever gets their own — never a colleague's or
// the admin's whole-company list. Shape: { runs: [{ id, headline, ctx, lastSeenAt }] }.
export async function listMyRuns() {
  return json(await fetch("/api/v1/runs/mine"));
}
```

- Reuse the existing `json(...)` helper (same pattern as every other call in the file) — it
  already throws on a non-OK response, which the page's error state will catch.
- No new endpoint, no backend change. The route + fence already exist
  ([server.ts:257](../../../backend/api/server.ts), `runs.mine` →
  `service.myFinished` → `listFinishedRunsForMember`, fenced by `orgId` **and** `userId`).

## 5. How to check it worked
- `npm run typecheck` stays clean (the file is JS but is type-checked in the project).
- `npm test` stays green (nothing behavioural changed; the backend fence is already tested
  in `runs.service.test.ts`).
- Eyeball: the new function reads like its neighbours (same `json(await fetch(...))` shape).
