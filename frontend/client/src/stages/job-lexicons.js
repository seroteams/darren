// Job lexicons — a browsable home for every role's words (the role-profile
// terminology). You can add your own words per role; they save to a separate
// overlay (never overwriting the AI's) and show marked as "yours".

import { getRoleLexicons, addRoleLexiconTerm, removeRoleLexiconTerm } from "../api.js";
import { escapeHtml as esc } from "../ui/html.js";
import { groupTerms, isGrouped } from "../ui/vocab-groups.js";

export async function mount(root) {
  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Job lexicons</div>
        <h1 class="h1">The words of each role</h1>
        <div class="text-ink-dim text-sm max-w-measure">
          The everyday vocabulary the assistant knows for each job, so a 1:1 speaks the same language. Add the words your team actually uses, they sit alongside the AI's and are always yours to remove.
        </div>
      </header>
      <div class="thinking-host min-h-[60px] flex items-center text-ink-mute">Loading job words…</div>
      <div class="result-host l-stack l-stack--6"></div>
    </div>
  `;

  const thinkingHost = root.querySelector(".thinking-host");
  const resultHost = root.querySelector(".result-host");

  let roles = [];
  try {
    const res = await getRoleLexicons();
    roles = Array.isArray(res?.roles) ? res.roles : [];
  } catch (e) {
    console.warn("[job-lexicons] fetch failed:", e);
    thinkingHost.textContent = "Couldn't load job words — try again in a moment.";
    return;
  }

  thinkingHost.remove();

  if (!roles.length) {
    resultHost.innerHTML =
      `<p class="text-ink-mute">No job words yet. They're created the first time you set up a 1:1 for a role.</p>`;
    return;
  }

  const byKey = new Map(roles.map((r) => [r.key, r]));
  resultHost.innerHTML = roles.map(sectionHtml).join("");

  // Re-render one role's section in place (event delegation lives on the parent,
  // so swapping a section's node keeps the handlers working).
  function refreshSection(key) {
    const role = byKey.get(key);
    const node = resultHost.querySelector(`section[data-key="${cssEsc(key)}"]`);
    if (role && node) node.outerHTML = sectionHtml(role);
  }

  resultHost.addEventListener("click", async (e) => {
    const addBtn = e.target.closest(".js-add-word");
    const rmBtn = e.target.closest(".js-remove-word");

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

function sectionHtml(role) {
  const title = [role.role, role.seniority].filter(Boolean).map(esc).join(" · ") || "Untitled role";
  const terms = Array.isArray(role.terms) ? role.terms : [];
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
    </section>`;
}

function rowHtml(t, key) {
  const yours = t.source === "you";
  const term = esc(t.term || "");
  const meaning = esc(t.meaning || "");
  const extras = yours
    ? ` <span class="joblex-yours">yours</span>` +
      `<button class="joblex-remove js-remove-word" type="button" data-key="${esc(key)}" data-term="${term}" aria-label="Remove ${term}" title="Remove">×</button>`
    : "";
  return `
    <div class="flow-glossary__row">
      <div class="flow-glossary__term">${term}${extras}</div>
      <div class="flow-glossary__meaning">${meaning}</div>
    </div>`;
}

// Keys are slug--slug (safe), but guard the attribute selector anyway.
function cssEsc(s) {
  return window.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/"/g, '\\"');
}
