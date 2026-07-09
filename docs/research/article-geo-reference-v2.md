# Can AI Detect Employee Disengagement From Manager Notes? What the Evidence Actually Shows

*By Carl Heaton — design leader (20 years), founder of Sero. Published July 2026. Every figure below is checked against the primary source.*

**Quick answer: No. There is no peer-reviewed evidence that AI can reliably infer employee disengagement, burnout, or flight risk from short, manager-written notes — and three independent lines of evidence say the problem is the data, not the models.** The psychological-detection literature is built on *self-authored* text; observer-written ratings mostly reflect the observer (idiosyncratic rater effects explain 62% and 53% of performance-rating variance across two datasets of 2,350 and 2,142 managers, versus ~21% for actual performance — Scullen, Mount & Goff, *Journal of Applied Psychology*, 2000); and at realistic base rates, even the best published burnout classifier would be wrong roughly three times out of four when it fires. What AI *can* do with integrity is track observable facts — rolled-over commitments, slipping cadence, broken follow-ups — and turn them into better human preparation. Inference versus evidence is the line to check before buying any AI management tool.

Here is the full evidence: the three failure modes, the verified numbers, the current legal position (which changed in June 2026), the market post-mortems, and a five-rule standard for evaluating tools.

---

## Why can't AI infer psychological states from manager notes?

Three independent problems compound, and any one alone is disqualifying.

**1. The detection science was trained on the wrong author.** The studies showing language can reveal burnout or distress analyse text written by the person experiencing it. BurnoutEnsemble — the strongest published burnout classifier (Merhbene, Nath, Puttick & Kurpicz-Briki, *Frontiers in Big Data*, 2022) — trained on 13,568 first-person Reddit posts describing the authors' own experiences. The healthcare-worker linguistic study most often cited in this space analysed employees' *own* survey comments and needed substantial text to find anything. Even the most celebrated linguistic marker in the entire field — first-person pronoun use predicting depression — carries a meta-analytic correlation of just **r = 0.13** (95% CI 0.10–0.16, across 21 studies and 3,758 participants; Edwards & Holtzman, *Journal of Research in Personality*, 2017). That is the headline act, in self-authored text. For inferring someone *else's* psychological state from a manager's two-sentence note, I could find no peer-reviewed validation at all. The absence is the finding.

**2. Manager notes measure the manager.** In the most comprehensive study of what workplace ratings actually contain, Scullen, Mount and Goff (2000) decomposed ratings of roughly 4,500 managers, each rated by seven people across two large datasets. Idiosyncratic rater effects — the rater's own personality, mood, calibration, and history with the person — explained **62% and 53%** of the variance. The ratee's actual performance explained about **21%**. Achenbach's meta-analysis of 269 samples (*Psychological Bulletin*, 1987) found self–observer agreement on internal states of just **r ≈ 0.22**, weakest exactly for internal, low-visibility states — which Vazire's self–other knowledge asymmetry model (*JPSP*, 2010) predicts: outside observers are structurally worst at judging mood, exhaustion, and motivation. An algorithm reading a manager's notes is, mathematically, mostly modelling the manager.

**3. Rare events guarantee false alarms.** In the BurnoutEnsemble dataset, burnout posts were 352 of 13,568 samples — a base rate of 2.6%. This is what real detection conditions look like, and low base rates produce the false-positive paradox. The best ensemble achieved recall of 0.93 with a test F1 of 0.43 — which mathematically implies **precision around 0.28**. Roughly three false alarms for every true one, on data far richer than any 1:1 tool will ever hold. Clinical prediction, the nearest deployed analogue, lives with 74–99% non-actionable alarm rates. A hospital absorbs a false alarm in a wasted minute. A 1:1 tool absorbs it as a manager walking into a meeting suspicious of a healthy employee — who feels the temperature change and never learns why.

That asymmetry is the core design fact: **a false negative preserves the status quo; a false positive manufactures suspicion about a person who was fine.**

## What do the verified numbers say?

