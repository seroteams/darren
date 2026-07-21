// Job lexicons — a browsable home for every role's words (the role-profile
// terminology). You can add your own words per role; they save to a separate
// overlay (never overwriting the AI's) and show marked as "yours".

import {
  getRoleLexicons,
  addRoleLexiconTerm,
  removeRoleLexiconTerm,
  hideRoleLexiconTerm,
  unhideRoleLexiconTerm,
} from "../../../shared/api.js";
import { escapeHtml as esc } from "../ui/html.js";
import { groupTerms, isGrouped } from "../ui/vocab-groups.js";
import { icon } from "../ui/icon.js";
import { Trash2 } from "lucide";

export async function mount(root) {
  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Role words</div>
        <h1 class="h1">The words of each role</h1>
        <div class="text-ink-dim max-w-measure">
          The everyday vocabulary the assistant knows for each job, so a 1:1 speaks the same language. Add the words your team actually uses, they sit alongside the AI's and are always yours to remove.
        </div>
      </header>
      <div class="thinking-host min-h-[60px] flex items-center text-ink-mute">Loading job words…</div>
      <div class="joblex-layout" hidden>
        <aside class="joblex-sidebar">
          <input class="input joblex-search js-role-search" type="search" placeholder="Search a job…" aria-label="Search roles" autocomplete="off" />
          <div class="joblex-list js-role-list"></div>
        </aside>
        <div class="joblex-detail result-host js-role-detail"></div>
      </div>
    </div>
  `;

  const thinkingHost = root.querySelector(".thinking-host");
  const layout = root.querySelector(".joblex-layout");
  const searchEl = root.querySelector(".js-role-search");
  const listEl = root.querySelector(".js-role-list");
  const resultHost = root.querySelector(".js-role-detail");

  let roles = [];
  try {
    const res = await getRoleLexicons();
    roles = Array.isArray(res?.roles) ? res.roles : [];
  } catch (e) {
    console.warn("[job-lexicons] fetch failed:", e);
    thinkingHost.textContent = "Couldn't load job words. Try again in a moment.";
    return;
  }

  thinkingHost.remove();

  if (!roles.length) {
    layout.hidden = false;
    resultHost.innerHTML =
      `<p class="text-ink-mute">No job words yet. They're created the first time you set up a 1:1 for a role.</p>`;
    return;
  }

  const byKey = new Map(roles.map((r) => [r.key, r]));
  let activeKey = null;

  layout.hidden = false;
  resultHost.innerHTML =
    `<p class="text-ink-mute">Pick a role to see its words.</p>`;
  renderList("");

  // Render the left list grouped by seniority, filtered by the search query.
  function renderList(query) {
    const q = query.trim().toLowerCase();
    const matches = roles.filter((r) => !q || roleLabel(r).toLowerCase().includes(q));
    const groups = groupBySeniority(matches);

    if (!groups.length) {
      listEl.innerHTML = `<p class="joblex-empty text-ink-mute">No roles match "${esc(query.trim())}".</p>`;
      return;
    }
    listEl.innerHTML = groups.map((g) => `
      <div class="joblex-group">${esc(g.label)}</div>
      ${g.roles.map((r) => `
        <button class="joblex-item${r.key === activeKey ? " is-active" : ""}" type="button" data-key="${esc(r.key)}">${esc(roleLabel(r))}</button>
      `).join("")}
    `).join("");
  }

  // Render the picked role's words on the right and move the highlight.
  function showRole(key) {
    const role = byKey.get(key);
    if (!role) return;
    activeKey = key;
    resultHost.innerHTML = sectionHtml(role);
    renderList(searchEl.value);
  }

  searchEl.addEventListener("input", () => renderList(searchEl.value));

  listEl.addEventListener("click", (e) => {
    const item = e.target.closest(".joblex-item");
    if (item) showRole(item.dataset.key);
  });

  // Re-render one role's section in place (event delegation lives on the parent,
  // so swapping a section's node keeps the handlers working).
  function refreshSection(key) {
    const role = byKey.get(key);
    const node = resultHost.querySelector(`section[data-key="${cssEsc(key)}"]`);
    if (role && node) node.outerHTML = sectionHtml(role);
  }

  // Flip the local `hidden` flag on an AI term and re-render (keeps the two
  // views — main list and "Hidden words" — in sync without a re-fetch).
  function setHidden(key, term, hidden) {
    const role = byKey.get(key);
    const hit = role?.terms.find(
      (t) => t.source === "ai" && String(t.term || "").toLowerCase() === term.toLowerCase()
    );
    if (hit) hit.hidden = hidden;
  }

  resultHost.addEventListener("click", async (e) => {
    const addBtn = e.target.closest(".js-add-word");
    const rmBtn = e.target.closest(".js-remove-word");
    const hideBtn = e.target.closest(".js-hide-word");
    const restoreBtn = e.target.closest(".js-restore-word");

    if (hideBtn) {
      const key = hideBtn.dataset.key;
      const term = hideBtn.dataset.term;
      hideBtn.disabled = true;
      try {
        await hideRoleLexiconTerm(key, term);
        setHidden(key, term, true);
        refreshSection(key);
      } catch (err) {
        hideBtn.disabled = false;
        console.warn("[job-lexicons] hide failed:", err);
      }
      return;
    }

    if (restoreBtn) {
      const key = restoreBtn.dataset.key;
      const term = restoreBtn.dataset.term;
      restoreBtn.disabled = true;
      try {
        await unhideRoleLexiconTerm(key, term);
        setHidden(key, term, false);
        refreshSection(key);
      } catch (err) {
        restoreBtn.disabled = false;
        console.warn("[job-lexicons] restore failed:", err);
      }
      return;
    }

    if (addBtn) {
      const key = addBtn.dataset.key;
      const section = addBtn.closest("section[data-key]");
      const termEl = section.querySelector(".js-term");
      const meaningEl = section.querySelector(".js-meaning");
      const errEl = section.querySelector(".js-add-error");
      const term = termEl.value.trim();
      const meaning = meaningEl.value.trim();
      errEl.hidden = true;
      if (!term) {
        errEl.textContent = "Type a word first.";
        errEl.hidden = false;
        termEl.focus();
        return;
      }
      addBtn.disabled = true;
      try {
        const res = await addRoleLexiconTerm(key, term, meaning);
        byKey.get(key).terms.push({ ...res.term, source: "you" });
        refreshSection(key);
        resultHost.querySelector(`section[data-key="${cssEsc(key)}"] .js-term`)?.focus();
      } catch (err) {
        errEl.textContent = err.message || "Couldn't add that word.";
        errEl.hidden = false;
        addBtn.disabled = false;
      }
      return;
    }

    if (rmBtn) {
      const key = rmBtn.dataset.key;
      const term = rmBtn.dataset.term;
      rmBtn.disabled = true;
      try {
        await removeRoleLexiconTerm(key, term);
        const role = byKey.get(key);
        role.terms = role.terms.filter(
          (t) => !(t.source === "you" && t.term.toLowerCase() === term.toLowerCase())
        );
        refreshSection(key);
      } catch (err) {
        rmBtn.disabled = false;
        console.warn("[job-lexicons] remove failed:", err);
      }
      return;
    }
  });

  // Enter in the meaning field submits the add.
  resultHost.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.classList?.contains("js-meaning")) {
      e.preventDefault();
      e.target.closest("section[data-key]")?.querySelector(".js-add-word")?.click();
    }
  });
}

