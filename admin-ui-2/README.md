# Admin UI 2 — tidiness experiment

The Sero admin screen rebuilt as a standalone app to see how small a modern SaaS
admin page can be. React + [Radix Themes](https://www.radix-ui.com/themes) (styled
out of the box — not shadcn), TypeScript strict, zero custom CSS files.

One screen: header with a one-line summary, four tabs (People, Guest runs,
Feedback, Errors), one quiet table each. Demo data in `src/admin-data.ts` is typed
to the real `/api/v1/admin/*` payload shapes, so going live means swapping that one
file for `shared/api.js` calls.

```bash
cd admin-ui-2
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc strict
npm run build
```

The one pure-logic helper (`src/time-ago.ts`) has a co-located `node:test` suite,
picked up by the repo-wide `npm test`.
