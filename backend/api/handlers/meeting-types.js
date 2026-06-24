const { MEETING_TYPES } = require("../../engine/meeting-types.ts");

module.exports = function meetingTypes(c) {
  c.json(200, { types: MEETING_TYPES });
};
