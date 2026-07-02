import assert from "node:assert/strict";

import { DEFAULT_CONDITION_ID, getConditionByIndex } from "../config/conditions.js";
import {
  assignParticipantConditionWithDataPipe,
  buildManualConditionAssignment,
} from "../logic/conditionAssignment.js";

const conditionIndexMapping = [0, 1, 2, 3].map((index) => ({
  index,
  conditionId: getConditionByIndex(index).id,
}));

// 実験群 (counter_attitudinal) を 2:1:1 で多く割り当てるため、
// index 0 と 3 の両方が実験群に対応することを検証します。
assert.equal(getConditionByIndex(0).id, "counter_attitudinal");
assert.equal(getConditionByIndex(1).id, "objective_description_control");
assert.equal(getConditionByIndex(2).id, "irrelevant_control");
assert.equal(getConditionByIndex(3).id, "counter_attitudinal");
// 範囲外のインデックスは既定条件へフォールバックします。
assert.equal(getConditionByIndex(4).id, DEFAULT_CONDITION_ID);

const manualOverride = buildManualConditionAssignment({
  participantId: "preview-user",
  searchParams: new URLSearchParams("condition=irrelevant_control"),
});

const dataPipeAssignment = await assignParticipantConditionWithDataPipe({
  participantId: "participant-001",
  experimentId: "demo-experiment",
  endpoint: "https://example.com/api/condition/",
  fetchImpl: async () => ({
    ok: true,
    async json() {
      return { condition: 1 };
    },
  }),
});

console.log(
  JSON.stringify(
    {
      conditionIndexMapping,
      manualOverride: {
        source: manualOverride.source,
        conditionId: manualOverride.conditionId,
      },
      dataPipeAssignment: {
        source: dataPipeAssignment.source,
        conditionIndex: dataPipeAssignment.conditionIndex,
        conditionId: dataPipeAssignment.conditionId,
      },
    },
    null,
    2
  )
);
