// Design system — the Sero component sheet, rebuilt as a native admin stage
// (design-stage-native). It used to be a standalone static page at
// /sero-flowbite/index.html opened in a NEW TAB (CDN Tailwind + Flowbite); now it's a
// routed stage in the app's own CSS/tokens, so the main left rail stays and the sheet's
// sidebar is a second-level nav. All 24 sections, no CDN, no iframe. Reuses the real app
// classes (.btn, .card, .um-table*, .um-badge*, .page-header*, .field*, .textarea, .input,
// .bench-select) where they exist; showcase-only bits are local .ds-* classes.

import { createOrb } from "../ui/orb.js";

// Rail order = section order down the page. Each entry needs a matching builder below and
// a <section id="ds-<id>">; the scrollspy wires up automatically.
const SECTIONS = [
  { id: "rules", label: "✔ Before you build" },
  { id: "brandmark", label: "Brandmark / logo" },
  { id: "colours", label: "Colours" },
  { id: "type", label: "Type" },
  { id: "buttons", label: "Buttons" },
  { id: "badges", label: "Badges & tags" },
  { id: "inputs", label: "Inputs" },
  { id: "selects", label: "Pick controls" },
  { id: "datetime", label: "Date & time" },
  { id: "toasts", label: "Toasts & alerts" },
  { id: "table", label: "Table" },
  { id: "cards", label: "Cards" },
  { id: "tabs", label: "Tabs & stages" },
  { id: "pagehead", label: "Header & banner" },
  { id: "scores", label: "Scores" },
  { id: "goals", label: "Goals & legend" },
  { id: "chart", label: "Chart card" },
  { id: "timeline", label: "Timeline" },
  { id: "overlays", label: "Dropdown & modal" },
  { id: "nav", label: "Navigation" },
  { id: "panel", label: "Side panel" },
  { id: "states", label: "Empty & loading" },
  { id: "login", label: "Login card" },
  { id: "inventory", label: "📋 What Sero needs" },
];

const RULES = [
  "Colours come <strong>only from the tokens</strong>. Never type a hex code in a screen file.",
  "<strong>Nothing under 14px</strong>, and colour used as text passes <strong>4.5:1</strong>. On light backgrounds that means the scale's dark step (coral <strong>800</strong>, mint <strong>900</strong>, gold <strong>900</strong>). Never a 700 as text.",
  "<strong>One blue action per screen.</strong> If two blue buttons compete, one is wrong.",
  "Corners: <strong>4px on controls, 12px on cards.</strong>",
  "Every screen ships with its <strong>empty, loading, and error states</strong> designed.",
  "Layout uses the shared primitives (<code>.l-stack</code>, <code>.l-grid</code>…). No bespoke scaffolding.",
  "Anything destructive goes through the <strong>confirm dialog</strong>.",
  "<strong>Works at phone width</strong>. No sideways scroll, everything tappable.",
  "One date format everywhere: <strong>Mon 18 Nov 2024</strong>.",
  "Plain words. Focus ring on everything interactive. No nested cards, no side-stripes, no gradient text.",
];

const CORE = [
  { name: "Action blue", token: "primary-700" },
  { name: "Blue pressed", token: "primary-800" },
  { name: "Ink", token: "charcoal-750" },
  { name: "Page", token: "primary-100" },
  { name: "Coral. Error", token: "coral-700" },
  { name: "Mint. Success", token: "mint-700" },
  { name: "Gold. Warning", token: "gold-700" },
  { name: "Lavender", token: "lavender-700" },
];

const SCALES = [
  { name: "Primary (action blue)", key: "primary" },
  { name: "Mint green (success)", key: "mint" },
  { name: "Sky blue", key: "sky" },
  { name: "Lavender", key: "lavender" },
  { name: "Bright coral (error)", key: "coral" },
  { name: "Golden yellow (warning)", key: "gold" },
  { name: "Teal green", key: "teal" },
  { name: "Navy blue", key: "navy" },
  { name: "Soft gray", key: "soft" },
  { name: "Charcoal gray", key: "charcoal" },
  { name: "Off white", key: "offwhite" },
];
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Category tags — colour comes from the block/category tokens (tokens.css), not hex.
const TAGS = [
  { emoji: "🗒", label: "Tasks", bg: "gold-200", fg: "gold-900" },
  { emoji: "👥", label: "Our team", bg: "coral-200", fg: "coral-800" },
  { emoji: "🌱", label: "Development", bg: "mint-300", fg: "mint-900" },
  { emoji: "🎈", label: "Fun", bg: "sky-200", fg: "sky-800" },
  { emoji: "✨", label: "Fulfilment", bg: "lavender-200", fg: "lavender-800" },
];

const BRAND_COLOURS = [
  { file: "charcoal", name: "Charcoal", note: "master · #333333" },
  { file: "ink", name: "Ink", note: "#1f2a37" },
  { file: "blue", name: "Action blue", note: "#5aa9e6" },
  { file: "blue-deep", name: "Blue pressed", note: "#1b5d91" },
  { file: "mint", name: "Mint", note: "#1aa887" },
  { file: "lavender", name: "Lavender", note: "#55358f" },
  { file: "coral", name: "Coral", note: "#ac1608" },
];

