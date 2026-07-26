// The shared modal shell (component-consolidation P1) — ONE place that owns how a
// pop-up behaves: the backdrop, the aria-modal labelling, Escape, the Tab trap, the
// focus restore, and click-outside-to-close. Each modal supplies only its own content.
//
// Why this exists: the same open sequence was hand-rolled in seven modules, and
// `getFocusables` had been copy-pasted five times with TWO different selector lists —
// so the Tab trap already behaved differently depending on which box you were in
// (links, selects and textareas were reachable in some and skipped in others). Three
// overlays had no trap at all. This settles on the widest list, which is the correct
// one: anything the browser can focus should be reachable.
//
// Two entry points, because two shapes exist:
//   openModalShell()        builds the backdrop + card for you (the seven modals).
//   attachModalBehaviour()  wraps an element that already owns its own DOM
//                           (the account page overlay, the stage-review panel), so
//                           they get the same keys and focus handling without being
//                           forced onto the shared .modal-backdrop chrome.

/**
 * Everything the browser can focus, in Tab order. The wide list — the narrow copies
 * were the bug.
 *
 * Rendered-only, and that part is load-bearing: several dialogs keep collapsed sections
 * in the markup (`[hidden]` password form, the invite-email row before you tick the box).
 * Counting those as focusable puts an unfocusable element last in the list, `.focus()` on
 * it silently does nothing, and the wrap check never matches — so Tab walks straight out
 * of the dialog. getClientRects() is the cheap honest test: empty for display:none.
 */
export function getFocusables(root: ParentNode): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.getClientRects().length > 0);
}

export interface ModalBehaviourOptions {
  /** Escape and (when enabled) a backdrop click call this. The caller decides what closing means. */
  onClose: () => void;
  /** Keep Tab inside the dialog. On by default; there is no good reason to turn it off. */
  trap?: boolean;
}

/**
 * Give an existing element the modal keyboard contract. Returns a detach function
 * that unbinds the listeners and puts focus back where it was before the dialog opened.
 * It does NOT remove the element — the caller owns its own DOM.
 */
export function attachModalBehaviour(
  el: HTMLElement,
  { onClose, trap = true }: ModalBehaviourOptions,
): () => void {
  const previouslyFocused = document.activeElement as HTMLElement | null;

  function onKey(e: KeyboardEvent): void {
    if (e.key !== "Escape") return;
    e.preventDefault();
    e.stopPropagation();
    onClose();
  }

  function onTab(e: KeyboardEvent): void {
    if (e.key !== "Tab") return;
    const focusables = getFocusables(el);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // Escape on document capture so it beats any screen-level Escape handler underneath
  // (the session top bar, the notes panel). Tab on the element itself, so the trap only
  // ever fires while focus is genuinely inside the dialog.
  document.addEventListener("keydown", onKey, true);
  if (trap) el.addEventListener("keydown", onTab);

  return function detach(): void {
    document.removeEventListener("keydown", onKey, true);
    if (trap) el.removeEventListener("keydown", onTab);
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      previouslyFocused.focus({ preventScroll: true });
    }
  };
}

export interface ModalShellOptions {
  /** Classes on the dialog card. Defaults to the shared "card modal" base. */
  className?: string;
  /** alertdialog for destructive confirms, dialog for everything else. */
  role?: "dialog" | "alertdialog";
  /** id of the element naming the dialog. Prefer this over `label`. */
  labelledBy?: string;
  /** Fallback name when there is no visible title to point at. */
  label?: string;
  /** The dialog's inner markup. Set text via textContent afterwards, never interpolate names. */
  html?: string;
  /** Clicking the backdrop closes. On by default. */
  closeOnBackdrop?: boolean;
  onClose: () => void;
}

export interface ModalShell {
  /** The full-screen backdrop. */
  backdrop: HTMLElement;
  /** The dialog card. Query your content off this. */
  el: HTMLElement;
  /** Remove the dialog, unbind the keys, and put focus back on the trigger. */
  destroy: () => void;
}

/**
 * Build and open a modal: backdrop, card, keys, trap, focus restore.
 * The caller still chooses what to focus first, because only it knows which field matters.
 */
export function openModalShell(opts: ModalShellOptions): ModalShell {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";

  const el = document.createElement("div");
  el.className = opts.className ?? "card modal";
  el.setAttribute("role", opts.role ?? "dialog");
  el.setAttribute("aria-modal", "true");
  if (opts.labelledBy) el.setAttribute("aria-labelledby", opts.labelledBy);
  else if (opts.label) el.setAttribute("aria-label", opts.label);
  if (opts.html) el.innerHTML = opts.html;

  backdrop.appendChild(el);
  document.body.appendChild(backdrop);

  // Attached after the element is in the document so the focus restore captures the
  // real trigger rather than <body>.
  const detach = attachModalBehaviour(el, { onClose: () => opts.onClose() });

  if (opts.closeOnBackdrop !== false) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) opts.onClose();
    });
  }

  return {
    backdrop,
    el,
    destroy(): void {
      detach();
      backdrop.remove();
    },
  };
}
