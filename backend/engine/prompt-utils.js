// Shared prompt helpers used by every pipeline stage.

// Markdown prompt templates carry a "## System ... ## User ..." split. Given a
// template that has already had its {{PLACEHOLDERS}} filled, return the system
// and user halves (plus the filled text). If a half is missing, fall back to
// empty system / whole-template user so the caller still gets a usable prompt.
function splitSystemUser(filled) {
  const systemMatch = filled.match(/## System\s+([\s\S]*?)\n## User/);
  const userMatch = filled.match(/## User\s+([\s\S]*)$/);
  return {
    filled,
    system: systemMatch ? systemMatch[1].trim() : "",
    user: userMatch ? userMatch[1].trim() : filled,
  };
}

module.exports = { splitSystemUser };
