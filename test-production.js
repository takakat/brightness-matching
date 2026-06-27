import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";

import { EXPERIMENT_CONFIG } from "./config/experiment.js";
import { getEnabledStimuli } from "./config/stimuli.js";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:8080";
const HEADLESS = process.env.HEADLESS !== "false";
const DEFAULT_TIMEOUT_MS = Number(process.env.TEST_TIMEOUT_MS ?? 30000);
const MATCHING_TIMEOUT_MS = Number(process.env.MATCHING_TIMEOUT_MS ?? 60000);
const DOWNLOAD_TIMEOUT_MS = Number(process.env.DOWNLOAD_TIMEOUT_MS ?? 30000);
const POLL_INTERVAL_MS = 250;
const SAVE_MODE = process.env.TEST_SAVE_MODE ?? "download";
const ASSIGNMENT_COVERAGE = process.env.TEST_ASSIGNMENT_COVERAGE ?? "matrix";
const TEST_MAX_RUNS = Number(process.env.TEST_MAX_RUNS ?? 9);
const TEST_PARTICIPANT_PREFIX = process.env.TEST_PARTICIPANT_PREFIX ?? "test";
const SCREENSHOTS_ENABLED = process.env.SCREENSHOTS === "true";
const KNOWN_CONDITION_IDS = [
  "counter_attitudinal",
  "objective_description_control",
  "irrelevant_control",
];
const RESULTS_TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-");

const liveResultDirectory = path.resolve("test-results", `live-production-${RESULTS_TIMESTAMP}`);
const defaultDownloadDirectory =
  SAVE_MODE === "datapipe" || SCREENSHOTS_ENABLED
    ? liveResultDirectory
    : path.resolve("test-results");
const screenshotDirectory = path.join(liveResultDirectory, "screenshots");

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function logStep(message) {
  console.log(`\n== ${message} ==`);
}

