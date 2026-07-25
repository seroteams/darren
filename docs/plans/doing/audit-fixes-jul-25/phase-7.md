# Phase 7 — Member view, motion, and the small sweep

**Part of:** [plan.md](plan.md) · **Status:** ⬜

## Goal
The member's one screen stops feeling half-built, the app acknowledges when something is happening, and the eleven small untidy things go.

## Changes

**Member home says what it is (F10)**
Copy only, no new capability. Today the nav item says "Your 1:1s", the page says "Home", and it lists exactly one. And an orphaned grey line says "Only the date and 1:1 type are recorded here." Make the nav label and the page agree, and turn that orphan line into a proper, warm explanation of why a member sees the date and the type and not the notes. The no-inference ruling is not being changed here; it is being explained.

**Three motion wins (F12)**
Measured across 256 page loads: 3 pages had a running animation, the average page had 33 elements with a transition and almost all were hover colours. No page transition, no stagger, no visible loading.
- a 120ms cross-fade when the stage changes
- a 40ms-per-row stagger when a list mounts
- the shared skeleton (`admin/src/ui/skeleton.js`) actually visible on a first fetch, with a minimum display time so it does not flash
Respect `prefers-reduced-motion` on all three.

**The eleven small things**
- Front door: "Try it free. No account needed" is a real button styled as a divider label. Make it look tappable.
- Live pulse: the "Runs per day" chart renders an empty flat line with no message while the card beside it has a written empty state. Give it one.
- Live pulse: six metric cards in a five-wide grid, so "Errors" sits alone. Fix the grid.
- Person page: the meta line wraps and leaves a dangling "·" ("Content Designer · 1 1:1 ·"). And "1 1:1" is hard to read.
- Person page: the Clarity and Growth bars show "-5" in red with no scale, legend or tooltip. Say what the number is out of.
- Run detail: the meeting type appears twice in the header, once as blue text that looks like a link but is not.
- The 1:1 wizard: a guest sees "Focus areas, Prep brief, During the meeting"; a manager sees "Focus, Prep, Meeting". Pick one vocabulary.
- Compare runs: the nav highlights "Test engine" while the page says "Compare runs", and it marks its parent with an eyebrow where the Pulse sub-pages use a breadcrumb. Pick one pattern.
- Collapsed nav: icon-only with no tooltips. The aria-labels are there, so this is for sighted users only.
- Logged out: every page logs a red 401 on `/api/v1/auth/me`. Treat a logged-out 401 as a normal state, not an error.
- Screen gallery: a second yellow chrome bar above the app shell, and the one screen with no h1.

## Not in this phase
- A real member history screen. Parked: Carl chose the reframe, and it needs a ruling on what a member may see first.
- The empty right third of the list pages. Parked with the same decision.

## Done when
- [ ] The member's nav label and page heading match, and the explanation reads as a sentence a person would write
- [ ] Each of the three motion changes is verified by reading computed styles, not by watching (screenshots time out on running animations)
- [ ] The skeleton is proven visible with the network throttled, captured
- [ ] `prefers-reduced-motion: reduce` turns all three off, verified
- [ ] All eleven small items ticked off individually in this file
- [ ] The logged-out console is clean: zero red lines on a fresh visit
- [ ] Product owner has tested the scenarios below and said go

## Test scenarios — for the product owner
Walk through these yourself. Next phase waits for your green light.

1. **The member's screen makes sense** — `local > customer (audit.member) > Home`. The nav item and the heading should say the same thing, and you should be able to read why only the date and type are shown. ❌ Not OK if it still says "Home" under a nav item called "Your 1:1s".
2. **Things move now** — `local > customer (audit.manager) > Past 1:1s`, then click into a 1:1 and back out. There should be a short fade rather than a hard cut, and the list rows should arrive in quick sequence.
3. **You can see it loading** — hard-refresh Team. You should catch the grey placeholder cards for a moment. ❌ Not OK if you get a white flash and then content.
4. **Front door button looks like a button** — `local > customer (logged out) > /`. "Try it free. No account needed" should look tappable.
5. **Pulse has no odd gaps** — `local > admin > Pulse`. The metric cards should fill their rows, and the empty chart should say something rather than showing a bare line.
6. **The person page reads cleanly** — `local > customer (audit.manager) > Team > Nina Petrova`. No dangling "·" at the end of a line, and the Clarity and Growth numbers should say what they are out of.
7. **The wizard uses one vocabulary** — start a 1:1 signed in, note the step names. Then log out and start a guest run. Same names. ❌ Not OK if one says "Prep" and the other "Prep brief".
8. **Quiet console** — `local > customer (logged out) > /`, open the browser console. No red lines. ❌ Not OK if you still see a 401.
