// A calm inline error line for a failed row action — the house pattern (design-system
// .ds-alert--error + role="alert") in place of a jarring native window.alert(). It sits at the
// top of the panel, just under the header, and stays until the next successful action
// re-renders the screen (every load() replaces the panel, which clears it). The message is shown
// verbatim so the server's plain-words guard ("only a manager can do that") survives; callers
// pass a friendly generic as the fallback for unexpected failures.
//
// DOM-only glue — no node unit test, same as the mount code it serves; it's exercised on the
// Team and Members screens.
export function showActionError(root: HTMLElement, message: string): void {
  const host = root.querySelector<HTMLElement>(".stage-inner") ?? root;
  let el = host.querySelector<HTMLElement>(".js-action-error");
  if (!el) {
    el = document.createElement("div");
    el.className = "ds-alert ds-alert--error js-action-error";
    el.setAttribute("role", "alert");
    host.insertBefore(el, host.children[1] ?? null);
  }
  el.textContent = message;
}