| Finding | Figure | Source |
|---|---|---|
| Rating variance explained by the *rater's* idiosyncrasies | 62% and 53% (two datasets) | Scullen, Mount & Goff, *J. Applied Psychology* 85(6), 2000; n = 2,350 and 2,142 |
| Variance explained by the ratee's actual performance | ~21% | Same study |
| Self–observer agreement on internal states | r ≈ 0.22 | Achenbach, McConaughy & Howell, *Psychological Bulletin* 101, 1987; 269 samples |
| Strongest linguistic marker (pronouns → depression), self-authored text | r = 0.13 (95% CI 0.10–0.16) | Edwards & Holtzman, *J. Research in Personality* 68, 2017; k = 21, N = 3,758 |
| Best published burnout classifier: recall / F1 / implied precision | 0.93 / 0.43 / ~0.28 | Merhbene et al., *Frontiers in Big Data* 5, 2022 |
| Burnout base rate in that training corpus | 2.6% (352 of 13,568) | Same study |
| Team-engagement variance attributable to the manager | ~70% | Gallup, *State of the American Manager* |
| Feedback interventions that *worsened* performance | over one third | Kluger & DeNisi, *Psychological Bulletin* 119, 1996 |

## Doesn't the AI just neutralise manager bias?

No — it launders it. A randomised controlled trial by the UK's Behavioural Insights Team on 360-degree feedback for 4,328 senior managers (2021) found systematic gender differences in observer language — women received more hedged, less actionable developmental feedback — and machine learning could predict the subject's gender from linguistic patterns alone, even when the interface prompted reviewers to be objective. Medicine has measured what happens when biased observer text flows downstream: stigmatising language in patient records transmits negative attitudes to the next clinician and changes their prescribing decisions (Goddu et al., *Journal of General Internal Medicine*, 2018). A manager's prep note is a handoff. A model that mines it for "signals" doesn't strip the bias out — it converts the bias into a system output and returns it wearing the authority of software.

## Is inferring employee states from text legal? (Updated June 2026)

In the UK and EU it is, at minimum, heavily regulated — and hiding the inference in a backend does not exempt it.

