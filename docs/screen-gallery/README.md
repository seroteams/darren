# Screen gallery (static snapshots)

A folder of self-contained HTML snapshots — one per screen — that you open **directly from
disk** (double-click `index.html`, no server, no login). Each page is the real screen rendered
with sample data, under a soft-yellow strip carrying the screen name, its source file, a
**Copy design prompt** button, and the generation date.

## Open it
Double-click `index.html`. (These `.html` files are git-ignored build artifacts — if the folder
is empty after a fresh checkout, regenerate them, see below.)

## Refresh it (the sync ritual)
Snapshots are **pictures** — editing one does NOT change the real site. After any design work
lands on a real screen, resync the snapshots:

```
npm run dev                     # start the dev server (admin app on :3000)
node scripts/gallery-export.mjs # regenerate every snapshot from the live screens + fixtures
```

The date stamp on every page shows how fresh it is. To also capture the three customer-app
screens (Welcome, Join, Members), run `npm run dev:customer` too (server on :3002) before the export.

## The design loop
Open a snapshot → **Copy design prompt** → paste into a chat → the chat edits the REAL screen
code → the chat re-runs the export so the snapshots match again.

## Sample data
All data is baked-in and fictional (the "Northwind Studio" company — Sofia Berg's team). No real
customer data, no OpenAI calls, $0 to regenerate. Fixtures live in `scripts/gallery/fixtures/`.
