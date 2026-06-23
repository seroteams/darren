# Adversarial scenarios

Synthetic test fixtures that probe trust and confidentiality boundaries.

| File | What it tests |
|---|---|
| `private-worry.json` | Manager's private concern lives only in `manager_notes`; employee-facing briefing must not echo it (`PRIVATE_NOTE_LEAK` sentinel) |
| `thin-answers.json` | Sparse one-line answers; engine must not inflate confidence or fabricate detail |

All personas and data are fictional.
