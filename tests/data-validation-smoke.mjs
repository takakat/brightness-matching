import assert from "node:assert/strict";

import { summarizeExperimentRows } from "../logic/dataSummary.js";

const missingMatchingSummary = summarizeExperimentRows(
  [
    { phase: "intro", participant_id: "participant-001" },
    { phase: "consent", participant_id: "participant-001" },
    {
      phase: "writing",
      participant_id: "participant-001",
      condition_id: "objective_description_control",
      stimulus_id: "stimulus_020",
      char_count: 180,
      essay: "A sufficiently long essay response for the writing task.",
    },
  ],
  {
    participantId: "participant-001",
    assignedCondition: { id: "objective_description_control" },
    targetStimulus: { id: "stimulus_020" },
    controlStimuli: [
      { id: "stimulus_019" },
      { id: "stimulus_018" },
      { id: "stimulus_017" },
      { id: "stimulus_016" },
    ],
    postSdStimuli: [{ id: "stimulus_020" }],
  }
);

assert.ok(
  missingMatchingSummary.validationErrors.includes("Expected 20 pre-matching trials but found 0.")
);
assert.ok(
  missingMatchingSummary.validationErrors.includes("Expected 20 post-matching trials but found 0.")
);

const missingWritingSummary = summarizeExperimentRows(
  [],
  {
    participantId: "participant-001",
    assignedCondition: { id: "objective_description_control" },
    targetStimulus: { id: "stimulus_020" },
    controlStimuli: [
      { id: "stimulus_019" },
      { id: "stimulus_018" },
      { id: "stimulus_017" },
      { id: "stimulus_016" },
    ],
    postSdStimuli: [],
  }
);

assert.ok(missingWritingSummary.validationErrors.includes("Expected 1 writing response but found 0."));
assert.ok(missingWritingSummary.validationErrors.includes("Writing response is missing or empty."));

console.log(
  JSON.stringify(
    {
      missingMatchingErrors: missingMatchingSummary.validationErrors,
      missingWritingErrors: missingWritingSummary.validationErrors,
    },
    null,
    2
  )
);
