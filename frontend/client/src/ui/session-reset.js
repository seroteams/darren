import { STAGES } from "../state.js";

export async function confirmResetSession(confirmAction, { to = STAGES.START } = {}) {
  const toStart = to === STAGES.START;
  return confirmAction({
    message: toStart
      ? "Reset session? This session will be cleared and you'll return to the start screen."
      : "Reset session? Your answers so far will be cleared and you'll return to setup.",
    confirmLabel: "Reset session",
    cancelLabel: "Cancel",
    destructive: true,
  });
}
