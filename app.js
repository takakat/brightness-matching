import { EXPERIMENT_CONFIG } from "./config/experiment.js?v=20260528-flow-validation";
import { CONDITION_ASSIGNMENT_CONFIG } from "./config/conditions.js?v=20260526-datapipe-conditions";
import { getPreloadImages, getEnabledStimuli, shuffleStimuliForParticipant } from "./config/stimuli.js";
import { EVALUATION_KEYS, getSdQuestions } from "./config/scales.js?v=20260605-sd16";
import {
  assignParticipantConditionWithDataPipe,
  buildManualConditionAssignment,
  getOrCreateParticipantId,
} from "./logic/conditionAssignment.js?v=20260526-datapipe-conditions";
import { buildAnalysisCsv } from "./logic/analysisExport.js?v=20260528-analysis-csv";
import { summarizeExperimentRows } from "./logic/dataSummary.js?v=20260528-flow-validation";
import { selectStimuli } from "./logic/selection.js";
import { getTestScenarioId, isTestMode } from "./logic/testScenario.js";
import { createConsentTrial } from "./pages/consent.js?v=20260605-consent-layout";
import { createFinishTrial } from "./pages/finish.js?v=20260605-finish-ja";
import { createIntroTrial } from "./pages/intro.js?v=20260528-production-mode";
import { buildMatchingPlan, createMatchingLoop } from "./pages/matching.js?v=20260604-matching-copy";
import { createPreSdTimeline, createPostSdLoop } from "./pages/sdScale.js?v=20260526-datapipe-conditions";
import { createWritingTrial } from "./pages/writing.js?v=20260605-writing-inline";

const { initJsPsych, jsPsychPreload, jsPsychCallFunction } = window;
const SAVE_MODES = {
  datapipe: "datapipe",
  download: "download",
};

function createCompletionCode(length = 10) {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const randomValues = new Uint32Array(length);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(randomValues);
  } else {
    for (let index = 0; index < length; index += 1) {
      randomValues[index] = Math.floor(Math.random() * 4294967296);
    }
  }

  return Array.from(randomValues, (value) => characters[value % characters.length]).join("");
}

function renderAssignmentError(message) {
  document.body.innerHTML = `
    <div class="jspsych-display-element">
      <div class="instruction-card">
        <h1>隴夲ｽ｡闔会ｽｶ陷托ｽｲ郢ｧ髮・ｽｽ阮吮ｻ郢ｧ蟶晏ｹ戊沂荵昴堤ｸｺ髦ｪ竏ｪ邵ｺ蟶呻ｽ鍋ｸｺ・ｧ邵ｺ蜉ｱ笳・/h1>
        <p class="lead">${message}</p>
        <p>DataPipe 邵ｺ・ｮ髫ｪ・ｭ陞ｳ螢ｹﾂ竏壹Ο郢昴・繝ｨ郢晢ｽｯ郢晢ｽｼ郢ｧ・ｯ隰暦ｽ･驍ｯ螢ｹﾂ窶・periment ID 郢ｧ蝣､・｢・ｺ髫ｱ髦ｪ・邵ｺ・ｦ邵ｺ荳岩味邵ｺ霈費ｼ樒ｸｲ繝ｻ/p>
      </div>
    </div>
  `;
}

async function resolveConditionAssignment({ searchParams, previewMode, testMode }) {
  const participantId = getOrCreateParticipantId({
    searchParams,
    persist: !previewMode,
  });
  const requestedConditionId = searchParams.get(CONDITION_ASSIGNMENT_CONFIG.urlConditionParam)?.trim();

  if (previewMode || (testMode && requestedConditionId)) {
    return buildManualConditionAssignment({
      participantId,
      searchParams,
    });
  }

  if (!EXPERIMENT_CONFIG.dataPipe.useConditionAssignment) {
    return buildManualConditionAssignment({
      participantId,
      searchParams,
    });
  }

  return assignParticipantConditionWithDataPipe({
    participantId,
    experimentId: EXPERIMENT_CONFIG.dataPipe.experimentId,
    endpoint: EXPERIMENT_CONFIG.dataPipe.conditionEndpoint,
  });
}

