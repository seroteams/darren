# Detail: member persona + auth/onboarding/content pages

Full agent findings, 2026-07-22. Evidence cited as file:line.

**Headline:** the auth system is split in two. LOGIN, FORGOT, RESET and WELCOME share a polished split-screen brand shell (`.auth-split`, logo, photo). REGISTER and JOIN reference a CSS class `auth-card` that is **defined nowhere** (grep finds it only in admin/src/stages/register.js:14 and frontend/src/stages/join.js:14, never in CSS), so both render as plain unbranded in-app pages. The two most identity-forming moments (creating an account, accepting an invite) are the two that fall outside the brand shell.

## Verdicts

| Page | Verdict | Biggest familiarity break |
|---|---|---|
| WELCOME ("/") | HYBRID | Login demoted to a mid-page ghost button instead of the universal top-right link; random Pexels stock photo per visit teaches nothing and never looks the same twice |
| LOGIN | STANDARD | Blue-caps `.eyebrow` field labels (login.js:42,46); "Forgot password?" below the submit instead of on the password label row; three stacked footer link paragraphs |
| REGISTER | CUSTOM (by accident) | Undefined `auth-card` drops the whole brand shell: no logo, no photo, a costume change mid-signup; owner language ("You're the admin") with no signpost for invitees |
| FORGOT / RESET | STANDARD | Best in batch. Minor: no show/hide password toggle, no confirm field, no Resend button |
| JOIN ("/join/:token") | HYBRID | No brand mark at all on a member's first-ever Sero screen; inviter/org line is a dim sub-line instead of the hero; no "Already have an account?" path; loading state lives in the subtitle |
| MEMBER_HOME ("/home") | CUSTOM | One narrow 38rem column doing two jobs; timeline rows are inert and look dead (member-home.js:125-138); a parallel `mh-*` widget set (member-home.css:24-61) with its own inputs/buttons and multiple blue actions; raw number input for goal progress; grey-sentence empty states on the member's true first impression |
| RUN_DETAIL (member view) | STANDARD shell, wrong voice | Only member adaptation is the crumb label; rating and Answers copy presume a manager; in practice a member can never load a run (phantom stage) and the error loops them to a dead end |
| ABOUT | STANDARD | Member "what you see / what stays private" copy is exactly the transparency answer but buried behind a nav row; manager steps are dim paragraphs not a numbered list |
| FEEDBACK | STANDARD | "Thanks!" breaks house tone; inline style on the button |
| PRIVACY | STANDARD | Lone "← Back" below all content violates the Breadcrumb Rule; "Who can see it" is one dense paragraph, the single most important paragraph for the member persona |

## Flow findings

**Member journey (invite → JOIN → account → HOME → open a run):**
1. Brand continuity collapses at the first touch: branded email → anonymous form → narrow list page. Sero never visually introduces itself.
2. JOIN promises "Your 1:1 history is waiting", lands with no orientation beat; empty state is two grey sentences.
3. The journey has no final step: timeline rows are inert, RUN_DETAIL is whitelisted but unfulfillable (frontend/src/router.js:61-64 vs the owner-fenced API), so the transparency promise terminates at date + type with the explanation on a separate About page. The boundary is policy; the UI presents it as absence.
4. Wrong-door risk unguarded: WELCOME/REGISTER speak only to managers; nothing routes a lost invitee.

**Logged-out visitor (WELCOME → guest run or register):**
5. Guest lane is clean (rail correctly dropped). Register lane breaks costume mid-signup.
6. Privacy check from the front door costs a full scroll to return (back link below the fold).

**Cross-cutting for this batch:**
- One undefined CSS class (`auth-card`) accounts for the two worst pages; one shared auth shell applied to REGISTER and JOIN is the highest-leverage single fix.
- Blue-caps `.eyebrow` as form labels on every auth form is the most repeated familiarity breaker; the quiet `--slot` tier already exists.
- MEMBER_HOME's `mh-*` widget set is the clearest "fighting the system from inside": a parallel input/button system on the persona's only daily screen.
