// Job lexicons — a browsable home for every role's words (the role-profile
// terminology). Phase 1 is read-only: list each cached job and its words. No
// session needed; these words are the cache the 1:1 already speaks from.

import { getRoleLexicons } from "../api.js";
import { escapeHtml as esc } from "../ui/html.js";

export async function mount(root) {
  root.innerHTML = `
    <div class="stage-medium l-stack l-stack--8">
      <header class="page-header">
        <div class="eyebrow">Job lexicons</div>
        <h1 class="h1">The words of each role</h1>
        <div class="text-ink-dim text-sm max-w-measure">
          The everyday vocabulary the assistant knows for each job, so a 1:1 speaks the same language. Built from the job title and level only.
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

  resultHost.innerHTML = roles.map(renderRole).join("");
}

function renderRole(r) {
  const title = [r.role, r.seniority].filter(Boolean).map(esc).join(" · ") || "Untitled role";
  const terms = Array.isArray(r.terms) ? r.terms : [];
  const body = terms.length
    ? `<div class="card flow-glossary">
        ${terms
          .map(
            (t) => `
          <div class="flow-glossary__row">
            <div class="flow-glossary__term">${esc(t.term || "")}</div>
            <div class="flow-glossary__meaning">${esc(t.meaning || "")}</div>
          </div>`
          )
          .join("")}
      </div>`
    : `<p class="hint">No words yet for this role.</p>`;
  return `
    <section class="l-stack l-stack--3">
      <h2 class="h3">${title}</h2>
      ${body}
    </section>`;
}
