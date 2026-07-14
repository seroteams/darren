# Member walk — Sam Patel (free lane)

- **Role:** member (invited by manager Dana Reeves)
- **Env:** live — https://sero-obwq.onrender.com (build `c151ec4`, Jul 12 21:30)
- **Date:** 2026-07-12
- **Persona:** Sam Patel, a product designer whose manager just invited them to Sero.
- **Goal of this walk:** prove an invited member can accept, set a password, land in the right place, see the correct (empty) history, and be blocked from manager functions.
- **Account (for cleanup):** carl+testmember1@seroteams.com / SamTest123! · userId `c076d015-9ee0-4ff5-bed6-357ba8c723a2` · role member · same org as Dana

---

## Think-out-loud log
- Opened the join link **while still logged in as the manager** → it bounced to `/login`. So an already-authenticated session can't accept an invite. For the test that means: members must open their link in a fresh/logged-out browser (normal for a real person, but worth knowing).
- Logged the manager out (`POST /api/v1/auth/logout` → 200, `/auth/me` → 401), reopened the join link logged-out → the **join page rendered correctly**.
- Join page is genuinely good: "Join your team on Sero / **Dana Reeves at Northwind Test Co invited you** — your 1:1 history is waiting." Email **pre-filled and locked** (carl+testmember1@…), name pre-filled "Sam Patel", password field. Everything the invite carried tied through correctly.
- Honest expectation-setting up front: "you'll see your own check-in history — dates and meeting types, **always**." Sets the member's limited view as a feature, not a gap.
- Set a password, clicked **Join Northwind Test Co** → landed on `/home`. `auth/me` confirms `roles:["member"]`, correct org. 
- Member home: "Welcome to Sero / Your manager uses Sero to prepare your 1:1s. Here's your history. / YOUR 1:1S / **Nothing here yet.** When your manager preps a 1:1 with you, it shows up here — the date and meeting type, so you always know where things stand." Empty because no 1:1 has been run about Sam yet (that's the paid walk).
- Checked role fencing on live: member is **hard-blocked** from manager endpoints (real 403s), not just hidden UI.

---

## Step-by-step

| # | Step | Expected | What happened | Verdict |
|---|---|---|---|---|
| 1 | Open join link while logged-in as mgr | — | bounced to `/login` (auth'd can't accept) | ⚠️ note |
| 2 | Log out, reopen join link | join page | rendered: inviter + org + prefilled email/name | ✅ |
| 3 | Set password, Join | member account, login | created, `roles:["member"]`, correct org | ✅ |
| 4 | Post-join routing | member → /home | landed `/home` (MEMBER_HOME) | ✅ |
| 5 | Member history | empty, clear copy | "Nothing here yet…" clear empty state | ✅ (by design) |
| 6 | Role fencing (live) | 403 on manager APIs | team/people 403, sessions 403, runs/about-me 200 | ✅ |

---

## Bugs / breakages found
- None. The redirect at step 1 is correct behaviour, just worth documenting for the test instructions.

## Confusions (clarity, not bugs)
- **Member surface is a near-dead-end by design** — after joining, Sam can only view a list of dates+types. Before any 1:1 is run it's an empty screen. The copy softens it ("Nothing here yet…"), but a tester may still expect *something to do*. **Recommend:** sequence the human test so the manager runs a 1:1 about the member **before** the member logs in, so their first view has content — that's what makes the two roles tie together.

---

## "Would a real human get this?" — clarity verdict
Yes — for what it is. The join flow is one of the strongest screens in the product: clear inviter/org context, locked email, honest expectation-setting. The risk is not confusion but *thinness*: a member who logs in first sees an empty page. Fix by ordering (manager runs the 1:1 first).

## Overall verdict
- **Works end-to-end:** yes (free lane)
- **Human-ready:** yes — provided the human test sequences the manager's 1:1 before the member logs in. Tie-together check (member actually sees the run) is pending the paid walk.
