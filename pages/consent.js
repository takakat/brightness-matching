import { CONSENT_TEXT } from "../config/experiment.js";

export function createConsentTrial() {
  const { jsPsychHtmlButtonResponse } = window;
  const isTestMode = new URLSearchParams(window.location.search).get("test") === "true";
  const consentState = {
    agreedItems: new Array(CONSENT_TEXT.checklist.length).fill(isTestMode),
    date: new Date().toISOString().slice(0, 10),
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

  function updateButtonState() {
    const button = document.getElementById("jspsych-html-button-response-button-0");
    if (!button) {
      return;
    }

    const isValid = consentState.agreedItems.every(Boolean) && consentState.signature.trim().length > 0;
    button.disabled = !isValid;
  }

  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="consent-card">
        <div class="eyebrow">Consent</div>
        <h1>${CONSENT_TEXT.title}</h1>
        <p class="lead">必須項目を確認し、すべてチェックしてから次へ進んでください。</p>

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
            氏名または署名
            <input id="consent-signature-input" type="text" placeholder="同意者名を入力してください" value="${isTestMode ? "Test User" : ""}">
          </label>
        </div>

        <p class="consent-hint">回答データは DataPipe 経由で OSF の保存先に送信されます。</p>
      </div>
    `,
    choices: ["同意して事前評価へ進む"],
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
      const signatureInput = document.getElementById("consent-signature-input");

      dateInput.addEventListener("change", (event) => {
        consentState.date = event.target.value;
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
      data.consent_signature = consentState.signature.trim();
      data.consent_agreed_count = consentState.agreedItems.filter(Boolean).length;
      data.consent_complete = consentState.agreedItems.every(Boolean) && consentState.signature.trim().length > 0;
    },
  };
}
