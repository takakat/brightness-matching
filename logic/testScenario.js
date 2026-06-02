const DEFAULT_TEST_SCENARIO_ID = "flat_mid";
const TEST_SCENARIO_IDS = [
  DEFAULT_TEST_SCENARIO_ID,
  "strict_ascending",
  "tie_blocks",
];

const EVALUATION_KEYS = ["beauty", "like", "good", "interest"];
const BRIGHTNESS_KEYS = ["bright", "fun", "warm", "heavy"];
const ACTIVITY_KEYS = ["dynamic", "strong", "showy", "unique"];
const TEXTURE_KEYS = ["soft", "loose", "sharp"];

function resolveSearchParams(searchParams) {
  if (searchParams instanceof URLSearchParams) {
    return searchParams;
  }

  return new URLSearchParams(globalThis.location?.search ?? "");
}

function clampLikertValue(value) {
  return Math.max(0, Math.min(10, Number(value) || 0));
}

function distributeSum(total, keys) {
  const response = {};
  let remaining = Math.max(0, Number(total) || 0);

  for (const key of keys) {
    const value = Math.min(10, remaining);
    response[key] = clampLikertValue(value);
    remaining -= value;
  }

  return response;
}

function buildBaseResponse({ evaluationSum, brightnessSum }) {
  const response = {
    ...distributeSum(evaluationSum, EVALUATION_KEYS),
    ...distributeSum(brightnessSum, BRIGHTNESS_KEYS),
  };

  for (const key of ACTIVITY_KEYS) {
    response[key] = 5;
  }

  for (const key of TEXTURE_KEYS) {
    response[key] = 5;
  }

  return response;
}

function buildScenarioProfile({ scenarioId, displayOrder, stimulusCount }) {
  if (scenarioId === "strict_ascending") {
    return {
      evaluationSum: stimulusCount - displayOrder,
      brightnessSum: 20 + ((displayOrder - 1) % 4),
    };
  }

  if (scenarioId === "tie_blocks") {
    return displayOrder <= 12
      ? { evaluationSum: 4, brightnessSum: 12 }
      : { evaluationSum: 24, brightnessSum: 28 };
  }

  return {
    evaluationSum: 12,
    brightnessSum: 20,
  };
}

function buildCompactText(seed, minimumCharacters) {
  let text = String(seed ?? "test");
  while (text.length < minimumCharacters) {
    text += seed;
  }
  return text;
}

export function isTestMode(searchParams) {
  return resolveSearchParams(searchParams).get("test") === "true";
}

export function getTestScenarioId(searchParams) {
  const requestedScenarioId = resolveSearchParams(searchParams).get("testScenario");
  return TEST_SCENARIO_IDS.includes(requestedScenarioId)
    ? requestedScenarioId
    : DEFAULT_TEST_SCENARIO_ID;
}

export function buildTestSdResponse({
  searchParams,
  scenarioId = getTestScenarioId(searchParams),
  stimulus,
  totalStimuli = 1,
} = {}) {
  const displayOrder = Number(stimulus?.displayOrder) || 1;
  const profile = buildScenarioProfile({
    scenarioId,
    displayOrder,
    stimulusCount: Math.max(displayOrder, Number(totalStimuli) || 1),
  });

  return buildBaseResponse(profile);
}

export function buildTestWritingResponse({
  searchParams,
  scenarioId = getTestScenarioId(searchParams),
  minCharacters,
  conditionId = "unknown_condition",
  stimulusId = "unknown_stimulus",
} = {}) {
  const requiredLength = Math.max(0, Number(minCharacters) || 0);

  if (scenarioId === DEFAULT_TEST_SCENARIO_ID) {
    return "x".repeat(requiredLength);
  }

  const seed =
    scenarioId === "strict_ascending"
      ? `strict${conditionId}${stimulusId}response`
      : `tie${conditionId}${stimulusId}response`;

  return buildCompactText(seed, requiredLength + 32);
}

export { DEFAULT_TEST_SCENARIO_ID, TEST_SCENARIO_IDS };
