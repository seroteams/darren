// The contract every stage module satisfies. A stage renders into a root element
// on mount() and tears down on unmount(); the router hands it the shared store and
// setState. Shared typed layer for the admin TypeScript pilot (repo-tidy Phase 4) —
// convert a stage by typing its exports `Mount` / `Unmount` against this.

import type { Store } from "../state.js";

export interface StageContext {
  store: Store;
  setState: (patch: Partial<Store>) => void;
}

export type Mount = (root: HTMLElement, ctx: StageContext) => Promise<void>;
export type Unmount = () => void;
