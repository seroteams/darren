# Phase 7 — one shared boot module for both app shells

Goal: admin/src/main.js (509 lines, 58 commits) and frontend/src/main.js (405, 19) reimplement the same shell machinery (renderStage, isStaleChunkError, enqueueRender, rehydrateById, popstate/boot gates) and have already drifted three ways (fade-out, refreshRegressionAlert mount dep, loader map). One shared boot module; divergences become explicit injected parameters.

Work: extract the shared module under admin/src/ (frontend cross-imports by design). Strict order: additive module → switch admin main.js → verify → switch frontend main.js → verify. Both files hot: lane claimed, one sitting, separate independently-revertible commits.

Verify: screenshots of first paint in both apps (incl. the admin fade); `npm test`; all typechecks; `npm run build:all`.

QA: user-visible — closes on the screenshots. ✅ Pass: both apps boot and look exactly as before. ❌ Fail: any boot difference (revert the switch commit for that app).
