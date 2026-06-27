import assert from "node:assert/strict";

import {
  ATTENTION_CHECK_EXPECTED_VALUE,
  ATTENTION_CHECK_ITEM,
  getAttentionCheckIndex,
  getAttentionCheckIndices,
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
const firstPreAttentionIndices = getAttentionCheckIndices({
  participantId: "participant-001",
  phase: "pre_sd",
  itemCount: 20,
});
const secondPreAttentionIndices = getAttentionCheckIndices({
  participantId: "participant-001",
  phase: "pre_sd",
  itemCount: 20,
});
const firstPostAttentionIndices = getAttentionCheckIndices({
  participantId: "participant-001",
  phase: "post_sd",
  itemCount: 10,
});

assert.equal(firstPreAttentionIndex, secondPreAttentionIndex);
assert.ok(firstPreAttentionIndex >= 0 && firstPreAttentionIndex < 20);
assert.ok(firstPostAttentionIndex >= 0 && firstPostAttentionIndex < 10);
assert.notEqual(firstPreAttentionIndex, firstPostAttentionIndex);
assert.ok(otherPreAttentionIndex >= 0 && otherPreAttentionIndex < 20);
assert.deepEqual(firstPreAttentionIndices, secondPreAttentionIndices);
assert.equal(firstPreAttentionIndices.length, 3);
assert.equal(new Set(firstPreAttentionIndices).size, 3);
assert.equal(firstPreAttentionIndices[0], firstPreAttentionIndex);
assert.ok(firstPreAttentionIndices.every((index) => index >= 0 && index < 20));
assert.equal(firstPostAttentionIndices.length, 2);
assert.equal(new Set(firstPostAttentionIndices).size, 2);
assert.equal(firstPostAttentionIndices[0], firstPostAttentionIndex);
assert.ok(firstPostAttentionIndices.every((index) => index >= 0 && index < 10));
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
        participant001PreIndices: firstPreAttentionIndices,
        participant001PostIndices: firstPostAttentionIndices,
      },
    },
    null,
    2
  )
);
