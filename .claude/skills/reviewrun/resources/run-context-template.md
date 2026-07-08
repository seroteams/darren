# Run context block — assembled by the skill, not pasted by Carl

Emit this block at the very top of phase 1, BEFORE the payload dump. Fill every field from the
run directory itself — `axis-state.json`, `transcript.json`, and the stage `inputs.json` files
carry all of it. Only ask Carl for a field if the run dir genuinely doesn't contain it.

```
## Run context
- **Report:** <employee name / alias>
- **Role:** <role title>
- **Seniority:** <junior / mid / senior / …>
- **Meeting type:** <bi-weekly check-in / performance / feels-off / …>
- **Session ID:** <run id>
- **Log folder:** <absolute path to the run dir>
- **Engine fingerprint:** <from axis-state.json, if present>
- **Reviewed:** <today's date>
```

Where the fields live:
- name / role / seniority / meeting type → `01-*/inputs.json` (focus-points stage inputs) or `axis-state.json`
- session id → the run-dir name
- engine fingerprint → `axis-state.json`

Carl used to paste this block by hand at the start of every review. He shouldn't have to —
if a field can't be found in the dir, say which one and why, don't silently omit it.
