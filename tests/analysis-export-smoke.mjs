import assert from "node:assert/strict";

import {
  ANALYSIS_CSV_COLUMNS,
  buildAnalysisCsv,
  buildAnalysisRows,
} from "../logic/analysisExport.js";

const rows = [
  {
    phase: "consent",
    participant_id: "participant-001",
    subject_id: "participant-001",
    condition_id: "objective_description_control",
    condition_label: "Objective description control",
    condition_index: 1,
    condition_source: "datapipe",
    prototype_stimulus_count: 20,
    sd_display_mode: "minimal",
    data_pipe_environment: "test",
    data_pipe_experiment_id: "exp-001",
    save_mode: "download",
    trial_type: "html-button-response",
    trial_index: 2,
    time_elapsed: 1200,
    rt: 700,
    consent_date: "2026-05-28",
    consent_signature: "Participant",
    consent_agreed_count: 4,
    consent_complete: true,
  },
  {
    phase: "pre_sd",
    participant_id: "participant-001",
    subject_id: "participant-001",
    condition_id: "objective_description_control",
    condition_label: "Objective description control",
    condition_index: 1,
    condition_source: "datapipe",
    prototype_stimulus_count: 20,
    sd_display_mode: "minimal",
    data_pipe_environment: "test",
    data_pipe_experiment_id: "exp-001",
    save_mode: "download",
    stimulus_id: "stimulus_020",
    stimulus_label: "Stimulus 020",
    display_order: 20,
    evaluation_score: 0.5,
    response: {
      beauty: 0,
      like: 0,
      good: 1,
      interest: 1,
      bright: 7,
      fun: 6,
      warm: 5,
      heavy: 4,
    },
  },
  {
    phase: "pre_sd",
    participant_id: "participant-001",
    subject_id: "participant-001",
    condition_id: "objective_description_control",
    condition_label: "Objective description control",
    condition_index: 1,
    condition_source: "datapipe",
    prototype_stimulus_count: 20,
    sd_display_mode: "minimal",
    data_pipe_environment: "test",
    data_pipe_experiment_id: "exp-001",
    save_mode: "download",
    stimulus_id: "stimulus_019",
    stimulus_label: "Stimulus 019",
    display_order: 19,
    evaluation_score: 1.5,
    response: {
      beauty: 1,
      like: 1,
      good: 2,
      interest: 2,
      bright: 8,
      fun: 7,
      warm: 6,
      heavy: 3,
    },
  },
  {
    phase: "pre_matching",
    participant_id: "participant-001",
    subject_id: "participant-001",
    condition_id: "objective_description_control",
    condition_label: "Objective description control",
    condition_index: 1,
    condition_source: "datapipe",
    prototype_stimulus_count: 20,
    sd_display_mode: "minimal",
    data_pipe_environment: "test",
    data_pipe_experiment_id: "exp-001",
    save_mode: "download",
    stimulus_id: "stimulus_020",
    stimulus_label: "Stimulus 020",
    trial_index_within_artwork: 1,
    start_direction: "dark_start",
    initial_value: 40,
    matching_value: 122,
    adjustment_count: 11,
  },
  {
    phase: "writing",
    participant_id: "participant-001",
    subject_id: "participant-001",
    condition_id: "objective_description_control",
    condition_label: "Objective description control",
    condition_index: 1,
    condition_source: "datapipe",
    prototype_stimulus_count: 20,
    sd_display_mode: "minimal",
    data_pipe_environment: "test",
    data_pipe_experiment_id: "exp-001",
    save_mode: "download",
    stimulus_id: "stimulus_020",
    stimulus_label: "Stimulus 020",
    char_count: 180,
    essay: "objective description",
  },
  {
    phase: "post_matching",
    participant_id: "participant-001",
    subject_id: "participant-001",
    condition_id: "objective_description_control",
    condition_label: "Objective description control",
    condition_index: 1,
    condition_source: "datapipe",
    prototype_stimulus_count: 20,
    sd_display_mode: "minimal",
    data_pipe_environment: "test",
    data_pipe_experiment_id: "exp-001",
    save_mode: "download",
    stimulus_id: "stimulus_019",
    stimulus_label: "Stimulus 019",
    trial_index_within_artwork: 1,
    start_direction: "bright_start",
    initial_value: 200,
    matching_value: 135,
    adjustment_count: 9,
  },
  {
    phase: "post_sd",
    participant_id: "participant-001",
    subject_id: "participant-001",
    condition_id: "objective_description_control",
    condition_label: "Objective description control",
    condition_index: 1,
    condition_source: "datapipe",
    prototype_stimulus_count: 20,
    sd_display_mode: "minimal",
    data_pipe_environment: "test",
    data_pipe_experiment_id: "exp-001",
    save_mode: "download",
    stimulus_id: "stimulus_020",
    stimulus_label: "Stimulus 020",
    display_order: 20,
    response: {
      beauty: 1,
      like: 1,
      good: 1,
      interest: 2,
      bright: 6,
      fun: 5,
      warm: 5,
      heavy: 4,
    },
  },
];

const state = {
  participantId: "participant-001",
  subjectId: "participant-001",
  assignedConditionIndex: 1,
  assignedConditionSource: "datapipe",
  assignedCondition: {
    id: "objective_description_control",
    label: "Objective description control",
    writingTask: {
      stimulusRole: "target",
    },
  },
  targetStimulus: { id: "stimulus_020" },
  controlStimuli: [{ id: "stimulus_019" }],
  postSdStimuli: [{ id: "stimulus_020" }, { id: "stimulus_019" }],
};

const analysisRows = buildAnalysisRows(rows, state);

assert.equal(analysisRows.length, 7);
assert.equal(analysisRows[1].phase, "pre_sd");
assert.equal(analysisRows[1].pre_sd_rank, 1);
assert.equal(analysisRows[1].sd_beauty, 0);
assert.equal(analysisRows[1].brightness_score, 5.5);
assert.equal(analysisRows[3].matching_delta_from_initial, 82);
assert.equal(analysisRows[4].writing_task_stimulus_role, "target");
assert.equal(analysisRows[5].stimulus_analysis_role, "control");
assert.equal(analysisRows[5].matching_delta_from_initial, -65);
assert.equal(analysisRows[6].is_post_sd_stimulus, true);
assert.equal(analysisRows[0].prototype_stimulus_count, 20);

const csv = buildAnalysisCsv(rows, state);
const [header, firstDataRow] = csv.split("\n");

assert.equal(header, ANALYSIS_CSV_COLUMNS.join(","));
assert.ok(firstDataRow.includes("consent"));
assert.ok(csv.includes("stimulus_020"));

console.log(csv);