function logInfo(message) {
  console.log(`[info] ${message}`);
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildStimulusId(sequenceNumber) {
  return `stimulus_${String(sequenceNumber).padStart(3, "0")}`;
}

function buildStimulusRange(start, end) {
  const ids = [];
  const step = start <= end ? 1 : -1;

  for (let index = start; step > 0 ? index <= end : index >= end; index += step) {
    ids.push(buildStimulusId(index));
  }

  return ids;
}

function buildControlStimulusIds(startSequenceNumber) {
  return Array.from(
    { length: EXPERIMENT_CONFIG.controlStimulusCount },
    (_, index) => buildStimulusId(startSequenceNumber + index)
  );
}

function buildExpectedCounts() {
  const enabledStimuli = getEnabledStimuli(EXPERIMENT_CONFIG.prototypeStimulusCount);
  const preSd = enabledStimuli.length;
  const matching =
    (1 + EXPERIMENT_CONFIG.controlStimulusCount) * EXPERIMENT_CONFIG.matching.trialsPerArtwork;

  return {
    preSd,
    preMatching: matching,
    postMatching: matching,
    writing: 1,
    postSd: Math.min(EXPERIMENT_CONFIG.postSdLowScoreCount, preSd),
  };
}

const TEST_MATRIX = [
  {
    conditionId: "counter_attitudinal",
    scenarioId: "strict_ascending",
    expectedSelection: {
      targetId: buildStimulusId(20),
      controlIds: buildControlStimulusIds(16).reverse(),
      postSdIds: buildStimulusRange(20, 11),
      writingStimulusId: buildStimulusId(20),
      writingTaskStimulusRole: "target",
      writingAnalysisRole: "target",
    },
  },
  {
    conditionId: "objective_description_control",
    scenarioId: "tie_blocks",
    expectedSelection: {
      targetId: buildStimulusId(1),
      controlIds: buildControlStimulusIds(2),
      postSdIds: buildStimulusRange(1, 10),
      writingStimulusId: buildStimulusId(1),
      writingTaskStimulusRole: "target",
      writingAnalysisRole: "target",
    },
  },
  {
    conditionId: "irrelevant_control",
    scenarioId: "flat_mid",
    expectedSelection: {
      targetId: buildStimulusId(1),
      controlIds: buildControlStimulusIds(2),
      postSdIds: buildStimulusRange(1, 10),
      writingStimulusId: buildStimulusId(20),
      writingTaskStimulusRole: "non_target",
      writingAnalysisRole: "prototype_only",
    },
  },
];

function getDefaultExpectedSelection(conditionId, scenarioId = "flat_mid") {
  const knownDefinition = TEST_MATRIX.find(
    (definition) =>
      definition.conditionId === conditionId && definition.scenarioId === scenarioId
  );

  if (knownDefinition) {
    return knownDefinition.expectedSelection;
  }

  const writingIsIrrelevantControl = conditionId === "irrelevant_control";
  return {
    targetId: buildStimulusId(1),
    controlIds: buildControlStimulusIds(2),
    postSdIds: buildStimulusRange(1, 10),
    writingStimulusId: writingIsIrrelevantControl ? buildStimulusId(20) : buildStimulusId(1),
    writingTaskStimulusRole: writingIsIrrelevantControl ? "non_target" : "target",
    writingAnalysisRole: writingIsIrrelevantControl ? "prototype_only" : "target",
  };
}

function buildScenarioDefinition({ conditionId, scenarioId = "flat_mid", participantId = null } = {}) {
  const resolvedConditionId = conditionId ?? "pending_assignment";
  return {
    conditionId: resolvedConditionId,
    scenarioId,
    participantId,
    expectedSelection: getDefaultExpectedSelection(resolvedConditionId, scenarioId),
  };
}

function resolveScenarioDefinitions() {
  if (ASSIGNMENT_COVERAGE === "all_conditions") {
    return [];
  }

  if (!process.env.TEST_SCENARIO && !process.env.TEST_CONDITION) {
    return TEST_MATRIX;
  }

  const conditionId = process.env.TEST_CONDITION ?? "counter_attitudinal";
  const scenarioId = process.env.TEST_SCENARIO ?? "flat_mid";
  const knownDefinition = TEST_MATRIX.find(
    (definition) =>
      definition.conditionId === conditionId && definition.scenarioId === scenarioId
  );

  return [knownDefinition ?? {
    conditionId,
    scenarioId,
    expectedSelection: {
      targetId: buildStimulusId(1),
      controlIds: [buildStimulusId(2), buildStimulusId(3), buildStimulusId(4)],
      postSdIds: buildStimulusRange(1, 10),
      writingStimulusId: buildStimulusId(1),
      writingTaskStimulusRole: "target",
      writingAnalysisRole: "target",
    },
  }];
}

function formatScenario(definition) {
  const participantSuffix = definition.participantId ? ` / ${definition.participantId}` : "";
  return `${definition.conditionId} / ${definition.scenarioId}${participantSuffix}`;
}

function buildScenarioUrl(definition) {
  const url = new URL(BASE_URL);
  url.searchParams.set("test", "true");
  if (SAVE_MODE === "download") {
    url.searchParams.set("save", "download");
  }
  if (definition.conditionId && definition.conditionId !== "pending_assignment") {
    url.searchParams.set("condition", definition.conditionId);
  }
  if (definition.participantId) {
    url.searchParams.set("participant_id", definition.participantId);
  }
  url.searchParams.set("testScenario", definition.scenarioId);
  return url.toString();
}

function formatRunNumber(runNumber) {
  return String(runNumber).padStart(3, "0");
}

function buildParticipantId(runNumber) {
  return `${TEST_PARTICIPANT_PREFIX}-${formatRunNumber(runNumber)}`;
}

function sanitizePathPart(value) {
  return String(value ?? "unknown")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "unknown";
}

async function captureStep(page, definition, stepName) {
  if (!SCREENSHOTS_ENABLED) {
    return null;
  }

  await fs.mkdir(screenshotDirectory, { recursive: true });
  const participant = sanitizePathPart(definition.participantId ?? "no-participant");
  const scenario = sanitizePathPart(`${definition.conditionId}-${definition.scenarioId}`);
  const step = sanitizePathPart(stepName);
  const screenshotPath = path.join(screenshotDirectory, `${participant}-${scenario}-${step}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  logInfo(`screenshot: ${screenshotPath}`);
  return screenshotPath;
}

async function configureDownloads(browser, page, downloadDirectory) {
  try {
    await browser.defaultBrowserContext().setDownloadBehavior({
      policy: "allow",
      downloadPath: downloadDirectory,
    });
    return;
  } catch (error) {
    logInfo(`default browser context download setup failed, using CDP fallback: ${error.message}`);
  }

  const session = await page.target().createCDPSession();
  await session.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadDirectory,
  });
}

async function verifyRuntimeConfigForDataPipe() {
  if (SAVE_MODE !== "datapipe") {
    return;
  }

  const runtimeConfigUrl = new URL("runtime-config.js", BASE_URL).toString();
  logStep("Runtime DataPipe config check");
  logInfo(`runtime config: ${runtimeConfigUrl}`);

  const response = await fetch(runtimeConfigUrl);
  assertCondition(response.ok, `Unable to fetch runtime-config.js: ${response.status}`);

  const runtimeConfigText = await response.text();
  const requiredSnippets = [
    'environmentName: "production"',
    "useConditionAssignment: true",
    "saveData: true",
  ];

  for (const snippet of requiredSnippets) {
    assertCondition(
      runtimeConfigText.includes(snippet),
      `runtime-config.js did not include required setting: ${snippet}`
    );
  }
}

async function installJsPsychCapture(page) {
  await page.evaluateOnNewDocument(() => {
    let wrappedInitJsPsych = null;

    function wrapInitJsPsych(candidate) {
      if (typeof candidate !== "function") {
        return candidate;
      }

      if (candidate.__testWrappedInitJsPsych) {
        return candidate;
      }

      const wrapped = function (...args) {
        const instance = candidate.apply(this, args);
        window.__testJsPsych = instance;
        return instance;
      };

      wrapped.__testWrappedInitJsPsych = true;
      return wrapped;
    }

    Object.defineProperty(window, "initJsPsych", {
      configurable: true,
      enumerable: true,
      get() {
        return wrappedInitJsPsych;
      },
      set(value) {
        wrappedInitJsPsych = wrapInitJsPsych(value);
      },
    });
  });
}

async function waitForJsPsychReady(page) {
  await page.waitForFunction(
    () => Boolean(window.__testJsPsych) && document.querySelector("button"),
    { timeout: DEFAULT_TIMEOUT_MS }
  );
}

async function getPhaseCount(page, phaseName) {
  return page.evaluate((phase) => {
    return window.__testJsPsych?.data?.get().filter({ phase }).count() ?? 0;
  }, phaseName);
}

async function getSelectionDebug(page) {
  return page.evaluate(() => window.selectionDebug ?? null);
}

async function getConditionAssignmentDebug(page) {
  return page.evaluate(() => window.conditionAssignmentDebug ?? null);
}

async function waitForPhaseCount(page, phaseName, minimumCount, timeoutMs) {
  await page.waitForFunction(
    (phase, targetCount) => {
      return (window.__testJsPsych?.data?.get().filter({ phase }).count() ?? 0) >= targetCount;
    },
    { timeout: timeoutMs },
    phaseName,
    minimumCount
  );
}

async function waitForVisibleRadioPage(page) {
  await page.waitForFunction(
    () => {
      return Array.from(document.querySelectorAll("input[type='radio']")).some(
        (element) => element.offsetParent !== null
      );
    },
    { timeout: DEFAULT_TIMEOUT_MS }
  );
}

async function clickEnabledButton(
  page,
  selector = "button, input[type='button'], input[type='submit']"
) {
  const clickedButton = await page.evaluate((buttonSelector) => {
    const buttons = Array.from(document.querySelectorAll(buttonSelector)).filter((button) => {
      return !button.disabled && button.offsetParent !== null;
    });

    const button = buttons[buttons.length - 1];
    if (!button) {
      return null;
    }

    button.click();
    return {
      id: button.id || null,
      text: button.textContent?.trim() || null,
    };
  }, selector);

  assertCondition(clickedButton, `No enabled button found for selector: ${selector}`);
  return clickedButton;
}

async function runIntro(page, scenarioLabel) {
  logStep(`${scenarioLabel}: Intro`);
  const consentAlreadyVisible = await page.$("[data-consent-index]");
  if (consentAlreadyVisible) {
    logInfo(`${scenarioLabel}: consent is already visible; skipping intro click`);
    return;
  }

  await clickEnabledButton(page, "button");
  await page.waitForSelector("[data-consent-index]", { timeout: DEFAULT_TIMEOUT_MS });
}

async function runConsent(page, scenarioLabel) {
  logStep(`${scenarioLabel}: Consent`);

  await page.waitForSelector("[data-consent-index]", { timeout: DEFAULT_TIMEOUT_MS });
  const consentState = await page.evaluate(() => {
    const checkboxes = Array.from(document.querySelectorAll("[data-consent-index]"));
    for (const checkbox of checkboxes) {
      if (!checkbox.checked) {
        checkbox.click();
      }
    }

    const signatureInput = document.getElementById("consent-signature-input");
    if (signatureInput && !signatureInput.value.trim()) {
      signatureInput.value = "Test User";
      signatureInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    return {
      checklistCount: checkboxes.length,
      signature: signatureInput?.value ?? "",
    };
  });

  assertCondition(consentState.checklistCount > 0, "Consent checklist did not render.");
  assertCondition(Boolean(consentState.signature.trim()), "Consent signature was empty.");

  await clickEnabledButton(page, "button");
  await waitForVisibleRadioPage(page);
}

async function answerCurrentSdPage(page) {
  await sleep(150);

  return page.evaluate(() => {
    const radios = Array.from(document.querySelectorAll("input[type='radio']"));
    const groupedInputs = new Map();

    for (const radio of radios) {
      if (!groupedInputs.has(radio.name)) {
        groupedInputs.set(radio.name, []);
      }
      groupedInputs.get(radio.name).push(radio);
    }

    let checkedGroupCount = 0;
    for (const inputs of groupedInputs.values()) {
      if (inputs.some((input) => input.checked)) {
        checkedGroupCount += 1;
      }
    }

    return {
      groupCount: groupedInputs.size,
      checkedGroupCount,
    };
  });
}

async function runSdLoop(page, phaseName, expectedCount, scenarioLabel) {
  logStep(`${scenarioLabel}: SD loop (${phaseName})`);

  let completedCount = await getPhaseCount(page, phaseName);
  while (completedCount < expectedCount) {
    await waitForVisibleRadioPage(page);

    const sdState = await answerCurrentSdPage(page);
    assertCondition(sdState.groupCount > 0, `${phaseName} rendered no questions.`);
    assertCondition(
      sdState.groupCount === sdState.checkedGroupCount,
      `${phaseName} did not preload all radio groups.`
    );

    await clickEnabledButton(page);
    await waitForPhaseCount(page, phaseName, completedCount + 1, DEFAULT_TIMEOUT_MS);

    completedCount = await getPhaseCount(page, phaseName);
    logInfo(`${scenarioLabel}: ${phaseName} ${completedCount}/${expectedCount}`);
  }
}

async function waitForMatchingToComplete(page, phaseName, expectedCount, nextSelector, scenarioLabel) {
  logStep(`${scenarioLabel}: Matching loop (${phaseName})`);

  let completedCount = await getPhaseCount(page, phaseName);
  while (completedCount < expectedCount) {
    await waitForPhaseCount(page, phaseName, completedCount + 1, MATCHING_TIMEOUT_MS);
    completedCount = await getPhaseCount(page, phaseName);
    logInfo(`${scenarioLabel}: ${phaseName} ${completedCount}/${expectedCount}`);
  }

  await page.waitForSelector(nextSelector, { timeout: DEFAULT_TIMEOUT_MS });
}

async function runWriting(page, scenarioLabel) {
  logStep(`${scenarioLabel}: Writing`);

  await page.waitForSelector("textarea", { timeout: DEFAULT_TIMEOUT_MS });
  const writingState = await page.evaluate((minimumCharacters) => {
    const textarea = document.querySelector("textarea");
    const nextButton = document.getElementById("jspsych-survey-text-next");

    if (!textarea || !nextButton) {
      return null;
    }

    const countCharacters = (value) => value.replace(/\s+/g, "").length;
    let currentText = textarea.value ?? "";

    if (countCharacters(currentText) < minimumCharacters) {
      const filler = "Automatedwritingresponseforendtoendvalidation";
      while (countCharacters(currentText) < minimumCharacters) {
        currentText += filler;
      }

      textarea.value = currentText;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    }

    return {
      charCount: countCharacters(textarea.value ?? ""),
      buttonDisabled: nextButton.disabled,
    };
  }, EXPERIMENT_CONFIG.writingMinCharacters);

  assertCondition(writingState, "Writing page did not render correctly.");
  assertCondition(
    writingState.charCount >= EXPERIMENT_CONFIG.writingMinCharacters,
    `Writing page did not reach minimum character count: ${writingState.charCount}.`
  );
  assertCondition(!writingState.buttonDisabled, "Writing next button remained disabled.");

  await clickEnabledButton(page, "#jspsych-survey-text-next");
  await page.waitForSelector(".matching-shell", { timeout: DEFAULT_TIMEOUT_MS });
}

async function waitForDataSaveResult(page, scenarioLabel) {
  logStep(`${scenarioLabel}: Data save`);

  await page.waitForFunction(() => Boolean(window.dataPipeSaveResult), {
    timeout: DOWNLOAD_TIMEOUT_MS,
  });
  await page.waitForSelector(".finish-card", { timeout: DEFAULT_TIMEOUT_MS });
}

async function listCsvFiles(downloadDirectory) {
  const entries = await fs.readdir(downloadDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".csv"))
    .map((entry) => path.join(downloadDirectory, entry.name));
}

async function waitForDownloadFile(downloadDirectory, knownFiles = new Set(), expectedFilename = null) {
  const deadline = Date.now() + DOWNLOAD_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const csvFiles = await listCsvFiles(downloadDirectory);

    for (const csvFile of csvFiles) {
      const basename = path.basename(csvFile);
      if (expectedFilename && basename !== expectedFilename) {
        continue;
      }

      if (!expectedFilename && knownFiles.has(csvFile)) {
        continue;
      }

      const stats = await fs.stat(csvFile);
      if (stats.size > 0) {
        return csvFile;
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`No CSV download was found in ${downloadDirectory}.`);
}

async function collectFinalResult(page) {
  return page.evaluate(() => {
    const rows = window.__testJsPsych?.data?.get().values() ?? [];
    const phaseCounts = rows.reduce((counts, row) => {
      if (row.phase) {
        counts[row.phase] = (counts[row.phase] ?? 0) + 1;
      }
      return counts;
    }, {});

    return {
      dataPipeSaveResult: window.dataPipeSaveResult ?? null,
      dataPipeUploadSummary: window.dataPipeUploadSummary ?? null,
      conditionAssignmentDebug: window.conditionAssignmentDebug ?? null,
      experimentState: window.experimentState ?? null,
      selectionDebug: window.selectionDebug ?? null,
      phaseCounts,
      rows,
    };
  });
}

function parseCsv(text) {
  const rows = [];
  let currentField = "";
  let currentRow = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (insideQuotes) {
      if (character === '"' && nextCharacter === '"') {
        currentField += '"';
        index += 1;
      } else if (character === '"') {
        insideQuotes = false;
      } else {
        currentField += character;
      }
      continue;
    }

    if (character === '"') {
      insideQuotes = true;
      continue;
    }

    if (character === ",") {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (character === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentField = "";
      currentRow = [];
      continue;
    }

    if (character !== "\r") {
      currentField += character;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  const [header = [], ...body] = rows;
  return body
    .filter((row) => row.length > 1 || row[0] !== "")
    .map((row) => Object.fromEntries(header.map((column, index) => [column, row[index] ?? ""])));
}

async function readCsvRecords(csvPath) {
  const csvText = await fs.readFile(csvPath, "utf8");
  return parseCsv(csvText);
}

function buildPhaseCountsFromCsv(records) {
  return records.reduce((counts, row) => {
    const phase = row.phase;
    counts[phase] = (counts[phase] ?? 0) + 1;
    return counts;
  }, {});
}

function buildExpectedAnalysisRowCount(expectedCounts) {
  return (
    1 +
    expectedCounts.preSd +
    expectedCounts.preMatching +
    expectedCounts.writing +
    expectedCounts.postMatching +
    expectedCounts.postSd
  );
}

function assertSelection(selectionDebug, expectedSelection) {
  assert.deepEqual(
    selectionDebug?.target?.id,
    expectedSelection.targetId,
    "Unexpected target stimulus."
  );
  assert.deepEqual(
    selectionDebug?.controls?.map((stimulus) => stimulus.id),
    expectedSelection.controlIds,
    "Unexpected control stimuli."
  );
  assert.deepEqual(
    selectionDebug?.postSdStimuli?.map((stimulus) => stimulus.id),
    expectedSelection.postSdIds,
    "Unexpected post-SD stimuli."
  );
}

function assertFinalResult({
  definition,
  result,
  expectedCounts,
  downloadedFilePath,
  csvRecords,
}) {
  const observedConditionId =
    result.conditionAssignmentDebug?.conditionId ?? result.experimentState?.assignedCondition?.id;
  const resolvedDefinition = buildScenarioDefinition({
    conditionId: observedConditionId ?? definition.conditionId,
    scenarioId: definition.scenarioId,
    participantId: definition.participantId,
  });
  const scenarioLabel = formatScenario(resolvedDefinition);
  const saveResult = result.dataPipeSaveResult;
  const uploadSummary = result.dataPipeUploadSummary;
  const phaseCounts = result.phaseCounts ?? {};
  const writingRows = result.rows.filter((row) => row.phase === "writing");
  const completionCode = result.experimentState?.completionCode;
  const expectedSaveStatus = SAVE_MODE === "datapipe" ? "saved_and_downloaded" : "downloaded";

  assertCondition(saveResult, `${scenarioLabel}: dataPipeSaveResult was not available.`);
  assert.equal(saveResult.status, expectedSaveStatus);
  assertCondition(uploadSummary, `${scenarioLabel}: dataPipeUploadSummary was not available.`);
  assert.deepEqual(uploadSummary.validationErrors ?? [], []);
  assertCondition(
    typeof completionCode === "string" && /^[A-Z2-9]{10}$/.test(completionCode),
    `${scenarioLabel}: completion code was missing or malformed.`
  );

  assert.equal(phaseCounts.pre_sd, expectedCounts.preSd);
  assert.equal(phaseCounts.pre_matching, expectedCounts.preMatching);
  assert.equal(phaseCounts.post_matching, expectedCounts.postMatching);
  assert.equal(phaseCounts.writing, expectedCounts.writing);
  assert.equal(phaseCounts.post_sd, expectedCounts.postSd);
  assert.equal(writingRows.length, 1);
  assertCondition(Boolean(String(writingRows[0]?.essay ?? "").trim()), "Writing essay was empty.");

  assertCondition(Boolean(downloadedFilePath), `${scenarioLabel}: downloaded CSV file path was missing.`);
  assert.equal(path.basename(downloadedFilePath), saveResult.filename);

  assertSelection(result.selectionDebug, resolvedDefinition.expectedSelection);

  const csvPhaseCounts = buildPhaseCountsFromCsv(csvRecords);
  assert.equal(
    csvRecords.length,
    buildExpectedAnalysisRowCount(expectedCounts),
    `${scenarioLabel}: unexpected analysis CSV row count.`
  );
  assert.equal(csvPhaseCounts.consent, 1);
  assert.equal(csvPhaseCounts.pre_sd, expectedCounts.preSd);
  assert.equal(csvPhaseCounts.pre_matching, expectedCounts.preMatching);
  assert.equal(csvPhaseCounts.writing, expectedCounts.writing);
  assert.equal(csvPhaseCounts.post_matching, expectedCounts.postMatching);
  assert.equal(csvPhaseCounts.post_sd, expectedCounts.postSd);

  const firstCsvRecord = csvRecords[0];
  assert.equal(firstCsvRecord.completion_code, completionCode);
  assert.equal(firstCsvRecord.prototype_stimulus_count, String(EXPERIMENT_CONFIG.prototypeStimulusCount));
  assert.equal(firstCsvRecord.condition_id, resolvedDefinition.conditionId);
  assert.equal(firstCsvRecord.participant_id, resolvedDefinition.participantId ?? firstCsvRecord.participant_id);
  assert.equal(firstCsvRecord.selected_target_stimulus_id, resolvedDefinition.expectedSelection.targetId);
  assert.equal(
    firstCsvRecord.selected_control_stimulus_ids,
    resolvedDefinition.expectedSelection.controlIds.join("|")
  );
  assert.equal(
    firstCsvRecord.selected_post_sd_stimulus_ids,
    resolvedDefinition.expectedSelection.postSdIds.join("|")
  );
  assert.equal(
    firstCsvRecord.selected_control_stimulus_count,
    String(EXPERIMENT_CONFIG.controlStimulusCount)
  );
  assert.equal(firstCsvRecord.selected_post_sd_stimulus_count, "10");

  const writingRow = csvRecords.find((row) => row.phase === "writing");
  assertCondition(writingRow, `${scenarioLabel}: writing row missing from CSV.`);
  assert.equal(writingRow.completion_code, completionCode);
  assert.equal(writingRow.stimulus_id, resolvedDefinition.expectedSelection.writingStimulusId);
  assert.equal(
    writingRow.writing_task_stimulus_role,
    resolvedDefinition.expectedSelection.writingTaskStimulusRole
  );
  assert.equal(writingRow.stimulus_analysis_role, resolvedDefinition.expectedSelection.writingAnalysisRole);
  assertCondition(Boolean(String(writingRow.essay ?? "").trim()), `${scenarioLabel}: CSV essay was empty.`);

  const preSdRows = csvRecords.filter((row) => row.phase === "pre_sd");
  const targetPreSdRow = preSdRows.find(
    (row) => row.stimulus_id === resolvedDefinition.expectedSelection.targetId
  );
  assertCondition(targetPreSdRow, `${scenarioLabel}: target pre-SD row was missing.`);
  assert.equal(targetPreSdRow.pre_sd_rank, "1");

  return resolvedDefinition;
}

async function runTestScenario(definition) {
  const expectedCounts = buildExpectedCounts();
  let activeDefinition = definition;
  let scenarioLabel = formatScenario(activeDefinition);
  const scenarioUrl = buildScenarioUrl(definition);
  const downloadDirectory = defaultDownloadDirectory;

  logStep(`Scenario setup: ${scenarioLabel}`);
  logInfo(`url: ${scenarioUrl}`);
  logInfo(`headless: ${HEADLESS}`);

  await fs.mkdir(downloadDirectory, { recursive: true });
  const existingCsvFiles = new Set(await listCsvFiles(downloadDirectory));

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: HEADLESS,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
    await page.setViewport({ width: 1440, height: 1200 });

    page.on("pageerror", (error) => {
      console.error(`[pageerror] ${error.message}`);
    });

    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        console.log(`[browser:${message.type()}] ${message.text()}`);
      }
    });

    await installJsPsychCapture(page);
    await configureDownloads(browser, page, downloadDirectory);

    await page.goto(scenarioUrl, {
      waitUntil: "networkidle2",
      timeout: DEFAULT_TIMEOUT_MS,
    });

    await waitForJsPsychReady(page);
    const conditionAssignmentDebug = await getConditionAssignmentDebug(page);
    if (definition.conditionId === "pending_assignment") {
      assertCondition(
        KNOWN_CONDITION_IDS.includes(conditionAssignmentDebug?.conditionId),
        `Unexpected assigned condition: ${conditionAssignmentDebug?.conditionId ?? "none"}`
      );
      activeDefinition = buildScenarioDefinition({
        conditionId: conditionAssignmentDebug.conditionId,
        scenarioId: definition.scenarioId,
        participantId: definition.participantId,
      });
      scenarioLabel = formatScenario(activeDefinition);
      logInfo(
        `${definition.participantId}: assigned ${conditionAssignmentDebug.conditionId} via ${conditionAssignmentDebug.source}`
      );
    }

    await runIntro(page, scenarioLabel);
    await runConsent(page, scenarioLabel);
    await captureStep(page, activeDefinition, "consent-after-submit");
    await captureStep(page, activeDefinition, "pre-sd-start");
    await runSdLoop(page, "pre_sd", expectedCounts.preSd, scenarioLabel);
    await page.waitForSelector(".matching-shell", { timeout: DEFAULT_TIMEOUT_MS });
    await captureStep(page, activeDefinition, "pre-matching-start");

    const selectionDebug = await getSelectionDebug(page);
    assertCondition(selectionDebug, `${scenarioLabel}: selectionDebug was not published after pre_sd.`);
    assertSelection(selectionDebug, activeDefinition.expectedSelection);

    await waitForMatchingToComplete(
      page,
      "pre_matching",
      expectedCounts.preMatching,
      "textarea",
      scenarioLabel
    );
    await captureStep(page, activeDefinition, "writing");
    await runWriting(page, scenarioLabel);
    await captureStep(page, activeDefinition, "post-matching-start");
    await waitForMatchingToComplete(
      page,
      "post_matching",
      expectedCounts.postMatching,
      "input[type='radio']",
      scenarioLabel
    );
    await captureStep(page, activeDefinition, "post-sd-start");
    await runSdLoop(page, "post_sd", expectedCounts.postSd, scenarioLabel);
    await waitForDataSaveResult(page, scenarioLabel);
    await captureStep(page, activeDefinition, "finish");

    const finalResult = await collectFinalResult(page);
    const downloadedFilePath = await waitForDownloadFile(
      downloadDirectory,
      existingCsvFiles,
      finalResult.dataPipeSaveResult?.filename ?? null
    );
    const csvRecords = await readCsvRecords(downloadedFilePath);

    const resolvedDefinition = assertFinalResult({
      definition: activeDefinition,
      result: finalResult,
      expectedCounts,
      downloadedFilePath,
      csvRecords,
    });

    logStep(`Scenario summary: ${scenarioLabel}`);
    console.log(
      JSON.stringify(
        {
          scenario: scenarioLabel,
          participantId: resolvedDefinition.participantId,
          conditionId: resolvedDefinition.conditionId,
          saveStatus: finalResult.dataPipeSaveResult?.status,
          dataPipeFilename: finalResult.dataPipeSaveResult?.filename,
          completionCode: finalResult.experimentState?.completionCode,
          selectedTarget: resolvedDefinition.expectedSelection.targetId,
          selectedControls: resolvedDefinition.expectedSelection.controlIds,
          selectedPostSd: resolvedDefinition.expectedSelection.postSdIds,
          downloadedFile: downloadedFilePath,
          observedCounts: finalResult.phaseCounts,
        },
        null,
        2
      )
    );

    return {
      participantId: resolvedDefinition.participantId,
      conditionId: resolvedDefinition.conditionId,
      scenarioId: resolvedDefinition.scenarioId,
      saveStatus: finalResult.dataPipeSaveResult?.status,
      dataPipeFilename: finalResult.dataPipeSaveResult?.filename,
      completionCode: finalResult.experimentState?.completionCode,
      downloadedFile: downloadedFilePath,
      phaseCounts: finalResult.phaseCounts,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function main() {
  const definitions = resolveScenarioDefinitions();
  logStep("Test matrix");
  logInfo(`base url: ${BASE_URL}`);
  logInfo(`save mode: ${SAVE_MODE}`);
  logInfo(`assignment coverage: ${ASSIGNMENT_COVERAGE}`);
  logInfo(`screenshots: ${SCREENSHOTS_ENABLED}`);
  await verifyRuntimeConfigForDataPipe();

  if (ASSIGNMENT_COVERAGE === "all_conditions") {
    const observedConditions = new Set();
    const runSummaries = [];

    await fs.mkdir(liveResultDirectory, { recursive: true });

    for (let runNumber = 1; runNumber <= TEST_MAX_RUNS; runNumber += 1) {
      const participantId = buildParticipantId(runNumber);
      const definition = buildScenarioDefinition({
        conditionId: "pending_assignment",
        scenarioId: process.env.TEST_SCENARIO ?? "flat_mid",
        participantId,
      });

      const runSummary = await runTestScenario(definition);
      runSummaries.push({
        runNumber,
        ...runSummary,
      });
      observedConditions.add(runSummary.conditionId);

      const missingConditions = KNOWN_CONDITION_IDS.filter(
        (conditionId) => !observedConditions.has(conditionId)
      );
      logInfo(
        `observed conditions: ${Array.from(observedConditions).join(", ")}; missing: ${
          missingConditions.join(", ") || "none"
        }`
      );

      if (missingConditions.length === 0) {
        break;
      }
    }

    const missingConditions = KNOWN_CONDITION_IDS.filter(
      (conditionId) => !observedConditions.has(conditionId)
    );
    const summaryPath = path.join(liveResultDirectory, "summary.json");
    const summary = {
      baseUrl: BASE_URL,
      saveMode: SAVE_MODE,
      assignmentCoverage: ASSIGNMENT_COVERAGE,
      maxRuns: TEST_MAX_RUNS,
      participantPrefix: TEST_PARTICIPANT_PREFIX,
      screenshotDirectory: SCREENSHOTS_ENABLED ? screenshotDirectory : null,
      observedConditions: Array.from(observedConditions),
      missingConditions,
      runs: runSummaries,
    };

    await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    logStep("Assignment coverage summary");
    console.log(JSON.stringify(summary, null, 2));
    logInfo(`summary: ${summaryPath}`);

    if (missingConditions.length > 0) {
      logInfo(
        `Reached TEST_MAX_RUNS=${TEST_MAX_RUNS} before observing all conditions. Missing: ${missingConditions.join(", ")}`
      );
    }

    return;
  }

  logInfo(`scenario count: ${definitions.length}`);

  for (const definition of definitions) {
    await runTestScenario(definition);
  }
}

await main();
