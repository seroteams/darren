import { STAGES, isInternalAdmin } from "../state.js";
import { createAxesPanel } from "../ui/axes.js";
import { revealOne } from "../ui/reveal.js";
import { postVerdict, getMyRun, submitRunVerdict, savePromises } from "../../../shared/api.js";
import { draftsFromNextActions, renderPromiseAgree } from "../ui/promise-agree.ts";
import { showFinishFeedbackModal } from "../ui/finish-feedback-modal.js";
import { markRunForClaim } from "../guest.ts";
import { finishDestination } from "./finish-destination.ts";
import { escapeCopy as escape } from "../ui/html.js";
import { wizardFooter } from "../ui/wizard-footer.ts";
import { icon } from "../ui/icon.js";
import { Check, Copy } from "lucide";

const WHEN_ORDER = ["today", "this week", "this month", "next 1:1"];

export async function mount(root, deps) {
  const { store, setState, resetSession } = deps;
  const b = store.briefing;
  const fastPath = !!store.skipBriefingAnimation;
  if (fastPath) setState({ skipBriefingAnimation: false });

  if (!b) {
    root.innerHTML = `
      <div class="stage-inner l-stack l-stack--6">
        <h1 class="h1">Recap not available</h1>
        <div class="error-card">
          <div class="text-ink-dim">This 1:1 has no saved recap yet. You can try again or start a new 1:1.</div>
        </div>
        <div class="l-cluster l-cluster--2">
          <button class="btn js-retry-eval" type="button">Try again</button>
          <button class="btn btn--ghost js-restart" type="button">Start a new 1:1</button>
        </div>
      </div>
    `;
    root.querySelector(".js-retry-eval").addEventListener("click", () => {
      setState({ stage: STAGES.EVAL, error: null });
    });
    root.querySelector(".js-restart").addEventListener("click", () => {
      try { localStorage.removeItem("seroSessionId"); } catch {}
      resetSession();
      setState({ stage: STAGES.INTAKE, substage: "NAME" });
    });
    return;
  }

  // The promises moment (promises-before-recap, signed off 2026-07-19): before any
  // recap is shown, the manager — or a guest — locks in what the two of them agreed,
  // as its own full-screen step. Q9's ghost path sets promisesConfirmSkip; a re-visit
  // after locking (promisesConfirmed) goes straight to the recap; the scripted QA
  // lane never sees the step. Locking or skipping re-mounts this stage, which then
  // falls through to the recap below (wash and all — the payoff plays after the step).
  const showPromises = Boolean(store.sessionId && !store.scripted
    && !store.promisesConfirmSkip && !store.promisesConfirmed);
  if (showPromises) {
    root.innerHTML = `<div class="stage-questioning l-stack l-stack--6"></div>`;
    renderPromiseAgree(root.firstElementChild, {
      drafts: draftsFromNextActions(b.next_actions || []),
      reportName: store.ctx?.name || "them",
      ctxSegments: [store.ctx?.name, store.ctx?.seniority, store.ctx?.role, store.ctx?.meetingType],
      onLock: async (promises) => {
        // Keep the locked list on-device first — the recap and PDF must show what
        // was agreed even if the save can't reach the server (fail soft, never lose it).
        store.promises = promises;
        store.promisesConfirmed = true;
        try {
          await savePromises(store.sessionId, promises);
          store.promisesSaveFailed = false;
        } catch (e) {
          console.warn("[briefing] promises save failed. Keeping them on-device:", e);
          store.promisesSaveFailed = true;
        }
        void mount(root, deps);
      },
      onSkip: () => {
        store.promisesConfirmSkip = true;
        void mount(root, deps);
      },
    });
    return;
  }

  if (!fastPath) {
    const wash = document.createElement("div");
    wash.className = "celebration-wash";
    document.body.appendChild(wash);
    requestAnimationFrame(() => wash.classList.add("is-active"));
    setTimeout(() => wash.remove(), 1600);
  }

  root.innerHTML = `
    <div class="stage-wide max-w-wide mx-auto briefing-page recap-page reveal-soft relative z-10 py-8">
      <header class="briefing-block recap-hero space-y-3">
        <div class="briefing-section-head">
          <div class="eyebrow">Recap · For ${escape(store.ctx.name)}</div>
          <button type="button" class="btn btn--ghost btn--sm js-copy-all-briefing">Copy all</button>
        </div>
        <div class="recap-hero__signal"></div>
        <h1 class="briefing-headline"></h1>
      </header>

      <section class="recap-act recap-act--read">
        <div class="eyebrow recap-act__label">What came out</div>
        <div class="briefing-grid briefing-grid--pair">
          <section class="briefing-block bullets-section space-y-3">
            <div class="eyebrow eyebrow--slot">What stood out</div>
            <div class="card-flat bullets-host"></div>
          </section>

          <section class="briefing-block axes-section space-y-4">
            <div class="eyebrow eyebrow--slot" title="Scores reflect meaning in answers, not word count or typing style">Final read</div>
            <div class="card-flat axes-mount"></div>
            <div class="axis-meanings space-y-2"></div>
          </section>
        </div>

        <section class="briefing-block paragraph-section space-y-3">
          <div class="eyebrow eyebrow--slot">What we understood</div>
          <p class="briefing-prose paragraph-body"></p>
        </section>

        <section class="briefing-block engagement-section space-y-3 hidden">
          <div class="eyebrow eyebrow--slot">How engaged they seem</div>
          <div class="card-flat engagement-host"></div>
        </section>
      </section>

      <section class="recap-act recap-act--honest">
        <div class="eyebrow recap-act__label">The honest read</div>
        <div class="briefing-block brutal-host"></div>
      </section>

      <section class="recap-act recap-act--payoff">
        <div class="eyebrow recap-act__label">What to do next</div>
        <div class="card-flat">
          <div class="briefing-grid briefing-grid--pair">
            <section class="briefing-block actions-section space-y-3">
              <div class="eyebrow eyebrow--slot">What you agreed</div>
              <div class="actions-host"></div>
            </section>

            <section class="briefing-block watch-section space-y-3">
              <div class="briefing-section-head">
                <div class="eyebrow eyebrow--slot">Reminders</div>
                <button type="button" class="btn btn--ghost btn--sm js-copy-all-reminders hidden">Copy all</button>
              </div>
              <div class="watch-host"></div>
            </section>
          </div>
        </div>
      </section>

      ${store.scripted ? `
      <section class="briefing-block verdict-block card space-y-3">
        <div class="eyebrow">Test lane · verdict</div>
        <div class="verdict-row">
          <button type="button" class="btn btn--ghost js-verdict" data-v="keep" aria-pressed="false">Keep</button>
          <button type="button" class="btn btn--ghost js-verdict" data-v="fix" aria-pressed="false">Fix</button>
          <button type="button" class="btn btn--ghost js-verdict" data-v="block" aria-pressed="false">Block</button>
        </div>
        <label class="block">
          <span class="eyebrow">Issue type</span>
          <select class="bench-select js-issue-type" aria-label="Issue type">
            <option value="">(none)</option>
            <option value="too_generic">too generic</option>
            <option value="wrong_level">wrong level</option>
            <option value="bad_tone">bad tone</option>
            <option value="over_inferred">over inferred</option>
            <option value="missed_focus">missed focus</option>
            <option value="weak_action">weak action</option>
          </select>
        </label>
        <label class="block">
          <span class="eyebrow">Note</span>
          <input class="input js-verdict-note" type="text" autocomplete="off" placeholder="what's wrong, in one line" />
        </label>
        <span class="js-verdict-confirm feedback-confirm text-sm text-ink-mute">Saved</span>
      </section>` : ""}

      <footer class="briefing-finish pt-2 l-stack l-stack--2">
        ${!store.user && !store.scripted ? `
        <div class="card-flat space-y-2 js-run-verdict">
          <div class="eyebrow" id="run-verdict-label">Would you run this 1:1 differently now?</div>
          <div class="l-cluster l-cluster--2 items-center" role="group" aria-labelledby="run-verdict-label">
            <button type="button" class="btn btn--ghost btn--sm js-rv" data-v="yes" aria-pressed="false">Yes</button>
            <button type="button" class="btn btn--ghost btn--sm js-rv" data-v="no" aria-pressed="false">No</button>
            <span class="js-rv-status text-sm text-ink-mute" role="status" aria-live="polite"></span>
          </div>
          <div class="l-cluster l-cluster--2 items-center js-rv-more hidden">
            <input class="input js-rv-note" type="text" maxlength="200" autocomplete="off" placeholder="One line on why. Optional" aria-label="Optional comment" />
            <button type="button" class="btn btn--ghost btn--sm js-rv-send">Add</button>
          </div>
        </div>` : ""}
        ${!store.user ? `
        <div class="card-flat space-y-3 js-guest-save">
          <div class="eyebrow">Want to keep this 1:1?</div>
          <div class="l-cluster l-cluster--2 items-center">
            <button type="button" class="btn js-guest-register">Create a free account</button>
            <span class="text-ink-dim">. We'll save it for you</span>
          </div>
          <p class="text-ink-dim text-sm">
            Already have an account?
            <button type="button" class="link js-guest-login">Log in</button>
          </p>
        </div>
        <div class="l-cluster l-cluster--2 items-center">
          <button type="button" class="btn btn--ghost js-save-pdf">Save as PDF</button>
          <button type="button" class="btn btn--ghost js-guest-restart">Start a new 1:1</button>
        </div>` : `
        <div class="text-ink-mute">All saved. This 1:1 is in your Past 1:1s.</div>`}
      </footer>
      ${store.user ? wizardFooter({
        primary: { label: "Finish & review this 1:1" },
        secondaryHtml:
          `<button type="button" class="btn btn--ghost js-save-pdf">Save as PDF</button>` +
          `<button type="button" class="btn btn--ghost js-copy-review hidden">Copy QA prompt</button>` +
          `<span class="js-copy-confirm feedback-confirm text-sm text-ink-mute">Copied</span>`,
      }) : ""}
    </div>
  `;

  // One pass, one fade (audit F7): the whole recap is in the DOM before first
  // paint; the page arrives as a single soft fade (same idiom as focus-points).
  // A rehydrated tab skips even that and just shows the page.
  const page = root.querySelector(".recap-page");
  if (fastPath) page.classList.add("is-in");
  else revealOne(page);

  // --- 1) Hero: an at-a-glance signal chip, then the engine's own headline.
  // The chip only appears when NO axis got a real read — a genuinely thin
  // session, drawn straight from the engine's per-axis read_status (never
  // invented). The headline itself is always the engine's, unmasked.
  const heroSignal = root.querySelector(".recap-hero__signal");
  const axisWasRead = (a) => (a.read_status ? a.read_status !== "not_read" : a.score !== 0);
  const anyAxisRead = (b.axes || []).some(axisWasRead);
  if (!anyAxisRead && (b.axes || []).length) {
    heroSignal.innerHTML = `<span class="chip chip--gold"><span class="chip__dot"></span>Partial record</span>`;
  } else {
    heroSignal.remove();
  }

  const headline = root.querySelector(".briefing-headline");
  headline.textContent = b.headline || "Recap";

  // --- 2) Bullets
  const bulletsHost = root.querySelector(".bullets-host");
  for (const text of b.summary_bullets || []) {
    const row = document.createElement("div");
    row.className = "bullet";
    row.innerHTML = `<div class="bullet__mark">●</div><div>${escape(text)}</div>`;
    bulletsHost.appendChild(row);
  }

  const para = root.querySelector(".paragraph-body");
  para.textContent = b.understanding_paragraph || "";

  const axes = createAxesPanel({ celebrate: true });
  root.querySelector(".axes-mount").appendChild(axes.el);
  // A score of 0 means "not enough signal to read this axis" (final-evaluation
  // axis_meaning_rules) — render it as an unread baseline, not a measured 0, so
  // a quiet session doesn't look like a flat verdict.
  axes.renderInitial([
    { id: "wellbeing", score: -1 }, { id: "engagement", score: -1 },
    { id: "clarity", score: 0, noRead: true }, { id: "growth", score: 0, noRead: true },
  ]);

  // The backend declares read-status per axis; trust it. Fall back to the old
  // score-0 heuristic only for briefings produced before read_status existed.
  const isNotRead = (a) =>
    a.read_status ? a.read_status === "not_read" : a.score === 0;
  const axesList = (b.axes || []).map((a) => ({
    id: a.id,
    label: a.id,
    score: a.score,
    lastDelta: 0,
    noRead: isNotRead(a),
  }));
  const known = new Set(axesList.map((a) => a.id));
  const AXIS_SEED = { wellbeing: -1, engagement: -1, clarity: 0, growth: 0 };
  for (const id of ["wellbeing", "engagement", "clarity", "growth"]) {
    // An axis the evaluator omitted was not read — never fabricate a measured bar.
    if (!known.has(id)) axesList.push({ id, label: id, score: AXIS_SEED[id], lastDelta: 0, noRead: true });
  }
  axes.update(axesList, { showDelta: false });

  // Axis meanings (subtle, under the card). Only axes we actually read get a
  // line; the score-0 "not read" axes are collapsed into one quiet caption so
  // the panel doesn't repeat "didn't surface enough" at full weight.
  const readAxes = (b.axes || []).filter((a) => a.meaning && !isNotRead(a));
  const unreadAxes = (b.axes || []).filter((a) => isNotRead(a));
  if (readAxes.length || unreadAxes.length) {
    const mwrap = root.querySelector(".axis-meanings");
    const meaningRows = readAxes
      .map((a) => `
        <div class="text-ink-dim">
          <span class="eyebrow mr-2" style="color: var(--color-accent-dark);">${escape(cap(a.id))}</span>${escape(a.meaning)}
        </div>
      `);
    if (unreadAxes.length) {
      const names = unreadAxes.map((a) => cap(a.id));
      const list = names.length > 1
        ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
        : names[0];
      meaningRows.push(`
        <div class="text-ink-mute">${escape(list)}. Not enough signal to read this session.</div>
      `);
    }
    mwrap.innerHTML = meaningRows.join("");
  }

  const brutalHost = root.querySelector(".brutal-host");
  const truths = [
    { eyebrow: `Honest read:${escape(store.ctx.name || "them")}`, text: b.brutal_truth_employee || "", shareable: true },
    { eyebrow: "Honest read:You", text: b.brutal_truth_manager || "", shareable: false },
  ];
  for (const t of truths) {
    if (!t.text) continue;
    const card = document.createElement("div");
    card.className = "brutal" + (t.shareable ? "" : " brutal--private");
    card.innerHTML = `
      <div class="brutal__eyebrow">
        ${t.eyebrow}
        <span class="brutal__badge ${t.shareable ? "brutal__badge--shareable" : "brutal__badge--private"}">${t.shareable ? "OK to share" : "Private · just for you"}</span>
      </div>
      <div class="brutal__body">${escape(t.text)}</div>
      ${t.shareable ? "" : `<div class="brutal__note">Your reflection. Don't paste this into shared notes.</div>`}
    `;
    brutalHost.appendChild(card);
  }
  // No honest reads this run → drop the whole act so its label isn't orphaned.
  if (!brutalHost.children.length) root.querySelector(".recap-act--honest")?.remove();

  // --- 5b) Engagement read (plain prose, sentence-first; no badge chrome).
  // New shape: read_status + observable content, no state labels. Old stored
  // runs still carry the legacy `level` enum — render those through the legacy
  // lead line, never invent new content for them.
  const er = b.engagement_read;
  if (er && (er.read_status || er.level)) {
    const section = root.querySelector(".engagement-section");
    section.classList.remove("hidden");
    const host = root.querySelector(".engagement-host");
    const evidence = (er.evidence || []).filter(Boolean);
    const lead = er.read_status
      ? (er.read_status === "read"
          ? "What this session actually showed on engagement. Quotes below, no labels."
          : "Not enough from this conversation to read engagement. Treat it as a partial read.")
      : engagementReadLabel(er.level);
    const rows = [
      `<div class="engagement-read__lead">${escape(lead)}</div>`,
    ];
    if (er.observed_shift) {
      rows.push(`<div class="engagement-read__line"><span class="eyebrow mr-2">You noted</span>${escape(er.observed_shift)}</div>`);
    }
    if (evidence.length) {
      rows.push(`<div class="engagement-read__line"><span class="eyebrow mr-2">Why</span>${evidence.map(escape).join("; ")}</div>`);
    }
    if (er.missing_evidence) {
      rows.push(`<div class="engagement-read__line text-ink-dim"><span class="eyebrow mr-2">Still missing</span>${escape(er.missing_evidence)}</div>`);
    }
    if (er.recommended_action) {
      rows.push(`<div class="engagement-read__line"><span class="eyebrow mr-2">Your move</span>${escape(er.recommended_action)}</div>`);
    }
    if (er.watch_next) {
      rows.push(`<div class="engagement-read__line text-ink-dim"><span class="eyebrow mr-2">Watch next</span>${escape(er.watch_next)}</div>`);
    }
    host.innerHTML = rows.join("");
  }

  // --- 6) What you agreed — the locked-in promises, grouped by owner (manager's
  // own first, per the promises-loop rule). Falls back to the engine's read-only
  // suggestions when nothing was locked (Q9 skip path, scripted lane, old runs).
  const actions = b.next_actions || [];
  const agreed = Array.isArray(store.promises)
    ? store.promises.filter((p) => p && String(p.action || "").trim())
    : null;
  if (agreed && agreed.length) {
    const host = root.querySelector(".actions-host");
    for (const g of [
      { owner: "manager", label: "You promised", cls: " agreed-owner-label--you" },
      { owner: "report", label: `${store.ctx?.name || "They"} promised`, cls: "" },
    ]) {
      const list = agreed.filter((p) => p.owner === g.owner);
      if (!list.length) continue;
      const label = document.createElement("span");
      label.className = `agreed-owner-label${g.cls}`;
      label.textContent = g.label;
      host.appendChild(label);
      for (const p of list) {
        const row = createCopyableRow({
          className: "action-group",
          mark: "",
          bodyHtml: `
            <div class="action-when">${escape(capWhen(p.when))}</div>
            <div class="action-body">${escape(p.action || "")}</div>
          `,
          copyText: formatPromiseCopy(p, store.ctx?.name),
        });
        host.appendChild(row);
      }
    }
    if (store.promisesSaveFailed) {
      const note = document.createElement("div");
      note.className = "agreed-note";
      note.textContent = "Kept on this device. Sero couldn't reach the server, so these may not come back at your next 1:1.";
      host.appendChild(note);
    }
  } else if (agreed) {
    // An explicitly locked-in EMPTY list — "nothing kept this time" was the
    // manager's call; don't resurface the engine's suggestions over it.
    root.querySelector(".actions-section").remove();
  } else if (actions.length) {
    // Nothing was locked in — these are the engine's suggestions, and the label
    // must say so (never present unconfirmed output as an agreement).
    root.querySelector(".actions-section .eyebrow").textContent = "Sero's suggestions";
    const host = root.querySelector(".actions-host");
    const sortedActions = [...actions].sort((a, b) => whenRank(a.when) - whenRank(b.when));
    sortedActions.forEach((a) => {
      const row = createCopyableRow({
        className: "action-group",
        mark: "",
        bodyHtml: `
          <div class="action-when">${escape(capWhen(a.when))}</div>
          <div class="action-body">${escape(a.action || "")}</div>
        `,
        copyText: formatActionCopy(a),
      });
      host.appendChild(row);
    });
  } else {
    root.querySelector(".actions-section").remove();
  }

  // --- 7) Watch-for items
  const watch = b.watch_for || [];
  if (watch.length) {
    const host = root.querySelector(".watch-host");
    const copyAllBtn = root.querySelector(".js-copy-all-reminders");
    copyAllBtn.classList.remove("hidden");
    copyAllBtn.addEventListener("click", () => {
      copySnippet(watch.join("\n"), copyAllBtn, "Copied all");
    });
    watch.forEach((text) => {
      const row = createCopyableRow({
        className: "watch-item",
        mark: "●",
        bodyHtml: `<div class="watch-item__text">${escape(text)}</div>`,
        copyText: text,
      });
      host.appendChild(row);
    });
  } else {
    root.querySelector(".watch-section").remove();
  }

  // Neither agreed-actions nor reminders → drop the empty payoff ground + label.
  if (!root.querySelector(".actions-section") && !root.querySelector(".watch-section")) {
    root.querySelector(".recap-act--payoff")?.remove();
  }

  root.querySelector(".js-copy-all-briefing").addEventListener("click", () => {
    copyFullBriefing(b, store.ctx, root.querySelector(".js-copy-all-briefing"), store.promises);
  });

  // Briefing verdict tap (validation-kit Phase 3, guests-only since 3b — logged-in
  // users answer in the Finish modal instead). The tap saves immediately (the answer
  // is never lost to a closed tab); the optional comment then attaches to the same
  // row. Failures are soft and ignoring the card costs nothing — never nags or blocks.
  const rvCard = root.querySelector(".js-run-verdict");
  if (rvCard) {
    const rvBtns = [...rvCard.querySelectorAll(".js-rv")];
    const rvStatus = rvCard.querySelector(".js-rv-status");
    const rvMore = rvCard.querySelector(".js-rv-more");
    const rvNote = rvCard.querySelector(".js-rv-note");
    let rvChosen = null;
    const rvSave = async (message) => {
      try {
        await submitRunVerdict(store.sessionId, rvChosen, message || "");
        rvStatus.textContent = message ? "Noted. Thanks." : "Thanks.";
      } catch {
        rvStatus.textContent = "Couldn't save. Fine to skip.";
      }
    };
    rvBtns.forEach((btn) => btn.addEventListener("click", () => {
      rvChosen = btn.dataset.v;
      rvBtns.forEach((x) => {
        x.classList.toggle("is-active", x === btn);
        x.setAttribute("aria-pressed", String(x === btn));
      });
      rvMore.classList.remove("hidden");
      rvSave(rvNote.value.trim());
    }));
    rvCard.querySelector(".js-rv-send").addEventListener("click", () => {
      if (rvChosen) rvSave(rvNote.value.trim());
    });
    rvNote.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && rvChosen) { e.preventDefault(); rvSave(rvNote.value.trim()); }
    });
  }

  // Guest save card (guest-run Phase 3): a guest has no rating, no Finish, no QA
  // tools — just "keep this 1:1?". Mark the finished run before leaving for
  // register/login; the auth success paths claim it and land on the saved run.
  const saveCard = root.querySelector(".js-guest-save");
  if (saveCard) {
    const saveVia = (stage) => {
      markRunForClaim(store.sessionId);
      setState({ stage });
    };
    saveCard.querySelector(".js-guest-register").addEventListener("click", () => saveVia(STAGES.REGISTER));
    saveCard.querySelector(".js-guest-login").addEventListener("click", () => saveVia(STAGES.LOGIN));
    // Start fresh without saving — same reset as the "no recap" branch above.
    root.querySelector(".js-guest-restart").addEventListener("click", () => {
      try { localStorage.removeItem("seroSessionId"); } catch {}
      resetSession();
      setState({ stage: STAGES.INTAKE, substage: "NAME" });
    });
  }

  // Save as PDF — guests and logged-in users alike: generate a designed PDF
  // from the briefing and download it straight away (ui/recap-pdf.ts; pdfmake
  // is lazy-loaded on first click).
  const pdfBtn = root.querySelector(".js-save-pdf");
  if (pdfBtn) {
    pdfBtn.addEventListener("click", async () => {
      const prev = pdfBtn.textContent;
      pdfBtn.disabled = true;
      pdfBtn.textContent = "Preparing…";
      try {
        const { downloadRecapPdf } = await import("../ui/recap-pdf.ts");
        await downloadRecapPdf(b, store.ctx, store.promises);
      } catch (e) {
        console.error("[briefing] PDF export failed:", e);
        pdfBtn.textContent = "Couldn't build the PDF. Try again";
        setTimeout(() => { pdfBtn.textContent = prev; }, 2500);
        pdfBtn.disabled = false;
        return;
      }
      pdfBtn.textContent = prev;
      pdfBtn.disabled = false;
    });
  }

  // The run debrief (API time / cost / CLI replay / QA prompt) is internal QA tooling —
  // only the internal admin role sees it. A manager just finishes the run and goes home.
  // Absent for guests (the save card replaces the whole finish cluster).
  const finishBtn = root.querySelector(".js-wf-continue");
  const seesDebrief = isInternalAdmin(store.user);
  if (finishBtn) {
    if (!seesDebrief) finishBtn.textContent = "Finish";
    finishBtn.addEventListener("click", () => {
      void (async () => {
        // The one feedback moment (validation-kit Phase 3b): stars + the verdict
        // question in a single modal on Finish — replaces the two inline cards for
        // logged-in users. Skippable every way (Done/Skip/Escape/backdrop), and any
        // failure falls through — Finish ALWAYS proceeds.
        if (store.user && !store.scripted) {
          try {
            let savedStars = 0;
            try { savedStars = (await getMyRun(store.sessionId))?.rating?.stars ?? 0; } catch { /* blank */ }
            await showFinishFeedbackModal({ sessionId: store.sessionId, initialStars: savedStars });
          } catch { /* never block the exit */ }
        }
        if (seesDebrief) {
          setState({ stage: STAGES.RUN_DEBRIEF });
          return;
        }
        // Land on this person's page when the run is tied to one — the saved briefing and the
        // new top-placed "prep next 1:1" button both live there (audit X5). Capture the id
        // before resetSession() clears ctx; no roster person → Home.
        const dest = finishDestination(store.ctx?.personId);
        resetSession();
        setState(dest);
      })();
    });
  }

  // Scripted test lane: capture the structured verdict (ground truth for Suggest-fix).
  if (store.scripted) {
    const verdictBtns = [...root.querySelectorAll(".js-verdict")];
    const issueSel = root.querySelector(".js-issue-type");
    const noteInput = root.querySelector(".js-verdict-note");
    const confirm = root.querySelector(".js-verdict-confirm");
    let chosen = null;
    async function save() {
      if (!chosen) return;
      try {
        await postVerdict(store.sessionId, {
          verdict: chosen,
          issue_type: issueSel.value || null,
          note: noteInput.value || null,
        });
        confirm.classList.add("is-shown");
        setTimeout(() => { confirm.classList.remove("is-shown"); }, 1500);
      } catch (e) {
        console.warn("[briefing] verdict save failed:", e.message);
      }
    }
    verdictBtns.forEach((b) => b.addEventListener("click", () => {
      chosen = b.dataset.v;
      verdictBtns.forEach((x) => {
        x.classList.toggle("is-active", x === b);
        x.setAttribute("aria-pressed", String(x === b));
      });
      save();
    }));
    issueSel.addEventListener("change", save);
    noteInput.addEventListener("change", save);
  }

  // "Copy QA prompt" — internal QA tooling (same as the run debrief above): only the
  // internal admin sees it, and only when there are notes to discuss. Managers never see it.
  const copyBtn = root.querySelector(".js-copy-review");
  const copyConfirm = root.querySelector(".js-copy-confirm");
  if (seesDebrief && (store.notes || []).length && store.sessionDir) {
    copyBtn.classList.remove("hidden");
    copyBtn.addEventListener("click", async () => {
      const notesPath = `${String(store.sessionDir).replace(/\\/g, "/")}/notes.md`;
      const prompt = [
        `Open notes.md in the session folder (${notesPath}).`,
        "",
        "These are my notes from a Sero run, tagged by stage. Save the key recurring themes to memory (treat them as feedback about the app, not about me). Then ask me one focused question at a time about the issues I raised so we can decide what changes to make to the prompts and copy.",
      ].join("\n");
      try {
        await navigator.clipboard.writeText(prompt);
        copyConfirm.classList.add("is-shown");
        setTimeout(() => { copyConfirm.classList.remove("is-shown"); }, 1500);
      } catch (e) {
        console.warn("[briefing] clipboard write failed:", e.message);
      }
    });
  }
}

export function unmount() { /* nothing */ }

function capWhen(w) {
  const s = String(w || "").trim();
  if (!s) return "";
  if (s === "next 1:1") return "Next 1:1";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function whenRank(w) {
  const i = WHEN_ORDER.indexOf(w);
  return i === -1 ? WHEN_ORDER.length : i;
}

function formatActionCopy(a) {
  const when = String(a.when || "").trim();
  const action = String(a.action || "").trim();
  if (!when) return action;
  return `${capWhen(when)}: ${action}`;
}

function formatPromiseCopy(p, name) {
  const who = p.owner === "report" ? (name || "They") : "You";
  const when = String(p.when || "").trim();
  return `${who}: ${String(p.action || "").trim()}${when ? `. ${capWhen(when)}` : ""}`;
}

function formatBriefingForCopy(b, ctx, promises) {
  const lines = [];
  const name = (ctx?.name || "").trim();
  lines.push(name ? `Recap · For ${name}` : "Recap");

  const headline = String(b.headline || "").trim();
  if (headline) {
    lines.push("", headline);
  }

  const bullets = b.summary_bullets || [];
  if (bullets.length) {
    lines.push("", "What stood out");
    bullets.forEach((item) => lines.push(`- ${item}`));
  }

  const para = String(b.understanding_paragraph || "").trim();
  if (para) {
    lines.push("", "What we understood", para);
  }

  const axes = b.axes || [];
  if (axes.length) {
    lines.push("", "Final read");
    for (const a of axes) {
      const label = cap(a.id);
      const notRead = a.read_status ? a.read_status === "not_read" : a.score === 0;
      if (notRead) {
        lines.push(`${label} (not read. Not enough signal)`);
        continue;
      }
      const score = a.score != null ? ` (${a.score})` : "";
      lines.push(`${label}${score}`);
      if (a.meaning) lines.push(String(a.meaning).trim());
    }
  }

  const empTruth = String(b.brutal_truth_employee || "").trim();
  if (empTruth) {
    lines.push("", `Honest read:${name || "them"}`, empTruth);
  }

  const mgrTruth = String(b.brutal_truth_manager || "").trim();
  if (mgrTruth) {
    lines.push("", "Honest read:You (private · just for you, not for sharing)", mgrTruth);
  }

  const agreed = (Array.isArray(promises) ? promises : [])
    .filter((p) => p && String(p.action || "").trim());
  const actions = b.next_actions || [];
  if (agreed.length) {
    lines.push("", "What you agreed");
    // Manager's own first — same order as on screen.
    [...agreed.filter((p) => p.owner !== "report"), ...agreed.filter((p) => p.owner === "report")]
      .forEach((p) => lines.push(`- ${formatPromiseCopy(p, name)}`));
  } else if (actions.length) {
    lines.push("", "Sero's suggestions");
    [...actions]
      .sort((x, y) => whenRank(x.when) - whenRank(y.when))
      .forEach((a) => lines.push(`- ${formatActionCopy(a)}`));
  }

  const watch = b.watch_for || [];
  if (watch.length) {
    lines.push("", "Reminders");
    watch.forEach((item) => lines.push(`- ${item}`));
  }

  return lines.join("\n").trim();
}

async function copyFullBriefing(briefing, ctx, btn, promises) {
  const text = formatBriefingForCopy(briefing, ctx, promises);
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const prev = btn.textContent;
    btn.innerHTML = `Copied ${icon(Check, { size: 16 })}`;
    setTimeout(() => { btn.textContent = prev; }, 1500);
  } catch (e) {
    console.warn("[briefing] clipboard write failed:", e.message);
  }
}

function createCopyableRow({ className, mark, bodyHtml, copyText }) {
  const row = document.createElement("div");
  row.className = `${className} copyable-row`;
  row.innerHTML = `
    ${mark ? `<div class="copyable-row__mark">${mark}</div>` : ""}
    <div class="copyable-row__content">${bodyHtml}</div>
    <button type="button" class="copy-snippet-btn" title="Copy" aria-label="Copy">${COPY_ICON}</button>
  `;
  row.querySelector(".copy-snippet-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    copySnippet(copyText, e.currentTarget);
  });
  return row;
}

const COPY_ICON = icon(Copy, { size: 14 });

async function copySnippet(text, btn, doneLabel = "Copied") {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    const prev = btn.getAttribute("aria-label");
    btn.classList.add("is-copied");
    btn.setAttribute("aria-label", doneLabel);
    setTimeout(() => {
      btn.classList.remove("is-copied");
      btn.setAttribute("aria-label", prev || "Copy");
    }, 1200);
  } catch (e) {
    console.warn("[briefing] clipboard write failed:", e.message);
  }
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// Plain-language lead line for LEGACY stored briefings that still carry the
// pre-ruling `level` enum. New briefings use read_status and never see this.
function engagementReadLabel(level) {
  switch (level) {
    case "clear_concern":
      return "There's a clear engagement concern here, worth acting on.";
    case "worth_checking":
      return "One or two signs worth checking directly. Not a pattern yet.";
    case "no_clear_concern":
      return "Nothing here points to them pulling away.";
    case "inconclusive":
    default:
      return "Not enough from this conversation to read engagement. Treat it as a partial read.";
  }
}