- **GDPR:** the CJEU confirmed in C-184/20 (2022) that *inferred* sensitive data is sensitive data. Deriving a mental-health-adjacent state like burnout creates special-category data, which requires explicit consent — and the ICO's guidance on monitoring workers (October 2023) notes that employee consent rarely holds, given the power imbalance. An inferred score is still profiling even if no screen ever displays it.
- **EU AI Act:** Article 5(1)(f) prohibits inferring emotions in the workplace from biometric data outright. Standalone employment AI — including systems for monitoring and evaluating worker behaviour — is high-risk under Annex III. **Note the current status:** under the Digital Omnibus agreed in May 2026 and given final approval by the Council on 29 June 2026, Annex III high-risk obligations were deferred from 2 August 2026 to **2 December 2027**. That is a delay, not a reprieve — the classification stands, penalties reach €35m or 7% of global turnover for prohibited practices, and enforcement bodies (Finland's was first, January 2026) are coming online now.

For any vendor, the practical implication is architectural: a system that never generates a psychological inference has nothing to consent, register, or defend.

## What happened when companies tried this before?

**Microsoft Productivity Score (2020):** shipped with per-employee visibility into email and meeting behaviour; branded workplace surveillance within weeks; Microsoft removed individual user names days later. **IBM (2019):** claimed on CNBC that its AI predicted resignations with "95% accuracy"; no precision or recall figures were ever published, and analyses of similar attrition models show they lean on proxy variables — commute length, profile updates — that predict without explaining. **Humu (2023):** a genuinely sophisticated behavioural-nudge engine that exited via acquisition by Perceptyx. A decade of people analytics converges on one lesson: **undisclosed inference about individuals destroys trust at the moment of discovery, regardless of stated accuracy — and hidden systems are always discovered.**

## What can AI legitimately do in 1:1s?

Hold facts, and prepare humans. There is a class of signal a system can carry with complete integrity because none of it guesses at anyone's inner life:

- **Commitment follow-through** — the action both people agreed has now rolled over three meetings running
- **Cadence** — the fortnightly 1:1 has quietly become monthly, or keeps getting rescheduled
- **The manager's own record** — what they explicitly observed and wrote, quoted back rather than interpreted
- **One-tap outcome capture** — one structured question after each meeting (*did the agreed action happen: yes / partly / no / changed?*), which builds first-party longitudinal data no classifier squinting at sparse prose can match

And preparation is where the leverage genuinely sits. Steven Rogelberg's research on 1:1s (*Glad We Met*, Oxford University Press, 2024) identifies under-preparation — not ill will — as the main reason these meetings underdeliver, while Gallup puts ~70% of team-engagement variance on the manager. Kluger and DeNisi's meta-analysis of 607 feedback effect sizes (1996) found over a third of feedback interventions *worsened* performance, and the dividing line was whether feedback targeted the task or the person. Facts about commitments target the task. Inferred states target the person.

## The No-Inference Standard: five rules for any AI 1:1 tool

I've led design teams for twenty years, and early in my career I watched a business I'd built unravel because I missed the human signals before two key people left. So before deciding what my own tool would do, I commissioned three independent deep-research reviews of this exact question. The result is a standard now hard-coded into Sero as engineering gates — and a checklist any buyer can put to any vendor:

1. **No inferred states, ever.** The system never asserts disengagement, burnout, flight risk, or any internal state — as a label, a score, or a trend, visible or hidden.
2. **Every claim shows its evidence.** Any suggestion cites an observable fact ("this action rolled over 3×"), never an interpretation of tone, brevity, or vibes.
3. **Route on events, not inference.** Suggestions fire only from countable events, rarely, with the reason displayed.
4. **Nothing persists as a hidden trait.** Store what happened and what was suggested — never a profile of who someone supposedly is.
5. **The human makes every judgement.** The system prepares the manager. It never pre-judges the employee.

A tool that meets this standard makes managers better prepared. A tool that fails it makes managers suspicious — of the wrong people, roughly three times out of four, with the arithmetic above to prove it.

---

## FAQ

**Can AI predict which employees will quit?**
Models trained on historical HR data can post high headline accuracy, but analyses repeatedly show they rely on proxy variables rather than causes a manager can act on, and at low base rates most individual-level flags are false. IBM's "95% accuracy" claim was never accompanied by published precision figures.

**Is sentiment analysis of manager notes useful for anything?**
For exactly one thing: the *manager's own* sentiment. A system can legitimately register frustration or urgency in the author's writing and calibrate preparation tone. It cannot use the manager's text to conclude anything about the employee.

**What about "engine-only" inference that's never shown in the UI?**
Legally and ethically, hiding the label changes little. Under GDPR an inferred state is still personal data and still profiling (CJEU C-184/20), generated without consent — whether or not a screen displays it. It also still drives manager behaviour, which is where the harm occurs.

**Do EU AI Act rules for workplace AI apply yet?**
The prohibition tiers (including biometric emotion inference at work) have applied since February 2025. The Annex III high-risk obligations covering employment AI were deferred by the June 2026 Digital Omnibus to 2 December 2027 — delayed, not removed.

**So what should an AI 1:1 tool actually produce?**
A preparation brief: what changed since last time, what was promised and whether it happened, a safe opening question, what to listen for anchored to the manager's own observations, and a clear success condition. Data in, judgement human.

---

### Sources

Achenbach, McConaughy & Howell (1987), *Psychological Bulletin* 101, 213–232 · Behavioural Insights Team (2021), *Gender bias and performance feedback: an RCT*, n = 4,328 · CJEU Case C-184/20 (2022) · Council of the EU / European Parliament, Digital Omnibus on AI, final approval 29 June 2026 · Edwards & Holtzman (2017), *Journal of Research in Personality* 68, 63–68 · EU AI Act (Regulation 2024/1689), Art. 5(1)(f), Annex III · Gallup, *State of the American Manager* · Goddu et al. (2018), *Journal of General Internal Medicine* 33, 685–691 · ICO (2023), *Employment practices and data protection: monitoring workers* · Kluger & DeNisi (1996), *Psychological Bulletin* 119, 254–284 · Merhbene, Nath, Puttick & Kurpicz-Briki (2022), *Frontiers in Big Data* 5, 863100 · Rogelberg (2024), *Glad We Met*, Oxford University Press · Scullen, Mount & Goff (2000), *Journal of Applied Psychology* 85(6), 956–970 · Vazire (2010), *Journal of Personality and Social Psychology* 98(2), 281–300 · Reporting: Microsoft Productivity Score (GeekWire/The Guardian, 2020); IBM attrition claims (CNBC, 2019); Perceptyx acquisition of Humu (2023).
