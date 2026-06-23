import assert from "node:assert/strict";

import {
  ATTENTION_CHECK_EXPECTED_VALUE,
  ATTENTION_CHECK_ITEM,
  getAttentionCheckIndex,
  getSdQuestions,
} from "../config/scales.js";

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
assert.equal(firstOrder.includes(ATTENTION_CHECK_ITEM.name), false);
assert.notDeepEqual(firstOrder, thirdOrder);

const firstPreAttentionIndex = getAttentionCheckIndex({
  participantId: "participant-001",
  phase: "pre_sd",
  itemCount: 20,
});
const secondPreAttentionIndex = getAttentionCheckIndex({
  participantId: "participant-001",
  phase: "pre_sd",
  itemCount: 20,
});
const firstPostAttentionIndex = getAttentionCheckIndex({
  participantId: "participant-001",
  phase: "post_sd",
  itemCount: 10,
});
const otherPreAttentionIndex = getAttentionCheckIndex({
  participantId: "participant-002",
  phase: "pre_sd",
  itemCount: 20,
});

assert.equal(firstPreAttentionIndex, secondPreAttentionIndex);
assert.ok(firstPreAttentionIndex >= 0 && firstPreAttentionIndex < 20);
assert.ok(firstPostAttentionIndex >= 0 && firstPostAttentionIndex < 10);
assert.notEqual(firstPreAttentionIndex, firstPostAttentionIndex);
assert.ok(otherPreAttentionIndex >= 0 && otherPreAttentionIndex < 20);
assert.equal(ATTENTION_CHECK_EXPECTED_VALUE, 10);

console.log(
  JSON.stringify(
    {
      participant001: firstOrder,
      participant002: thirdOrder,
      attentionCheck: {
        itemName: ATTENTION_CHECK_ITEM.name,
        expectedValue: ATTENTION_CHECK_EXPECTED_VALUE,
        participant001PreIndex: firstPreAttentionIndex,
        participant001PostIndex: firstPostAttentionIndex,
        participant002PreIndex: otherPreAttentionIndex,
      },
    },
    null,
    2
  )
);
