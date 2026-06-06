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
      controlIds: [buildStimulusId(19), buildStimulusId(18), buildStimulusId(17)],
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
      controlIds: [buildStimulusId(2), buildStimulusId(3), buildStimulusId(4)],
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
      controlIds: [buildStimulusId(2), buildStimulusId(3), buildStimulusId(4)],
      postSdIds: buildStimulusRange(1, 10),
      writingStimulusId: buildStimulusId(20),
      writingTaskStimulusRole: "non_target",
      writingAnalysisRole: "prototype_only",
    },
  },
];

function resolveScenarioDefinitions() {
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
  return `${definition.conditionId} / ${definition.scenarioId}`;
}

function buildScenarioUrl(definition) {
  const url = new URL(BASE_URL);
  url.searchParams.set("test", "true");
  url.searchParams.set("save", "download");
  url.searchParams.set("condition", definition.conditionId);
  url.searchParams.set("testScenario", definition.scenarioId);
  return url.toString();
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
  const scenarioLabel = formatScenario(definition);
  const saveResult = result.dataPipeSaveResult;
  const uploadSummary = result.dataPipeUploadSummary;
  const phaseCounts = result.phaseCounts ?? {};
  const writingRows = result.rows.filter((row) => row.phase === "writing");
  const completionCode = result.experimentState?.completionCode;

  assertCondition(saveResult, `${scenarioLabel}: dataPipeSaveResult was not available.`);
  assert.equal(saveResult.status, "downloaded");
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

  assertSelection(result.selectionDebug, definition.expectedSelection);

  const csvPhaseCounts = buildPhaseCountsFromCsv(csvRecords);
  assert.equal(csvRecords.length, 64, `${scenarioLabel}: unexpected analysis CSV row count.`);
  assert.equal(csvPhaseCounts.consent, 1);
  assert.equal(csvPhaseCounts.pre_sd, expectedCounts.preSd);
  assert.equal(csvPhaseCounts.pre_matching, expectedCounts.preMatching);
  assert.equal(csvPhaseCounts.writing, expectedCounts.writing);
  assert.equal(csvPhaseCounts.post_matching, expectedCounts.postMatching);
  assert.equal(csvPhaseCounts.post_sd, expectedCounts.postSd);

  const firstCsvRecord = csvRecords[0];
  assert.equal(firstCsvRecord.completion_code, completionCode);
  assert.equal(firstCsvRecord.prototype_stimulus_count, String(EXPERIMENT_CONFIG.prototypeStimulusCount));
  assert.equal(firstCsvRecord.condition_id, definition.conditionId);
  assert.equal(firstCsvRecord.selected_target_stimulus_id, definition.expectedSelection.targetId);
  assert.equal(
    firstCsvRecord.selected_control_stimulus_ids,
    definition.expectedSelection.controlIds.join("|")
  );
  assert.equal(
    firstCsvRecord.selected_post_sd_stimulus_ids,
    definition.expectedSelection.postSdIds.join("|")
  );
  assert.equal(firstCsvRecord.selected_control_stimulus_count, "3");
  assert.equal(firstCsvRecord.selected_post_sd_stimulus_count, "10");

  const writingRow = csvRecords.find((row) => row.phase === "writing");
  assertCondition(writingRow, `${scenarioLabel}: writing row missing from CSV.`);
  assert.equal(writingRow.completion_code, completionCode);
  assert.equal(writingRow.stimulus_id, definition.expectedSelection.writingStimulusId);
  assert.equal(
    writingRow.writing_task_stimulus_role,
    definition.expectedSelection.writingTaskStimulusRole
  );
  assert.equal(writingRow.stimulus_analysis_role, definition.expectedSelection.writingAnalysisRole);
  assertCondition(Boolean(String(writingRow.essay ?? "").trim()), `${scenarioLabel}: CSV essay was empty.`);

  const preSdRows = csvRecords.filter((row) => row.phase === "pre_sd");
  const targetPreSdRow = preSdRows.find(
    (row) => row.stimulus_id === definition.expectedSelection.targetId
  );
  assertCondition(targetPreSdRow, `${scenarioLabel}: target pre-SD row was missing.`);
  assert.equal(targetPreSdRow.pre_sd_rank, "1");
}

async function runTestScenario(definition) {
  const expectedCounts = buildExpectedCounts();
  const scenarioLabel = formatScenario(definition);
  const scenarioUrl = buildScenarioUrl(definition);
  const downloadDirectory = path.resolve("test-results");

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
    await runIntro(page, scenarioLabel);
    await runConsent(page, scenarioLabel);
    await runSdLoop(page, "pre_sd", expectedCounts.preSd, scenarioLabel);
    await page.waitForSelector(".matching-shell", { timeout: DEFAULT_TIMEOUT_MS });

    const selectionDebug = await getSelectionDebug(page);
    assertCondition(selectionDebug, `${scenarioLabel}: selectionDebug was not published after pre_sd.`);
    assertSelection(selectionDebug, definition.expectedSelection);

    await waitForMatchingToComplete(
      page,
      "pre_matching",
      expectedCounts.preMatching,
      "textarea",
      scenarioLabel
    );
    await runWriting(page, scenarioLabel);
    await waitForMatchingToComplete(
      page,
      "post_matching",
      expectedCounts.postMatching,
      "input[type='radio']",
      scenarioLabel
    );
    await runSdLoop(page, "post_sd", expectedCounts.postSd, scenarioLabel);
    await waitForDataSaveResult(page, scenarioLabel);

    const finalResult = await collectFinalResult(page);
    const downloadedFilePath = await waitForDownloadFile(
      downloadDirectory,
      existingCsvFiles,
      finalResult.dataPipeSaveResult?.filename ?? null
    );
    const csvRecords = await readCsvRecords(downloadedFilePath);

    assertFinalResult({
      definition,
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
          selectedTarget: definition.expectedSelection.targetId,
          selectedControls: definition.expectedSelection.controlIds,
          selectedPostSd: definition.expectedSelection.postSdIds,
          downloadedFile: downloadedFilePath,
          observedCounts: finalResult.phaseCounts,
        },
        null,
        2
      )
    );
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
  logInfo(`scenario count: ${definitions.length}`);

  for (const definition of definitions) {
    await runTestScenario(definition);
  }
}

await main();
