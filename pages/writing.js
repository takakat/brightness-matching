import { EXPERIMENT_CONFIG } from "../config/experiment.js?v=20260528-flow-validation";
import { DEFAULT_CONDITION_ID, getConditionById } from "../config/conditions.js?v=20260526-datapipe-conditions";
import {
  buildTestWritingResponse,
  isTestMode,
} from "../logic/testScenario.js";

const WRITING_IMAGE_HEIGHT_PX = 320;
const WRITING_LAYOUT_WIDTH_PX = 760;
const WRITING_TEXT_COLUMN_WIDTH_PX = 760;

function applyWritingImageSize() {
  const shell = document.querySelector(".writing-layout-shell");
  const image = document.querySelector(".writing-target");
  if (!shell || !image) {
    return;
  }

  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  if (!naturalWidth || !naturalHeight) {
    return;
  }

  const ratio = naturalWidth / naturalHeight;
  const width = Math.round(WRITING_IMAGE_HEIGHT_PX * ratio);
  const referenceWidth = Math.max(width + 56, 320);
  shell.style.setProperty("--writing-image-height", `${WRITING_IMAGE_HEIGHT_PX}px`);
  shell.style.setProperty("--writing-image-width", `${width}px`);
  shell.style.setProperty("--writing-reference-width", `${referenceWidth}px`);
  shell.style.setProperty("--writing-layout-width", `${WRITING_LAYOUT_WIDTH_PX}px`);
  shell.style.setProperty("--writing-text-column-width", `${WRITING_TEXT_COLUMN_WIDTH_PX}px`);
}

function getAssignedCondition(state) {
  return state.assignedCondition ?? getConditionById(DEFAULT_CONDITION_ID);
}

export function getWritingStimulus(state, condition = getAssignedCondition(state)) {
  if (condition.writingTask.stimulusRole === "non_target") {
    return state.controlStimuli[0] ?? state.targetStimulus;
  }

  return state.targetStimulus;
}

function renderInstructionParagraphs(condition) {
  return condition.writingTask.instructions.map((paragraph) => `<p>${paragraph}</p>`).join("");
}

export function createWritingTrial({ state }) {
  const { jsPsychSurveyText } = window;
  const searchParams = new URLSearchParams(window.location.search);
  const testMode = isTestMode(searchParams);
  const minChars = EXPERIMENT_CONFIG.writingMinCharacters;
  const assignedCondition = getAssignedCondition(state);
  const writingStimulus = getWritingStimulus(state, assignedCondition);
  const defaultText = testMode
    ? buildTestWritingResponse({
        searchParams,
        minCharacters: minChars,
        conditionId: assignedCondition.id,
        stimulusId: writingStimulus?.id ?? "pending_stimulus",
      })
    : "";

  return {
    type: jsPsychSurveyText,
    preamble: () => {
      const currentCondition = getAssignedCondition(state);
      const currentWritingStimulus = getWritingStimulus(state, currentCondition);

      return `
        <div class="writing-layout-shell">
          <div class="writing-reference-block">
            <div class="writing-reference-row">
              <img src="${currentWritingStimulus.imagePath}" alt="${currentWritingStimulus.label}" class="writing-target">
              <div class="writing-prompt-block">
                ${renderInstructionParagraphs(currentCondition)}
              </div>
            </div>
          </div>
          <div class="writing-text-column">
            <div class="writing-form-slot"></div>
          </div>
        </div>
      `;
    },
    questions: [
      {
        prompt: "",
        rows: EXPERIMENT_CONFIG.writingTextareaRows,
        columns: EXPERIMENT_CONFIG.writingTextareaColumns,
        required: true,
        name: "essay",
        value: defaultText,
      },
    ],
    button_label: "次へ",
    on_load: () => {
      const form = document.getElementById("jspsych-survey-text-form");
      const textarea = document.querySelector("textarea");
      const nextButton = document.getElementById("jspsych-survey-text-next");
      const formSlot = document.querySelector(".writing-form-slot");

      applyWritingImageSize();

      if (form && formSlot) {
        formSlot.appendChild(form);
      }

      const counter = document.createElement("p");
      counter.className = "writing-counter";
      counter.innerHTML = `現在の文字数: <strong id="writing-count">0</strong> / ${EXPERIMENT_CONFIG.writingMinCharacters}`;
      textarea.parentElement.appendChild(counter);

      function updateCount() {
        const currentCount = textarea.value.replace(/\s+/g, "").length;
        document.getElementById("writing-count").textContent = String(currentCount);
        nextButton.disabled = currentCount < EXPERIMENT_CONFIG.writingMinCharacters;
      }

      nextButton.disabled = !testMode;
      textarea.addEventListener("input", updateCount);
      updateCount();
    },
    on_finish: (data) => {
      const currentCondition = getAssignedCondition(state);
      const currentWritingStimulus = getWritingStimulus(state, currentCondition);
      const essay = data.response.essay ?? "";

      data.phase = "writing";
      data.condition_id = currentCondition.id;
      data.condition_label = currentCondition.label;
      data.stimulus_id = currentWritingStimulus.id;
      data.stimulus_label = currentWritingStimulus.label;
      data.char_count = essay.replace(/\s+/g, "").length;
      data.essay = essay;
    },
  };
}