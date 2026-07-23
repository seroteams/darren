import { STAGES, resetSession, isAdmin } from "../state.js";
import { exitStage } from "../ui/landing.ts";
import { getMeetingTypes, startSession, listPeople, listMyRuns, listRecentRuns, createPerson, createGuidedSession } from "../../../shared/api.js";
import { firstRunIntroHtml, firstRunNotesExampleHtml } from "./intake-firstrun.ts";
import { swapField, focusField } from "../ui/field.js";
import { confirmAction } from "../ui/confirm.js";
import { confirmResetSession } from "../ui/session-reset.js";
import { escapeHtml } from "../ui/html.js";
import { buildRosterView } from "../ui/group-people.js";
import { formatDate } from "../ui/time.ts";
import { wizardFooter } from "../ui/wizard-footer.ts";
import { INTAKE_SUBSTAGES as SUBSTAGES, backTrail } from "./intake-wizard.ts";

const COPY = {
  NAME: {
    question: "Who are you prepping for?",
    hint: "First name only. Sero works from what you tell it. Nothing else.",
    placeholder: "e.g. Priya",
    key: "name",
  },
  ROLE: {
    question: "What do they do?",
    hint: "Their role as you'd say it out loud.",
    placeholder: "e.g. Senior backend engineer",
    key: "role",
  },
  SENIORITY: {
    question: "And their seniority?",
    hint: "Junior, senior, staff, director. Whatever reads naturally.",
    placeholder: "e.g. Senior / Staff / Lead",
    key: "seniority",
  },
  NOTES: {
    question: "Anything Sero should know?",
    placeholder: "e.g. Quieter since the reorg ~3 weeks ago. Something feels off.",
    key: "notes",
  },
};

