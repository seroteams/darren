import { MEETING_TYPES } from "../../engine/meeting-types.ts";
import type { RequestContext } from "../router.ts";

export default function meetingTypes(c: RequestContext): void {
  c.json(200, { types: MEETING_TYPES });
}
