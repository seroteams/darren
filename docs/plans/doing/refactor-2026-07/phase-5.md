# Phase 5 — screen scaffold helper + state typing

Goal: ~15 screens hand-roll the same shell + "Loading…" + error-card + retry wiring; customer screens mostly lack the standard skeleton loader. One helper, adopted everywhere; plus the drifted hand-written state.d.ts goes.

Work: new admin/src/ui/ scaffold helper built on createSkeleton (admin/src/ui/skeleton.js); adopt across admin-runs, admin-error-log, admin-feedback, admin-registered, admin-pulse, admin-ratings, admin-gate1, admin-guest-runs, admin-user-detail, runs, run-detail + frontend team, members, person-detail, guided.page — copy stays identical, customer screens gain proper skeletons. Convert admin/src/state.js → state.ts and delete state.d.ts (its StageName is already missing MEMBERS/TEST/GALLERY). One commit per screen batch; unmigrated screens keep the old idiom safely.

Verify: screenshots of skeleton/error/retry states on 3–4 representative screens in both apps (fixtures only); `npm test`; all typechecks; lint:copy proves zero copy drift.

QA: user-visible — closes on the screenshots. ✅ Pass: loading/error states look consistent (customer app now has real skeletons), copy unchanged. ❌ Fail: any screen's copy or layout changed.
