import assert from "node:assert/strict";

import { getConditionById } from "../config/conditions.js";
import { getWritingStimulus } from "../pages/writing.js";

const targetStimulus = { id: "stimulus_020", label: "Stimulus 020" };
const controlStimuli = [
  { id: "stimulus_019", label: "Stimulus 019" },
  { id: "stimulus_018", label: "Stimulus 018" },
];

const state = {
  targetStimulus,
  highestRatedStimulus: { id: "stimulus_001", label: "Stimulus 001" },
  controlStimuli,
};

assert.equal(
  getWritingStimulus(state, getConditionById("counter_attitudinal")).id,
  targetStimulus.id
);
assert.equal(
  getWritingStimulus(state, getConditionById("objective_description_control")).id,
  targetStimulus.id
);
assert.equal(
  getWritingStimulus(state, getConditionById("irrelevant_control")).id,
  state.highestRatedStimulus.id
);

console.log(
  JSON.stringify(
    {
      counter_attitudinal: getWritingStimulus(state, getConditionById("counter_attitudinal")).id,
      objective_description_control: getWritingStimulus(
        state,
        getConditionById("objective_description_control")
      ).id,
      irrelevant_control: getWritingStimulus(state, getConditionById("irrelevant_control")).id,
    },
    null,
    2
  )
);
