import assert from "node:assert/strict";

import { EXPERIMENT_CONFIG } from "../config/experiment.js";
import {
  MATCHING_START_DIRECTIONS,
  buildMatchingPlan,
  buildMatchingTrialsForArtwork,
} from "../pages/matching.js";

function createDeterministicRandom(values) {
  let index = 0;
  return function deterministicRandom() {
    const value = values[index % values.length];
    index += 1;
    return value;
  };
}

const artworkRandom = createDeterministicRandom([
  0.1,
  0.9,
  0.3,
  0.7,
  0.2,
  0.8,
  0.4,
  0.6,
]);

const artworkTrials = buildMatchingTrialsForArtwork({ random: artworkRandom });

assert.equal(artworkTrials.length, EXPERIMENT_CONFIG.matching.trialsPerArtwork);
assert.deepEqual(
  artworkTrials.map((trial) => trial.trialIndexWithinArtwork),
  [1, 2, 3, 4]
);

const darkTrials = artworkTrials.filter((trial) => trial.startDirection === MATCHING_START_DIRECTIONS.dark);
const brightTrials = artworkTrials.filter((trial) => trial.startDirection === MATCHING_START_DIRECTIONS.bright);

assert.equal(darkTrials.length, EXPERIMENT_CONFIG.matching.directionsPerArtwork.darkStart);
assert.equal(brightTrials.length, EXPERIMENT_CONFIG.matching.directionsPerArtwork.brightStart);

for (const trial of darkTrials) {
  assert.ok(trial.initialValue >= EXPERIMENT_CONFIG.matching.startValueRanges.dark.min);
  assert.ok(trial.initialValue <= EXPERIMENT_CONFIG.matching.startValueRanges.dark.max);
}

for (const trial of brightTrials) {
  assert.ok(trial.initialValue >= EXPERIMENT_CONFIG.matching.startValueRanges.bright.min);
  assert.ok(trial.initialValue <= EXPERIMENT_CONFIG.matching.startValueRanges.bright.max);
}

const state = {
  targetStimulus: { id: "stimulus_020", label: "Stimulus 020", imagePath: "target.png" },
  controlStimuli: [
    { id: "stimulus_019", label: "Stimulus 019", imagePath: "c1.png" },
    { id: "stimulus_018", label: "Stimulus 018", imagePath: "c2.png" },
    { id: "stimulus_017", label: "Stimulus 017", imagePath: "c3.png" },
    { id: "stimulus_016", label: "Stimulus 016", imagePath: "c4.png" },
  ],
};

const planRandom = createDeterministicRandom([
  0.02,
  0.62,
  0.18,
  0.88,
  0.24,
  0.74,
  0.32,
  0.94,
]);

const matchingPlan = buildMatchingPlan({ state, random: planRandom });

assert.equal(
  matchingPlan.trials.length,
  (1 + EXPERIMENT_CONFIG.controlStimulusCount) * EXPERIMENT_CONFIG.matching.trialsPerArtwork
);
assert.equal(matchingPlan.index, 0);

const perArtwork = matchingPlan.trials.reduce((groups, trial) => {
  groups[trial.stimulus.id] ??= [];
  groups[trial.stimulus.id].push(trial);
  return groups;
}, {});

assert.deepEqual(Object.keys(perArtwork), [
  "stimulus_020",
  "stimulus_019",
  "stimulus_018",
  "stimulus_017",
  "stimulus_016",
]);

for (const trials of Object.values(perArtwork)) {
  assert.equal(trials.length, EXPERIMENT_CONFIG.matching.trialsPerArtwork);
  assert.equal(
    trials.filter((trial) => trial.startDirection === MATCHING_START_DIRECTIONS.dark).length,
    EXPERIMENT_CONFIG.matching.directionsPerArtwork.darkStart
  );
  assert.equal(
    trials.filter((trial) => trial.startDirection === MATCHING_START_DIRECTIONS.bright).length,
    EXPERIMENT_CONFIG.matching.directionsPerArtwork.brightStart
  );
}

console.log(
  JSON.stringify(
    {
      artworkTrials,
      matchingPlanTrialCount: matchingPlan.trials.length,
      artworkIds: Object.keys(perArtwork),
    },
    null,
    2
  )
);
