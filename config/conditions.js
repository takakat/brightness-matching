const CONDITION_ASSIGNMENT_CONFIG = {
  currentParticipantStorageKey: "online-experiment-current-participant-id",
  urlConditionParam: "condition",
  urlParticipantParam: "participant_id",
};

const CONDITION_ORDER = [
  "counter_attitudinal",
  "objective_description_control",
  "irrelevant_control",
];

const EXPERIMENT_CONDITIONS = {
  counter_attitudinal: {
    id: "counter_attitudinal",
    label: "反態度的記述群",
    writingTask: {
      stimulusRole: "target",
      instructions: [
        "この作品をまだ見たことのない他者に推薦する文章を書いてください。",
        "この作品の魅力や、他者に勧めることのできる価値のある点を、少なくとも3つ挙げてください。それぞれについて、なぜそう言えるのかが伝わるように、具体的に説明してください。あなた自身の言葉で書いてください。",
      ],
    },
  },
  objective_description_control: {
    id: "objective_description_control",
    label: "客観的描写統制群",
    writingTask: {
      stimulusRole: "target",
      instructions: [
        "この作品について、目に見える構成要素を客観的に記述してください。",
        "個人的な好悪や、良い・悪いといった評価、推薦表現は含めないでください。形、色彩の配置、線や面の構成、筆致や質感など、観察できる特徴を少なくとも3つ挙げて、具体的に説明してください。",
      ],
    },
  },
  irrelevant_control: {
    id: "irrelevant_control",
    label: "無関係統制群",
    writingTask: {
      stimulusRole: "non_target",
      instructions: [
        "指定された別の作品について、目に見える構成要素を客観的に記述してください。",
        "個人的な好悪や、良い・悪いといった評価、推薦表現は含めないでください。形、色彩の配置、線や面の構成、筆致や質感など、観察できる特徴を少なくとも3つ挙げて、具体的に説明してください。",
      ],
    },
  },
};

const CONDITION_IDS = [...CONDITION_ORDER];
const DEFAULT_CONDITION_ID = CONDITION_IDS[0];

function getConditionById(conditionId) {
  if (conditionId && EXPERIMENT_CONDITIONS[conditionId]) {
    return EXPERIMENT_CONDITIONS[conditionId];
  }

  return EXPERIMENT_CONDITIONS[DEFAULT_CONDITION_ID];
}

function getConditionByIndex(conditionIndex) {
  const normalizedIndex = Number(conditionIndex);
  if (!Number.isInteger(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= CONDITION_ORDER.length) {
    return getConditionById(DEFAULT_CONDITION_ID);
  }

  return getConditionById(CONDITION_ORDER[normalizedIndex]);
}

export {
  CONDITION_ASSIGNMENT_CONFIG,
  CONDITION_IDS,
  CONDITION_ORDER,
  DEFAULT_CONDITION_ID,
  EXPERIMENT_CONDITIONS,
  getConditionById,
  getConditionByIndex,
};