function sanitizeFilenamePart(value) {
  return String(value ?? "unknown")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "unknown";
}

function buildDataPipeFilename(experimentState) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const participant = sanitizeFilenamePart(experimentState.participantId);
  const condition = sanitizeFilenamePart(experimentState.assignedCondition.id);

  return `${timestamp}_${participant}_${condition}.csv`;
}

function resolveSaveMode({ searchParams, previewMode }) {
  if (previewMode) {
    return null;
  }

  if (searchParams.get("save") === SAVE_MODES.download) {
    return SAVE_MODES.download;
  }

  return EXPERIMENT_CONFIG.dataPipe.saveData
    ? SAVE_MODES.datapipe
    : SAVE_MODES.download;
}

function buildDataSavePayload({ jsPsych, experimentState }) {
  const rows = jsPsych.data.get().values();
  const filename = buildDataPipeFilename(experimentState);
  const summary = summarizeExperimentRows(rows, experimentState);
  const csvData = buildAnalysisCsv(rows, experimentState);

  return {
    filename,
    summary,
    csvData,
    requestBody: {
      experimentID: EXPERIMENT_CONFIG.dataPipe.experimentId,
      filename,
      data: csvData,
    },
  };
}

function buildValidationFailureResult({ mode, filename, summary }) {
  return {
    skipped: false,
    downloaded: false,
    validationError: true,
    filename,
    mode,
    summary,
    validationErrors: summary.validationErrors,
    message: "Required experiment phases are missing. Data was not saved.",
  };
}

function downloadExperimentData({ filename, csvData }) {
  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);

  return {
    skipped: false,
    downloaded: true,
    filename,
  };
}

async function saveExperimentData({ jsPsych, experimentState }) {
  const { dataPipe } = EXPERIMENT_CONFIG;

  if (experimentState.previewMode) {
    return {
      skipped: true,
      reason: "preview",
    };
  }

  const savePayload = buildDataSavePayload({
    jsPsych,
    experimentState,
  });
  experimentState.dataPipeUploadSummary = savePayload.summary;
  window.dataPipeUploadSummary = savePayload.summary;

  if (savePayload.summary.validationErrors.length > 0) {
    return buildValidationFailureResult({
      mode: experimentState.saveMode,
      filename: savePayload.filename,
      summary: savePayload.summary,
    });
  }

  if (experimentState.saveMode === SAVE_MODES.download) {
    return {
      ...downloadExperimentData({
        filename: savePayload.filename,
        csvData: savePayload.csvData,
      }),
      mode: SAVE_MODES.download,
      summary: savePayload.summary,
    };
  }

  if (!dataPipe.saveData) {
    return {
      skipped: true,
      reason: "disabled",
    };
  }

  const response = await fetch(dataPipe.dataEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(savePayload.requestBody),
  });

  const responseData = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = responseData.message || "DataPipe data upload failed.";
    throw new Error(message);
  }

  return {
    skipped: false,
    downloaded: false,
    filename: savePayload.filename,
    summary: savePayload.summary,
    mode: SAVE_MODES.datapipe,
    response: responseData,
  };
}

function publishConditionAssignmentDebug({ conditionAssignment, searchParams, previewMode, testMode, saveMode }) {
  const debugPayload = {
    participantId: conditionAssignment.participantId,
    conditionId: conditionAssignment.condition.id,
    conditionLabel: conditionAssignment.condition.label,
    conditionIndex: conditionAssignment.conditionIndex ?? null,
    source: conditionAssignment.source,
    dataPipeExperimentId: EXPERIMENT_CONFIG.dataPipe.experimentId,
    dataPipeEnvironment: EXPERIMENT_CONFIG.dataPipe.environmentName,
    dataPipeConditionAssignmentEnabled: EXPERIMENT_CONFIG.dataPipe.useConditionAssignment,
    saveMode,
    previewMode: previewMode ?? "",
    testMode,
    urlCondition: searchParams.get(CONDITION_ASSIGNMENT_CONFIG.urlConditionParam) ?? "",
    urlParticipantId: searchParams.get(CONDITION_ASSIGNMENT_CONFIG.urlParticipantParam) ?? "",
  };

  window.conditionAssignmentDebug = debugPayload;
  console.info("[experiment] condition assignment", debugPayload);
  console.table([
    {
      dataPipeConditionIndex: debugPayload.conditionIndex,
      appConditionId: debugPayload.conditionId,
      assignmentSource: debugPayload.source,
      participantId: debugPayload.participantId,
    },
  ]);
}