const AXES = [
  { label: "Wellbeing", pct: 65, val: "+3", fill: "var(--color-accent)", valColor: "" },
  { label: "Engagement", pct: 30, val: "−2", fill: "var(--color-negative)", valColor: "var(--color-negative-text)" },
  { label: "Clarity", pct: 55, val: "+1", fill: "var(--color-accent)", valColor: "" },
  { label: "Growth", pct: 80, val: "+4", fill: "var(--color-accent)", valColor: "" },
];

// Lifecycle state — all torn down in unmount() so nothing leaks after leaving the stage.
let observer = null;
let toastTimers = [];
let liveToasts = [];
let docClick = null;
let orbDemo = null; // live loading-mark demo in the states section

function hexOf(el) {
  const c = getComputedStyle(el).backgroundColor;
  const m = c.match(/\d+/g);
  if (!m || m.length < 3) return c;
  return "#" + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, "0")).join("");
}

// --- section builders --------------------------------------------------------

function railHtml() {
  const links = SECTIONS.map(
    (s) => `<a class="ds-rail__link" href="#ds-${s.id}" data-spy="${s.id}">${s.label}</a>`
  ).join("");
  return `
    <nav class="ds-rail" aria-label="Design system sections">
      <p class="ds-rail__title">Sero design system</p>
      <div class="ds-rail__links">${links}</div>
    </nav>`;
}

function sec(id, headingHtml, bodyHtml, subtitle = "") {
  const sub = subtitle ? ` <span class="ds-sub">${subtitle}</span>` : "";
  return `<section class="ds-section" id="ds-${id}"><h2 class="h2">${headingHtml}${sub}</h2>${bodyHtml}</section>`;
}

function rulesHtml() {
  const cells = RULES.map((r, i) => `<p><strong>${i + 1}.</strong> ${r}</p>`).join("");
  return sec(
    "rules",
    "✔ Before you build",
    `<p class="lead">Check every new or touched screen against this list. If one fails, it's not done.</p>
     <div class="ds-card"><div class="ds-rulesgrid">${cells}</div></div>`
  );
}

function brandmarkHtml() {
  const brand = (f) => `/sero-flowbite/brand/sero-brandmark-${f}.svg`;
  const colours = BRAND_COLOURS.map(
    (c) => `<div class="ds-brandtile"><img src="${brand(c.file)}" alt="Sero logo, ${c.name}" width="80" height="80">
      <p class="ds-swatch__name">${c.name}</p><p class="ds-swatch__meta">${c.note}</p></div>`
  ).join("");
  return sec(
    "brandmark",
    "Brandmark",
    `<p class="lead">The rounded square with two bars and two dots is <strong>the Sero logo</strong>. The one official
      mark. Files live in <code>admin/public/sero-flowbite/brand/</code>. Use them as-is: don't recolour the marks,
      squash the square, or add effects.</p>
     <div class="ds-card ds-brandmaster">
       <img src="${brand("charcoal")}" alt="Sero logo" width="96" height="96" style="border-radius: var(--sero-radius-xl)">
       <div><p class="h4">The master</p><p class="body" style="color: var(--color-ink-dim)"><code>sero-brandmark-charcoal.svg</code>. Charcoal tile, white marks. The default; reach for it unless there's a reason to use another colour.</p></div>
     </div>
     <p class="label">Colour versions. All from our tokens, marks stay white</p>
     <div class="ds-brandgrid ds-brandgrid--4">${colours}</div>
     <div class="ds-card"><div class="ds-rulesgrid">
       <p><strong>Clear space:</strong> one bar-width clear on every side.</p>
       <p><strong>Minimum size:</strong> never below 24px.</p>
       <p><strong>Don't</strong> recolour the marks, squash the square, or add shadows/gradients.</p>
       <p><strong>The corners are the mark</strong>. Never square off the tile.</p>
     </div></div>`,
    "(this is our logo)"
  );
}

function coloursHtml() {
  const core = CORE.map(
    (c) => `<div data-swatch><div class="ds-swatch" style="background: var(--sero-${c.token})"></div>
      <p class="ds-swatch__name">${c.name}</p><p class="ds-swatch__meta">${c.token} · <span data-hex></span></p></div>`
  ).join("");
  const ramps = SCALES.map(
    (s) => `<div class="ds-ramp"><p class="ds-ramp__name">${s.name}</p><div class="ds-ramp__row">
      ${STEPS.map(
        (step) => `<div><div class="ds-ramp__chip" style="background: var(--sero-${s.key}-${step})" title="--sero-${s.key}-${step}"></div><p class="ds-ramp__step">${step}</p></div>`
      ).join("")}
    </div></div>`
  ).join("");
  return sec(
    "colours",
    "Colours",
    `<div class="ds-swatchgrid">${core}</div>
     <details class="ds-details">
       <summary>Full palette. All 11 scales, 50 → 950 (click to open)</summary>
       <div class="ds-details__body">
         <div class="ds-palette">${ramps}</div>
         <p class="caption">How to use a scale: <strong>100–300</strong> tinted backgrounds · <strong>700</strong> the
           colour itself (fills, bars, borders) · text on light needs the step that passes <strong>4.5:1</strong>. 
           coral <strong>800</strong> · mint <strong>900</strong> · gold <strong>900</strong>. In code:
           <code>var(--sero-&lt;scale&gt;-&lt;step&gt;)</code>. Never the hex.</p>
       </div>
     </details>`
  );
}

