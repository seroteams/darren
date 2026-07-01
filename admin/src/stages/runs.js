// Runs — placeholder for the member app (member-nav Phase 1). Phase 2 fills this with
// the member's own finished runs (scoped to them, never anyone else's). For now it's a
// friendly "coming soon" so the nav shape is set. Distinct from the admin Library, which
// lists the whole company's runs and stays admin-only.

export async function mount(root) {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Runs</h1>
        <div class="text-ink-dim text-sm">Your past prep sessions.</div>
      </header>

      <section class="card-flat space-y-2">
        <div class="eyebrow">Coming soon</div>
        <p class="text-ink-dim text-sm">Your finished runs will show up here. We're building it now.</p>
      </section>
    </div>
  `;
}

export function unmount() {}
