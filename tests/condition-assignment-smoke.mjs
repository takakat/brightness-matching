import { getConditionByIndex } from "../config/conditions.js";
import {
  assignParticipantConditionWithDataPipe,
  buildManualConditionAssignment,
} from "../logic/conditionAssignment.js";

const conditionIndexMapping = [0, 1, 2].map((index) => ({
  index,
  conditionId: getConditionByIndex(index).id,
}));

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