function publishStimulusOrderDebug(experimentState) {
  const debugPayload = {
    participantId: experimentState.participantId,
    stimulusIds: experimentState.activeStimuli.map((stimulus) => stimulus.id),
    sourceDisplayOrders: experimentState.activeStimuli.map((stimulus) => stimulus.displayOrder),
  };

  window.stimulusOrderDebug = debugPayload;
  console.info("[experiment] stimulus presentation order", debugPayload);
  console.table(
    experimentState.activeStimuli.map((stimulus, index) => ({
      presentationOrder: index + 1,
      stimulusId: stimulus.id,
      sourceDisplayOrder: stimulus.displayOrder,
      sourceFilename: stimulus.sourceFilename,
    }))
  );
}

const searchParams = new URLSearchParams(window.location.search);
const previewMode = searchParams.get("preview");
const testMode = isTestMode(searchParams);
const testScenarioId = testMode ? getTestScenarioId(searchParams) : null;
const saveMode = resolveSaveMode({
  searchParams,
  previewMode,
});

let conditionAssignment;

try {
  conditionAssignment = await resolveConditionAssignment({
    searchParams,
    previewMode,
    testMode,
  });
} catch (error) {
  renderAssignmentError(
    error instanceof Error ? error.message : "Condition assignment failed before the app could start."
  );
  throw error;
}

const activeStimuli = shuffleStimuliForParticipant(
  getEnabledStimuli(EXPERIMENT_CONFIG.prototypeStimulusCount),
  conditionAssignment.participantId
);
const preloadImages = getPreloadImages(EXPERIMENT_CONFIG.prototypeStimulusCount);
const sdQuestions = getSdQuestions(EXPERIMENT_CONFIG.sdDisplayMode, {
  participantId: conditionAssignment.participantId,
});

const state = {
  subjectId: conditionAssignment.participantId,
  participantId: conditionAssignment.participantId,
  completionCode: createCompletionCode(),
  assignedCondition: conditionAssignment.condition,
  assignedConditionSource: conditionAssignment.source,
  assignedConditionIndex: conditionAssignment.conditionIndex ?? null,
  activeStimuli,
  preResults: [],
  highestRatedStimulus: null,
  targetStimulus: null,
  controlStimuli: [],
  postSdStimuli: [],
  postSdIndex: 0,
  matchingResponses: {
    pre_matching: [],
    post_matching: [],
  },
  matchingPlan: {
    pre_matching: {
      trials: [],
      index: 0,
    },
    post_matching: {
      trials: [],
      index: 0,
    },
  },
  previewMode,
  saveMode,
  testScenarioId,
};

window.experimentState = state;
publishConditionAssignmentDebug({
  conditionAssignment,
  searchParams,
  previewMode,
  testMode,
  saveMode,
});
publishStimulusOrderDebug(state);

const jsPsych = initJsPsych({
  on_finish: () => {
    window.experimentState = state;
  },
});

jsPsych.data.addProperties({
  subject_id: state.subjectId,
  participant_id: state.participantId,
  completion_code: state.completionCode,
  condition_id: state.assignedCondition.id,
  condition_label: state.assignedCondition.label,
  condition_index: state.assignedConditionIndex,
  condition_source: state.assignedConditionSource,
  prototype_stimulus_count: EXPERIMENT_CONFIG.prototypeStimulusCount,
  sd_display_mode: EXPERIMENT_CONFIG.sdDisplayMode,
  data_pipe_environment: EXPERIMENT_CONFIG.dataPipe.environmentName,
  data_pipe_experiment_id: EXPERIMENT_CONFIG.dataPipe.experimentId,
  preview_mode: previewMode ?? "",
  save_mode: saveMode ?? "",
  test_scenario: testScenarioId ?? "",
});

