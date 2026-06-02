import assert from "node:assert/strict";

import { EXPERIMENT_CONFIG } from "../config/experiment.js";
import { summarizeExperimentRows } from "../logic/dataSummary.js";

function buildStimulusId(sequenceNumber) {
  return `stimulus_${String(sequenceNumber).padStart(3, "0")}`;
}

function createMatchingRows({ phase, stimulusId, values }) {
  return values.map((matchingValue, index) => ({
    phase,
    participant_id: "participant-001",
    stimulus_id: stimulusId,
    start_direction: index % 2 === 0 ? "dark_start" : "bright_start",
    matching_value: matchingValue,
  }));
}

const rows = [
  { phase: "intro", participant_id: "participant-001" },
  { phase: "consent", participant_id: "participant-001" },
  ...Array.from({ length: 20 }, (_, index) => ({
    phase: "pre_sd",
    participant_id: "participant-001",
    stimulus_id: buildStimulusId(index + 1),
  })),
  ...createMatchingRows({ phase: "pre_matching", stimulusId: "stimulus_020", values: [131, 137, 133, 135] }),
  ...createMatchingRows({ phase: "pre_matching", stimulusId: "stimulus_019", values: [125, 129, 127, 131] }),
  ...createMatchingRows({ phase: "pre_matching", stimulusId: "stimulus_018", values: [121, 123, 125, 127] }),
  ...createMatchingRows({ phase: "pre_matching", stimulusId: "stimulus_017", values: [119, 121, 123, 125] }),
  {
    phase: "writing",
    participant_id: "participant-001",
    condition_id: "objective_description_control",
    stimulus_id: "stimulus_020",
    char_count: 184,
    essay: "A sufficiently long essay response for the writing task.",
  },
  ...createMatchingRows({ phase: "post_matching", stimulusId: "stimulus_020", values: [126, 130, 128, 132] }),
  ...createMatchingRows({ phase: "post_matching", stimulusId: "stimulus_019", values: [121, 127, 123, 129] }),
  ...createMatchingRows({ phase: "post_matching", stimulusId: "stimulus_018", values: [118, 122, 120, 124] }),
  ...createMatchingRows({ phase: "post_matching", stimulusId: "stimulus_017", values: [116, 120, 118, 122] }),
  ...Array.from({ length: 10 }, (_, index) => ({
    phase: "post_sd",
    participant_id: "participant-001",
    stimulus_id: buildStimulusId(20 - index),
  })),
  { phase: "finish", participant_id: "participant-001" },
];

const summary = summarizeExperimentRows(rows, {
  participantId: "participant-001",
  assignedCondition: { id: "objective_description_control" },
  targetStimulus: { id: "stimulus_020" },
  controlStimuli: [
    { id: "stimulus_019" },
    { id: "stimulus_018" },
    { id: "stimulus_017" },
  ],
  postSdStimuli: Array.from({ length: 10 }, (_, index) => ({
    id: buildStimulusId(20 - index),
  })),
});

assert.equal(summary.phaseCounts.pre_sd, 20);
assert.equal(summary.phaseCounts.post_sd, 10);
assert.equal(
  summary.preMatchingTrialCount,
  (1 + EXPERIMENT_CONFIG.controlStimulusCount) * EXPERIMENT_CONFIG.matching.trialsPerArtwork
);
assert.equal(summary.postMatchingTrialCount, summary.expectedCounts.postMatchingTrialCount);
assert.equal(summary.matchingArtworkCount, summary.expectedCounts.matchingArtworkCount);
assert.deepEqual(summary.directionCounts, {
  pre_matching: {
    dark_start: 8,
    bright_start: 8,
  },
  post_matching: {
    dark_start: 8,
    bright_start: 8,
  },
});
assert.equal(summary.matching.artworkMeans.pre_matching.stimulus_020, 134);
assert.equal(summary.matching.artworkMeans.post_matching.stimulus_019, 125);
assert.equal(summary.expectedCounts.controlStimulusCount, EXPERIMENT_CONFIG.controlStimulusCount);
assert.equal(summary.expectedCounts.postSdStimulusCount, 10);
assert.deepEqual(summary.validationErrors, []);

console.log(JSON.stringify(summary, null, 2));
