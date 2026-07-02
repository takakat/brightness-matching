// URL パラメータや localStorage で使う、条件割当まわりのキー名です。
const CONDITION_ASSIGNMENT_CONFIG = {
  currentParticipantStorageKey: "online-experiment-current-participant-id",
  urlConditionParam: "condition",
  urlParticipantParam: "participant_id",
};

// DataPipe が順番に返す条件番号を、アプリ内の条件 ID に対応させる割り当てテーブルです。
// 実験群 (counter_attitudinal) を 2 枠割り当てて、実験群 50% / 各統制群 25%（2:1:1）にします。
// ※ pipe.jspsych.org 側の Number of conditions を 4 に設定する必要があります。
const CONDITION_ASSIGNMENT_ORDER = [
  "counter_attitudinal",            // index 0 — 実験群
  "objective_description_control",  // index 1 — 統制群
  "irrelevant_control",             // index 2 — 統制群
  "counter_attitudinal",            // index 3 — 実験群（追加割り当て）
];

// アプリ内に存在する一意な条件 ID です（URL の ?condition= 検証などに使用）。
const CONDITION_ORDER = [
  "counter_attitudinal",
  "objective_description_control",
  "irrelevant_control",
];

// 各条件の表示名、ライティング課題文、どの刺激に書かせるかをまとめます。
const EXPERIMENT_CONDITIONS = {
  counter_attitudinal: {
    id: "counter_attitudinal",
    label: "反態度的記述群",
    writingTask: {
      stimulusRole: "target",
      instructions: [
        "「この作品の魅力や、他者に推薦できる優れた点」についての推薦文を作成していただきます。",
        "この作品をまだ見たことのない他者に推薦する文章を書いてください。",
        "この作品の魅力や、素晴らしい点、他者に勧めることのできる価値のある点を、少なくとも3つ挙げてください。それぞれについて、なぜそう言えるのかが伝わるように、具体的に説明してください。あなた自身の言葉で書いてください。",
      ],
    },
  },
  objective_description_control: {
    id: "objective_description_control",
    label: "客観的描写統制群",
    writingTask: {
      stimulusRole: "target",
      instructions: [
        "この作品について、 あなたの個人的な感想や「良い・悪い」といった評価は含めず、「作品の構成要素」を客観的に記述してください。",
        "形、色彩の配置、線や面の構成、筆致や質感など、観察できる特徴を少なくとも3つ挙げて、具体的に説明してください。",
      ],
    },
  },
  irrelevant_control: {
    id: "irrelevant_control",
    label: "無関係統制群",
    writingTask: {
      stimulusRole: "non_target",
      instructions: [
        "この作品について、 あなたの個人的な感想や「良い・悪い」といった評価は含めず、「作品の構成要素」を客観的に記述してください。",
        "形、色彩の配置、線や面の構成、筆致や質感など、観察できる特徴を少なくとも3つ挙げて、具体的に説明してください。",
      ],
    },
  },
};

const CONDITION_IDS = [...CONDITION_ORDER];
const DEFAULT_CONDITION_ID = CONDITION_IDS[0];

function getConditionById(conditionId) {
  // 不明な条件 ID が来た場合は、安全側としてデフォルト条件に戻します。
  if (conditionId && EXPERIMENT_CONDITIONS[conditionId]) {
    return EXPERIMENT_CONDITIONS[conditionId];
  }

  return EXPERIMENT_CONDITIONS[DEFAULT_CONDITION_ID];
}

function getConditionByIndex(conditionIndex) {
  // DataPipe は条件を数値インデックスで返すため、割り当てテーブルで条件 ID に変換します。
  const normalizedIndex = Number(conditionIndex);
  if (!Number.isInteger(normalizedIndex) || normalizedIndex < 0 || normalizedIndex >= CONDITION_ASSIGNMENT_ORDER.length) {
    return getConditionById(DEFAULT_CONDITION_ID);
  }

  return getConditionById(CONDITION_ASSIGNMENT_ORDER[normalizedIndex]);
}

export {
  CONDITION_ASSIGNMENT_CONFIG,
  CONDITION_ASSIGNMENT_ORDER,
  CONDITION_IDS,
  CONDITION_ORDER,
  DEFAULT_CONDITION_ID,
  EXPERIMENT_CONDITIONS,
  getConditionById,
  getConditionByIndex,
};
