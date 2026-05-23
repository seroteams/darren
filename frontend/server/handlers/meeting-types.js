const { MEETING_TYPES } = require("../../../src/meeting-types");

module.exports = function meetingTypes(c) {
  c.json(200, { types: MEETING_TYPES });
};
