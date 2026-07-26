# Welcome screen: the four open questions

Research only, 2026-07-26. Nothing here has been built. Stage is validation, so this is
material for a later decision, not a licence to start.

Sources for the committee session: `logs/committee/2026-07-26-welcome-screen-five-versions.html`.
Live screen: `admin/src/stages/start-welcome.ts`. Five-version prototype:
`admin/src/stages/tests/welcome-redesign.js`.

---

## 1. The broken walkthrough video (Error 153)

### What it is not

Three suspects were named. All three are cleared, by check rather than by opinion.

| Suspect | Check run (free) | Result |
|---|---|---|
| Embedding disabled on the video itself | `youtube.com/oembed?url=...Xve0NyKH7Co` returns 200 with a full embed payload; the embed page's own config carries `playableInEmbed: true` | Cleared. Embedding is allowed. |
| The `youtube-nocookie.com` host | `curl` of `youtube-nocookie.com/embed/Xve0NyKH7Co?start=49` returns 200 and the same `playableInEmbed: true` | Cleared. The privacy host is in fact the *recommended* host for this error. |
| CSP `frame-src` | Live headers on sero.team carry `frame-src https://www.youtube-nocookie.com`, exact host match | Cleared. A CSP block also produces a browser console violation and an empty frame, not YouTube's own branded error card. |

### What it actually is

Sero's own response header. Live headers on sero.team today:

```
referrer-policy: same-origin
```

YouTube's embedded player identifies the embedding site from the HTTP `Referer` on the
iframe request. `same-origin` strips that header on every cross-origin request, so the
player receives no identification and answers "Error 153 - video player configuration
error". This is a documented, reproduced failure mode, not a theory: Simon Willison hit
exactly the same header value (Django's `SecurityMiddleware` default is also
`Referrer-Policy: same-origin`) and traced it to the same cause. The University of
Michigan support note gives the same diagnosis and the same fix.

The header was added by the personal-data-security Phase 2 hardening
(`backend/api/middleware/security-headers.ts:43`), for good reasons. It is not wrong. It
just has this one side effect.

### Where the code stands right now

The repo already carries the correct element-level override, and so does the deployed
bundle:

- `admin/src/stages/start-welcome.ts:81` — `referrerpolicy="strict-origin-when-cross-origin"`
- Live build `b7e4f74`, chunk `/assets/start-core-CaDLkMDc.js`, verified by fetching it
  and reading the iframe string: the attribute is present in production.

An element-level `referrerpolicy` on an `<iframe>` overrides the document's
header-derived policy for that iframe's own request, so the request should carry
`Origin: https://sero.team`. That is also precisely the value YouTube's own oEmbed
snippet ships with (checked above: their generated iframe uses
`referrerpolicy="strict-origin-when-cross-origin"`).

Git history says this has already broken once and been repaired once:

| Commit | What it did |
|---|---|
| `4f53e3c9` | Original build. `strict-origin-when-cross-origin`. Worked. |
| `d3dcbc45` | "post-close review fixes (3 real defects)" changed it to `no-referrer`. **This is what broke it.** |
| `3f299d66` | Changed it back to `strict-origin-when-cross-origin`. |
| `9a2a4cfb` | Today's stage-ladder rebuild kept the good value. |

**So: the screenshot that raised this is almost certainly from the `d3dcbc45` window.**
I have not clicked play on the live screen to confirm the repair, because the welcome
only renders for a logged-in manager with zero runs and I did not create an account to
get there. Diagnosis is from headers, the live bundle and published reproductions. Call
it repaired-but-unwitnessed.

### Options

