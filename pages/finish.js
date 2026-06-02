function getDataPipeStatusText(state) {
  const saveState = state.dataPipeSave;

  if (!saveState) {
    return "Save status pending";
  }

  if (saveState.status === "saved") {
    return `Saved to DataPipe (${saveState.filename})`;
  }

  if (saveState.status === "downloaded") {
    return `Downloaded CSV (${saveState.filename})`;
  }

  if (saveState.status === "skipped") {
    return "Preview mode: data upload skipped";
  }

  if (saveState.status === "error") {
    return `Save blocked: ${saveState.message}`;
  }

  return "Save status pending";
}

function getMatchingTrialCount(state, phase) {
  return state.matchingResponses?.[phase]?.length ?? 0;
}

function getMatchingArtworkCount(state, phase) {
  const artworkIds = new Set(
    (state.matchingResponses?.[phase] ?? [])
      .map((row) => row.stimulus_id)
      .filter(Boolean)
  );

  return artworkIds.size;
}

function renderValidationErrors(state) {
  const errors = state.dataPipeSave?.validationErrors ?? [];
  if (errors.length === 0) {
    return "";
  }

  return `
    <div class="mini-panel" style="margin-bottom: 18px;">
      <h2>Validation errors</h2>
      <ul class="compact-list">
        ${errors.map((error) => `<li>${error}</li>`).join("")}
      </ul>
    </div>
  `;
}

function getFinishCopy(state) {
  if (state.dataPipeSave?.status === "error") {
    return {
      eyebrow: "Incomplete",
      title: "The experiment data was not exported.",
      lead:
        "This session finished with missing required phases, so the CSV export was blocked.",
      note:
        "Please keep this tab open while you review the validation summary and rerun the session.",
    };
  }

  return {
    eyebrow: "Complete",
    title: "The experiment is complete.",
    lead:
      "Thank you for your participation. The summary below reflects the data prepared for export at the end of this session.",
    note: "Please keep this browser tab open until the session fully finishes.",
  };
}

export function createFinishTrial({ state }) {
  const { jsPsychHtmlKeyboardResponse } = window;

  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: () => {
      const finishCopy = getFinishCopy(state);

      return `
        <div class="finish-card">
          <div class="eyebrow">${finishCopy.eyebrow}</div>
          <h1>${finishCopy.title}</h1>
          <p class="lead">${finishCopy.lead}</p>
          <div class="mini-panel" style="margin-bottom: 18px;">
            <h2>Summary</h2>
            <ul class="compact-list">
              <li>Data status: ${getDataPipeStatusText(state)}</li>
              <li>Target artwork: ${state.targetStimulus?.label ?? "Not selected"}</li>
              <li>Control artwork count: ${state.controlStimuli.length}</li>
              <li>Post-SD artwork count: ${state.postSdStimuli.length}</li>
              <li>Pre-matching trial count: ${getMatchingTrialCount(state, "pre_matching")}</li>
              <li>Pre-matching artwork count: ${getMatchingArtworkCount(state, "pre_matching")}</li>
              <li>Post-matching trial count: ${getMatchingTrialCount(state, "post_matching")}</li>
              <li>Post-matching artwork count: ${getMatchingArtworkCount(state, "post_matching")}</li>
            </ul>
          </div>
          ${renderValidationErrors(state)}
          <p class="summary-note">${finishCopy.note}</p>
        </div>
      `;
    },
    choices: "NO_KEYS",
    data: {
      phase: "finish",
    },
  };
}