function typeHtml() {
  return sec(
    "type",
    "Type",
    `<div class="ds-card ds-type">
       <p class="text-display">Display. Bricolage Grotesque</p>
       <p class="h2">Headline. Bricolage Grotesque</p>
       <p class="h3">Title. Inter semibold</p>
       <p class="body">Body 16. Inter regular. Most reading happens here; keep lines under 75 characters.</p>
       <p class="caption">Small 14. Inter, secondary details. This is the floor; nothing goes smaller.</p>
     </div>`
  );
}

function buttonsHtml() {
  return sec(
    "buttons",
    "Buttons",
    `<div class="ds-card ds-row">
       <button type="button" class="btn">▶ Open 1:1</button>
       <button type="button" class="btn btn--ghost">Reschedule 1:1</button>
       <button type="button" class="ds-btn-quiet">View profile</button>
       <button type="button" class="btn btn--danger">Delete</button>
       <button type="button" class="btn" disabled>Disabled</button>
     </div>
     <p class="caption">One filled-blue button per screen. Everything else stays quiet. No trailing arrows on action buttons.</p>`
  );
}

function badgesHtml() {
  const tags = TAGS.map(
    (t) => `<span class="ds-tag" style="background: var(--sero-${t.bg}); color: var(--sero-${t.fg})">${t.emoji} ${t.label}</span>`
  ).join("");
  return sec(
    "badges",
    "Badges &amp; tags",
    `<div class="ds-card" style="display:flex; flex-direction:column; gap: var(--sero-space-5)">
       <div class="ds-row">${tags}</div>
       <div class="ds-row">
         <span class="um-badge um-badge--manager">Manager</span>
         <span class="ds-scorepill">Score 7.5 <span>↑ 2.5</span></span>
         <span class="ds-avatarwrap">
           <span class="ds-avatar" style="width:3rem; height:3rem">JW</span>
           <span class="ds-count">8</span>
         </span>
       </div>
     </div>`
  );
}

function inputsHtml() {
  return sec(
    "inputs",
    "Inputs",
    `<div class="ds-card ds-formgrid">
       <div class="field"><label class="field__label" for="ds-name">Your name</label>
         <input class="ds-input" id="ds-name" type="text" placeholder="James Warren"></div>
       <div class="field"><label class="field__label" for="ds-type">Meeting type</label>
         <select class="bench-select" id="ds-type"><option>Bi-weekly 1:1</option><option>Feels-off check-in</option><option>Quarterly review</option></select></div>
       <div class="field ds-col2"><label class="field__label" for="ds-msg">Your message</label>
         <textarea class="textarea" id="ds-msg" rows="3" placeholder="What would you like to talk about?"></textarea></div>
       <div class="field ds-col2"><label class="field__label" for="ds-bad">Field with a problem</label>
         <input class="ds-input is-error" id="ds-bad" type="text" placeholder="Required">
         <p class="field__error">Please fill this in before saving.</p></div>
       <div class="field ds-col2"><label class="field__label" for="ds-search">Search</label>
         <div class="ds-search"><span class="ds-search__icon">⌕</span>
           <input class="ds-input" id="ds-search" type="search" placeholder="Search people, teams, runs…"></div></div>
     </div>
     <div class="ds-card" style="display:flex; flex-direction:column; gap: var(--sero-space-3)">
       <h3 class="h4">Session variant. The big "one question at a time" input</h3>
       <p class="caption">Used only inside the 1:1 session flow (no box, bottom line, large type). Everywhere else uses the compact boxed inputs above. These are the only two input styles.</p>
       <input class="input" type="text" placeholder="What's the team member's name?">
     </div>`
  );
}

function selectsHtml() {
  return sec(
    "selects",
    "Pick controls",
    `<div class="ds-card ds-pickgrid">
       <div class="ds-pickcol"><p class="label">Checkboxes. Pick many</p>
         <label class="ds-optrow"><input class="ds-check" type="checkbox" checked> Wellbeing</label>
         <label class="ds-optrow"><input class="ds-check" type="checkbox" checked> Growth</label>
         <label class="ds-optrow"><input class="ds-check" type="checkbox"> Clarity</label></div>
       <div class="ds-pickcol"><p class="label">Radios. Pick one</p>
         <label class="ds-optrow"><input class="ds-radio" type="radio" name="ds-mt" checked> Bi-weekly 1:1</label>
         <label class="ds-optrow"><input class="ds-radio" type="radio" name="ds-mt"> Feels-off check-in</label>
         <label class="ds-optrow"><input class="ds-radio" type="radio" name="ds-mt"> Quarterly review</label></div>
       <div class="ds-pickcol"><p class="label">Toggles. On / off</p>
         <label class="ds-toggle"><input type="checkbox" checked><span class="ds-toggle__track"></span><span>Remind me before each 1:1</span></label>
         <label class="ds-toggle"><input type="checkbox"><span class="ds-toggle__track"></span><span>Weekly summary email</span></label></div>
     </div>
     <p class="caption">Checked = action blue, always. Checkbox for many, radio for one, toggle only for instant on/off settings.</p>`,
    "(one \"choose me\" look)"
  );
}