// Plain label for a role, used in both the list and the section heading.
function roleLabel(role) {
  return [role.role, role.seniority].filter(Boolean).join(" · ") || "Untitled role";
}

const SENIORITY_ORDER = ["Junior", "Mid-level", "Senior", "Lead", "Principal", "Director", "Expert"];

// The data has a known inconsistency: some profiles say "Mid", others "Mid-level".
// Fold them into one bucket for display; leave the stored value alone.
function normalizeSeniority(s) {
  const raw = (s || "").trim();
  if (/^mid(-level)?$/i.test(raw)) return "Mid-level";
  return raw || "Other";
}

// Group roles under seniority headings, ordered by SENIORITY_ORDER (unknown
// levels sort to the end, alphabetically). Roles inside a group are A–Z.
function groupBySeniority(list) {
  const buckets = new Map();
  for (const r of list) {
    const label = normalizeSeniority(r.seniority);
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label).push(r);
  }
  const rank = (label) => {
    const i = SENIORITY_ORDER.indexOf(label);
    return i === -1 ? SENIORITY_ORDER.length : i;
  };
  return [...buckets.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
    .map(([label, roles]) => ({
      label,
      roles: roles.sort((a, b) => roleLabel(a).localeCompare(roleLabel(b))),
    }));
}

function sectionHtml(role) {
  const title = esc(roleLabel(role));
  const allTerms = Array.isArray(role.terms) ? role.terms : [];
  const terms = allTerms.filter((t) => !t.hidden); // hidden AI words drop out of the list
  const hidden = allTerms.filter((t) => t.hidden);
  const sections = groupTerms(terms, role.groups);
  let glossary;
  if (!terms.length) {
    glossary = `<div class="card flow-glossary"><p class="hint" style="padding:0.35rem 0;">No words yet for this role.</p></div>`;
  } else if (isGrouped(sections)) {
    glossary = `<div class="card flow-glossary-card">${sections.map((s) => `
      <div class="flow-glossary-group">
        <h3 class="flow-glossary-group__head eyebrow">${esc(s.label || "Other")}</h3>
        <div class="flow-glossary">${s.rows.map((t) => rowHtml(t, role.key)).join("")}</div>
      </div>
    `).join("")}</div>`;
  } else {
    glossary = `<div class="card flow-glossary">${terms.map((t) => rowHtml(t, role.key)).join("")}</div>`;
  }
  const hiddenBlock = hidden.length
    ? `<details class="joblex-hidden">
        <summary class="joblex-hidden__head">Hidden words (${hidden.length}). Put any back</summary>
        <div class="card flow-glossary joblex-hidden__list">${hidden.map((t) => hiddenRowHtml(t, role.key)).join("")}</div>
      </details>`
    : "";
  return `
    <section class="l-stack l-stack--3" data-key="${esc(role.key)}">
      <h2 class="h3">${title}</h2>
      ${glossary}
      <div class="joblex-add">
        <input class="input joblex-add__term js-term" type="text" maxlength="60" placeholder="Add a word (e.g. Standup)" aria-label="New word for ${title}" />
        <input class="input joblex-add__meaning js-meaning" type="text" maxlength="140" placeholder="What it means" aria-label="Meaning of the new word" />
        <button class="btn btn--sm js-add-word" type="button" data-key="${esc(role.key)}">Add</button>
      </div>
      <p class="joblex-error js-add-error" role="alert" hidden></p>
      ${hiddenBlock}
    </section>`;
}

