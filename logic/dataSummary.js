import { EXPERIMENT_CONFIG } from "../config/experiment.js?v=20260528-flow-validation";

function incrementPhaseCount(phaseCounts, phase) {
  if (!phase) {
    return phaseCounts;
  }

  phaseCounts[phase] = (phaseCounts[phase] ?? 0) + 1;
  return phaseCounts;
}

function mean(values) {
  const numericValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (numericValues.length === 0) {
    return null;
  }

  const sum = numericValues.reduce((accumulator, value) => accumulator + value, 0);
  return sum / numericValues.length;
}

function getMatchingRows(rows, phase) {
  return rows.filter((row) => row.phase === phase);
}

function buildDirectionCounts(rows) {
  return rows.reduce((counts, row) => {
    const key = row.start_direction ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function buildArtworkMeans(rows) {
  const groupedValues = rows.reduce((groups, row) => {
    const stimulusId = row.stimulus_id;
    if (!stimulusId) {
      return groups;
    }

    if (!groups[stimulusId]) {
      groups[stimulusId] = [];
    }

    groups[stimulusId].push(row.matching_value);
    return groups;
  }, {});

  return Object.fromEntries(
    Object.entries(groupedValues).map(([stimulusId, values]) => [stimulusId, mean(values)])
  );
}

function summarizeMatchingPhase(rows) {
  const artworkIds = new Set(rows.map((row) => row.stimulus_id).filter(Boolean));

  return {
    trialCount: rows.length,
    artworkCount: artworkIds.size,
    directionCounts: buildDirectionCounts(rows),
    artworkMeans: buildArtworkMeans(rows),
    overallMean: mean(rows.map((row) => row.matching_value)),
  };
}

function buildExpectedCounts(experimentState = {}) {
  const expectedControlStimulusCount = EXPERIMENT_CONFIG.controlStimulusCount;
  const expectedMatchingArtworkCount = 1 + expectedControlStimulusCount;
  const expectedMatchingTrialCount =
    expectedMatchingArtworkCount * EXPERIMENT_CONFIG.matching.trialsPerArtwork;

  return {
    writingTrialCount: 1,
    controlStimulusCount: expectedControlStimulusCount,
    matchingArtworkCount: expectedMatchingArtworkCount,
    preMatchingTrialCount: expectedMatchingTrialCount,
    postMatchingTrialCount: expectedMatchingTrialCount,
    postSdStimulusCount: experimentState.postSdStimuli?.length ?? 0,
  };
}

function buildValidationErrors(summary, experimentState = {}) {
  const errors = [];
  const writingTrialCount = summary.phaseCounts.writing ?? 0;

  if (!experimentState.targetStimulus?.id) {
    errors.push("Target stimulus was not selected.");
  }

  if ((experimentState.controlStimuli?.length ?? 0) !== summary.expectedCounts.controlStimulusCount) {
    errors.push(
      `Expected ${summary.expectedCounts.controlStimulusCount} control stimuli but found ${experimentState.controlStimuli?.length ?? 0}.`
    );
  }

  if (writingTrialCount !== summary.expectedCounts.writingTrialCount) {
    errors.push(`Expected 1 writing response but found ${writingTrialCount}.`);
  }

  if (!summary.writing?.hasEssay) {
    errors.push("Writing response is missing or empty.");
  }

  if (summary.preMatchingTrialCount !== summary.expectedCounts.preMatchingTrialCount) {
    errors.push(
      `Expected ${summary.expectedCounts.preMatchingTrialCount} pre-matching trials but found ${summary.preMatchingTrialCount}.`
    );
  }

  if (summary.postMatchingTrialCount !== summary.expectedCounts.postMatchingTrialCount) {
    errors.push(
      `Expected ${summary.expectedCounts.postMatchingTrialCount} post-matching trials but found ${summary.postMatchingTrialCount}.`
    );
  }

  return errors;
}

export function summarizeExperimentRows(rows, experimentState = {}) {
  const phaseCounts = rows.reduce((counts, row) => incrementPhaseCount(counts, row.phase), {});
  const writingRows = rows.filter((row) => row.phase === "writing");
  const writingRow = writingRows[0];
  const preMatchingRows = getMatchingRows(rows, "pre_matching");
  const postMatchingRows = getMatchingRows(rows, "post_matching");
  const preMatchingSummary = summarizeMatchingPhase(preMatchingRows);
  const postMatchingSummary = summarizeMatchingPhase(postMatchingRows);
  const matchingArtworkIds = new Set([
    ...preMatchingRows.map((row) => row.stimulus_id).filter(Boolean),
    ...postMatchingRows.map((row) => row.stimulus_id).filter(Boolean),
  ]);
  const directionCounts = {
    pre_matching: preMatchingSummary.directionCounts,
    post_matching: postMatchingSummary.directionCounts,
  };

  const summary = {
    rowCount: rows.length,
    phaseCounts,
    conditionId: experimentState.assignedCondition?.id ?? writingRow?.condition_id ?? null,
    participantId: experimentState.participantId ?? rows[0]?.participant_id ?? null,
    targetStimulusId: experimentState.targetStimulus?.id ?? null,
    controlStimulusCount: experimentState.controlStimuli?.length ?? 0,
    postSdStimulusCount: experimentState.postSdStimuli?.length ?? 0,
    preMatchingTrialCount: preMatchingSummary.trialCount,
    postMatchingTrialCount: postMatchingSummary.trialCount,
    matchingArtworkCount: matchingArtworkIds.size,
    directionCounts,
    writing: writingRow
      ? {
          stimulusId: writingRow.stimulus_id ?? null,
          charCount: writingRow.char_count ?? 0,
          hasEssay: Boolean(String(writingRow.essay ?? "").trim()),
          trialCount: writingRows.length,
        }
      : null,
    matching: {
      preMatchingTrialCount: preMatchingSummary.trialCount,
      postMatchingTrialCount: postMatchingSummary.trialCount,
      matchingArtworkCount: matchingArtworkIds.size,
      directionCounts,
      artworkMeans: {
        pre_matching: preMatchingSummary.artworkMeans,
        post_matching: postMatchingSummary.artworkMeans,
      },
      overallMeans: {
        pre_matching: preMatchingSummary.overallMean,
        post_matching: postMatchingSummary.overallMean,
      },
    },
  };

  summary.expectedCounts = buildExpectedCounts(experimentState);
  summary.validationErrors = buildValidationErrors(summary, experimentState);

  return summary;
}