function getTargetStimulus(experimentState) {
  return experimentState.targetStimulus ?? experimentState.activeStimuli[0];
}

function buildPreviewSelection(activeItems) {
  const baseScores = [2.0, 2.0, 3.2, 3.8, 4.4, 5.1];
  const mockPreResults = activeItems.map((stimulus, index) => ({
    id: stimulus.id,
    label: stimulus.label,
    imagePath: stimulus.imagePath,
    displayOrder: stimulus.displayOrder,
    evaluationScore: baseScores[index] ?? 5 + index,
  }));

  return selectStimuli(mockPreResults, {
    controlCount: EXPERIMENT_CONFIG.controlStimulusCount,
    lowScoreCount: EXPERIMENT_CONFIG.postSdLowScoreCount,
  });
}

function publishSelectionDebug(experimentState, selection) {
  const debugPayload = {
    participantId: experimentState.participantId,
    conditionId: experimentState.assignedCondition.id,
    conditionIndex: experimentState.assignedConditionIndex,
    testScenarioId: experimentState.testScenarioId,
    ranked: selection.ranked,
    target: selection.target,
    controls: selection.controls,
    postSdStimuli: selection.postSdStimuli,
  };

  window.selectionDebug = debugPayload;
  console.log("selectionDebug", debugPayload);
}

function createEmptyMatchingPlan() {
  return {
    trials: [],
    index: 0,
  };
}

function resetMatchingState(experimentState) {
  experimentState.matchingResponses = {
    pre_matching: [],
    post_matching: [],
  };
  experimentState.matchingPlan = {
    pre_matching: createEmptyMatchingPlan(),
    post_matching: createEmptyMatchingPlan(),
  };
}

function assignSelectionState(experimentState, selection) {
  experimentState.preResults = selection.ranked;
  experimentState.highestRatedStimulus = selection.ranked[selection.ranked.length - 1] ?? null;
  experimentState.targetStimulus = selection.target;
  experimentState.controlStimuli = selection.controls;
  experimentState.postSdStimuli = selection.postSdStimuli;
  experimentState.postSdIndex = 0;
  resetMatchingState(experimentState);
  experimentState.matchingPlan.pre_matching = buildMatchingPlan({
    state: experimentState,
  });
  experimentState.matchingPlan.post_matching = buildMatchingPlan({
    state: experimentState,
  });
  window.experimentState = experimentState;
}

function setPreviewMatchingPlan(experimentState, phase) {
  experimentState.matchingResponses[phase] = [];
  experimentState.matchingPlan[phase] = buildMatchingPlan({
    state: experimentState,
    stimuli: [
      {
        stimulus: getTargetStimulus(experimentState),
        stimulusRole: "target",
      },
    ],
  });
}

function applyPreviewState(experimentState) {
  const selection = buildPreviewSelection(experimentState.activeStimuli);
  assignSelectionState(experimentState, selection);

  publishSelectionDebug(experimentState, selection);
}

function createDataSaveTrial() {
  return {
    type: jsPsychCallFunction,
    async: true,
    func: (done) => {
      window.dataPipeSavePromise = saveExperimentData({
        jsPsych,
        experimentState: state,
      })
        .then((result) => {
          state.dataPipeSave = {
            status: result.validationError
              ? "error"
              : result.skipped
                ? "skipped"
                : result.downloaded
                  ? "downloaded"
                  : "saved",
            ...result,
          };
          window.dataPipeSaveResult = state.dataPipeSave;
          window.experimentState = state;
          console.log("dataPipeSaveResult", state.dataPipeSave);
        })
        .catch((error) => {
          state.dataPipeSave = {
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          };
          window.dataPipeSaveResult = state.dataPipeSave;
          window.experimentState = state;
          console.error("dataPipeSaveError", error);
        })
        .finally(done);
    },
    data: {
      phase: "data_pipe_save",
    },
  };
}

