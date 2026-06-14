import { alertAction } from "./confirm.js";

const ENTRIES = [
  {
    term: "Focus areas",
    def: "Topics Sero suggests covering in this 1:1, based on the report's role, meeting type, and your notes.",
  },
  {
    term: "Prep brief",
    def: "Pre-meeting guidance: likely theme, opener, what to listen for, and what to avoid — before you ask questions.",
  },
  {
    term: "Live scores",
    def: "Wellbeing, engagement, clarity, and growth — updated after each answer during questioning. Not the final briefing read.",
  },
  {
    term: "Synthesis",
    def: "The engine turns the full conversation into the post-meeting briefing.",
  },
  {
    term: "Coaching phrases",
    def: "Wording worth saving from a session for future runs to reference.",
  },
  {
    term: "Role words",
    def: "The everyday vocabulary the assistant knows for each job; you can add your team's own words.",
  },
  {
    term: "Engine changelog",
    def: "Dev panel on Start showing prompt, model, and git changes since the last baseline run.",
  },
];

export function createGlossaryButton() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "session-topbar__glossary";
  btn.textContent = "?";
  btn.setAttribute("aria-label", "Terminology glossary");
  btn.title = "Terminology glossary";
  btn.addEventListener("click", () => {
    alertAction({
      message: ENTRIES.map((e) => `${e.term} — ${e.def}`).join("\n\n"),
      confirmLabel: "Close",
    });
  });
  return btn;
}
