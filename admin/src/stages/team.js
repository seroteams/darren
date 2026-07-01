// Team — placeholder for the member app (member-nav Phase 1). Real content (teammates,
// their prep) comes later; for now it's a friendly "coming soon" so the nav shape is set.

export async function mount(root) {
  root.innerHTML = `
    <div class="stage-inner l-stack l-stack--8">
      <header class="page-header">
        <h1 class="h1">Team</h1>
        <div class="text-ink-dim text-sm">Your team, in one place.</div>
      </header>

      <section class="card-flat space-y-2">
        <div class="eyebrow">Coming soon</div>
        <p class="text-ink-dim text-sm">This is where you'll see your team. We're building it now.</p>
      </section>
    </div>
  `;
}

export function unmount() {}