function datetimeHtml() {
  return sec(
    "datetime",
    "Date &amp; time",
    `<div class="ds-card ds-formgrid ds-formgrid--3">
       <div class="field"><label class="field__label" for="ds-d1">Date</label><input class="ds-input" id="ds-d1" type="date" value="2024-11-18"></div>
       <div class="field"><label class="field__label" for="ds-t1">Starts</label><input class="ds-input" id="ds-t1" type="time" value="13:45"></div>
       <div class="field"><label class="field__label" for="ds-t2">Ends</label><input class="ds-input" id="ds-t2" type="time" value="14:30"></div>
     </div>
     <p class="caption">Native pickers, Sero-styled. Displayed dates always read <strong>Mon 18 Nov 2024</strong>.</p>`
  );
}

function toastsHtml() {
  return sec(
    "toasts",
    "Toasts &amp; alerts",
    `<div class="ds-card" style="display:flex; flex-direction:column; gap: var(--sero-space-4)">
       <div class="ds-alert" role="status"><span class="ds-alert__icon" style="background: var(--sero-mint-300); color: var(--color-positive-text)">✓</span>
         <p class="body">Saved. Your note is on James's page.</p></div>
       <div class="ds-alert ds-alert--error" role="alert"><span class="ds-alert__icon" style="background: var(--sero-coral-200); color: var(--color-negative-text)">!</span>
         <div><p class="body" style="font-weight:600">Couldn't save your note.</p>
           <p class="caption">The connection dropped. Your text is still here. Try again.</p>
           <button type="button" class="btn btn--ghost" style="margin-top: var(--sero-space-2)">Try again</button></div></div>
       <div class="ds-alert ds-alert--warn" role="status"><span class="ds-alert__icon" style="background: var(--sero-gold-200); color: var(--sero-gold-900)">▲</span>
         <p class="body">This 1:1 has no agenda yet. James can't prepare.</p></div>
       <div><button type="button" class="btn btn--ghost js-toast">▶ Try a live toast</button></div>
     </div>
     <p class="caption">Success = toast, slides in bottom-right, gone in 4s. Errors stay until dealt with. Warnings sit inline, near the thing they warn about.</p>`,
    "(one system for \"it worked / it didn't\")"
  );
}

function tableHtml() {
  const row = (initials, avBg, avFg, name, role, badge, last, score, trend) => `
    <tr class="um-row">
      <td><span class="um-activity"><span class="ds-avatar" style="width:2.25rem; height:2.25rem; background: var(--sero-${avBg}); color: var(--sero-${avFg})">${initials}</span>
        <span><span class="um-user__open" style="display:block">${name}</span><span class="um-user__email" style="display:block">${role}</span></span></span></td>
      <td><span class="um-badge um-badge--${badge}">${badge}</span></td>
      <td style="color: var(--color-ink-dim)">${last}</td>
      <td>${score}${trend}</td>
      <td style="text-align:right"><button class="ds-rowmenu" aria-label="Row actions">⋯</button></td>
    </tr>`;
  return sec(
    "table",
    "Table",
    `<div class="ds-card" style="padding:0; overflow:hidden">
       <div class="um-table-wrap"><table class="um-table" style="padding: var(--sero-space-2)">
         <thead><tr><th style="padding: var(--sero-space-3) var(--sero-space-4)">Person</th><th>Role</th><th>Last 1:1</th><th>Score</th><th></th></tr></thead>
         <tbody>
           ${row("JW", "primary-200", "primary-800", "James Warren", "Senior UX Writer", "member", "Mon 4 Nov 2024", "<span style=\"font-weight:600\">7.5</span>", " <span style=\"color: var(--color-positive-text)\">↑ 2.5</span>")}
           ${row("AP", "lavender-200", "lavender-800", "Amara Patel", "Product Designer", "manager", "Fri 15 Nov 2024", "<span style=\"font-weight:600\">6.0</span>", " <span style=\"color: var(--color-ink-mute)\">→</span>")}
           ${row("TK", "mint-300", "mint-900", "Tom Kowalski", "Engineer", "admin", "–", "<span style=\"color: var(--color-ink-dim)\">No 1:1s yet</span>", "")}
         </tbody>
       </table></div>
     </div>
     <p class="caption">Whole row clickable · header muted · avatar + name + quiet second line · role badges · ⋯ menu right · scrolls sideways inside its card on phones.</p>`,
    "(one style. User lists, run lists, all of it)"
  );
}

function cardsHtml() {
  return sec(
    "cards",
    "Cards",
    `<div class="ds-cardgrid">
       <div class="card ds-requestcard">
         <span class="ds-requestcard__icon">✓</span>
         <div style="display:flex; flex-direction:column; gap: var(--sero-space-2)">
           <p class="body">"I'd like to discuss opportunities for taking on more responsibility within the team."</p>
           <div class="ds-row" style="gap: var(--sero-space-2)">
             <span class="ds-tag" style="background: var(--color-bg); color: var(--color-ink-dim)">📅 11 May · 15:00</span>
             <span class="ds-tag" style="background: var(--sero-coral-200); color: var(--sero-coral-800)">👥 Our team</span>
           </div>
         </div>
       </div>
       <div class="card" style="display:flex; flex-direction:column; gap: var(--sero-space-2)">
         <h3 class="h3">Upcoming 1:1s</h3>
         <p class="body" style="color: var(--color-ink-dim)">Three conversations this week. James is first, Monday 13:45.</p>
         <button type="button" class="ds-link" style="align-self:flex-start">See all</button>
       </div>
     </div>`
  );
}

