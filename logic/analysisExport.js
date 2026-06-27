import {
  BRIGHTNESS_KEYS,
  EVALUATION_KEYS,
  SD_DISPLAY_MODES,
  SD_ITEM_BANK,
} from "../config/scales.js";

const PHASE_ORDER = {
  consent: 1,
  pre_sd: 2,
  pre_matching: 3,
  writing: 4,
  post_matching: 5,
  post_sd: 6,
};

// 分析 CSV に含めるフェーズだけを対象にし、画面遷移用の内部行は除外します。
const ANALYSIS_PHASES = new Set(Object.keys(PHASE_ORDER));
const ACTIVITY_KEYS = SD_ITEM_BANK.filter((item) => item.factor === "activity").map((item) => item.name);
const SOFTNESS_KEYS = SD_ITEM_BANK.filter((item) => item.factor === "softness").map((item) => item.name);

export const ANALYSIS_CSV_COLUMNS = [
  // 列順は分析側の読み込みに影響するため、ここで明示的に固定しています。
  "record_index",
  "phase",
  "phase_order",
  "phase_trial_index",
  "participant_id",
  "subject_id",
  "completion_code",
  "condition_id",
  "condition_label",
  "condition_index",
  "condition_source",
  "prototype_stimulus_count",
  "sd_display_mode",
  "data_pipe_environment",
  "data_pipe_experiment_id",
  "preview_mode",
  "save_mode",
  "trial_type",
  "source_trial_type",
  "source_trial_index",
  "source_time_elapsed_ms",
  "rt_ms",
  "stimulus_id",
  "stimulus_label",
  "stimulus_display_order",
  "stimulus_analysis_role",
  "is_target_stimulus",
  "is_control_stimulus",
  "is_post_sd_stimulus",
  "selected_target_stimulus_id",
  "selected_control_stimulus_ids",
  "selected_post_sd_stimulus_ids",
  "selected_control_stimulus_count",
  "selected_post_sd_stimulus_count",
  "pre_sd_rank",
  "pre_sd_evaluation_score",
  "pre_sd_brightness_score",
  "sd_question_count",
  "attention_check_present",
  "attention_check_expected",
  "attention_check_response",
  "attention_check_passed",
  "attention_check_index",
  "attention_check_total_for_phase",
  "attention_check_phase_total",
  "attention_check_phase_passed_count",
  "attention_check_phase_failed_count",
  "attention_check_phase_all_passed",
  "sd_beauty",
  "sd_like",
  "sd_good",
  "sd_pleasant",
  "sd_dynamic",
  "sd_stable",
  "sd_unique",
  "sd_showy",
  "sd_bright",
  "sd_cheerful",
  "sd_warm",
  "sd_fun",
  "sd_loose",
  "sd_relaxed",
  "sd_calm",
  "sd_soft",
  "evaluation_score",
  "brightness_score",
  "activity_score",
  "softness_score",
  "matching_trial_index_within_artwork",
  "matching_start_direction",
  "matching_initial_value",
  "matching_value",
  "matching_delta_from_initial",
  "matching_adjustment_count",
  "writing_task_stimulus_role",
  "char_count",
  "essay",
  "consent_date",
  "consent_gender",
  "consent_age",
  "consent_signature",
  "consent_agreed_count",
  "consent_complete",
];

function normalizeNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeBoolean(value) {
  if (value === true || value === false) {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

function meanFromKeys(response, keys) {
  const values = keys
    .map((key) => normalizeNumber(response?.[key]))
    .filter((value) => value !== null);

  if (values.length === 0) {
    return null;
  }

  const sum = values.reduce((accumulator, value) => accumulator + value, 0);
  return sum / values.length;
}

function parseIdList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[|,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinIdList(values) {
  return values.filter(Boolean).join("|");
}

function getLastDefinedRowValue(rows, key) {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const value = rows[index]?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

function getVisibleSdItemNames(mode = "minimal") {
  const visibleFactors = SD_DISPLAY_MODES[mode] ?? SD_DISPLAY_MODES.minimal;
  return SD_ITEM_BANK.filter((item) => visibleFactors.includes(item.factor)).map((item) => item.name);
}

function buildSdValues(response) {
  const values = {};

  for (const item of SD_ITEM_BANK) {
    values[`sd_${item.name}`] = normalizeNumber(response?.[item.name]);
  }

  return values;
}

function buildAttentionCheckPhaseLookup(rows) {
  const summaries = new Map();

  for (const row of rows) {
    if (row.phase !== "pre_sd" && row.phase !== "post_sd") {
      continue;
    }

    const existingSummary = summaries.get(row.phase) ?? {
      declaredTotal: null,
      presentCount: 0,
      passedCount: 0,
    };
    const declaredTotal = normalizeNumber(row.attention_check_total_for_phase);

    if (declaredTotal !== null) {
      existingSummary.declaredTotal = Math.max(
        existingSummary.declaredTotal ?? 0,
        declaredTotal
      );
    }

    if (normalizeBoolean(row.attention_check_present) === true) {
      existingSummary.presentCount += 1;

      if (normalizeBoolean(row.attention_check_passed) === true) {
        existingSummary.passedCount += 1;
      }
    }

    summaries.set(row.phase, existingSummary);
  }

  return new Map(
    Array.from(summaries.entries()).map(([phase, summary]) => {
      const total = summary.declaredTotal ?? summary.presentCount;
      const passedCount = summary.passedCount;

      return [
        phase,
        {
          total,
          passedCount,
          failedCount: Math.max(0, total - passedCount),
          allPassed: total > 0 ? passedCount === total : null,
        },
      ];
    })
  );
}

function comparePreSdRows(left, right) {
  if (left.evaluationScore === null && right.evaluationScore === null) {
    return left.displayOrder - right.displayOrder;
  }

  if (left.evaluationScore === null) {
    return 1;
  }

  if (right.evaluationScore === null) {
    return -1;
  }

  if (left.evaluationScore !== right.evaluationScore) {
    return left.evaluationScore - right.evaluationScore;
  }

  return left.displayOrder - right.displayOrder;
}

function buildPreSdLookup(rows) {
  // 事前 SD の評価結果を、後続フェーズの各行へ付与するための参照表にします。
  const preSdRows = rows
    .filter((row) => row.phase === "pre_sd" && row.stimulus_id)
    .map((row) => {
      const response = row.response ?? {};

      return {
        id: row.stimulus_id,
        stimulusLabel: row.stimulus_label ?? null,
        displayOrder: normalizeNumber(row.display_order) ?? Number.POSITIVE_INFINITY,
        evaluationScore: normalizeNumber(row.evaluation_score) ?? meanFromKeys(response, EVALUATION_KEYS),
        brightnessScore: meanFromKeys(response, BRIGHTNESS_KEYS),
      };
    });

  const rankLookup = new Map(
    [...preSdRows]
      .sort(comparePreSdRows)
      .map((row, index) => [row.id, index + 1])
  );

  return new Map(
    preSdRows.map((row) => [
      row.id,
      {
        displayOrder: row.displayOrder,
        evaluationScore: row.evaluationScore,
        brightnessScore: row.brightnessScore,
        rank: rankLookup.get(row.id) ?? null,
      },
    ])
  );
}

function resolveSelectedIds(rows, experimentState) {
  const targetId = experimentState.targetStimulus?.id ?? getLastDefinedRowValue(rows, "target_stimulus_id");
  const controlIds =
    experimentState.controlStimuli?.map((stimulus) => stimulus.id) ??
    parseIdList(getLastDefinedRowValue(rows, "control_stimulus_ids"));
  const postSdIds =
    experimentState.postSdStimuli?.map((stimulus) => stimulus.id) ??
    parseIdList(getLastDefinedRowValue(rows, "post_sd_stimulus_ids"));

  return {
    targetId: targetId ?? null,
    controlIds,
    postSdIds,
  };
}

function resolveMetaRows(rows, experimentState) {
  // 参加者 ID、条件、選定済み刺激など、全行に共通するメタ情報を集約します。
  const firstRow = rows.find(Boolean) ?? {};
  const selectedIds = resolveSelectedIds(rows, experimentState);

  return {
    participantId: experimentState.participantId ?? firstRow.participant_id ?? null,
    subjectId: experimentState.subjectId ?? firstRow.subject_id ?? null,
    completionCode: experimentState.completionCode ?? firstRow.completion_code ?? null,
    conditionId: experimentState.assignedCondition?.id ?? firstRow.condition_id ?? null,
    conditionLabel: experimentState.assignedCondition?.label ?? firstRow.condition_label ?? null,
    conditionIndex: normalizeNumber(experimentState.assignedConditionIndex ?? firstRow.condition_index),
    conditionSource: experimentState.assignedConditionSource ?? firstRow.condition_source ?? null,
    prototypeStimulusCount: normalizeNumber(firstRow.prototype_stimulus_count),
    sdDisplayMode: firstRow.sd_display_mode ?? null,
    dataPipeEnvironment: firstRow.data_pipe_environment ?? null,
    dataPipeExperimentId: firstRow.data_pipe_experiment_id ?? null,
    previewMode: firstRow.preview_mode ?? null,
    saveMode: firstRow.save_mode ?? null,
    writingTaskStimulusRole: experimentState.assignedCondition?.writingTask?.stimulusRole ?? null,
    ...selectedIds,
  };
}

function resolveStimulusAnalysisRole(stimulusId, targetId, controlIdSet, postSdIdSet) {
  if (!stimulusId) {
    return null;
  }

  if (stimulusId === targetId) {
    return "target";
  }

  if (controlIdSet.has(stimulusId)) {
    return "control";
  }

  if (postSdIdSet.has(stimulusId)) {
    return "post_sd_only";
  }

  return "prototype_only";
}

function buildBaseRecord({
  row,
  phaseCounts,
  includedRowIndex,
  meta,
  preSdLookup,
  selectedControlIds,
  selectedPostSdIds,
  controlIdSet,
  postSdIdSet,
}) {
  const stimulusId = row.stimulus_id ?? null;
  const preSdSummary = stimulusId ? preSdLookup.get(stimulusId) : null;

  return {
    record_index: includedRowIndex,
    phase: row.phase,
    phase_order: PHASE_ORDER[row.phase] ?? null,
    phase_trial_index: phaseCounts[row.phase],
    participant_id: meta.participantId,
    subject_id: meta.subjectId,
    completion_code: meta.completionCode,
    condition_id: meta.conditionId,
    condition_label: meta.conditionLabel,
    condition_index: meta.conditionIndex,
    condition_source: meta.conditionSource,
    prototype_stimulus_count: meta.prototypeStimulusCount,
    sd_display_mode: meta.sdDisplayMode,
    data_pipe_environment: meta.dataPipeEnvironment,
    data_pipe_experiment_id: meta.dataPipeExperimentId,
    preview_mode: meta.previewMode,
    save_mode: meta.saveMode,
    trial_type: row.trial_type ?? null,
    source_trial_type: row.trial_type ?? null,
    source_trial_index: normalizeNumber(row.trial_index),
    source_time_elapsed_ms: normalizeNumber(row.time_elapsed),
    rt_ms: normalizeNumber(row.rt),
    stimulus_id: stimulusId,
    stimulus_label: row.stimulus_label ?? null,
    stimulus_display_order: normalizeNumber(row.display_order) ?? preSdSummary?.displayOrder ?? null,
    stimulus_analysis_role: resolveStimulusAnalysisRole(
      stimulusId,
      meta.targetId,
      controlIdSet,
      postSdIdSet
    ),
    is_target_stimulus: stimulusId ? stimulusId === meta.targetId : null,
    is_control_stimulus: stimulusId ? controlIdSet.has(stimulusId) : null,
    is_post_sd_stimulus: stimulusId ? postSdIdSet.has(stimulusId) : null,
    selected_target_stimulus_id: meta.targetId,
    selected_control_stimulus_ids: joinIdList(selectedControlIds),
    selected_post_sd_stimulus_ids: joinIdList(selectedPostSdIds),
    selected_control_stimulus_count: selectedControlIds.length,
    selected_post_sd_stimulus_count: selectedPostSdIds.length,
    pre_sd_rank: preSdSummary?.rank ?? null,
    pre_sd_evaluation_score: preSdSummary?.evaluationScore ?? null,
    pre_sd_brightness_score: preSdSummary?.brightnessScore ?? null,
  };
}

function buildSdRecord(baseRecord, row, attentionCheckPhaseLookup) {
  const response = row.response ?? {};
  const visibleSdItems = getVisibleSdItemNames(baseRecord.sd_display_mode);
  const attentionCheckPhaseSummary = attentionCheckPhaseLookup.get(row.phase) ?? {
    total: null,
    passedCount: null,
    failedCount: null,
    allPassed: null,
  };

  return {
    ...baseRecord,
    sd_question_count: visibleSdItems.length || Object.keys(response).length,
    attention_check_present: normalizeBoolean(row.attention_check_present) ?? false,
    attention_check_expected: normalizeNumber(row.attention_check_expected),
    attention_check_response: normalizeNumber(row.attention_check_response),
    attention_check_passed: normalizeBoolean(row.attention_check_passed),
    attention_check_index: normalizeNumber(row.attention_check_index),
    attention_check_total_for_phase: normalizeNumber(row.attention_check_total_for_phase),
    attention_check_phase_total: attentionCheckPhaseSummary.total,
    attention_check_phase_passed_count: attentionCheckPhaseSummary.passedCount,
    attention_check_phase_failed_count: attentionCheckPhaseSummary.failedCount,
    attention_check_phase_all_passed: attentionCheckPhaseSummary.allPassed,
    ...buildSdValues(response),
    evaluation_score: normalizeNumber(row.evaluation_score) ?? meanFromKeys(response, EVALUATION_KEYS),
    brightness_score: meanFromKeys(response, BRIGHTNESS_KEYS),
    activity_score: meanFromKeys(response, ACTIVITY_KEYS),
    softness_score: meanFromKeys(response, SOFTNESS_KEYS),
  };
}

function buildMatchingRecord(baseRecord, row) {
  const initialValue = normalizeNumber(row.initial_value);
  const matchingValue = normalizeNumber(row.matching_value);

  return {
    ...baseRecord,
    matching_trial_index_within_artwork: normalizeNumber(row.trial_index_within_artwork),
    matching_start_direction: row.start_direction ?? null,
    matching_initial_value: initialValue,
    matching_value: matchingValue,
    matching_delta_from_initial:
      initialValue === null || matchingValue === null ? null : matchingValue - initialValue,
    matching_adjustment_count: normalizeNumber(row.adjustment_count),
  };
}

function buildWritingRecord(baseRecord, row, meta) {
  return {
    ...baseRecord,
    writing_task_stimulus_role: meta.writingTaskStimulusRole,
    char_count: normalizeNumber(row.char_count),
    essay: row.essay ?? null,
  };
}

function buildConsentRecord(baseRecord, row) {
  return {
    ...baseRecord,
    consent_date: row.consent_date ?? null,
    consent_gender: row.consent_gender ?? null,
    consent_age: normalizeNumber(row.consent_age),
    consent_signature: row.consent_signature ?? null,
    consent_agreed_count: normalizeNumber(row.consent_agreed_count),
    consent_complete: normalizeBoolean(row.consent_complete),
  };
}

export function buildAnalysisRows(rows, experimentState = {}) {
  // フェーズごとの生データを、分析しやすい共通列のレコードへ変換します。
  const filteredRows = rows.filter((row) => ANALYSIS_PHASES.has(row.phase));
  const meta = resolveMetaRows(filteredRows, experimentState);
  const selectedControlIds = meta.controlIds ?? [];
  const selectedPostSdIds = meta.postSdIds ?? [];
  const controlIdSet = new Set(selectedControlIds);
  const postSdIdSet = new Set(selectedPostSdIds);
  const preSdLookup = buildPreSdLookup(filteredRows);
  const attentionCheckPhaseLookup = buildAttentionCheckPhaseLookup(filteredRows);
  const phaseCounts = {};

  return filteredRows.map((row, index) => {
    phaseCounts[row.phase] = (phaseCounts[row.phase] ?? 0) + 1;

    const baseRecord = buildBaseRecord({
      row,
      phaseCounts,
      includedRowIndex: index + 1,
      meta,
      preSdLookup,
      selectedControlIds,
      selectedPostSdIds,
      controlIdSet,
      postSdIdSet,
    });

    if (row.phase === "pre_sd" || row.phase === "post_sd") {
      return buildSdRecord(baseRecord, row, attentionCheckPhaseLookup);
    }

    if (row.phase === "pre_matching" || row.phase === "post_matching") {
      return buildMatchingRecord(baseRecord, row);
    }

    if (row.phase === "writing") {
      return buildWritingRecord(baseRecord, row, meta);
    }

    if (row.phase === "consent") {
      return buildConsentRecord(baseRecord, row);
    }

    return baseRecord;
  });
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  const stringValue = String(value);
  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function buildAnalysisCsv(rows, experimentState = {}) {
  // DataPipe 送信用・ローカル保存用の CSV 文字列を生成します。
  const analysisRows = buildAnalysisRows(rows, experimentState);
  const header = ANALYSIS_CSV_COLUMNS.join(",");
  const body = analysisRows
    .map((row) => ANALYSIS_CSV_COLUMNS.map((column) => escapeCsvValue(row[column])).join(","))
    .join("\n");

  return body ? `${header}\n${body}` : header;
}