export async function mount(root, { store, setState }) {
  // Role gate (audit B2): the prep flow is a manager tool. A logged-in member who reaches
  // this stage by any path is bounced to their own home before a single "Who are you
  // prepping for?" renders. A logged-OUT visitor is the guest lane — always allowed in.
  if (store.user && !isAdmin(store.user)) {
    setState({ stage: store.memberHome ?? STAGES.RUNS });
    return;
  }
  // No bespoke progress header (audit F1): the topbar stepper is the one
  // progress indicator for the whole flow. "Discard" is a quiet interim link:
  // the INTAKE screen has no topbar "This 1:1" menu yet (that's the topbar
  // builder's lane); once the menu covers Setup, this link goes too.
  root.innerHTML = `
    <div class="stage-inner intake-shell l-stack l-stack--10">
      <header class="space-y-3">
        <div class="intake-header__row">
          <div class="space-y-1 min-w-0">
            <div class="eyebrow">Setup</div>
          </div>
          <button class="link text-ink-dim text-sm js-start-fresh flex-shrink-0" type="button">Discard</button>
        </div>
        <p class="text-ink-dim text-sm max-w-measure js-intake-lede">Two minutes of prep. One sharper conversation.</p>
      </header>
      <div class="intake-body">
        <div class="field-host"></div>
        <div class="intake-firstrun-host" hidden></div>
      </div>
      <div class="wizard-footer-host"></div>
    </div>
  `;
  const host = root.querySelector(".field-host");
  const intakeLede = root.querySelector(".js-intake-lede");
  const intakeShell = root.querySelector(".intake-shell");
  const intakeBody = root.querySelector(".intake-body");
  const firstRunHost = root.querySelector(".intake-firstrun-host");
  const footerHost = root.querySelector(".wizard-footer-host");

  root.querySelector(".js-start-fresh").addEventListener("click", async () => {
    const ok = await confirmResetSession(confirmAction, { to: STAGES.START });
    if (!ok) return;
    resetSession();
    setState({ stage: exitStage(store.user, store.memberHome, store.guestHome) });
  });

  let types = null;
  let roster = null; // the caller's people (people-roster Phase 4b); null/[] → free-text only
  let isFirstRun = false; // zero-run account → show the first-run guidance (validation-kit Phase 4)
  let currentSub = SUBSTAGES.includes(store.substage) ? store.substage : "NAME";

  // Back walks real history (audit F2). Entering mid-flow (e.g. Back from Focus
  // lands on NOTES) seeds the trail so Back still works from the entry step.
  const history = backTrail(currentSub, !!store.ctx.personId);
  // The current substage's commit (footer Continue) and its best-effort state
  // stash (run before leaving via Back, so typed values survive the round trip).
  let submitCurrent = null;
  let stashCurrent = null;

  function refreshStep() {
    if (intakeLede) intakeLede.hidden = currentSub !== "NAME";
    // The orientation card belongs on the entry step only, and only for a
    // brand-new account — a veteran starting another prep never sees it.
    if (firstRunHost) firstRunHost.hidden = !(isFirstRun && currentSub === "NAME");
    // The first-run entry step gets the two-column split (picker left, guide
    // right); every other step is a single reading column.
    const split = isFirstRun && currentSub === "NAME";
    intakeShell?.classList.toggle("intake-shell--split", split);
    intakeBody?.classList.toggle("intake-body--split", split);
  }

  // The one wizard footer (audit F2): ghost Back bottom-left, primary Continue
  // bottom-right. The entry step has no Back.
  function renderFooter() {
    footerHost.innerHTML = wizardFooter({
      back: history.length ? {} : undefined,
      primary: { label: "Continue" },
    });
    footerHost.querySelector(".js-wf-back")?.addEventListener("click", goBack);
    footerHost.querySelector(".js-wf-continue").addEventListener("click", () => {
      if (submitCurrent) submitCurrent();
    });
  }

  refreshStep();
  renderFooter();

  function renderField(name) {
    if (name === "NAME") return renderName();
    if (name === "MEETING_TYPE") return renderMeetingType();
    if (name === "NOTES") return renderNotes();
    return renderInput(name);
  }

  // NAME substage (people-roster Phase 4b): a manager picks from their roster — one card per
  // person, plus "Someone new" for a free-typed name. Picking seeds name/role/seniority and
  // carries the personId into the start payload (an exact link, no name matching). Free text
  // keeps today's behaviour (personId null → the server auto-matches-or-creates, Phase 2).
  // Guests and members have no roster (the endpoint 401/403s) → plain free-text, unchanged.
  function renderName() {
    if (!roster || roster.length === 0) return renderFreeName();

    const wrap = document.createElement("div");
    wrap.className = "space-y-5";
    wrap.innerHTML = `
      <h1 class="h1 mb-2">${COPY.NAME.question}</h1>
      <div class="hint mb-3">Pick someone from your team, or add someone new.</div>
      <div class="grid gap-3 js-cards"></div>
    `;
    const cards = wrap.querySelector(".js-cards");
    // One commit model (audit F2): clicking a card only SELECTS it; the footer
    // Continue confirms. Selection starts from a previously committed pick so
    // Back shows it again.
    let pendingId = roster.some((p) => p.id === store.ctx.personId) ? store.ctx.personId : null;
    const cardBtns = [];
    function syncCards() {
      cardBtns.forEach((b) => {
        const on = b.dataset.personId === pendingId;
        b.classList.toggle("is-selected", on);
        b.setAttribute("aria-pressed", String(on));
      });
    }
    function makeCard(p) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "meeting-card";
      btn.dataset.personId = p.id;
      btn.setAttribute("aria-pressed", String(pendingId === p.id));
      if (pendingId === p.id) btn.classList.add("is-selected");
      const role = p.role ? `<div class="meeting-card__meta">${escapeHtml(p.role)}</div>` : "";
      // Show when they were last met, so the freshest 1:1s read at a glance (people are
      // already sorted most-recent-first). Never-met roster people simply carry no date.
      const last = p.lastMet ? `<div class="meeting-card__meta">Last 1:1 · ${escapeHtml(formatDate(p.lastMet))}</div>` : "";
      btn.innerHTML = `<div><span class="meeting-card__label">${escapeHtml(p.name)}</span></div>${role}${last}`;
      btn.addEventListener("click", () => {
        // Picking a card is the answer, so the free-text box clears — the two
        // are alternatives, never combined.
        pendingId = p.id;
        freshInput.value = "";
        hideFreshError();
        syncCards();
      });
      cardBtns.push(btn);
      return btn;
    }
    // Show the freshest few by default; a long roster reveals the rest on demand so the
    // picker stays short. The button drops in the remaining cards and removes itself.
    const INITIAL = 4;
    for (const p of roster.slice(0, INITIAL)) cards.appendChild(makeCard(p));
    if (roster.length > INITIAL) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = "btn btn--ghost btn--sm js-more";
      more.textContent = `Show ${roster.length - INITIAL} more`;
      more.addEventListener("click", () => {
        for (const p of roster.slice(INITIAL)) cards.appendChild(makeCard(p));
        more.remove();
      });
      wrap.querySelector(".js-cards").after(more);
    }
    // Always-visible free-name box, sitting ABOVE the cards — adding someone new
    // is the primary move, so the input leads and the roster follows. Submitting
    // free text clears personId, so the server links-or-creates from the name
    // (today's free-text behaviour).
    const fresh = document.createElement("div");
    fresh.className = "space-y-2";
    fresh.innerHTML = `
      <div class="eyebrow">Add someone new</div>
      <input class="input" type="text" autocomplete="off" spellcheck="false"
             placeholder="${COPY.NAME.placeholder}" aria-label="Add someone new" />
      <div class="field__error" hidden></div>
    `;
    const freshInput = fresh.querySelector("input");
    const freshErr = fresh.querySelector(".field__error");
    if (!pendingId) freshInput.value = store.ctx.name || "";
    function hideFreshError() {
      freshErr.hidden = true;
      freshInput.removeAttribute("aria-invalid");
    }
    // Continue commits whichever answer is live: the selected card wins; else
    // the typed name (personId null → the server links-or-creates); else nudge.
    function submitName() {
      if (pendingId) {
        const p = roster.find((x) => x.id === pendingId);
        store.ctx.personId = p.id;
        store.ctx.name = p.name;
        store.ctx.role = p.role || store.ctx.role || "";
        store.ctx.seniority = p.seniority || store.ctx.seniority || "";
        // Existing roster person — their role/seniority are already known, so skip
        // straight to the meeting type instead of re-asking those details.
        goTo("MEETING_TYPE");
        return;
      }
      const val = freshInput.value.trim();
      if (!val) {
        freshErr.textContent = "Pick someone, or add a name to continue.";
        freshErr.hidden = false;
        freshInput.setAttribute("aria-invalid", "true");
        return;
      }
      hideFreshError();
      store.ctx.personId = null;
      store.ctx.name = val;
      advance();
    }
    freshInput.addEventListener("input", () => {
      // Typing a new name un-picks any card — the typed name is the answer now.
      if (pendingId) { pendingId = null; syncCards(); }
      hideFreshError();
    });
    freshInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submitName(); }
    });
    submitCurrent = submitName;
    stashCurrent = null;
    // Input first, then a divider, then the existing people.
    const cardsGrid = wrap.querySelector(".js-cards");
    cardsGrid.before(fresh);
    const divider = document.createElement("div");
    divider.className = "intake-or";
    divider.textContent = "or pick from your team";
    cardsGrid.before(divider);
    return wrap;
  }

  // The free-text name input — today's NAME field. Submitting free text always clears
  // personId: the typed name is the truth, and the server links-or-creates from it.
  function renderFreeName() {
    const node = renderInput("NAME");
    const input = node.querySelector("input");
    input.addEventListener("input", () => { store.ctx.personId = null; });
    return node;
  }

  const ISSUE_PILLS = [
    { id: "workload", label: "Workload", example: "e.g. Three big things landed in the same week and it's showing." },
    { id: "motivation", label: "Motivation", example: "e.g. Used to jump on new work, lately just going through the motions." },
    { id: "friction", label: "Friction", example: "e.g. Something's felt off with the team since the handoff." },
    { id: "delivery", label: "Delivery", example: "e.g. The last couple of things slipped and I'm not sure why." },
    { id: "growth", label: "Growth", example: "e.g. Ready for more, but not sure what the next step looks like." },
  ];

  // Compose the structured intake (pills + free text) into one notes string that
  // feeds focus-point generation the same way free notes do today. Nothing
  // selected → notes is exactly the free text (today's behaviour).
  function composeNotes({ pills, free }) {
    const parts = [];
    if (pills.length) parts.push(`On my mind: ${pills.map((p) => p.label.toLowerCase()).join(", ")}.`);
    if (free) parts.push(free);
    return parts.join("\n");
  }

  function renderInput(name) {
    const cfg = COPY[name];
    const wrap = document.createElement("div");
    wrap.className = "space-y-4";
    wrap.innerHTML = `
      <label class="block">
        <h1 class="h1 mb-4">${cfg.question}</h1>
        <input class="input" type="text" autocomplete="off"
               spellcheck="false" placeholder="${cfg.placeholder}"
               aria-describedby="hint-${cfg.key} err-${cfg.key}" data-autofocus />
      </label>
      <div class="hint" id="hint-${cfg.key}">${cfg.hint}</div>
      <div class="field__error" id="err-${cfg.key}" hidden></div>
    `;
    const input = wrap.querySelector("input");
    input.value = store.ctx[cfg.key] || "";
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitInput();
      }
    });

    function submitInput() {
      const val = input.value.trim();
      const err = wrap.querySelector(".field__error");
      if (!val) {
        err.textContent = "Add a value to continue.";
        err.hidden = false;
        input.setAttribute("aria-invalid", "true");
        return;
      }
      err.hidden = true;
      input.removeAttribute("aria-invalid");
      store.ctx[cfg.key] = val;
      advance();
    }
    submitCurrent = submitInput;
    // Back keeps whatever was typed (validation still guards Continue).
    stashCurrent = () => { store.ctx[cfg.key] = input.value.trim(); };
    return wrap;
  }

  function renderNotes() {
    const cfg = COPY.NOTES;
    const wrap = document.createElement("div");
    wrap.className = "space-y-5";
    wrap.innerHTML = `
      <h1 class="h1 mb-2">${cfg.question}</h1>
      <div class="hint">Optional. Tap what's prompting this 1:1, then add anything in your own words.</div>
      ${isFirstRun ? firstRunNotesExampleHtml() : ""}
      <div class="space-y-2">
        <div class="eyebrow" id="pills-label">What's on your mind?</div>
        <div class="pill-row js-pills" role="group" aria-labelledby="pills-label"></div>
      </div>
      <label class="block space-y-2">
        <textarea class="textarea js-notes" rows="4" placeholder="${cfg.placeholder}"></textarea>
      </label>
    `;
    const selected = new Set(store.ctx.issuePills || []);
    const pillRow = wrap.querySelector(".js-pills");
    // Roving tabindex: the whole chip row is one Tab stop (Tab lands on the
    // group, then moves on to the text box). Arrow keys move between chips,
    // Space/Enter toggles. The first chip is the entry point and gets focus.
    const pillBtns = [];
    function focusPill(next) {
      const n = (next + pillBtns.length) % pillBtns.length;
      pillBtns.forEach((p, idx) => { p.tabIndex = idx === n ? 0 : -1; });
      pillBtns[n].focus();
    }
    ISSUE_PILLS.forEach((iss, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pill" + (selected.has(iss.id) ? " is-selected" : "");
      b.textContent = iss.label;
      b.setAttribute("aria-pressed", selected.has(iss.id) ? "true" : "false");
      b.tabIndex = i === 0 ? 0 : -1;
      if (i === 0) b.setAttribute("data-autofocus", "");
      b.addEventListener("click", () => {
        // Single-select: clicking a chip picks only that one (and clicking the
        // already-selected chip clears it). The text box example follows the pick.
        const on = selected.has(iss.id);
        selected.clear();
        if (!on) selected.add(iss.id);
        pillBtns.forEach((p, idx) => {
          const isOn = selected.has(ISSUE_PILLS[idx].id);
          p.classList.toggle("is-selected", isOn);
          p.setAttribute("aria-pressed", String(isOn));
        });
        ta.placeholder = on ? cfg.placeholder : iss.example;
      });
      b.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); focusPill(i + 1); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); focusPill(i - 1); }
      });
      pillBtns.push(b);
      pillRow.appendChild(b);
    });
    const ta = wrap.querySelector(".js-notes");
    ta.value = store.ctx.freeNotes ?? store.ctx.notes ?? "";
    const preSelected = ISSUE_PILLS.find((iss) => selected.has(iss.id));
    if (preSelected) ta.placeholder = preSelected.example;

    // Enter is a newline in the notes box (audit F2) — the only submit is the
    // footer Continue. Notes are optional: Continue with nothing filled in is
    // the old Skip.
    function commitNotes() {
      const pills = ISSUE_PILLS.filter((i) => selected.has(i.id));
      const free = ta.value.trim();
      store.ctx.issuePills = pills.map((p) => p.id);
      store.ctx.freeNotes = free;
      store.ctx.notes = composeNotes({ pills, free });
    }
    submitCurrent = () => {
      commitNotes();
      submit();
    };
    stashCurrent = commitNotes;
    return wrap;
  }

  function renderMeetingType() {
    const wrap = document.createElement("div");
    wrap.className = "space-y-5";
    wrap.setAttribute("tabindex", "0");
    wrap.setAttribute("data-autofocus", "");
    wrap.innerHTML = `
      <h1 class="h1 mb-2">What kind of meeting?</h1>
      <div class="hint mb-3">Pick whichever is closest. You can add detail next.</div>
      <div class="grid gap-3 js-cards"></div>
    `;
    const cards = wrap.querySelector(".js-cards");
    let selected = Number.isInteger(store.ctx.meetingTypeIndex) ? store.ctx.meetingTypeIndex : 0;

    function paint() {
      cards.innerHTML = "";
      types.forEach((t, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "meeting-card";
        if (i === selected) btn.classList.add("is-selected");
        btn.setAttribute("data-i", String(i));
        btn.setAttribute("aria-pressed", String(i === selected));
        btn.innerHTML = `
          <div>
            <span class="meeting-card__label">${t.label}</span>
            ${t.badge ? `<span class="meeting-card__badge">${t.badge}</span>` : ""}
          </div>
          <div class="meeting-card__meta">${t.duration} · ${t.description}</div>
        `;
        // One commit model (audit F2): clicking only selects; the footer
        // Continue confirms.
        btn.addEventListener("click", () => {
          selected = i;
          paint();
        });
        cards.appendChild(btn);
      });
    }

    function confirm() {
      store.ctx.meetingTypeIndex = selected;
      store.ctx.meetingType = types[selected].label;
      advance();
    }

    paint();

    wrap.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        selected = (selected + 1) % types.length;
        paint();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        selected = (selected - 1 + types.length) % types.length;
        paint();
      } else if (/^[1-9]$/.test(e.key)) {
        const n = Number(e.key) - 1;
        if (n < types.length) {
          selected = n;
          paint();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        confirm();
      }
    });

    submitCurrent = confirm;
    // Back keeps the highlighted card so the round trip restores it.
    stashCurrent = () => {
      store.ctx.meetingTypeIndex = selected;
      if (types[selected]) store.ctx.meetingType = types[selected].label;
    };
    return wrap;
  }

  async function goTo(sub, { push = true } = {}) {
    if (push && sub !== currentSub) history.push(currentSub);
    currentSub = sub;
    refreshStep();
    renderFooter();
    const node = await swapField(host, () => renderField(sub));
    // Each step restarts at the top — Continue leaves the page scrolled down,
    // hiding the next step's question (phone walk 2026-07-11).
    window.scrollTo(0, 0);
    focusField(node);
  }

  // Footer Back: one step back, previously entered values still shown (the
  // store holds the committed ones; stashCurrent keeps the in-progress ones).
  async function goBack() {
    if (!history.length) return;
    if (stashCurrent) { try { stashCurrent(); } catch { /* best-effort */ } }
    await goTo(history.pop(), { push: false });
  }

  async function advance() {
    const idx = SUBSTAGES.indexOf(currentSub);
    const next = SUBSTAGES[idx + 1];
    if (!next) return submit();
    await goTo(next);
  }

  async function submit() {
    // Starting the session is a network call — freeze the footer so a double
    // click can't open two sessions.
    const cont = footerHost.querySelector(".js-wf-continue");
    if (cont) cont.disabled = true;
    try {
      // Guided types (Monthly Check-in) don't run the AI-interview pipeline — branch BEFORE
      // startSession, which getArc()-throws on a guided label. Guided sessions are person-fenced,
      // so a free-typed name is turned into a real roster person first, then the session opens
      // the runner (/guided/:id). The card exists for admins and managers (catalog service).
      const picked = types[store.ctx.meetingTypeIndex];
      if (picked?.kind === "guided") {
        let personId = store.ctx.personId;
        if (!personId) {
          const { person } = await createPerson({
            name: store.ctx.name,
            role: store.ctx.role,
            seniority: store.ctx.seniority,
          });
          personId = person.id;
        }
        const gs = await createGuidedSession({ personId });
        setState({ guidedId: gs.id, stage: STAGES.GUIDED });
        return;
      }
      const payload = {
        personId: store.ctx.personId || undefined, // exact roster link when picked (Phase 4b)
        name: store.ctx.name,
        role: store.ctx.role,
        seniority: store.ctx.seniority,
        meetingTypeIndex: store.ctx.meetingTypeIndex,
        notes: store.ctx.notes || "",
      };
      const res = await startSession(payload);
      try { localStorage.setItem("seroSessionId", res.sessionId); } catch {}
      setState({
        sessionId: res.sessionId,
        sessionDir: res.sessionDir || null,
        createdAt: res.createdAt ?? Date.now(),
        stage: STAGES.FOCUS_POINTS,
      });
    } catch (e) {
      setState({ stage: STAGES.ERROR, error: e.message, retryStage: STAGES.INTAKE });
    }
  }

  // Meeting types, the roster, and the caller's runs load together; a roster failure (guest
  // 401, member 403, network) just means free-text — the intake never blocks on it. The runs
  // join in each person's 1:1 history so the picker can order most-recently-met first and show
  // the last-1:1 date (same buildRosterView the Team page uses). A runs failure just drops the
  // dates and falls back to the roster's own order — the picker still works.
  const [typesRes, rosterRes, runsRes, recentRes] = await Promise.allSettled([
    getMeetingTypes(),
    listPeople(),
    listMyRuns({ open: true }),
    listRecentRuns(1),
  ]);
  types = typesRes.status === "fulfilled" ? typesRes.value.types : [];
  // Zero runs ever (recent covers finished + in-progress) → this is a first prep.
  // Any failure (guest 401, network) leaves it false — guidance never blocks intake.
  isFirstRun =
    recentRes.status === "fulfilled" &&
    Array.isArray(recentRes.value?.runs) &&
    recentRes.value.runs.length === 0;
  if (isFirstRun && firstRunHost) {
    firstRunHost.innerHTML = firstRunIntroHtml();
    refreshStep();
  }
  const peopleRows =
    rosterRes.status === "fulfilled" && Array.isArray(rosterRes.value?.people)
      ? rosterRes.value.people
      : null;
  if (peopleRows && peopleRows.length) {
    const runs = runsRes.status === "fulfilled" && Array.isArray(runsRes.value?.runs) ? runsRes.value.runs : [];
    const byId = new Map(peopleRows.map((p) => [p.id, p]));
    // buildRosterView returns rows sorted freshest-activity-first with lastMet joined in; keep
    // seniority (which it doesn't thread through) from the original roster row for the click seed.
    roster = buildRosterView(peopleRows, runs).map((v) => ({
      id: v.key,
      name: v.name,
      role: v.role,
      seniority: byId.get(v.key)?.seniority ?? "",
      lastMet: v.lastMet,
    }));
  } else {
    roster = peopleRows; // null or [] → free-text path, unchanged
  }

  const node = await swapField(host, () => renderField(currentSub));
  focusField(node);
}

export function unmount() { /* nothing */ }
