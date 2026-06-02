import { computeAverageScore } from "../logic/selection.js";
import {
  buildTestSdResponse,
  getTestScenarioId,
  isTestMode,
} from "../logic/testScenario.js";

function renderSdPreamble(phaseLabel, stimulus, itemIndex, totalCount) {
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

export function createPreSdTimeline({ stimuli, questions, evaluationKeys, phaseLabel = "莠句燕隧穂ｾ｡" }) {
  const { jsPsychSurveyLikert } = window;
  const searchParams = new URLSearchParams(window.location.search);
  const testMode = isTestMode(searchParams);
  const testScenarioId = getTestScenarioId(searchParams);

  return stimuli.map((stimulus, zeroBasedIndex) => ({
    type: jsPsychSurveyLikert,
    css_classes: ["sticky-image-layout"],
    preamble: renderSdPreamble(phaseLabel, stimulus, zeroBasedIndex + 1, stimuli.length),
    questions,
    scale_width: 880,
    button_label: "谺｡縺ｸ",
    data: testMode ? { test_scenario: testScenarioId } : {},
    on_load: testMode
      ? function () {
          setTimeout(() => {
            const response = buildTestSdResponse({
              scenarioId: testScenarioId,
              stimulus,
              totalStimuli: stimuli.length,
            });
            applyTestResponseToVisibleRadios(questions, response);
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
    },
  }));
}

export function createPostSdLoop({ state, questions, evaluationKeys, phaseLabel = "蜀崎ｩ穂ｾ｡" }) {
  const { jsPsychSurveyLikert } = window;
  const searchParams = new URLSearchParams(window.location.search);
  const testMode = isTestMode(searchParams);
  const testScenarioId = getTestScenarioId(searchParams);

  const postSdTrial = {
    type: jsPsychSurveyLikert,
    css_classes: ["sticky-image-layout"],
    preamble: function () {
      const stimulus = state.postSdStimuli[state.postSdIndex];
      return renderSdPreamble(phaseLabel, stimulus, state.postSdIndex + 1, state.postSdStimuli.length);
    },
    questions: function () {
      return questions;
    },
    scale_width: 880,
    button_label: "谺｡縺ｸ",
    on_load: testMode
      ? function () {
          setTimeout(() => {
            const stimulus = state.postSdStimuli[state.postSdIndex];
            const response = buildTestSdResponse({
              scenarioId: testScenarioId,
              stimulus,
              totalStimuli: state.activeStimuli?.length ?? state.postSdStimuli.length,
            });
            applyTestResponseToVisibleRadios(questions, response);
          }, 100);
        }
      : undefined,
    on_finish: function (data) {
      const stimulus = state.postSdStimuli[state.postSdIndex];
      const response = data.response ?? {};
      data.phase = "post_sd";
      data.stimulus_id = stimulus.id;
      data.stimulus_label = stimulus.label;
      data.image_path = stimulus.imagePath;
      data.display_order = stimulus.displayOrder;
      data.evaluation_score = computeAverageScore(response, evaluationKeys);
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
