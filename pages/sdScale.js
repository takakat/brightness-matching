import {
  ATTENTION_CHECK_EXPECTED_VALUE,
  ATTENTION_CHECK_ITEM,
  getAttentionCheckIndex,
} from "../config/scales.js";
import { computeAverageScore } from "../logic/selection.js";
import {
  buildTestSdResponse,
  getTestScenarioId,
  isTestMode,
} from "../logic/testScenario.js";

function renderSdPreamble(phaseLabel, stimulus, itemIndex, totalCount) {
  // SD 評定では、質問群の前に現在評価する刺激画像を固定表示します。
  return `
    <div>
      <img src="${stimulus.imagePath}" alt="${stimulus.label}" class="sd-image">
    </div>
  `;
}

function applyTestResponseToVisibleRadios(questions, response) {
  const questionInputs = new Map();
  const inputs = Array.from(document.querySelectorAll("input[type='radio']"));

  for (const input of inputs) {
    if (!questionInputs.has(input.name)) {
      questionInputs.set(input.name, []);
    }

    questionInputs.get(input.name).push(input);
  }

  Array.from(questionInputs.values()).forEach((groupedInputs, questionIndex) => {
    const questionName = questions[questionIndex]?.name;
    const preferredValue = String(response[questionName] ?? 3);
    const preferredInput =
      groupedInputs.find((input) => input.value === preferredValue) ??
      groupedInputs[Math.floor(groupedInputs.length / 2)];

    if (preferredInput) {
      preferredInput.checked = true;
    }
  });
}

function getTrialQuestions(questions, hasAttentionCheck) {
  return hasAttentionCheck ? [...questions, ATTENTION_CHECK_ITEM] : questions;
}

function applyAttentionCheckData(data, response, hasAttentionCheck) {
  data.attention_check_present = hasAttentionCheck;

  if (!hasAttentionCheck) {
    data.attention_check_expected = null;
    data.attention_check_response = null;
    data.attention_check_passed = null;
    return;
  }

  const attentionCheckResponse = Number(response[ATTENTION_CHECK_ITEM.name]);
  data.attention_check_expected = ATTENTION_CHECK_EXPECTED_VALUE;
  data.attention_check_response = Number.isFinite(attentionCheckResponse) ? attentionCheckResponse : null;
  data.attention_check_passed = data.attention_check_response === ATTENTION_CHECK_EXPECTED_VALUE;
}

export function createPreSdTimeline({
  stimuli,
  questions,
  evaluationKeys,
  participantId,
  phaseLabel = "事前SD評定",
}) {
  // 事前 SD は全刺激を 1 枚ずつ評価し、ターゲット選定用の評価性スコアを保存します。
  const { jsPsychSurveyLikert } = window;
  const searchParams = new URLSearchParams(window.location.search);
  const testMode = isTestMode(searchParams);
  const testScenarioId = getTestScenarioId(searchParams);
  const attentionCheckIndex = getAttentionCheckIndex({
    participantId,
    phase: "pre_sd",
    itemCount: stimuli.length,
  });

  return stimuli.map((stimulus, zeroBasedIndex) => {
    const hasAttentionCheck = zeroBasedIndex === attentionCheckIndex;
    const trialQuestions = getTrialQuestions(questions, hasAttentionCheck);

    return {
      type: jsPsychSurveyLikert,
      css_classes: ["sticky-image-layout"],
      preamble: renderSdPreamble(phaseLabel, stimulus, zeroBasedIndex + 1, stimuli.length),
      questions: trialQuestions,
      scale_width: 880,
      button_label: "次へ",
      data: testMode ? { test_scenario: testScenarioId } : {},
      on_load: testMode
        ? function () {
            setTimeout(() => {
              const response = buildTestSdResponse({
                scenarioId: testScenarioId,
                stimulus,
                totalStimuli: stimuli.length,
              });
              applyTestResponseToVisibleRadios(trialQuestions, response);
            }, 100);
          }
        : undefined,
      on_finish: function (data) {
        const response = data.response ?? {};
        data.phase = "pre_sd";
        data.stimulus_id = stimulus.id;
        data.stimulus_label = stimulus.label;
        data.image_path = stimulus.imagePath;
        data.display_order = stimulus.displayOrder;
        data.sd_mode = questions.length;
        data.evaluation_score = computeAverageScore(response, evaluationKeys);
        applyAttentionCheckData(data, response, hasAttentionCheck);
      },
    };
  });
}

export function createPostSdLoop({
  state,
  questions,
  evaluationKeys,
  phaseLabel = "事後SD評定",
}) {
  // 事後 SD は選定済みの postSdStimuli を state.postSdIndex で順に表示します。
  const { jsPsychSurveyLikert } = window;
  const searchParams = new URLSearchParams(window.location.search);
  const testMode = isTestMode(searchParams);
  const testScenarioId = getTestScenarioId(searchParams);
  function getPostAttentionCheckIndex() {
    return getAttentionCheckIndex({
      participantId: state.participantId,
      phase: "post_sd",
      itemCount: state.postSdStimuli.length,
    });
  }

  const postSdTrial = {
    type: jsPsychSurveyLikert,
    css_classes: ["sticky-image-layout"],
    preamble: function () {
      const stimulus = state.postSdStimuli[state.postSdIndex];
      return renderSdPreamble(phaseLabel, stimulus, state.postSdIndex + 1, state.postSdStimuli.length);
    },
    questions: function () {
      return getTrialQuestions(questions, state.postSdIndex === getPostAttentionCheckIndex());
    },
    scale_width: 880,
    button_label: "次へ",
    on_load: testMode
      ? function () {
          setTimeout(() => {
            const stimulus = state.postSdStimuli[state.postSdIndex];
            const trialQuestions = getTrialQuestions(questions, state.postSdIndex === getPostAttentionCheckIndex());
            const response = buildTestSdResponse({
              scenarioId: testScenarioId,
              stimulus,
              totalStimuli: state.activeStimuli?.length ?? state.postSdStimuli.length,
            });
            applyTestResponseToVisibleRadios(trialQuestions, response);
          }, 100);
        }
      : undefined,
    on_finish: function (data) {
      const stimulus = state.postSdStimuli[state.postSdIndex];
      const response = data.response ?? {};
      const hasAttentionCheck = state.postSdIndex === getPostAttentionCheckIndex();
      data.phase = "post_sd";
      data.stimulus_id = stimulus.id;
      data.stimulus_label = stimulus.label;
      data.image_path = stimulus.imagePath;
      data.display_order = stimulus.displayOrder;
      data.evaluation_score = computeAverageScore(response, evaluationKeys);
      applyAttentionCheckData(data, response, hasAttentionCheck);
      data.is_target = state.targetStimulus?.id === stimulus.id;
      data.is_control = state.controlStimuli.some((candidate) => candidate.id === stimulus.id);
      state.postSdIndex += 1;
    },
  };

  return {
    timeline: [postSdTrial],
    loop_function: () => state.postSdIndex < state.postSdStimuli.length,
  };
}
