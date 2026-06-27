function createBipolarLabels(leftText, rightText) {
  // jsPsych の Likert 尺度で、0 と 10 の端点に意味ラベルを付けます。
  const labelStyle = "font-size: 0.8em; font-weight: 500; display: block; margin-top: 4px;";
  return [
    `0<br><span style="${labelStyle}">${leftText}</span>`,
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    `10<br><span style="${labelStyle}">${rightText}</span>`,
  ];
}

function createNumericLabels() {
  return Array.from({ length: 11 }, (_, index) => String(index));
}

// SD 法の項目定義です。factor は表示モードや分析時の平均スコア算出に使います。
const SD_ITEM_BANK = [
  { name: "good", factor: "evaluation", prompt: "悪い - 良い", labels: createBipolarLabels("悪い", "良い") },
  { name: "beauty", factor: "evaluation", prompt: "醜い - 美しい", labels: createBipolarLabels("醜い", "美しい") },
  { name: "like", factor: "evaluation", prompt: "嫌い - 好き", labels: createBipolarLabels("嫌い", "好き") },
  { name: "pleasant", factor: "evaluation", prompt: "不快な - 快い", labels: createBipolarLabels("不快な", "快い") },
  { name: "dynamic", factor: "activity", prompt: "静的 - 動的", labels: createBipolarLabels("静的", "動的") },
  { name: "stable", factor: "activity", prompt: "不安定な - 安定した", labels: createBipolarLabels("不安定な", "安定した") },
  { name: "unique", factor: "activity", prompt: "平凡な - 個性的な", labels: createBipolarLabels("平凡な", "個性的な") },
  { name: "showy", factor: "activity", prompt: "地味な - 派手な", labels: createBipolarLabels("地味な", "派手な") },
  { name: "bright", factor: "brightness", prompt: "暗い - 明るい", labels: createBipolarLabels("暗い", "明るい") },
  { name: "cheerful", factor: "brightness", prompt: "陰気な - 陽気な", labels: createBipolarLabels("陰気な", "陽気な") },
  { name: "warm", factor: "brightness", prompt: "冷たい - 暖かい", labels: createBipolarLabels("冷たい", "暖かい") },
  { name: "fun", factor: "brightness", prompt: "寂しい - 楽しい", labels: createBipolarLabels("寂しい", "楽しい") },
  { name: "loose", factor: "softness", prompt: "緊張した - ゆるんだ", labels: createBipolarLabels("緊張した", "ゆるんだ") },
  { name: "relaxed", factor: "softness", prompt: "張りつめた - くつろいだ", labels: createBipolarLabels("張りつめた", "くつろいだ") },
  { name: "calm", factor: "softness", prompt: "厳格な - 穏やかな", labels: createBipolarLabels("厳格な", "穏やかな") },
  { name: "soft", factor: "softness", prompt: "固い - 柔らかな", labels: createBipolarLabels("固い", "柔らかな") },
];

const ATTENTION_CHECK_EXPECTED_VALUE = 10;
const ATTENTION_CHECK_COUNTS_BY_PHASE = {
  pre_sd: 3,
  post_sd: 2,
};
const ATTENTION_CHECK_ITEM = {
  name: "attention_check",
  prompt: "この項目では右端の「10」を選択してください。",
  labels: createNumericLabels(),
  required: true,
};

const SD_DISPLAY_MODES = {
  // minimal は確認用、full は本番想定の全因子表示です。
  minimal: ["evaluation", "brightness"],
  full: ["evaluation", "activity", "brightness", "softness"],
};

const EVALUATION_KEYS = SD_ITEM_BANK
  // evaluation 因子の平均は、ターゲット刺激の選定スコアになります。
  .filter((item) => item.factor === "evaluation")
  .map((item) => item.name);

const BRIGHTNESS_KEYS = SD_ITEM_BANK
  .filter((item) => item.factor === "brightness")
  .map((item) => item.name);

function createSeedFromString(value) {
  const source = String(value ?? "default-seed");
  let seed = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    seed ^= source.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }

  return seed >>> 0;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;

  return function seededRandom() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffleArray(items, random) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function getAttentionCheckIndex({ participantId, phase, itemCount } = {}) {
  const normalizedItemCount = Number(itemCount);
  if (!Number.isInteger(normalizedItemCount) || normalizedItemCount <= 0) {
    return -1;
  }

  const seed = createSeedFromString(`${participantId ?? "default-participant"}:${phase ?? "sd"}:attention_check`);
  const random = createSeededRandom(seed);
  return Math.floor(random() * normalizedItemCount);
}

export function getAttentionCheckIndices({ participantId, phase, itemCount, checkCount } = {}) {
  const normalizedItemCount = Number(itemCount);
  if (!Number.isInteger(normalizedItemCount) || normalizedItemCount <= 0) {
    return [];
  }

  const requestedCheckCount = checkCount ?? ATTENTION_CHECK_COUNTS_BY_PHASE[phase] ?? 1;
  const normalizedCheckCount = Math.min(
    normalizedItemCount,
    Math.max(0, Number(requestedCheckCount) || 0)
  );

  if (normalizedCheckCount === 0) {
    return [];
  }

  const firstIndex = getAttentionCheckIndex({ participantId, phase, itemCount });
  const remainingIndices = Array.from({ length: normalizedItemCount }, (_, index) => index)
    .filter((index) => index !== firstIndex);
  const random = createSeededRandom(
    createSeedFromString(`${participantId ?? "default-participant"}:${phase ?? "sd"}:attention_check_extra`)
  );

  return [
    firstIndex,
    ...shuffleArray(remainingIndices, random).slice(0, normalizedCheckCount - 1),
  ];
}

export function getSdQuestions(mode = "minimal", { participantId } = {}) {
  // 参加者 ID で項目順を固定シャッフルし、順序効果を抑えつつ再現性を保ちます。
  const visibleFactors = SD_DISPLAY_MODES[mode] ?? SD_DISPLAY_MODES.minimal;
  const questions = SD_ITEM_BANK
    .filter((item) => visibleFactors.includes(item.factor))
    .map((item) => ({ ...item, required: true }));

  const seededRandom = createSeededRandom(createSeedFromString(participantId));
  return shuffleArray(questions, seededRandom);
}

export {
  ATTENTION_CHECK_COUNTS_BY_PHASE,
  ATTENTION_CHECK_EXPECTED_VALUE,
  ATTENTION_CHECK_ITEM,
  BRIGHTNESS_KEYS,
  EVALUATION_KEYS,
  SD_DISPLAY_MODES,
  SD_ITEM_BANK,
};