function rowHtml(t, key) {
  const yours = t.source === "you";
  const term = esc(t.term || "");
  const meaning = esc(t.meaning || "");
  const extras = yours
    ? ` <span class="joblex-yours">yours</span>` +
      `<button class="joblex-remove js-remove-word" type="button" data-key="${esc(key)}" data-term="${term}" aria-label="Remove ${term}" title="Remove">×</button>`
    : // AI word — a delete control that only shows on row hover/focus.
      `<button class="joblex-delete js-hide-word" type="button" data-key="${esc(key)}" data-term="${term}" aria-label="Delete ${term}" title="Delete">${TRASH_SVG}</button>`;
  return `
    <div class="flow-glossary__row joblex-row">
      <div class="flow-glossary__term">${term}${extras}</div>
      <div class="flow-glossary__meaning">${meaning}</div>
    </div>`;
}

// A hidden (deleted) AI word, shown in the "Hidden words" area with a put-back.
function hiddenRowHtml(t, key) {
  const term = esc(t.term || "");
  const meaning = esc(t.meaning || "");
  return `
    <div class="flow-glossary__row joblex-hidden__row">
      <div class="flow-glossary__term">${term}
        <button class="joblex-restore js-restore-word" type="button" data-key="${esc(key)}" data-term="${term}" aria-label="Put back ${term}">Put back</button>
      </div>
      <div class="flow-glossary__meaning">${meaning}</div>
    </div>`;
}

const TRASH_SVG = icon(Trash2, { size: 15 });

// Keys are slug--slug (safe), but guard the attribute selector anyway.
function cssEsc(s) {
  return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/"/g, '\\"');
}
