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
  { name: "beauty", factor: "evaluation", prompt: "醜い - 美しい", labels: createBipolarLabels("醜い", "美しい") },
  { name: "like", factor: "evaluation", prompt: "嫌い - 好き", labels: createBipolarLabels("嫌い", "好き") },
  { name: "good", factor: "evaluation", prompt: "悪い - 良い", labels: createBipolarLabels("悪い", "良い") },
  { name: "interest", factor: "evaluation", prompt: "つまらない - 面白い", labels: createBipolarLabels("つまらない", "面白い") },
  { name: "dynamic", factor: "activity", prompt: "静的 - 動的", labels: createBipolarLabels("静的", "動的") },
  { name: "strong", factor: "activity", prompt: "弱い - 強い", labels: createBipolarLabels("弱い", "強い") },
  { name: "showy", factor: "activity", prompt: "地味な - 派手な", labels: createBipolarLabels("地味な", "派手な") },
  { name: "unique", factor: "activity", prompt: "平凡な - 個性的な", labels: createBipolarLabels("平凡な", "個性的な") },
  { name: "bright", factor: "brightness", prompt: "暗い - 明るい", labels: createBipolarLabels("暗い", "明るい") },
  { name: "fun", factor: "brightness", prompt: "悲しい - 楽しい", labels: createBipolarLabels("悲しい", "楽しい") },
  { name: "warm", factor: "brightness", prompt: "冷たい - 暖かい", labels: createBipolarLabels("冷たい", "暖かい") },
  { name: "heavy", factor: "brightness", prompt: "軽い - 重い", labels: createBipolarLabels("軽い", "重い") },
  { name: "soft", factor: "texture", prompt: "硬い - 柔らかい", labels: createBipolarLabels("硬い", "柔らかい") },
  { name: "loose", factor: "texture", prompt: "緊張した - ゆるやかな", labels: createBipolarLabels("緊張した", "ゆるやかな") },
  { name: "sharp", factor: "texture", prompt: "鈍い - 鋭い", labels: createBipolarLabels("鈍い", "鋭い") },
];

const SD_DISPLAY_MODES = {
  minimal: ["evaluation", "brightness"],
  full: ["evaluation", "activity", "brightness", "texture"],
};

const EVALUATION_KEYS = SD_ITEM_BANK
  .filter((item) => item.factor === "evaluation")
  .map((item) => item.name);

const BRIGHTNESS_KEYS = SD_ITEM_BANK
  .filter((item) => item.factor === "brightness")
  .map((item) => item.name);

export function getSdQuestions(mode = "minimal") {
  const visibleFactors = SD_DISPLAY_MODES[mode] ?? SD_DISPLAY_MODES.minimal;
  return SD_ITEM_BANK
    .filter((item) => visibleFactors.includes(item.factor))
    .map((item) => ({ ...item, required: true }));
}

export { BRIGHTNESS_KEYS, EVALUATION_KEYS, SD_DISPLAY_MODES, SD_ITEM_BANK };
