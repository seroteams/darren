// Which data is this console actually showing? Local dev and the published site read two
// SEPARATE databases (.env DATABASE_URL vs LIVE_DATABASE_URL — see docs/reference/RENDER_SETUP.md),
// so the same screen means different things depending on where it is running. Pulse was
// headed "Live pulse / The live site right now" on Carl's own machine while showing his
// local rows, and the Error log's Live filter can never return anything locally (console
// audit, 2026-07-29). These are the words that keep those screens honest.

import { isLiveEnv } from "../state.ts";

/** "Live" or "Local" — the word a page title leads with. */
export function envTitleWord(live: boolean = isLiveEnv()): string {
  return live ? "Live" : "Local";
}

/** Where the numbers came from, as it reads mid-sentence. */
export function envPlace(live: boolean = isLiveEnv()): string {
  return live ? "live" : "this machine";
}

/** Pulse's standfirst. Local must not claim to be showing the live site. */
export function pulseIntro(live: boolean = isLiveEnv()): string {
  return live
    ? "The live site right now. Managers, runs, who came back, what broke. Internal Sero accounts are counted separately."
    : "This machine only, not the live site. Live numbers show on sero.team. Internal Sero accounts are counted separately.";
}

/** Shown under the Error log's where-filter on local, where "Live" can never match. */
export function liveNotVisibleNote(live: boolean = isLiveEnv()): string {
  return live ? "" : "Live errors are not in this database. Open the console on sero.team to read them.";
}

/** The Error log's standfirst. It used to promise both environments in one list. */
export function errorLogIntro(live: boolean = isLiveEnv()): string {
  return live
    ? "Everything that broke on the live site, grouped into issues, freshest first. Click a row for the full detail."
    : "Everything that broke on this machine, grouped into issues, freshest first. Click a row for the full detail.";
}
