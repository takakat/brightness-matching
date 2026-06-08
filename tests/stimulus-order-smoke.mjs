import assert from "node:assert/strict";

import { getEnabledStimuli, shuffleStimuliForParticipant } from "../config/stimuli.js";

const sourceStimuli = getEnabledStimuli(20);

const firstOrder = shuffleStimuliForParticipant(sourceStimuli, "participant-001").map(
  (stimulus) => stimulus.id
);
const secondOrder = shuffleStimuliForParticipant(sourceStimuli, "participant-001").map(
  (stimulus) => stimulus.id
);
const thirdOrder = shuffleStimuliForParticipant(sourceStimuli, "participant-002").map(
  (stimulus) => stimulus.id
);
const originalOrder = sourceStimuli.map((stimulus) => stimulus.id);

assert.deepEqual(firstOrder, secondOrder);
assert.equal(firstOrder.length, sourceStimuli.length);
assert.equal(new Set(firstOrder).size, sourceStimuli.length);
assert.notDeepEqual(firstOrder, originalOrder);
assert.notDeepEqual(firstOrder, thirdOrder);

console.log(
  JSON.stringify(
    {
      participant001: firstOrder,
      participant002: thirdOrder,
    },
    null,
    2
  )
);
