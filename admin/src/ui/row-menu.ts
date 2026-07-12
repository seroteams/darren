// A small overflow (⋯) menu for row actions — DESIGN §5 "Dropdown menu, one build".
// Body-attached + fixed-positioned so a scrolling/overflowing card can never clip it
// (same approach as the admin user table's role menu, generalised into a reusable helper).
// One menu open at a time; it closes on pick, outside click, or Escape.

import "../styles/row-menu.css";

export interface RowMenuItem {
  label: string;
  danger?: boolean;
  onSelect: () => void;
}

let openEl: HTMLElement | null = null;
let teardown: (() => void) | null = null;

export function closeRowMenu(): void {
  if (teardown) { teardown(); teardown = null; }
  if (openEl) { openEl.remove(); openEl = null; }
}

/** Open a menu anchored to `anchor` (positioned below its right edge). */
export function openRowMenu(anchor: HTMLElement, items: RowMenuItem[]): void {
  closeRowMenu();
  const menu = document.createElement("div");
  menu.className = "row-menu";
  menu.setAttribute("role", "menu");
  for (const it of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.setAttribute("role", "menuitem");
    btn.className = "row-menu__item" + (it.danger ? " row-menu__item--danger" : "");
    btn.textContent = it.label;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      closeRowMenu();
      it.onSelect();
    });
    menu.appendChild(btn);
  }
  document.body.appendChild(menu);

  // Position under the anchor's right edge; clamp to the viewport's left gutter.
  const rect = anchor.getBoundingClientRect();
  menu.style.top = `${Math.round(rect.bottom + 4)}px`;
  menu.style.left = `${Math.round(Math.max(8, rect.right - menu.offsetWidth))}px`;
  openEl = menu;

  const onOutside = (e: Event) => {
    if (!(e.target instanceof Node) || !menu.contains(e.target)) closeRowMenu();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeRowMenu();
      anchor.focus();
    }
  };
  // Deferred so the click that opened the menu doesn't immediately close it.
  setTimeout(() => {
    document.addEventListener("click", onOutside, true);
    document.addEventListener("keydown", onKey, true);
  }, 0);
  teardown = () => {
    document.removeEventListener("click", onOutside, true);
    document.removeEventListener("keydown", onKey, true);
  };

  menu.querySelector<HTMLButtonElement>(".row-menu__item")?.focus();
}
