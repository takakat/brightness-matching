export function computeAverageScore(response, keys) {
  // 指定した SD 項目だけを平均し、未回答や数値化できない値は除外します。
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
  // 評価性スコアが低い順に並べます。同点時の処理は compareByScoreThenOrder が担います。
  return [...preResults].sort(compareByScoreThenOrder);
}

export function selectStimuli(preResults, options = {}) {
  // 最低評価をターゲット、次点群を統制刺激、低評価側の一部を事後 SD 対象にします。
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
