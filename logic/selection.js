export function computeAverageScore(response, keys) {
  const values = keys
    .map((key) => Number(response[key]))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return null;
  }

  const sum = values.reduce((accumulator, value) => accumulator + value, 0);
  return sum / values.length;
}

function compareByScoreThenOrder(left, right) {
  if (left.evaluationScore !== right.evaluationScore) {
    return left.evaluationScore - right.evaluationScore;
  }

  return left.displayOrder - right.displayOrder;
}

export function rankStimuliByEvaluation(preResults) {
  return [...preResults].sort(compareByScoreThenOrder);
}

export function selectStimuli(preResults, options = {}) {
  const ranked = rankStimuliByEvaluation(preResults);
  const controlCount = options.controlCount ?? 3;
  const lowScoreCount = options.lowScoreCount ?? 10;

  if (ranked.length === 0) {
    return {
      ranked,
      target: null,
      controls: [],
      postSdStimuli: [],
    };
  }

  const [target, ...remaining] = ranked;
  const controls = remaining.slice(0, controlCount);
  const postSdStimuli = ranked.slice(0, Math.min(lowScoreCount, ranked.length));

  return {
    ranked,
    target,
    controls,
    postSdStimuli,
  };
}
