import assert from "node:assert/strict";

import { selectStimuli } from "../logic/selection.js";

const sample = Array.from({ length: 20 }, (_, index) => ({
  id: `stimulus_${String(index + 1).padStart(3, "0")}`,
  label: `Stimulus ${String(index + 1).padStart(3, "0")}`,
  displayOrder: index + 1,
  evaluationScore: index < 12 ? 1 : 6,
}));

const selection = selectStimuli(sample, {
  controlCount: 3,
  lowScoreCount: 10,
});

assert.equal(selection.target.id, "stimulus_001");
assert.deepEqual(
  selection.controls.map((item) => item.id),
  ["stimulus_002", "stimulus_003", "stimulus_004"]
);
assert.deepEqual(
  selection.postSdStimuli.map((item) => item.id),
  [
    "stimulus_001",
    "stimulus_002",
    "stimulus_003",
    "stimulus_004",
    "stimulus_005",
    "stimulus_006",
    "stimulus_007",
    "stimulus_008",
    "stimulus_009",
    "stimulus_010",
  ]
);

console.log(
  JSON.stringify(
    {
      target: selection.target.id,
      controls: selection.controls.map((item) => item.id),
      postSdIds: selection.postSdStimuli.map((item) => item.id),
    },
    null,
    2
  )
);
