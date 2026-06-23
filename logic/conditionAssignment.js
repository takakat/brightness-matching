import {
  CONDITION_ASSIGNMENT_CONFIG,
  CONDITION_IDS,
  DEFAULT_CONDITION_ID,
  getConditionById,
  getConditionByIndex,
} from "../config/conditions.js?v=20260526-datapipe-conditions";

function normalizeConditionId(value) {
  // URL で条件を指定された場合でも、定義済み ID だけを有効にします。
  if (!value) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return CONDITION_IDS.includes(normalizedValue) ? normalizedValue : null;
}

function createParticipantId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `participant-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateParticipantId({
  searchParams,
  storage = globalThis.localStorage,
  persist = true,
} = {}) {
  // URL 指定、保存済み ID、新規生成の順で参加者 ID を決めます。
  const params = searchParams ?? new URLSearchParams(globalThis.location?.search ?? "");
  const requestedParticipantId = params.get(CONDITION_ASSIGNMENT_CONFIG.urlParticipantParam)?.trim();
  const storedParticipantId = storage.getItem(CONDITION_ASSIGNMENT_CONFIG.currentParticipantStorageKey);
  const participantId = requestedParticipantId || storedParticipantId || createParticipantId();

  if (persist) {
    storage.setItem(CONDITION_ASSIGNMENT_CONFIG.currentParticipantStorageKey, participantId);
  }

  return participantId;
}

export function buildManualConditionAssignment({
  participantId,
  searchParams,
  fallbackConditionId = DEFAULT_CONDITION_ID,
} = {}) {
  // プレビューや DataPipe 無効時は、URL 指定またはデフォルト条件で割り当てます。
  const params = searchParams ?? new URLSearchParams(globalThis.location?.search ?? "");
  const requestedConditionId = normalizeConditionId(params.get(CONDITION_ASSIGNMENT_CONFIG.urlConditionParam));
  const conditionId = requestedConditionId || fallbackConditionId;

  return {
    participantId,
    conditionId,
    condition: getConditionById(conditionId),
    source: requestedConditionId ? "url" : "default",
  };
}

export async function assignParticipantConditionWithDataPipe({
  participantId,
  experimentId,
  endpoint,
  fetchImpl = globalThis.fetch,
} = {}) {
  // 本番時は DataPipe から条件番号を取得し、アプリ内の条件定義へ変換します。
  if (!experimentId || experimentId === "SET_YOUR_DATAPIPE_EXPERIMENT_ID") {
    throw new Error("DataPipe の experimentId が未設定です。config/experiment.js を更新してください。");
  }

  if (typeof fetchImpl !== "function") {
    throw new Error("条件割り当てに必要な fetch が利用できません。");
  }

  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      experimentID: experimentId,
    }),
  });

  const responseData = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = responseData.message || "DataPipe から条件番号を取得できませんでした。";
    throw new Error(message);
  }

  const conditionIndex = Number(responseData.condition);
  if (!Number.isInteger(conditionIndex)) {
    throw new Error("DataPipe から不正な条件番号が返されました。");
  }

  const condition = getConditionByIndex(conditionIndex);

  return {
    participantId,
    conditionIndex,
    conditionId: condition.id,
    condition,
    source: "datapipe",
  };
}
