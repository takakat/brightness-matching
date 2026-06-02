import { EXPERIMENT_CONFIG, INTRO_CONTENT } from "../config/experiment.js";

export function createIntroTrial() {
  const { jsPsychHtmlButtonResponse } = window;
  const overviewItems = INTRO_CONTENT.overviewPoints.map((item) => `<li>${item}</li>`).join("");
  const noteItems = INTRO_CONTENT.notes.map((item) => `<li>${item}</li>`).join("");

  return {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
      <div class="instruction-card">
        <div class="eyebrow">Prototype</div>
        <h1>${EXPERIMENT_CONFIG.experimentTitle}</h1>
        <p class="lead">
          卒業研究で用いた実験システムを参照しつつ、今回の修士研究向けに
          ページ分離と仕様整理を優先した初期版です。
        </p>
        <div class="split-grid">
          <section>
            <h2>この版で確認する流れ</h2>
            <ol class="info-list">
              ${overviewItems}
            </ol>
          </section>
          <aside class="mini-panel">
            <h3>初期設定</h3>
            <ul class="compact-list">
              <li>刺激数: ${EXPERIMENT_CONFIG.prototypeStimulusCount} 枚</li>
              <li>SD 表示モード: ${EXPERIMENT_CONFIG.sdDisplayMode}</li>
              <li>統制作品数: 最大 ${EXPERIMENT_CONFIG.controlStimulusCount} 枚</li>
              <li>ライティング下限: ${EXPERIMENT_CONFIG.writingMinCharacters} 文字</li>
            </ul>
          </aside>
        </div>
        <section class="mini-panel" style="margin-top: 24px;">
          <h3>確認用メモ</h3>
          <ul class="compact-list">
            ${noteItems}
          </ul>
        </section>
      </div>
    `,
    choices: ["同意画面へ進む"],
    data: {
      phase: "intro",
    },
  };
}
