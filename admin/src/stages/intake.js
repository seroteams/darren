import { STAGES, resetSession } from "../state.js";
import { getMeetingTypes, startSession, listPeople, listMyRuns, listRecentRuns, createPerson, createGuidedSession } from "../../../shared/api.js";
import { firstRunIntroHtml, firstRunNotesExampleHtml } from "./intake-firstrun.ts";
import { swapField, focusField } from "../ui/field.js";
import { confirmAction } from "../ui/confirm.js";
import { confirmResetSession } from "../ui/session-reset.js";
import { escapeHtml } from "../ui/html.js";
import { buildRosterView } from "../ui/group-people.js";
import { formatDate } from "../ui/time.ts";

const SUBSTAGES = ["NAME", "ROLE", "SENIORITY", "MEETING_TYPE", "NOTES"];

const COPY = {
  NAME: {
    question: "Who are you prepping for?",
    hint: "First name only. Sero works from what you tell it — nothing else.",
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
    hint: "IC level, staff, manager, director — whatever reads naturally.",
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
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--10">
      <header class="space-y-3">
        <div class="intake-header__row">
          <div class="space-y-1 min-w-0">
            <div class="eyebrow">Setup</div>
            <div class="stage-step text-sm text-ink-mute"></div>
          </div>
          <button class="btn btn--ghost js-start-fresh flex-shrink-0" type="button">Cancel setup</button>
        </div>
        <p class="text-ink-dim text-sm max-w-measure js-intake-lede">Two minutes of prep. One sharper conversation.</p>
        <div class="intake-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${SUBSTAGES.length}" aria-valuenow="1">
          <div class="intake-progress__fill"></div>
        </div>
      </header>
      <div class="intake-firstrun-host" hidden></div>
      <div class="field-host"></div>
    </div>
  `;
  const host = root.querySelector(".field-host");
  const stepLabel = root.querySelector(".stage-step");
  const intakeLede = root.querySelector(".js-intake-lede");
  const firstRunHost = root.querySelector(".intake-firstrun-host");
  const progressBar = root.querySelector(".intake-progress");
  const progressFill = root.querySelector(".intake-progress__fill");

  root.querySelector(".js-start-fresh").addEventListener("click", async () => {
    const ok = await confirmResetSession(confirmAction, { to: STAGES.START });
    if (!ok) return;
    resetSession();
    setState({ stage: STAGES.START });
  });

  let types = null;
  let roster = null; // the caller's people (people-roster Phase 4b); null/[] → free-text only
  let isFirstRun = false; // zero-run account → show the first-run guidance (validation-kit Phase 4)
  let currentSub = store.substage || "NAME";

  function refreshStep() {
    const idx = SUBSTAGES.indexOf(currentSub) + 1;
    stepLabel.textContent = `Step ${idx} of ${SUBSTAGES.length}`;
    if (intakeLede) intakeLede.hidden = currentSub !== "NAME";
    // The orientation card belongs on the entry step only, and only for a
    // brand-new account — a veteran starting another prep never sees it.
    if (firstRunHost) firstRunHost.hidden = !(isFirstRun && currentSub === "NAME");
    progressBar.setAttribute("aria-valuenow", String(idx));
    progressFill.style.transform = `scaleX(${idx / SUBSTAGES.length})`;
  }

  refreshStep();

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
    function makeCard(p) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "meeting-card";
      if (store.ctx.personId === p.id) btn.classList.add("is-selected");
      const role = p.role ? `<div class="meeting-card__meta">${escapeHtml(p.role)}</div>` : "";
      // Show when they were last met, so the freshest 1:1s read at a glance (people are
      // already sorted most-recent-first). Never-met roster people simply carry no date.
      const last = p.lastMet ? `<div class="meeting-card__meta">Last 1:1 · ${escapeHtml(formatDate(p.lastMet))}</div>` : "";
      btn.innerHTML = `<div><span class="meeting-card__label">${escapeHtml(p.name)}</span></div>${role}${last}`;
      btn.addEventListener("click", () => {
        store.ctx.personId = p.id;
        store.ctx.name = p.name;
        store.ctx.role = p.role || store.ctx.role || "";
        store.ctx.seniority = p.seniority || store.ctx.seniority || "";
        // Existing roster person — their role/seniority are already known, so skip
        // straight to the meeting type instead of re-asking those details.
        goTo("MEETING_TYPE");
      });
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
    // Always-visible free-name box, below the cards — type a name to add someone
    // new without picking a card first. Submitting free text clears personId, so
    // the server links-or-creates from the name (today's free-text behaviour).
    const fresh = document.createElement("div");
    fresh.className = "space-y-2";
    fresh.innerHTML = `
      <div class="eyebrow">Or add someone new</div>
      <input class="input" type="text" autocomplete="off" spellcheck="false"
             placeholder="${COPY.NAME.placeholder}" aria-label="Add someone new" />
      <div class="field__error" hidden></div>
      <div class="field__actions">
        <button class="btn js-add" type="button">Add &amp; continue</button>
      </div>
    `;
    const freshInput = fresh.querySelector("input");
    if (!store.ctx.personId) freshInput.value = store.ctx.name || "";
    function submitFresh() {
      const val = freshInput.value.trim();
      const err = fresh.querySelector(".field__error");
      if (!val) {
        err.textContent = "Add a name to continue.";
        err.hidden = false;
        freshInput.setAttribute("aria-invalid", "true");
        return;
      }
      err.hidden = true;
      freshInput.removeAttribute("aria-invalid");
      store.ctx.personId = null;
      store.ctx.name = val;
      advance();
    }
    freshInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submitFresh(); }
    });
    fresh.querySelector(".js-add").addEventListener("click", submitFresh);
    wrap.appendChild(fresh);
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
    if (pills.length) parts.push(`On the manager's mind: ${pills.map((p) => p.label.toLowerCase()).join(", ")}.`);
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
      <div class="field__actions">
        <button class="btn js-next">Continue</button>
      </div>
    `;
    const input = wrap.querySelector("input");
    input.value = store.ctx[cfg.key] || "";
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitInput();
      }
    });

    wrap.querySelector(".js-next").addEventListener("click", submitInput);

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
      <div class="field__actions">
        <button class="btn js-submit">Continue</button>
        <button class="btn btn--ghost js-skip">Skip (optional)</button>
      </div>
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

    function go() {
      const pills = ISSUE_PILLS.filter((i) => selected.has(i.id));
      const free = ta.value.trim();
      store.ctx.issuePills = pills.map((p) => p.id);
      store.ctx.freeNotes = free;
      store.ctx.notes = composeNotes({ pills, free });
      submit();
    }
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(); }
    });
    wrap.querySelector(".js-submit").addEventListener("click", go);
    wrap.querySelector(".js-skip").addEventListener("click", () => {
      selected.clear();
      store.ctx.issuePills = [];
      store.ctx.freeNotes = "";
      store.ctx.notes = "";
      submit();
    });
    return wrap;
  }

  function renderMeetingType() {
    const wrap = document.createElement("div");
    wrap.className = "space-y-5";
    wrap.setAttribute("tabindex", "0");
    wrap.setAttribute("data-autofocus", "");
    wrap.innerHTML = `
      <h1 class="h1 mb-2">What kind of meeting?</h1>
      <div class="hint mb-3">Pick the shape that fits today. Click a card to continue — you can add nuance in the notes step.</div>
      <div class="grid gap-3 js-cards"></div>
    `;
    const cards = wrap.querySelector(".js-cards");
    let selected = Number.isInteger(store.ctx.meetingTypeIndex) ? store.ctx.meetingTypeIndex : 0;

    function paint() {
      cards.innerHTML = "";
      types.forEach((t, i) => {
        const btn = document.createElement("button");
        btn.className = "meeting-card";
        if (i === selected) btn.classList.add("is-selected");
        btn.setAttribute("data-i", String(i));
        btn.innerHTML = `
          <div>
            <span class="meeting-card__label">${t.label}</span>
            ${t.badge ? `<span class="meeting-card__badge">${t.badge}</span>` : ""}
          </div>
          <div class="meeting-card__meta">${t.duration} · ${t.description}</div>
        `;
        btn.addEventListener("click", () => {
          selected = i;
          paint();
          confirm();
        });
        cards.appendChild(btn);
      });
    }

    function confirm() {
      store.ctx.meetingTypeIndex = selected;
      store.ctx.meetingType = types[selected].label;
      // Monthly Check-in (guided) branches BEFORE the interview flow: the interview path
      // calls startSession → getArc(label), which would throw for a guided type. Create the
      // guided session and jump to its runner instead (monthly-one-on-one Phase 1).
      if (types[selected].kind === "guided") { startGuided(); return; }
      advance();
    }

    // Open a Monthly Check-in for the chosen person. A roster pick already carries a
    // personId; a free-typed name has none, so create the roster person first (same
    // POST /team/people the roster uses) — a guided session is always about a real person.
    async function startGuided() {
      try {
        let personId = store.ctx.personId;
        if (!personId) {
          const { person } = await createPerson({ name: store.ctx.name, role: store.ctx.role, seniority: store.ctx.seniority });
          personId = person?.id || null;
          store.ctx.personId = personId;
        }
        const session = await createGuidedSession(personId);
        setState({ guidedId: session.id, stage: STAGES.GUIDED });
      } catch (e) {
        setState({ stage: STAGES.ERROR, error: e.message, retryStage: STAGES.INTAKE });
      }
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
          confirm();
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        confirm();
      }
    });

    return wrap;
  }

  async function goTo(sub) {
    currentSub = sub;
    refreshStep();
    const node = await swapField(host, () => renderField(sub));
    // Each step restarts at the top — Continue leaves the page scrolled down,
    // hiding the next step's question (phone walk 2026-07-11).
    window.scrollTo(0, 0);
    focusField(node);
  }

  async function advance() {
    const idx = SUBSTAGES.indexOf(currentSub);
    const next = SUBSTAGES[idx + 1];
    if (!next) return submit();
    await goTo(next);
  }

  async function submit() {
    try {
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
