function createBipolarLabels(leftText, rightText) {
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

const SD_DISPLAY_MODES = {
  minimal: ["evaluation", "brightness"],
  full: ["evaluation", "activity", "brightness", "softness"],
};

const EVALUATION_KEYS = SD_ITEM_BANK
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

export function getSdQuestions(mode = "minimal", { participantId } = {}) {
  const visibleFactors = SD_DISPLAY_MODES[mode] ?? SD_DISPLAY_MODES.minimal;
  const questions = SD_ITEM_BANK
    .filter((item) => visibleFactors.includes(item.factor))
    .map((item) => ({ ...item, required: true }));

  const seededRandom = createSeededRandom(createSeedFromString(participantId));
  return shuffleArray(questions, seededRandom);
}

export { BRIGHTNESS_KEYS, EVALUATION_KEYS, SD_DISPLAY_MODES, SD_ITEM_BANK };
