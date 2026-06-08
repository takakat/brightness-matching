const SOURCE_FILENAMES = [
  "painting_01.jpg",
  "painting_02.jpg",
  "painting_03.jpg",
  "painting_04.jpg",
  "painting_05.jpg",
  "painting_06.jpg",
  "50921.jpg",
  "50928.jpg",
  "50930.jpg",
  "50932.jpg",
  "50934.jpg",
  "50938.jpg",
  "51016.jpg",
  "51102.jpg",
  "51105.jpg",
  "51110.jpg",
  "51111.jpg",
  "51214.jpg",
  "51219.jpg",
  "51223.jpg",
];

const STIMULI_MANIFEST = SOURCE_FILENAMES.map((sourceFilename, index) => {
  const sequence = String(index + 1).padStart(3, "0");

  return {
    id: `stimulus_${sequence}`,
    label: `Stimulus ${sequence}`,
    imagePath: `./assets/stimuli/stimulus_${sequence}.jpg`,
    displayOrder: index + 1,
    enabled: true,
    sourceFilename,
  };
});

export function getEnabledStimuli(limit = STIMULI_MANIFEST.length) {
  return STIMULI_MANIFEST
    .filter((stimulus) => stimulus.enabled)
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .slice(0, limit);
}

export function getPreloadImages(limit = STIMULI_MANIFEST.length) {
  return getEnabledStimuli(limit).map((stimulus) => stimulus.imagePath);
}

function hashStringToSeed(value) {
  const normalizedValue = String(value ?? "default-participant");
  let hash = 2166136261;

  for (let index = 0; index < normalizedValue.length; index += 1) {
    hash ^= normalizedValue.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRandom(seedValue) {
  let state = seedValue || 1;

  return function seededRandom() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;

    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleStimuliForParticipant(stimuli, participantId) {
  const shuffledStimuli = [...stimuli];
  const random = createSeededRandom(hashStringToSeed(participantId));

  for (let index = shuffledStimuli.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffledStimuli[index], shuffledStimuli[swapIndex]] = [shuffledStimuli[swapIndex], shuffledStimuli[index]];
  }

  return shuffledStimuli;
}

export { STIMULI_MANIFEST };