function tabsHtml() {
  const tabs = ["Preparing", "Catchup", "Requests", "Rating", "Feedback", "Goals", "Summary"]
    .map((t, i) => `<button class="ds-tab${i === 0 ? " is-active" : ""}" role="tab">${t}</button>`)
    .join("");
  return sec(
    "tabs",
    "Tabs &amp; stages",
    `<div class="ds-card" style="display:flex; flex-direction:column; gap: var(--sero-space-8)">
       <div><p class="label" style="margin-bottom: var(--sero-space-3)">Tabs. The 1:1 pages</p>
         <div class="ds-tabs" role="tablist">${tabs}</div></div>
       <div><p class="label" style="margin-bottom: var(--sero-space-3)">Stage breadcrumb. Session progress</p>
         <div class="ds-crumb">
           <span class="ds-crumb__done">✓ Setup</span><span class="ds-crumb__sep">›</span>
           <span class="ds-crumb__done">✓ Focus areas</span><span class="ds-crumb__sep">›</span>
           <span class="ds-crumb__now">Prep brief</span><span class="ds-crumb__sep">›</span>
           <span class="ds-crumb__ahead">Questions</span><span class="ds-crumb__sep">›</span>
           <span class="ds-crumb__ahead">Briefing</span>
         </div></div>
     </div>
     <p class="caption">Done stages get a green tick and stay clickable. The current stage carries the blue underline. On phones the breadcrumb scrolls sideways.</p>`
  );
}

function pageheadHtml() {
  return sec(
    "pagehead",
    "Page header &amp; welcome banner",
    `<div class="ds-card" style="display:flex; flex-direction:column; gap: var(--sero-space-8)">
       <div class="page-header" style="border-bottom:1px solid var(--color-border); padding-bottom: var(--sero-space-5)">
         <div class="page-header__row">
           <div><p class="eyebrow">Your team</p><h3 class="h2">User management</h3>
             <p class="page-header__lede">Everyone with a Sero account, grouped by company.</p></div>
           <button type="button" class="btn">Invite someone</button>
         </div>
       </div>
       <div class="ds-banner">
         <div><h3 class="h2">Good morning, Carl</h3><p class="body" style="color: var(--color-ink-dim)">Three 1:1s this week. James is first. Monday 13:45.</p></div>
         <button type="button" class="btn">Prep James's 1:1</button>
       </div>
     </div>
     <p class="caption">Header: eyebrow, Bricolage title, one quiet line, one action right. Banner: accent-soft wash, never a photo, never a gradient.</p>`
  );
}

function scoresHtml() {
  const stars = [1, 1, 1, 1, 0].map((on) => `<button class="ds-star${on ? "" : " is-off"}">★</button>`).join("");
  const axes = AXES.map(
    (a) => `<span>${a.label}</span>
      <span class="ds-axis__track"><span class="ds-axis__fill" style="width:${a.pct}%; background:${a.fill}"></span></span>
      <span class="ds-axis__val"${a.valColor ? ` style="color:${a.valColor}"` : ""}>${a.val}</span>`
  ).join("");
  return sec(
    "scores",
    "Scores",
    `<div class="ds-card" style="display:flex; flex-direction:column; gap: var(--sero-space-8)">
       <div><p class="label" style="margin-bottom: var(--sero-space-3)">Star rating. How was this 1:1?</p>
         <div class="ds-stars" role="radiogroup" aria-label="Rate this 1:1">${stars}<span class="caption" style="margin-left: var(--sero-space-2)">4 of 5</span></div></div>
       <div style="display:flex; flex-direction:column; gap: var(--sero-space-4)">
         <p class="label">Axis bars. Sero's signature</p>
         <div class="ds-axes">${axes}</div>
         <p class="body" style="color: var(--color-ink-dim)">Engagement dipped after the reorg. James said the new split "makes my work invisible". That's the thread to pull on Monday.</p>
       </div>
     </div>
     <p class="caption">Every score sits next to the sentence that earned it. No bare-number tiles, ever.</p>`,
    "(a number never stands alone)"
  );
}

function goalsHtml() {
  const dot = (t) => `<span><span class="ds-dot" style="background: var(--sero-${t.c})"></span>${t.l}</span>`;
  return sec(
    "goals",
    "Goal columns &amp; legend",
    `<div class="ds-card" style="display:flex; flex-direction:column; gap: var(--sero-space-6)">
       <div class="ds-goals">
         <div class="ds-goalcol"><p class="label">To do · 2</p>
           <div class="ds-goalcard">Shadow a senior writer for one sprint</div>
           <div class="ds-goalcard">Draft the voice &amp; tone guide</div></div>
         <div class="ds-goalcol"><p class="label">Doing · 1</p>
           <div class="ds-goalcard">Lead the onboarding-copy rewrite <span class="ds-tag" style="margin-top: var(--sero-space-2); background: var(--sero-gold-200); color: var(--sero-gold-900)">due Fri</span></div></div>
         <div class="ds-goalcol"><p class="label">Done · 1</p>
           <div class="ds-goalcard is-done">Publish the error-message guide</div></div>
       </div>
       <div class="ds-legend"><span style="font-weight:500">Legend:</span>
         ${[{ c: "primary-700", l: "Active" }, { c: "gold-700", l: "Due soon" }, { c: "coral-700", l: "Overdue" }, { c: "mint-700", l: "Done" }].map(dot).join("")}</div>
     </div>`
  );
}

