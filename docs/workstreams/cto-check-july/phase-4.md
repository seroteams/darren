# Phase 4 — The summary: faithful recap or padding?

**Part of:** [PLAN.md](PLAN.md) · **Status:** ⬜

## The question
Is the **summary** a faithful, useful recap of what the little info + 1:1 actually contained — or does it
inflate / invent to look complete?

## What I'll inspect
- The summary / closing output from the Phase 1 thin case + a few more (`final.json`, closer output).
- The logic: `closer.ts`, the evaluation stage, the `briefing.ts` summary fields.
- Judged on: **faithful** (nothing added beyond the run), **useful** (real value to manager / report), **honest on thin input** (short when there's little to say — the `THIN_INPUT_SUPPRESSION` / `EVIDENCE_ANCHOR` behaviour), **plain**.

## Deliverable → `findings-4.md`
- A real thin-run summary, quoted, judged for faithfulness + padding.
- Blunt verdict: **good summary on thin input — yes / not yet.**
- The **#1 weakness** + cheapest fix, and a one-paragraph wrap-up across all 3 outputs (brief · questions · summary).

## Not in this phase
- Building fixes. The moat / learning questions (parked).

## Done when
- [ ] `findings-4.md` quotes a real summary and judges padding honestly.
- [ ] Clear yes / not-yet verdict + #1 weakness + the 3-output wrap-up.
- [ ] Carl has read it and said go → close the plan.

## Test scenarios — for the product owner (Carl)
1. **Read the summary** — does it match what actually went in, or feel inflated?
2. **Padding check** — the report should flag any sentence that says more than the input supports.
3. **Honesty test** — blunt verdict; thin input → a short honest summary is a *pass*, not a fail.
4. **Close it** — green-light → whole plan moves to `docs/todo/done/cto-check-july/`.
