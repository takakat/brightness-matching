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
    completion_code: "ABCD2345XY",
    condition_id: "objective_description_control",
    condition_label: "Objective description control",
    condition_index: 1,
    condition_source: "datapipe",
    prototype_stimulus_count: 20,
    sd_display_mode: "full",
    data_pipe_environment: "test",
    data_pipe_experiment_id: "exp-001",
    save_mode: "download",
    trial_type: "html-button-response",
    trial_index: 2,
    time_elapsed: 1200,
    rt: 700,
    consent_date: "2026-05-28",
    consent_gender: "female",
    consent_age: 25,
    consent_signature: "Participant",
    consent_agreed_count: 4,
    consent_complete: true,
  },
  {
    phase: "pre_sd",
    participant_id: "participant-001",
    subject_id: "participant-001",
    completion_code: "ABCD2345XY",
    condition_id: "objective_description_control",
    condition_label: "Objective description control",
    condition_index: 1,
    condition_source: "datapipe",
    prototype_stimulus_count: 20,
    sd_display_mode: "full",
    data_pipe_environment: "test",
    data_pipe_experiment_id: "exp-001",
    save_mode: "download",
    stimulus_id: "stimulus_020",
    stimulus_label: "Stimulus 020",
    display_order: 20,
    evaluation_score: 0.5,
    response: {
      good: 1,
      beauty: 0,
      like: 0,
      pleasant: 1,
      dynamic: 2,
      stable: 3,
      unique: 4,
      showy: 5,
      bright: 7,
      cheerful: 6,
      warm: 5,
      fun: 4,
      loose: 8,
      relaxed: 7,
      calm: 6,
      soft: 5,
    },
  },
  {
    phase: "pre_sd",
    participant_id: "participant-001",
    subject_id: "participant-001",
    completion_code: "ABCD2345XY",
    condition_id: "objective_description_control",
    condition_label: "Objective description control",
    condition_index: 1,
    condition_source: "datapipe",
    prototype_stimulus_count: 20,
    sd_display_mode: "full",
    data_pipe_environment: "test",
    data_pipe_experiment_id: "exp-001",
    save_mode: "download",
    stimulus_id: "stimulus_019",
    stimulus_label: "Stimulus 019",
    display_order: 19,
    evaluation_score: 1.5,
    response: {
      good: 2,
      beauty: 1,
      like: 1,
      pleasant: 2,
      dynamic: 3,
      stable: 4,
      unique: 5,
      showy: 6,
      bright: 8,
      cheerful: 7,
      warm: 6,
      fun: 3,
      loose: 7,
      relaxed: 6,
      calm: 5,
      soft: 4,
    },
  },
  {
    phase: "pre_matching",
    participant_id: "participant-001",
    subject_id: "participant-001",
    completion_code: "ABCD2345XY",
    condition_id: "objective_description_control",
    condition_label: "Objective description control",
    condition_index: 1,
    condition_source: "datapipe",
    prototype_stimulus_count: 20,
    sd_display_mode: "full",
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
    completion_code: "ABCD2345XY",
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
    completion_code: "ABCD2345XY",
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
    completion_code: "ABCD2345XY",
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
      good: 1,
      beauty: 1,
      like: 1,
      pleasant: 2,
      dynamic: 4,
      stable: 5,
      unique: 6,
      showy: 7,
      bright: 6,
      cheerful: 5,
      warm: 5,
      fun: 4,
      loose: 6,
      relaxed: 5,
      calm: 4,
      soft: 3,
    },
  },
];

const state = {
  participantId: "participant-001",
  subjectId: "participant-001",
  completionCode: "ABCD2345XY",
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
assert.equal(analysisRows[1].sd_pleasant, 1);
assert.equal(analysisRows[1].brightness_score, 5.5);
assert.equal(analysisRows[1].softness_score, 6.5);
assert.equal(analysisRows[3].matching_delta_from_initial, 82);
assert.equal(analysisRows[4].writing_task_stimulus_role, "target");
assert.equal(analysisRows[5].stimulus_analysis_role, "control");
assert.equal(analysisRows[5].matching_delta_from_initial, -65);
assert.equal(analysisRows[6].is_post_sd_stimulus, true);
assert.equal(analysisRows[0].prototype_stimulus_count, 20);
assert.equal(analysisRows[0].completion_code, "ABCD2345XY");
assert.equal(analysisRows[0].trial_type, "html-button-response");
assert.equal(analysisRows[0].consent_gender, "female");
assert.equal(analysisRows[0].consent_age, 25);

const csv = buildAnalysisCsv(rows, state);
const [header, firstDataRow] = csv.split("\n");

assert.equal(header, ANALYSIS_CSV_COLUMNS.join(","));
assert.ok(header.includes("trial_type"));
assert.ok(header.includes("completion_code"));
assert.ok(header.includes("consent_gender"));
assert.ok(header.includes("consent_age"));
assert.ok(firstDataRow.includes("consent"));
assert.ok(firstDataRow.includes("html-button-response"));
assert.ok(firstDataRow.includes("ABCD2345XY"));
assert.ok(firstDataRow.includes("female"));
assert.ok(csv.includes("stimulus_020"));

console.log(csv);