function chartHtml() {
  return sec(
    "chart",
    "Chart card",
    `<div class="card" style="max-width:36rem; display:flex; flex-direction:column; gap: var(--sero-space-4)">
       <div style="display:flex; align-items:baseline; justify-content:space-between">
         <h3 class="h3">Team score, last 6 weeks</h3><span class="caption" style="color: var(--color-positive-text); font-weight:600">↑ 1.2</span></div>
       <svg viewBox="0 0 400 140" style="width:100%" role="img" aria-label="Line chart: team score rising from 5.8 to 7.5 over six weeks">
         <polygon points="0,100 80,90 160,95 240,60 320,45 400,30 400,140 0,140" style="fill: var(--color-accent-soft)" opacity="0.6"/>
         <polyline points="0,100 80,90 160,95 240,60 320,45 400,30" fill="none" style="stroke: var(--color-accent)" stroke-width="3" stroke-linecap="round"/>
         <line x1="0" y1="139" x2="400" y2="139" style="stroke: var(--color-border)" stroke-width="1"/>
       </svg>
       <div style="display:flex; justify-content:space-between" class="caption"><span>7 Oct</span><span>21 Oct</span><span>4 Nov</span><span>18 Nov</span></div>
       <p class="body" style="color: var(--color-ink-dim)">The climb starts the week the team began sharing agendas up front.</p>
     </div>
     <p class="caption">One line, one accent, soft fill, sentence underneath. No grids of KPI tiles, no dual axes, no 3D.</p>`
  );
}

function timelineHtml() {
  const item = (dotToken, date, body) => `<li><span class="ds-timeline__dot" style="background: var(--sero-${dotToken})"></span>
    <p class="caption">${date}</p><p class="body">${body}</p></li>`;
  return sec(
    "timeline",
    "Timeline",
    `<div class="card" style="max-width:36rem">
       <ol class="ds-timeline">
         ${item("primary-700", "Mon 4 Nov 2024", "1:1 held. Scored <strong>7.5</strong>, agreed to hand James the onboarding rewrite.")}
         ${item("gold-700", "Fri 8 Nov 2024", "James added a request: <em>\"talk about prioritising my tasks\"</em>.")}
         ${item("mint-700", "Tue 12 Nov 2024", "Goal done: error-message guide published.")}
       </ol>
     </div>`,
    "(\"since last time\")"
  );
}

function overlaysHtml() {
  return sec(
    "overlays",
    "Dropdown &amp; modal",
    `<div class="ds-card ds-row">
       <div class="ds-menu">
         <button type="button" class="btn btn--ghost js-dd-toggle" aria-expanded="false">Row actions ▾</button>
         <div class="ds-menu__list" hidden>
           <a class="ds-menu__item" href="#">Extend by 1 week</a>
           <a class="ds-menu__item" href="#">Choose new date</a>
           <a class="ds-menu__item" href="#">Mark as complete</a>
           <a class="ds-menu__item ds-menu__item--danger" href="#">Remove</a>
         </div>
       </div>
       <button type="button" class="btn js-modal-open">Add a note</button>
     </div>
     <div class="ds-modal-backdrop js-modal-backdrop" hidden>
       <div class="ds-modal" role="dialog" aria-modal="true" aria-label="Add a rating note">
         <div class="ds-modal__head"><h3 class="h3">Add a rating note</h3><button type="button" class="ds-rowmenu js-modal-close" aria-label="Close">✕</button></div>
         <div class="ds-modal__body"><div class="field"><label class="field__label" for="ds-note">Your note</label>
           <textarea class="textarea" id="ds-note" rows="4" placeholder="What made this 1:1 a 7.5?"></textarea></div></div>
         <div class="ds-modal__foot"><button type="button" class="btn btn--ghost js-modal-close">Cancel</button><button type="button" class="btn js-modal-close">Save note</button></div>
       </div>
     </div>`,
    "(click them. Live)"
  );
}

function navHtml() {
  const icon = (glyph, active) => `<span class="ds-navdemo__icon${active ? " is-active" : ""}">${glyph}</span>`;
  return sec(
    "nav",
    "Navigation",
    `<div class="ds-navdemo">
       <div class="ds-navdemo__top">
         <div class="ds-row" style="gap: var(--sero-space-3)"><span class="ds-brandbadge">S</span><span class="h4">Sero</span></div>
         <div class="ds-row" style="gap: var(--sero-space-4)"><button class="ds-link">Help</button><span class="ds-avatar" style="width:2.25rem; height:2.25rem">CH</span></div>
       </div>
       <div class="ds-navdemo__body">
         <div class="ds-navdemo__rail">${icon("⌂", true)}${icon("👥", false)}${icon("▤", false)}</div>
         <div class="ds-navdemo__content">Page content sits on the tinted background; cards float on white.</div>
       </div>
     </div>`
  );
}

