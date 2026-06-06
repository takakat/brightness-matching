import assert from "node:assert/strict";

import { getSdQuestions } from "../config/scales.js";

const firstOrder = getSdQuestions("full", {
  participantId: "participant-001",
}).map((item) => item.name);

const secondOrder = getSdQuestions("full", {
  participantId: "participant-001",
}).map((item) => item.name);

const thirdOrder = getSdQuestions("full", {
  participantId: "participant-002",
}).map((item) => item.name);

assert.deepEqual(firstOrder, secondOrder);
assert.equal(firstOrder.length, 16);
assert.equal(new Set(firstOrder).size, 16);
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
