// Pipeline config changelog — Start page panel (content / engine / models / git vs last run).

export function createPipelineChangelog() {
  const el = document.createElement("section");
  el.className = "pipeline-changelog";
  el.hidden = true;

  let status = null;
  let expandedGroups = new Set();
  let expandAll = false;
  let panelCollapsed = true;

  try {
    const stored = sessionStorage.getItem("pipeline-changelog-collapsed");
    if (stored === "0") panelCollapsed = false;
    else if (stored === "1") panelCollapsed = true;
  } catch {}

  function escape(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function contentChangeCount(summary) {
    if (!summary) return 0;
    return (
      (summary.contentModified || 0) +
      (summary.contentAdded || 0) +
      (summary.contentRemoved || 0)
    );
  }

  function engineChangeCount(summary) {
    if (!summary) return 0;
    return (
      (summary.engineModified || 0) +
      (summary.engineAdded || 0) +
      (summary.engineRemoved || 0)
    );
  }

  function buildSummaryParts(summary) {
    const parts = [];
    const c = contentChangeCount(summary);
    const e = engineChangeCount(summary);
    if (c) parts.push(`${c} prompt file${c === 1 ? "" : "s"}`);
    if (e) parts.push(`${e} engine file${e === 1 ? "" : "s"}`);
    if (summary.modelsChanged?.length) {
      parts.push(
        summary.modelsChanged.length === 1
          ? `${summary.modelsChanged[0]} model change`
          : `${summary.modelsChanged.length} model changes`
      );
    }
    if (summary.gitChanged) parts.push("uncommitted git");
    return parts;
  }

  function wrapPanel(headExtra, bodyHtml) {
    const chevron = panelCollapsed ? "▶" : "▼";
    return `
      <button
        type="button"
        class="pipeline-changelog__panel-head js-panel-toggle"
        aria-expanded="${!panelCollapsed}"
        aria-controls="pipeline-changelog-body"
      >
        <span class="pipeline-changelog__chevron" aria-hidden="true">${chevron}</span>
        <span class="pipeline-changelog__label text-ink-mute text-xs uppercase tracking-wider">Engine changelog</span>
        <span class="pipeline-changelog__dev-badge" aria-hidden="true">DEV</span>
        ${
          headExtra && panelCollapsed
            ? `<span class="pipeline-changelog__head-extra text-sm">${headExtra}</span>`
            : ""
        }
      </button>
      <div
        id="pipeline-changelog-body"
        class="pipeline-changelog__body"
        ${panelCollapsed ? "hidden" : ""}
      >
        ${bodyHtml}
      </div>
    `;
  }

  function wirePanelToggle() {
    el.querySelector(".js-panel-toggle")?.addEventListener("click", () => {
      panelCollapsed = !panelCollapsed;
      try {
        sessionStorage.setItem("pipeline-changelog-collapsed", panelCollapsed ? "1" : "0");
      } catch {}
      render();
    });
  }

  function renderGroupChanges(group) {
    if (group.id === "models") {
      return group.changes
        .map(
          (c) =>
            `<li class="pipeline-changelog__item">
              <span class="pipeline-changelog__kind">${escape(c.kind)}</span>
              <span class="pipeline-changelog__stage">${escape(c.stage)}</span>
              <span class="pipeline-changelog__detail text-ink-mute">${escape(c.from)} → ${escape(c.to)}</span>
            </li>`
        )
        .join("");
    }
    if (group.id === "git") {
      const c = group.changes[0];
      const from = c.from
        ? `${c.from.sha}${c.from.dirty ? " (dirty)" : ""}`
        : "(none)";
      const to = c.to ? `${c.to.sha}${c.to.dirty ? " (dirty)" : ""}` : "(none)";
      return `<li class="pipeline-changelog__item">
        <span class="pipeline-changelog__kind">modified</span>
        <span class="pipeline-changelog__detail text-ink-mute">${escape(from)} → ${escape(to)}</span>
      </li>`;
    }
    return group.changes
      .map(
        (c) =>
          `<li class="pipeline-changelog__item">
            <span class="pipeline-changelog__kind">${escape(c.kind)}</span>
            <code class="pipeline-changelog__path">${escape(c.path)}</code>
            <span class="pipeline-changelog__stage text-ink-mute">${escape(c.stageLabel)}</span>
          </li>`
      )
      .join("");
  }

  function render() {
    if (!status) {
      el.hidden = true;
      return;
    }

    el.hidden = false;
    const { baseline, unchanged, hasBaseline, summary, groups, changelogMarkdown } = status;
    const counts = status.current?.manifestCounts;

    if (!hasBaseline || !baseline?.hasLock) {
      const mc = counts || {};
      el.className = `pipeline-changelog pipeline-changelog--legacy${
        panelCollapsed ? " pipeline-changelog--collapsed" : ""
      }`;
      const legacyMsg =
        baseline?.runId && !baseline?.hasLock
          ? "Last run has no pipeline lock (predates this feature). Showing current manifest only."
          : "No baseline yet. Starting a run will record the pipeline lock for future comparisons.";
      el.innerHTML = wrapPanel(
        escape(legacyMsg),
        `
        <p class="pipeline-changelog__message text-sm">${escape(legacyMsg)}</p>
        ${
          mc.total
            ? `<p class="text-ink-dim text-xs">Tracking: ${mc.content} content · ${mc.engine} engine files</p>`
            : ""
        }
      `
      );
      wirePanelToggle();
      return;
    }

    const baselineLabel = baseline.headline
      ? `${escape(baseline.headline)} · ${formatDate(baseline.capturedAt)}`
      : formatDate(baseline.capturedAt) || "last run";

    if (unchanged) {
      const okMsg = `Matches last run (${baselineLabel}) — content, engine, models, git`;
      el.className = `pipeline-changelog pipeline-changelog--ok${
        panelCollapsed ? " pipeline-changelog--collapsed" : ""
      }`;
      el.innerHTML = wrapPanel(
        `<span class="pipeline-changelog__message--ok">${okMsg}</span>`,
        `<p class="pipeline-changelog__message pipeline-changelog__message--ok text-sm">${okMsg}</p>`
      );
      wirePanelToggle();
      return;
    }

    const parts = buildSummaryParts(summary);
    const totalChanges =
      contentChangeCount(summary) +
      engineChangeCount(summary) +
      (summary.modelsChanged?.length || 0) +
      (summary.gitChanged ? 1 : 0);

    el.className = `pipeline-changelog pipeline-changelog--warn${
      panelCollapsed ? " pipeline-changelog--collapsed" : ""
    }`;

    const groupsHtml = (groups || [])
      .map((g) => {
        const n =
          g.id === "models"
            ? g.changes.length
            : g.id === "git"
              ? 1
              : g.changes.length;
        const open = expandAll || expandedGroups.has(g.id);
        return `
          <div class="pipeline-changelog__group" data-group="${escape(g.id)}">
            <button type="button" class="pipeline-changelog__group-head js-group-toggle" data-group="${escape(g.id)}">
              <span class="pipeline-changelog__chevron">${open ? "▼" : "▶"}</span>
              <span>${escape(g.title)} (${n})</span>
            </button>
            ${
              g.subtitle && open
                ? `<div class="pipeline-changelog__group-sub text-ink-mute text-xs">${escape(g.subtitle)}</div>`
                : ""
            }
            <ul class="pipeline-changelog__list" ${open ? "" : "hidden"}>
              ${renderGroupChanges(g)}
            </ul>
          </div>
        `;
      })
      .join("");

    const warnHead = `<span class="pipeline-changelog__warn-mark">⚠</span> ${totalChanges} change${
      totalChanges === 1 ? "" : "s"
    } since that run · ${escape(parts.join(" · "))}`;

    el.innerHTML = wrapPanel(
      warnHead,
      `
      <p class="pipeline-changelog__compare text-ink-dim text-xs">Compared to last run: ${baselineLabel}</p>
      <p class="pipeline-changelog__message text-sm">
        <span class="pipeline-changelog__warn-mark">⚠</span>
        ${totalChanges} change${totalChanges === 1 ? "" : "s"} since that run
      </p>
      <p class="pipeline-changelog__summary text-ink-mute text-xs">${escape(parts.join(" · "))}</p>
      <div class="pipeline-changelog__groups">${groupsHtml}</div>
      <div class="pipeline-changelog__actions">
        <button type="button" class="btn btn--ghost btn--sm js-expand-all">${expandAll ? "Collapse all" : "Expand all"}</button>
        <button type="button" class="btn btn--ghost btn--sm js-copy">Copy changelog</button>
      </div>
    `
    );

    wirePanelToggle();

    el.querySelectorAll(".js-group-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.group;
        if (expandedGroups.has(id)) expandedGroups.delete(id);
        else expandedGroups.add(id);
        expandAll = false;
        render();
      });
    });

    el.querySelector(".js-expand-all")?.addEventListener("click", () => {
      expandAll = !expandAll;
      expandedGroups.clear();
      render();
    });

    el.querySelector(".js-copy")?.addEventListener("click", async () => {
      if (!changelogMarkdown) return;
      try {
        await navigator.clipboard.writeText(changelogMarkdown);
        const btn = el.querySelector(".js-copy");
        const prev = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => { btn.textContent = prev; }, 1200);
      } catch {}
    });
  }

  return {
    el,
    setStatus(next) {
      status = next;
      render();
    },
    async loadForBaseline(baseline = "latest") {
      const q = baseline === "latest" ? "" : `?baseline=${encodeURIComponent(baseline)}`;
      const res = await fetch(`/api/pipeline/status${q}`);
      if (!res.ok) throw new Error(`pipeline status ${res.status}`);
      status = await res.json();
      render();
      return status;
    },
    async loadDriftForRun(runId) {
      const res = await fetch(
        `/api/pipeline/status?baseline=${encodeURIComponent(runId)}`
      );
      if (!res.ok) return { unchanged: true };
      return res.json();
    },
  };
}