function panelHtml() {
  return sec(
    "panel",
    "Side panel",
    `<div class="ds-panel">
       <div class="ds-panel__body">
         <div style="display:flex; align-items:flex-start; justify-content:space-between"><p class="eyebrow">Upcoming 1:1</p><button class="ds-rowmenu" aria-label="Close">✕</button></div>
         <div class="ds-row" style="gap: var(--sero-space-4)"><span class="ds-avatar" style="width:3.5rem; height:3.5rem; font-size: var(--type-h4)">JW</span>
           <div><p class="h3">James Warren</p><p class="body" style="color: var(--color-ink-dim)">Senior UX Writer</p></div></div>
         <div class="ds-row" style="gap: var(--sero-space-3)"><button class="ds-link">View profile</button><button class="ds-link">Edit</button></div>
         <hr style="border:0; border-top:1px solid var(--color-border); margin:0">
         <dl class="ds-dl">
           <div class="ds-dl__row"><dt>When</dt><dd>Mon 18 Nov 2024</dd></div>
           <div class="ds-dl__row"><dt>Time</dt><dd>13:45–14:30 BKK</dd></div>
           <div class="ds-dl__row"><dt>Where</dt><dd><button class="ds-link">Join Google Meet</button></dd></div>
           <div class="ds-dl__row"><dt>Last 1:1</dt><dd>4 Nov · <span style="color: var(--color-positive-text)">7.5 ↑</span></dd></div>
         </dl>
         <div><p class="h4" style="margin-bottom: var(--sero-space-2)">5 requests</p>
           <div class="ds-goalcard">"Could we talk about ways to better prioritize my tasks?"
             <div style="margin-top: var(--sero-space-2)"><span class="ds-tag" style="background: var(--sero-gold-200); color: var(--sero-gold-900)">🗒 Tasks</span></div></div></div>
       </div>
       <div class="ds-panel__foot"><button type="button" class="btn btn--ghost">Reschedule</button><button type="button" class="btn">Open 1:1</button></div>
     </div>
     <p class="caption">Actions live once (in the footer), no trailing arrows, name outweighs the job title, the Meet link is a button.</p>`,
    "(the \"Upcoming 1:1\" pattern)"
  );
}

function statesHtml() {
  return sec(
    "states",
    "Empty, loading &amp; tooltip",
    `<div class="ds-cardgrid">
       <div class="card ds-empty">
         <span class="ds-avatar" style="width:3rem; height:3rem">✉</span>
         <p class="h4">No requests yet</p>
         <p class="body" style="color: var(--color-ink-dim)">When James adds something he wants to talk about, it lands here.</p>
         <button type="button" class="btn btn--ghost">Add one for him</button>
       </div>
       <div class="card" style="display:flex; flex-direction:column; gap: var(--sero-space-4)">
         <p class="label">Loading skeleton (data on its way)</p>
         <div class="ds-skel">
           <div class="ds-skel__bar" style="width:66%; height:1.25rem"></div>
           <div class="ds-skel__bar" style="width:100%"></div>
           <div class="ds-skel__bar" style="width:83%"></div>
         </div>
         <div class="ds-row" style="border-top:1px solid var(--color-border); padding-top: var(--sero-space-4)">
           <span class="ds-spinner"></span><span class="caption">Spinner. Short waits only. Longer engine waits show the Sero mark, below.</span></div>
         <div class="ds-row js-orb-demo" style="border-top:1px solid var(--color-border); padding-top: var(--sero-space-4)"></div>
       </div>
     </div>
     <div class="ds-card ds-row">
       <span class="ds-tooltip-wrap"><button type="button" class="btn btn--ghost">Hover me</button><span class="ds-tooltip">Short, plain, never essential info</span></span>
       <p class="caption">Tooltips: ink background, for nice-to-know only. Never hide something needed to act.</p>
     </div>`
  );
}

function loginHtml() {
  return sec(
    "login",
    "Login card",
    `<div class="ds-loginwrap">
       <div class="card ds-logincard">
         <div class="ds-row" style="gap: var(--sero-space-3)"><span class="ds-brandbadge" style="width:2.5rem; height:2.5rem; font-size: var(--type-h4)">S</span>
           <div><p class="h3">Welcome back</p><p class="caption">Log in to Sero</p></div></div>
         <div class="field"><label class="field__label" for="ds-email">Email</label><input class="ds-input" id="ds-email" type="email" placeholder="you@company.com"></div>
         <div class="field"><label class="field__label" for="ds-pass">Password</label><input class="ds-input" id="ds-pass" type="password" placeholder="••••••••"></div>
         <button type="button" class="btn" style="width:100%; justify-content:center">Log in</button>
         <p class="caption" style="text-align:center">New here? <button class="ds-link">Create your company's space</button></p>
       </div>
     </div>`
  );
}

function inventoryHtml() {
  const group = (title, items) => `<div class="card"><h3 class="h4" style="margin-bottom: var(--sero-space-3)">${title}</h3>
    <ul class="ds-checklist">${items.map((i) => `<li>✅ ${i}</li>`).join("")}</ul></div>`;
  return sec(
    "inventory",
    "📋 What Sero needs",
    `<p class="lead">Every component type Sero uses. <strong>all ✅, all on this sheet</strong>. If a screen needs
      something not listed here, add it to the sheet first, then build the screen.</p>
     <div class="ds-cardgrid">
       ${group("Basics", ["Buttons (primary / secondary / quiet / danger / disabled)", "Badges &amp; category tags", "Avatars + count badge", "Inputs (boxed + big session variant, error state)", "Checkbox · radio · toggle switch", "Search box", "Date + time picker"])}
       ${group("Layout &amp; navigation", ["Topbar + icon rail", "Cards (content + request)", "Side panel / slide-over", "Tabs (the 1:1 stages)", "Stage breadcrumb", "Page header", "Welcome banner"])}
       ${group("Data &amp; content", ["Table (one canonical style)", "Score elements: pill · stars · axis bars", "Goal columns (To do / Doing / Done)", "Chart card", "Legend / key row", "Timeline / \"since last time\""])}
       ${group("Feedback &amp; states", ["Modal · dropdown menu", "Toast / inline alert", "Tooltip", "Empty state", "Loading skeleton + spinner", "Confirmation dialog", "Login / signup card"])}
     </div>`
  );
}