| | Fix | What it costs | Regression risk |
|---|---|---|---|
| **A ⭐** | Leave the code as it is; add a one-line comment plus a unit assertion in `start-welcome.test.ts` that pins the attribute to `strict-origin-when-cross-origin`, and one manual click-test on live to actually witness it | ~20 minutes | Lowest. The test is what stops a fourth hardening pass silently killing it again. There is currently no test guarding this string, which is exactly why `d3dcbc45` got through review. |
| B | Change the site header to `Referrer-Policy: strict-origin-when-cross-origin` and drop the per-iframe attribute | ~10 minutes | Weakens the global privacy posture for the whole app to fix one iframe. Undoes a deliberate security decision for a cosmetic gain. |
| C | Drop YouTube; self-host the walkthrough as an `<video>` file on sero.team | Half a day plus hosting bandwidth | No third-party frame at all, so `frame-src` could close entirely. Overkill while the video is one text link on the new screen. |

**Recommend A.** The bug is already fixed in production; what is missing is the guard
that stops it coming back, and the one click that proves it. B trades a real security
control for something already solved. Note that on the new stage-ladder screen the video
is a text link, not a black rectangle, so the blast radius of it breaking again is now
small — which is an argument for the cheap fix, not the expensive one.

Sources:
- [Simon Willison, "Error 153 Video player configuration error on YouTube embeds"](https://til.simonwillison.net/youtube/fixing-153-embed)
- [Simon Willison, "YouTube embeds fail with a 153 error"](https://simonwillison.net/2025/Dec/1/youtube-embed-153-error/)
- [University of Michigan ITS, "Fixing YouTube Player Error 153 with Referrer Policy Settings"](https://teamdynamix.umich.edu/TDClient/30/Portal/KB/Article/14491/Fixing-YouTube-Player-Error-153-with-Referrer-Policy-Settings)

---

## 2. The empty Kate Jackson seat

The problem stated plainly: every signal Sero has is from people who already know what
Sero is. A first-visit screen can only be judged by someone who has never seen it, and
Kate has only ever seen the app as an existing user. Her seat is not empty because she
is unavailable; it is empty because she is no longer the right sample.

### What the numbers say about sample size

For a **preference / first-impression** read (which of these five explains the product),
5 to 8 participants is the standard band for spotting the dominant pattern, and 15 to 20
if you want a number you would quote rather than a direction you would follow. The
familiar "5 users" rule is a *usability-defect* rule, not a preference rule: 5 people
find most of the broken things, but 5 people cannot tell you which of five versions
wins. Do not report percentages off 5 people.

### Options

| | Method | Who | Cost | Sample it buys | What it can honestly answer |
|---|---|---|---|---|---|
| **A ⭐** | Unmoderated 5-second test on the two strongest versions only, via a panel tool (Lyssna / Maze / UserTesting), screened to "manages at least one direct report" | Strangers, screened | ~£150 to £400 for 15 to 20 people at the specialised-profile incentive rate (£30 to £80 each is the 2026 band for manager-level screens) | 15 to 20 | "After five seconds, what does this product do, and who is it for?" That is the actual failure the redesign was built to fix. |
| B | Five moderated 20-minute calls with managers from Carl's own network who have never seen Sero | Warm strangers | Time only, no cash | 5 | Why a version fails, not which wins. Richer, slower, unquotable as a number. |
| C | Full comparative test of all five versions | Strangers, screened | ~£1,000 to £2,500 (the 2026 unmoderated-study band is £1k to £5k) | 20+ | Which of five wins. Almost certainly not worth it at validation stage: three of the five are already ruled out by the committee. |
| D | Ship the chosen version and read behaviour: percentage of new accounts that start a first prep within 24 hours | Real users | Free | Whatever signup gives | The only question that actually matters, but it needs traffic Sero does not yet have, and it cannot tell you *why*. |

**Recommend A, sized at 15, and only after the field is cut to two versions.** It is the
cheapest thing that produces a number rather than an anecdote, it screens for the actual
buyer, and at 15 people you can defend a direction without pretending to significance.
B is a good free supplement if Carl has five such managers to hand; do B first if the
budget answer is "nothing".

The thing to *not* do is ask any existing user, including Kate, what a new user would
think. That is the seat that is empty, and no amount of asking Kate fills it.

Sources:
- [Maze, "User Testing: How Many User Testers Do You Need per Method?"](https://maze.co/blog/user-testing-how-many-users/)
- [Lyssna, "Five-second testing guide"](https://www.lyssna.com/guides/five-second-testing/)
- [CleverX, "User Research Cost in 2026"](https://cleverx.com/guides/user-research-cost-in-2026-pricing-by-method-approach-and-industry/)
- [NN/G, "Remote Usability-Testing Costs: Moderated vs. Unmoderated"](https://www.nngroup.com/articles/remote-usability-testing-costs/)

---

## 3. Does a stepped explainer help or hurt activation

Seibel's challenge was: does teaching before the first action raise or lower the odds of
finishing a first prep. The published evidence is unusually one-directional on this, and
it does not flatter the explainer.

**The core finding.** NN/G ran a quantitative usability test with 70 users across four
mobile apps using "deck of cards" tutorials. Users who *read* the tutorial rated ease of
use at **4.92**; users who *skipped* it rated it **5.49**. Reading the explanation made
the product feel harder. NN/G's stated conclusion is to skip onboarding where possible,
because instructional overlays shift perception and make an app seem more complicated
than it is. Their separate finding on progressive disclosure is that front-loaded
tutorials did not improve task performance at all.

**The counter-finding, and it is a real one.** The same body of work is positive about
guidance that arrives *at the moment of need* rather than before the first action:
interactive, in-context guidance beats passive up-front tutorials substantially, and
learn-by-doing retains far better than read-then-do. The pattern that fails is not
"explaining"; it is "explaining first, in a block, before the user is allowed to act".

**Applied to the five versions:**

- **Four-step block above or below the button.** Below. Every finding above points the
  same way: the action must not be gated by the explanation. The current live build
  already does this (`start-welcome.ts` puts `.start-welcome__action` inside the header,
  with `How it works` in the section beneath), which matches both Seibel's committee note
  and the research. No change needed. This is the one question here that is already
  answered correctly on disk.
- **E's click-through stepper.** The evidence says it lowers the odds of finishing a
  first prep. A stepper is the deck-of-cards pattern in a different coat: it makes
  reading a sequence the price of reaching the button, and it is exactly the format that
  scored *worse* on perceived ease. It also converts a scannable four-line list into four
  interactions, which for an ADHD-relevant audience is strictly more friction for the
  same information.
- **The honest caveat.** All of this evidence is from consumer mobile apps with low
  intent. Sero's first-visit manager has arrived deliberately, at work, to solve a named
  problem, and is being asked to type notes rather than tap around. High-intent B2B
  first-runs are the one context where an explainer genuinely can help, because the user
  is trying to work out whether to trust the thing before they hand it real notes about a
  real person. That is a legitimate reason for the four steps to exist at all. It is not
  a reason to put them above the button, and it is not a reason to make them a stepper.

**Recommendation: keep the current order (action, then steps, then proof). Do not build
E's stepper.** If Carl wants to test the question rather than settle it by citation, the
version-A-versus-version-E pair is exactly the two-version cut that item 2's test above
is sized for.

Sources:
- [NN/G, "Mobile Tutorials: Wasted Effort or Efficiency Boost?"](https://www.nngroup.com/articles/mobile-tutorials/)
- [NN/G, "Onboarding Tutorials vs. Contextual Help"](https://www.nngroup.com/articles/onboarding-tutorials/)
- [NN/G, "Onboarding: Skip it When Possible"](https://www.nngroup.com/videos/onboarding-skip-it-when-possible/)
- [NN/G, "Mobile-App Onboarding: An Analysis of Components and Techniques"](https://www.nngroup.com/articles/mobile-app-onboarding/)

---

## 4. Are the four manager pain lines defensible

Rogelberg's seat asked whether these are reported behaviour or invented despair. Checked
one at a time against what is actually published. Verdicts are about *evidence*, not
about whether the line is good copy.

| Line | What the research supports | Verdict |
|---|---|---|
| "It is in ten minutes and I have not thought about it" | Strong on the general claim, weak on the specific number. Rogelberg's central finding is that roughly **half of 1:1s are not rated as optimal by direct reports**, and that essentially **no organisation trains managers on how to run them**. Agenda data is broad-meeting, not 1:1: around 63% of meetings run with no set agenda. Nothing published measures "ten minutes before". | **Defensible as experience, not as statistic.** Keep it as a first-person quote. Never attach a number to it. |
| "Same three questions, same 'yeah, all good'" | Directly on Rogelberg's territory: his explicit advice is to **avoid the 1:1 becoming a status update**, and his strongest success predictor is the direct report doing **50 to 90% of the talking**. A meeting where the report answers three stock questions is the failure mode he names. The specific ritual of "yeah, all good" is not itself measured. | **Best supported of the four.** The mechanism it describes is exactly what the literature identifies as the failure. |
| "I know something is off. I cannot name it" | **This one overclaims, and it overclaims in the wrong direction.** The published finding is not that managers sense a problem they cannot articulate. It is that managers **miss the signals entirely** until the resignation lands. Less than half of managers worldwide report having had any management training. The line grants the manager an intuition the research says they mostly do not have. | ⚠️ **Flag.** It is invented interior monologue, and it is flattering rather than accurate. It also happens to be the most emotionally resonant of the four, which is why it survived. Rewrite toward what is documented: the thing the manager did not see, not the thing they sensed. |
| "Whatever we agreed last time has evaporated" | Plausible and consistent with the follow-through advice in Rogelberg's HBR work, but I found **no published measurement** of agreements decaying between 1:1s. It is the weakest-evidenced of the four after line three, though unlike line three it does not contradict anything. | **Thin but not wrong.** Safe to keep as lived experience. Do not present it as a finding. |

### The one structural point

These lines currently work as first-person quotes, and as quotes they are honest: they
claim to be a manager's voice, not a research result. That framing is what keeps three
of the four safe. The moment any of them acquires a percentage or a "research shows",
three of the four become unsupportable. Line three is the exception and is already over
the line, because it asserts a specific mental state that the evidence contradicts.

### Options for line three

| | Fix | Why |
|---|---|---|
| **A ⭐** | Rewrite toward the documented failure, e.g. something in the shape of "I found out they were unhappy when they resigned" | Matches the research (managers miss it), keeps the emotional weight, and is a thing managers genuinely report. |
| B | Keep it, on the grounds that it is a quote and not a claim | Defensible, and Rogelberg's seat may accept it. But it is the one line that asserts something the evidence actively contradicts, which is a poor place for the product's opening argument to sit. |
| C | Cut it and run three lines | Cheapest. Costs the screen its strongest emotional beat. |

**Recommend A.** It is a copy change, not a build, and it moves the weakest line onto
the firmest evidence in the whole set.

Sources:
- [Rogelberg, "Make the Most of Your One-on-One Meetings", HBR Nov-Dec 2022](https://hbr.org/2022/11/make-the-most-of-your-one-on-one-meetings)
- [Flinchum, Kreamer, Rogelberg & Gooty, "One-on-one meetings between managers and direct reports: A new opportunity for meeting science" (2023)](https://journals.sagepub.com/doi/abs/10.1177/20413866221097570)
- [CNBC, "Many bosses do 1-on-1 meetings completely wrong, management expert says"](https://www.cnbc.com/2025/12/08/many-bosses-do-1-on-1-meetings-completely-wrong-management-expert-says.html)
- [Rogelberg, "Glad We Met: The Art and Science of 1:1 Meetings"](https://www.stevenrogelberg.com/11-meetings-1)

---

## What this adds up to

Nothing here needs building this week. Ranked by value per hour:

1. **Pin the referrerpolicy with a test** (item 1, option A). Twenty minutes, and it is
   the only thing on this list that stops a bug returning for a third time.
2. **Rewrite pain line three** (item 4, option A). A copy change.
3. **Do not build E's stepper** (item 3). A decision to not do work.
4. **The 15-person first-impression test** (item 2, option A) is the only item that costs
   money, and it should wait until the field is cut to two versions.
