// Data access for role lexicons (the role-profile word cache + the user's overlay
// words). Delegates to the role-profile engine today; that's the storage seam — a
// DB-backed impl can replace `fileRoleLexiconsRepo` without touching the service.
// The forwarded values are opaque to the service, so they're typed `unknown`.

import {
  listRoleProfiles,
  addOverlayTerm,
  removeOverlayTerm,
  hideOverlayTerm,
  unhideOverlayTerm,
} from "../../../engine/role-profile.ts";

export interface RoleLexiconsRepo {
  list(): unknown[];
  addTerm(key: string, value: { term: unknown; meaning: unknown }): unknown;
  removeTerm(key: string, term: unknown): unknown;
  hideTerm(key: string, term: unknown): unknown;
  unhideTerm(key: string, term: unknown): unknown;
}

export const fileRoleLexiconsRepo: RoleLexiconsRepo = {
  list: () => listRoleProfiles(),
  // addOverlayTerm throws an Object.assign(Error,{status}) on bad input — let it
  // propagate; the controller's error path formats it.
  addTerm: (key, value) => addOverlayTerm(key, value),
  removeTerm: (key, term) => removeOverlayTerm(key, term),
  hideTerm: (key, term) => hideOverlayTerm(key, term),
  unhideTerm: (key, term) => unhideOverlayTerm(key, term),
};
