import { STAGES } from "../state.js";

export async function confirmResetSession(confirmAction, { to = STAGES.START } = {}) {
  const toStart = to === STAGES.START;
  // Dialog grammar (voice sheet): the title names the OUTCOME ("Discard this prep?"), the
  // confirm button restates the verb ("Discard"), and the dismiss is never "Cancel" when the
  // action itself IS cancelling — it says what staying does ("Keep going"). (audit M7 / C3)
  return confirmAction({
    message: toStart
      ? "Discard this prep? It will be cleared and you'll go back to the start. This can't be undone."
      : "Discard this prep? Your answers so far will be cleared and you'll go back to the start. This can't be undone.",
    confirmLabel: "Discard",
    cancelLabel: "Keep going",
    destructive: true,
  });
}
