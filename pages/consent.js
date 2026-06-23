import { CONSENT_TEXT } from "../config/experiment.js";

export function createConsentTrial() {
  // 同意文書、確認チェック、属性入力を 1 つの jsPsych trial として表示します。
  const { jsPsychHtmlKeyboardResponse } = window;
  const isTestMode = new URLSearchParams(window.location.search).get("test") === "true";
  const consentState = {
    agreedItems: new Array(CONSENT_TEXT.checklist.length).fill(isTestMode),
    date: new Date().toISOString().slice(0, 10),
    gender: isTestMode ? "prefer_not_to_say" : "",
    age: isTestMode ? "30" : "",
    signature: isTestMode ? "Test User" : "",
  };

  const metadataHtml = CONSENT_TEXT.metadataRows
    .map(
      (row) => `
        <div class="consent-meta-label">${row.label}</div>
        <div class="consent-meta-value">${row.value}</div>
      `
    )
    .join("");

  const sectionHtml = CONSENT_TEXT.sections
    .map(
      (section) => `
        <section class="consent-document-section">
          <h3>${section.heading}</h3>
          <p>${section.body.replace(/\n/g, "<br>")}</p>
        </section>
      `
    )
    .join("");

  const checklistHtml = CONSENT_TEXT.checklist
    .map(
      (item, index) => `
        <label class="consent-check-item">
          <input type="checkbox" data-consent-index="${index}">
          <span>${item}</span>
        </label>
      `
    )
    .join("");

  function isConsentComplete() {
    return getConsentMissingItems().length === 0;
  }

  function getConsentMissingItems() {
    // 必須入力がそろうまで開始ボタンを無効にするため、未完了項目を列挙します。
    const missingItems = [];
    const hasValidAge =
      consentState.age.trim().length > 0 &&
      Number.isFinite(Number(consentState.age)) &&
      Number(consentState.age) >= 0 &&
      Number(consentState.age) <= 120;

    if (!consentState.agreedItems.every(Boolean)) {
      missingItems.push("確認チェック");
    }

    if (consentState.date.trim().length === 0) {
      missingItems.push("同意日");
    }

    if (consentState.age.trim().length === 0) {
      missingItems.push("年齢");
    } else if (!hasValidAge) {
      missingItems.push("有効な年齢");
    }

    if (consentState.gender.trim().length === 0) {
      missingItems.push("性別");
    }

    if (consentState.signature.trim().length === 0) {
      missingItems.push("署名");
    }

    return missingItems;
  }

  function updateButtonState() {
    const button = document.getElementById("consent-submit-button");
    if (!button) {
      return;
    }

    const missingItems = getConsentMissingItems();
    const message = document.getElementById("consent-validation-message");

    button.disabled = missingItems.length > 0;
    button.setAttribute("aria-disabled", String(button.disabled));

    if (message) {
      message.textContent =
        missingItems.length > 0 ? `未入力または未確認の項目があります: ${missingItems.join("、")}` : "";
    }
  }

  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: `
      <div class="consent-card">
        <h1 class="consent-title">${CONSENT_TEXT.title}</h1>

        <div class="consent-meta-table">
          ${metadataHtml}
        </div>

        <div class="consent-document">
          <h2>${CONSENT_TEXT.documentTitle}</h2>
          ${sectionHtml}
          <div class="consent-document-note">
            ${CONSENT_TEXT.acknowledgement}
          </div>
        </div>

        <div class="consent-agreement-panel">
          <h2>${CONSENT_TEXT.agreementTitle}</h2>
          <div class="consent-checklist">
            ${checklistHtml}
          </div>
          <p class="consent-agreement-statement">${CONSENT_TEXT.agreementStatement}</p>
          <div class="consent-field-row consent-field-row-single">
            <label class="consent-inline-field">
              <span>${CONSENT_TEXT.dateLabel}:</span>
              <input id="consent-date-input" type="date" value="${consentState.date}" required>
            </label>
          </div>
          <div class="consent-field-row">
            <label class="consent-inline-field">
              <span>年齢:</span>
              <input id="consent-age-input" type="number" inputmode="numeric" min="0" max="120" placeholder="例: 25" value="${consentState.age}">
            </label>
            <label class="consent-inline-field">
              <span>性別:</span>
              <select id="consent-gender-input" required>
                <option value="">選択してください</option>
                <option value="female"${consentState.gender === "female" ? " selected" : ""}>女性</option>
                <option value="male"${consentState.gender === "male" ? " selected" : ""}>男性</option>
                <option value="other"${consentState.gender === "other" ? " selected" : ""}>その他</option>
                <option value="prefer_not_to_say"${consentState.gender === "prefer_not_to_say" ? " selected" : ""}>回答しない</option>
              </select>
            </label>
          </div>
          <div class="consent-field-row consent-field-row-single">
            <label class="consent-inline-field">
              <span>${CONSENT_TEXT.signatureLabel}:</span>
              <input id="consent-signature-input" type="text" placeholder="氏名を入力してください" value="${consentState.signature}">
            </label>
          </div>
        </div>
      </div>
    `,
    choices: "NO_KEYS",
    on_load: () => {
      document.querySelectorAll("[data-consent-index]").forEach((checkbox) => {
        checkbox.addEventListener("change", (event) => {
          const index = Number(event.target.dataset.consentIndex);
          consentState.agreedItems[index] = event.target.checked;
          updateButtonState();
        });
        if (isTestMode) {
          checkbox.checked = true;
        }
      });

      const dateInput = document.getElementById("consent-date-input");
      const genderInput = document.getElementById("consent-gender-input");
      const ageInput = document.getElementById("consent-age-input");
      const signatureInput = document.getElementById("consent-signature-input");

      [dateInput, genderInput, ageInput, signatureInput].forEach((input) => {
        input.required = true;
      });

      const validationMessage = document.createElement("p");
      validationMessage.id = "consent-validation-message";
      validationMessage.className = "consent-validation-message";
      validationMessage.setAttribute("role", "status");
      validationMessage.setAttribute("aria-live", "polite");
      signatureInput.closest(".consent-field-row")?.after(validationMessage);

      const submitRow = document.createElement("div");
      submitRow.className = "consent-submit-row";
      submitRow.innerHTML = `<button id="consent-submit-button" class="jspsych-btn" type="button">実験を開始する</button>`;
      validationMessage.after(submitRow);

      dateInput.addEventListener("change", (event) => {
        consentState.date = event.target.value;
        updateButtonState();
      });

      genderInput.addEventListener("change", (event) => {
        consentState.gender = event.target.value;
        updateButtonState();
      });

      ageInput.addEventListener("input", (event) => {
        consentState.age = event.target.value;
        updateButtonState();
      });

      signatureInput.addEventListener("input", (event) => {
        consentState.signature = event.target.value;
        updateButtonState();
      });

      document.getElementById("consent-submit-button").addEventListener("click", () => {
        if (!isConsentComplete()) {
          updateButtonState();
          return;
        }

        document.getElementById("consent-submit-button").disabled = true;
        window.experimentJsPsych.finishTrial({
          phase: "consent",
          consent_date: consentState.date,
          consent_gender: consentState.gender,
          consent_age: Number(consentState.age),
          consent_signature: consentState.signature.trim(),
          consent_agreed_count: consentState.agreedItems.filter(Boolean).length,
          consent_complete: true,
        });
      });

      updateButtonState();
    },
    on_finish: (data) => {
      // 同意完了の状態と属性情報を、後続の保存・分析用データに残します。
      data.phase = "consent";
      data.consent_date = consentState.date;
      data.consent_gender = consentState.gender;
      data.consent_age = Number(consentState.age);
      data.consent_signature = consentState.signature.trim();
      data.consent_agreed_count = consentState.agreedItems.filter(Boolean).length;
      data.consent_complete = isConsentComplete();
    },
  };
}
