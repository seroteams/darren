const path = require("node:path");
const questions = require("./questions");

function loadIntroQueue(meetingTypeLabel, budget) {
  const slug = questions.slugify(meetingTypeLabel);
  const loaded = questions.loadDir(path.join("_intro", slug));
  return loaded.slice(0, budget);
}

module.exports = { loadIntroQueue };