function contentHtml() {
  return [
    rulesHtml(), brandmarkHtml(), coloursHtml(), typeHtml(), buttonsHtml(), badgesHtml(),
    inputsHtml(), selectsHtml(), datetimeHtml(), toastsHtml(), tableHtml(), cardsHtml(),
    tabsHtml(), pageheadHtml(), scoresHtml(), goalsHtml(), chartHtml(), timelineHtml(),
    overlaysHtml(), navHtml(), panelHtml(), statesHtml(), loginHtml(), inventoryHtml(),
  ].join("");
}

// --- lifecycle ---------------------------------------------------------------

export async function mount(root) {
  root.classList.add("ds-stage");
  root.innerHTML = `
    <div class="ds-layout">
      ${railHtml()}
      <div class="ds-content">
        <header class="ds-head">
          <h1 class="text-display">Sero design system</h1>
          <p class="lead">The Sero look in one page: our components in our own colours. New screens copy from here.
            Controls round at 4px, cards at 12px. Nothing smaller than 14px. One blue action per screen.</p>
        </header>
        ${contentHtml()}
      </div>
    </div>`;

  // Live loading mark — the actual animated Sero loader (createOrb) in the states
  // section, so the sheet shows the real thing, not a still.
  const orbHost = root.querySelector(".js-orb-demo");
  if (orbHost) {
    orbDemo = createOrb("Scoring answer…");
    orbHost.appendChild(orbDemo.el);
  }

  // Core-swatch captions get the real resolved hex (token → computed colour).
  root.querySelectorAll("[data-swatch]").forEach((w) => {
    const chip = w.querySelector(".ds-swatch");
    const out = w.querySelector("[data-hex]");
    if (chip && out) out.textContent = hexOf(chip);
  });

  // In-page anchors scroll smoothly without pushing a hash onto the URL.
  root.querySelectorAll(".ds-rail__link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const id = a.getAttribute("href").slice(1);
      root.querySelector("#" + CSS.escape(id))?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // Live toast — slides in bottom-right, gone in 4s. Timers + nodes tracked for unmount.
  root.querySelector(".js-toast")?.addEventListener("click", () => {
    const t = document.createElement("div");
    t.className = "ds-toast-live";
    t.setAttribute("role", "status");
    t.innerHTML = `<span class="ds-alert__icon" style="background: var(--sero-mint-300); color: var(--color-positive-text)">✓</span><p class="body">Saved. That worked.</p>`;
    document.body.appendChild(t);
    liveToasts.push(t);
    requestAnimationFrame(() => t.classList.add("is-in"));
    toastTimers.push(
      setTimeout(() => {
        t.classList.remove("is-in");
        toastTimers.push(setTimeout(() => t.remove(), 350));
      }, 4000)
    );
  });

  // Dropdown — toggle open; a document click outside closes it.
  const ddBtn = root.querySelector(".js-dd-toggle");
  const ddList = root.querySelector(".ds-menu__list");
  if (ddBtn && ddList) {
    ddBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = ddList.hidden;
      ddList.hidden = !open;
      ddBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    docClick = () => {
      ddList.hidden = true;
      ddBtn.setAttribute("aria-expanded", "false");
    };
    document.addEventListener("click", docClick);
  }

  // Modal — open / close (backdrop click + close buttons).
  const backdrop = root.querySelector(".js-modal-backdrop");
  root.querySelector(".js-modal-open")?.addEventListener("click", () => { if (backdrop) backdrop.hidden = false; });
  root.querySelectorAll(".js-modal-close").forEach((b) => b.addEventListener("click", () => { if (backdrop) backdrop.hidden = true; }));
  backdrop?.addEventListener("click", (e) => { if (e.target === backdrop) backdrop.hidden = true; });

  // Scrollspy — light the rail link for the section in view.
  const bySpy = {};
  root.querySelectorAll(".ds-rail__link").forEach((l) => (bySpy[l.dataset.spy] = l));
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = en.target.id.replace(/^ds-/, "");
        root.querySelectorAll(".ds-rail__link").forEach((l) => l.classList.remove("is-active"));
        bySpy[id]?.classList.add("is-active");
      });
    },
    { rootMargin: "-20% 0px -70% 0px" }
  );
  root.querySelectorAll(".ds-section").forEach((s) => observer.observe(s));
}

export function unmount(root) {
  observer?.disconnect();
  observer = null;
  toastTimers.forEach(clearTimeout);
  toastTimers = [];
  liveToasts.forEach((t) => t.remove());
  liveToasts = [];
  if (docClick) { document.removeEventListener("click", docClick); docClick = null; }
  if (orbDemo) { orbDemo.exit(); orbDemo = null; } // halt the mark's rAF loop
  root?.classList.remove("ds-stage");
}
