const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    roleFamily: { type: "string" },
    seniority: { type: "string" },
    meetingType: { type: "string" },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["prefer_term", "prefer_phrase", "avoid_phrase"] },
          value: { type: "string" },
          reason: { type: "string" },
          evidence: { type: "string" },
          better_as: { type: ["string", "null"] },
          status: { type: "string", enum: ["pending"] },
        },
        required: ["type", "value", "reason", "evidence", "better_as", "status"],
        additionalProperties: false,
      },
    },
  },
  required: ["roleFamily", "seniority", "meetingType", "suggestions"],
  additionalProperties: false,
};

module.exports = { RESPONSE_SCHEMA };
