> **Trend ledger for `/reviewrun`** — one row per run reviewed, appended by the reviewrun skill (step 11).
> Powers the direction arrows (↑ / → / ↓) in each review's **Understood / Filtered / Shown** scorecard.
> The skill reads the **last row** to compute arrows, then appends the new run's row. It never rewrites prior rows.
>
> Marks: ✅ solid · ⚠️ watch · 🔴 broken.  Engine = short fingerprint (`promptVersion/modelConfigVersion`).
> Spec: [`reviewrun-output-spec.md`](reviewrun-output-spec.md).

# Prompt-review ledger

| date | run-id | engine | 🟦 U | 🟨 F | 🟩 S | note |
|------|--------|--------|------|------|------|------|
