import { EXPERIMENT_CONFIG } from "../config/experiment.js?v=20260528-flow-validation";

export const MATCHING_START_DIRECTIONS = {
  dark: "dark_start",
  bright: "bright_start",
};

function resolveTrialValue(valueOrGetter) {
  return typeof valueOrGetter === "function" ? valueOrGetter() : valueOrGetter;
}

function clampValue(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function sampleIntegerInRange(range, random = Math.random) {
  const minimum = Math.ceil(range.min);
  const maximum = Math.floor(range.max);
  return Math.floor(random() * (maximum - minimum + 1)) + minimum;
}

function shuffleArray(items, random = Math.random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function buildDirectionList() {
  const { directionsPerArtwork } = EXPERIMENT_CONFIG.matching;
  const directions = [];

  for (let count = 0; count < directionsPerArtwork.darkStart; count += 1) {
    directions.push(MATCHING_START_DIRECTIONS.dark);
  }

  for (let count = 0; count < directionsPerArtwork.brightStart; count += 1) {
    directions.push(MATCHING_START_DIRECTIONS.bright);
  }

  return directions;
}

function getStartValueRange(startDirection) {
  if (startDirection === MATCHING_START_DIRECTIONS.dark) {
    return EXPERIMENT_CONFIG.matching.startValueRanges.dark;
  }

  return EXPERIMENT_CONFIG.matching.startValueRanges.bright;
}

function initializeMatchingPhaseState(state, phase) {
  if (!Array.isArray(state.matchingResponses?.[phase])) {
    state.matchingResponses[phase] = [];
  }
}

function createMatchingHtml({ stimulus }) {
  const matchingConfig = EXPERIMENT_CONFIG.matching;
  const stageStyle = [
    `--matching-shell-width: ${matchingConfig.shellWidthPx}px`,
    `--matching-frame-size: ${matchingConfig.frameSizePx}px`,
    `--matching-stage-gap: ${matchingConfig.stageGapPx}px`,
    `--matching-patch-inset: ${matchingConfig.patchInsetPx}px`,
    `--matching-visible-height: ${matchingConfig.frameSizePx - (matchingConfig.patchInsetPx * 2)}px`,
    "--matching-artwork-ratio: 1",
  ].join("; ");

  return `
    <div class="matching-shell" style="${stageStyle}">
      <div class="matching-card">
        <div class="matching-instruction-slot" aria-label="instruction-slot">
          <p>絵画の明るさの印象と同じになるように右の比較刺激を調整してください</p>
        </div>
        <div class="matching-layout">
          <div class="matching-stage">
            <div class="matching-target-column">
              <div class="matching-figure-frame">
                <img src="${stimulus.imagePath}" alt="${stimulus.label}" class="matching-stimulus">
              </div>
            </div>
            <div class="matching-reference-column">
              <div class="matching-reference-frame">
                <div class="comparison-patch" id="comparison-patch"></div>
              </div>
            </div>
          </div>
          <div class="matching-controls-panel">
            <div class="matching-controls">
              <div class="key-hint">
                <p style="margin: 0 0 8px;"><strong>操作方法</strong></p>
                <ul class="compact-list">
                  <li>A キー / 左矢印キー: 1段階暗くする</li>
                  <li>D キー / 右矢印キー: 1段階明るくする</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function buildMatchingTrialsForArtwork({ random = Math.random } = {}) {
  const directions = shuffleArray(buildDirectionList(), random);

  return directions.map((startDirection, index) => ({
    trialIndexWithinArtwork: index + 1,
    startDirection,
    initialValue: sampleIntegerInRange(getStartValueRange(startDirection), random),
  }));
}

export function getMatchingStimuli(state) {
  const stimuli = [];

  if (state.targetStimulus) {
    stimuli.push({
      stimulus: state.targetStimulus,
      stimulusRole: "target",
    });
  }

  for (const controlStimulus of state.controlStimuli ?? []) {
    stimuli.push({
      stimulus: controlStimulus,
      stimulusRole: "control",
    });
  }

  return stimuli;
}

export function buildMatchingPlan({
  state,
  stimuli = getMatchingStimuli(state),
  random = Math.random,
}) {
  return {
    trials: stimuli.flatMap(({ stimulus, stimulusRole }) =>
      buildMatchingTrialsForArtwork({ random }).map((trialDefinition) => ({
        stimulus,
        stimulusRole,
        trialIndexWithinArtwork: trialDefinition.trialIndexWithinArtwork,
        startDirection: trialDefinition.startDirection,
        initialValue: trialDefinition.initialValue,
      }))
    ),
    index: 0,
  };
}

export function createMatchingTrial({
  state,
  phase,
  stimulus,
  stimulusRole,
  trialIndexWithinArtwork,
  startDirection,
  initialValue,
}) {
  const { jsPsychHtmlButtonResponse } = window;
  const matchingState = {
    value: null,
    adjustmentCount: 0,
  };
  let keyHandler = null;

  function repaintPatch() {
    const patch = document.getElementById("comparison-patch");
    if (!patch) {
      return;
    }

    const channel = matchingState.value;
    patch.style.backgroundColor = `rgb(${channel}, ${channel}, ${channel})`;
  }

  function applyArtworkAspectRatio() {
    const shell = document.querySelector(".matching-shell");
    const image = document.querySelector(".matching-stimulus");
    if (!shell || !image) {
      return;
    }

    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    if (!naturalWidth || !naturalHeight) {
      return;
    }

    shell.style.setProperty("--matching-artwork-ratio", String(naturalWidth / naturalHeight));
  }

  function adjustValue(step) {
    matchingState.value = clampValue(
      matchingState.value + step,
      EXPERIMENT_CONFIG.matching.minValue,
      EXPERIMENT_CONFIG.matching.maxValue
    );
    matchingState.adjustmentCount += 1;
    repaintPatch();
  }

  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: () => createMatchingHtml({ stimulus: resolveTrialValue(stimulus) }),
    choices: ["Next"],
    on_load: () => {
      const isTestMode = new URLSearchParams(window.location.search).get("test") === "true";
      matchingState.value = resolveTrialValue(initialValue);
      matchingState.adjustmentCount = 0;
      document.body.classList.add("matching-page-mode");
      applyArtworkAspectRatio();
      repaintPatch();

      keyHandler = function handleKey(event) {
        if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
          event.preventDefault();
          adjustValue(event.shiftKey ? -EXPERIMENT_CONFIG.matching.coarseStep : -EXPERIMENT_CONFIG.matching.fineStep);
        }
        if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
          event.preventDefault();
          adjustValue(event.shiftKey ? EXPERIMENT_CONFIG.matching.coarseStep : EXPERIMENT_CONFIG.matching.fineStep);
        }
      };

      document.addEventListener("keydown", keyHandler);

      if (isTestMode) {
        const button = document.querySelector("button");
        setTimeout(() => {
          if (button) button.click();
        }, 500);
      }
    },
    on_finish: (data) => {
      document.body.classList.remove("matching-page-mode");
      if (keyHandler) {
        document.removeEventListener("keydown", keyHandler);
      }

      initializeMatchingPhaseState(state, phase);
      const resolvedStimulus = resolveTrialValue(stimulus);
      const resolvedStimulusRole = resolveTrialValue(stimulusRole);
      const resolvedTrialIndex = resolveTrialValue(trialIndexWithinArtwork);
      const resolvedStartDirection = resolveTrialValue(startDirection);
      const resolvedInitialValue = resolveTrialValue(initialValue);

      const trialRecord = {
        phase,
        stimulus_id: resolvedStimulus.id,
        stimulus_label: resolvedStimulus.label,
        stimulus_role: resolvedStimulusRole,
        trial_index_within_artwork: resolvedTrialIndex,
        start_direction: resolvedStartDirection,
        initial_value: resolvedInitialValue,
        matching_value: matchingState.value,
        adjustment_count: matchingState.adjustmentCount,
      };

      data.phase = trialRecord.phase;
      data.stimulus_id = trialRecord.stimulus_id;
      data.stimulus_label = trialRecord.stimulus_label;
      data.stimulus_role = trialRecord.stimulus_role;
      data.trial_index_within_artwork = trialRecord.trial_index_within_artwork;
      data.start_direction = trialRecord.start_direction;
      data.initial_value = trialRecord.initial_value;
      data.matching_value = trialRecord.matching_value;
      data.adjustment_count = trialRecord.adjustment_count;

      state.matchingResponses[phase].push(trialRecord);
    },
  };
}

export function createMatchingLoop({ state, phase }) {
  const matchingTrial = createMatchingTrial({
    state,
    phase,
    stimulus: () => state.matchingPlan?.[phase]?.trials?.[state.matchingPlan?.[phase]?.index]?.stimulus,
    stimulusRole: () => state.matchingPlan?.[phase]?.trials?.[state.matchingPlan?.[phase]?.index]?.stimulusRole,
    trialIndexWithinArtwork: () =>
      state.matchingPlan?.[phase]?.trials?.[state.matchingPlan?.[phase]?.index]?.trialIndexWithinArtwork,
    startDirection: () =>
      state.matchingPlan?.[phase]?.trials?.[state.matchingPlan?.[phase]?.index]?.startDirection,
    initialValue: () => state.matchingPlan?.[phase]?.trials?.[state.matchingPlan?.[phase]?.index]?.initialValue,
  });

  const originalOnFinish = matchingTrial.on_finish;
  matchingTrial.on_finish = (data) => {
    originalOnFinish(data);
    state.matchingPlan[phase].index += 1;
  };

  return {
    timeline: [matchingTrial],
    conditional_function: () => (state.matchingPlan?.[phase]?.trials?.length ?? 0) > 0,
    loop_function: () => state.matchingPlan[phase].index < state.matchingPlan[phase].trials.length,
  };
}

export function createMatchingTimeline({
  state,
  phase,
  stimuli = getMatchingStimuli(state),
  random = Math.random,
}) {
  return buildMatchingPlan({
    state,
    stimuli,
    random,
  }).trials.map((trialDefinition) =>
    createMatchingTrial({
      state,
      phase,
      stimulus: trialDefinition.stimulus,
      stimulusRole: trialDefinition.stimulusRole,
      trialIndexWithinArtwork: trialDefinition.trialIndexWithinArtwork,
      startDirection: trialDefinition.startDirection,
      initialValue: trialDefinition.initialValue,
    })
  );
}