function createNormalTimeline() {
  return [
    {
      type: jsPsychPreload,
      images: preloadImages,
      message: "使用する画像を読み込んでいます...",
    },
    createConsentTrial(),
    ...createPreSdTimeline({
      stimuli: activeStimuli,
      questions: sdQuestions,
      evaluationKeys: EVALUATION_KEYS,
    }),
    {
      type: jsPsychCallFunction,
      func: () => {
        const preResults = jsPsych.data
          .get()
          .filter({ phase: "pre_sd" })
          .values()
          .map((entry) => ({
            id: entry.stimulus_id,
            label: entry.stimulus_label,
            imagePath: entry.image_path,
            displayOrder: entry.display_order,
            evaluationScore: entry.evaluation_score,
          }));

        state.preResults = preResults;

        const selection = selectStimuli(preResults, {
          controlCount: EXPERIMENT_CONFIG.controlStimulusCount,
          lowScoreCount: EXPERIMENT_CONFIG.postSdLowScoreCount,
        });

        assignSelectionState(state, selection);

        publishSelectionDebug(state, selection);

        jsPsych.data.addProperties({
          target_stimulus_id: selection.target?.id ?? null,
          control_stimulus_ids: selection.controls.map((stimulus) => stimulus.id).join(","),
          post_sd_stimulus_ids: selection.postSdStimuli.map((stimulus) => stimulus.id).join(","),
        });
      },
    },
    createMatchingLoop({
      state,
      phase: "pre_matching",
    }),
    createWritingTrial({ state }),
    createMatchingLoop({
      state,
      phase: "post_matching",
    }),
    createPostSdLoop({
      state,
      questions: sdQuestions,
      evaluationKeys: EVALUATION_KEYS,
    }),
    createDataSaveTrial(),
    createFinishTrial({ state }),
  ];
}

function createPreviewTimeline(mode) {
  applyPreviewState(state);
  state.dataPipeSave = {
    status: "skipped",
    skipped: true,
    reason: "preview",
  };

  const previewStimulus = activeStimuli[0];
  const previewPostStimulus = state.postSdStimuli[0] ?? previewStimulus;
  state.postSdStimuli = [previewPostStimulus];
  state.postSdIndex = 0;

  const commonPreload = {
    type: jsPsychPreload,
    images: preloadImages,
    message: "プレビュー用の画像を読み込んでいます...",
  };

  if (mode === "intro") {
    return [commonPreload, createIntroTrial()];
  }

  if (mode === "consent") {
    return [commonPreload, createConsentTrial()];
  }

  if (mode === "pre-sd") {
    return [
      commonPreload,
      ...createPreSdTimeline({
        stimuli: [previewStimulus],
        questions: sdQuestions,
        evaluationKeys: EVALUATION_KEYS,
      }),
    ];
  }

  if (mode === "pre-matching") {
    setPreviewMatchingPlan(state, "pre_matching");
    return [
      commonPreload,
      createMatchingLoop({
        state,
        phase: "pre_matching",
      }),
    ];
  }

  if (mode === "writing") {
    return [commonPreload, createWritingTrial({ state })];
  }

  if (mode === "post-matching") {
    setPreviewMatchingPlan(state, "post_matching");
    return [
      commonPreload,
      createMatchingLoop({
        state,
        phase: "post_matching",
      }),
    ];
  }

  if (mode === "post-sd") {
    return [
      commonPreload,
      createPostSdLoop({
        state,
        questions: sdQuestions,
        evaluationKeys: EVALUATION_KEYS,
      }),
    ];
  }

  if (mode === "finish") {
    return [commonPreload, createFinishTrial({ state })];
  }

  return [commonPreload, createIntroTrial()];
}

const timeline = previewMode ? createPreviewTimeline(previewMode) : createNormalTimeline();

jsPsych.run(timeline);
