import { CONSENT_TEXT } from "../config/experiment.js";

export function createConsentTrial() {
  const { jsPsychHtmlButtonResponse } = window;
  const isTestMode = new URLSearchParams(window.location.search).get("test") === "true";
  const consentState = {
    agreedItems: new Array(CONSENT_TEXT.checklist.length).fill(isTestMode),
    date: new Date().toISOString().slice(0, 10),
    gender: isTestMode ? "prefer_not_to_say" : "",
    age: isTestMode ? "30" : "",
    signature: isTestMode ? "Test User" : "",
  };

  const sectionHtml = CONSENT_TEXT.sections
    .map(
      (section) => `
        <section style="margin-bottom: 16px;">
          <h3 style="margin-bottom: 8px;">${section.heading}</h3>
          <p style="margin: 0;">${section.body}</p>
        </section>
      `
    )
    .join("");

  const checklistHtml = CONSENT_TEXT.checklist
    .map(
      (item, index) => `
        <label>
          <input type="checkbox" data-consent-index="${index}">
          <span>${item}</span>
        </label>
      `
    )
    .join("");

  function isConsentComplete() {
    const hasValidAge =
      consentState.age.trim().length > 0 &&
      Number.isFinite(Number(consentState.age)) &&
      Number(consentState.age) >= 0;

    return (
      consentState.agreedItems.every(Boolean) &&
      consentState.gender.length > 0 &&
      hasValidAge &&
      consentState.signature.trim().length > 0
    );
  }

  function updateButtonState() {
    const button = document.getElementById("jspsych-html-button-response-button-0");
    if (!button) {
      return;
    }

    button.disabled = !isConsentComplete();
  }

  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="consent-card">
        <div class="eyebrow">Consent</div>
        <h1>${CONSENT_TEXT.title}</h1>
        <p class="lead">内容を確認し、すべての確認項目にチェックしたうえで次へ進んでください。</p>

        <div class="consent-scroll">
          ${sectionHtml}
        </div>

        <div class="consent-checklist">
          ${checklistHtml}
        </div>

        <div class="consent-grid">
          <label>
            日付
            <input id="consent-date-input" type="date" value="${consentState.date}">
          </label>
          <label>
            性別
            <select id="consent-gender-input">
              <option value="">選択してください</option>
              <option value="female"${consentState.gender === "female" ? " selected" : ""}>女性</option>
              <option value="male"${consentState.gender === "male" ? " selected" : ""}>男性</option>
              <option value="other"${consentState.gender === "other" ? " selected" : ""}>その他</option>
              <option value="prefer_not_to_say"${consentState.gender === "prefer_not_to_say" ? " selected" : ""}>回答しない</option>
            </select>
          </label>
          <label>
            年齢
            <input id="consent-age-input" type="number" inputmode="numeric" min="0" max="120" placeholder="例: 25" value="${consentState.age}">
          </label>
          <label>
            氏名または識別名
            <input id="consent-signature-input" type="text" placeholder="記録用の名前を入力してください" value="${consentState.signature}">
          </label>
        </div>

        <p class="consent-hint">取得したデータは DataPipe を経由して OSF の保存先へ送信されます。</p>
      </div>
    `,
    choices: ["同意して次へ進む"],
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

      dateInput.addEventListener("change", (event) => {
        consentState.date = event.target.value;
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

      updateButtonState();
    },
    on_finish: (data) => {
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
