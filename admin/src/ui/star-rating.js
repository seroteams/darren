// A small, accessible 1-5 star rating control (pre-go-live PG3): a radiogroup of five
// star buttons, keyboard-operable and labelled (global :focus-visible rings the focused
// star; the CSS lives in design.css as .star-rating / .star-rating__star). It owns ONLY
// the stars — the caller wires saving via onChange. Used on the run detail (with a note)
// and at the end of a 1:1 (compact, with Skip).

/** @param {{ initialStars?: number, ariaLabel?: string, onChange?: (stars: number) => void }} [opts] */
export function createStarRating({ initialStars = 0, ariaLabel = "How useful was this 1:1? 1 to 5 stars", onChange } = {}) {
  const el = document.createElement("div");
  el.className = "star-rating";
  el.setAttribute("role", "radiogroup");
  el.setAttribute("aria-label", ariaLabel);
  let stars = initialStars;

  const render = () => {
    el.innerHTML = [1, 2, 3, 4, 5]
      .map(
        (n) =>
          `<button type="button" class="star-rating__star" role="radio" aria-checked="${n === stars}" aria-label="${n} star${n > 1 ? "s" : ""}" data-v="${n}" tabindex="${n === (stars || 1) ? 0 : -1}">${n <= stars ? "★" : "☆"}</button>`,
      )
      .join("");
  };
  const buttons = () => Array.from(el.querySelectorAll(".star-rating__star"));
  const select = (v) => {
    stars = Math.max(1, Math.min(5, v));
    render();
    buttons().find((b) => Number(b.dataset.v) === stars)?.focus();
    if (onChange) onChange(stars);
  };

  el.addEventListener("click", (e) => {
    const b = e.target.closest(".star-rating__star");
    if (b) select(Number(b.dataset.v));
  });
  el.addEventListener("keydown", (e) => {
    const cur = stars || 1;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); select(cur + 1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); select(cur - 1); }
    else if (e.key === "Home") { e.preventDefault(); select(1); }
    else if (e.key === "End") { e.preventDefault(); select(5); }
  });

  render();
  return { el, getStars: () => stars };
}
