function renderValidationErrors(state) {
  // 保存前検証に失敗した場合だけ、終了画面に理由を表示します。
  const errors = state.dataPipeSave?.validationErrors ?? [];
  if (errors.length === 0) {
    return "";
  }

  return `
    <div class="mini-panel" style="margin-bottom: 18px;">
      <h2>保存できなかった理由</h2>
      <ul class="compact-list">
        ${errors.map((error) => `<li>${error}</li>`).join("")}
      </ul>
    </div>
  `;
}

function getFinishCopy(state) {
  // 保存状態に応じて、完了表示か未完了表示かを切り替えます。
  if (state.dataPipeSave?.status === "error") {
    return {
      eyebrow: "未完了",
      title: "実験データを保存できませんでした",
      lead:
        "必要な実験フェーズが不足していたため、データの保存が中止されました。",
      note:
        "内容を確認するまで、この画面は閉じないでください。",
    };
  }

  return {
    eyebrow: "完了",
    title: "実験は完了しました",
    lead:
      "ご参加ありがとうございました。以下の完了コードをクラウドワークスで報告してください。",
    note: "完了コードを控えるまで、この画面は閉じないでください。",
  };
}

function renderCompletionCode(state) {
  if (!state.completionCode) {
    return "";
  }

  const showCode = ["saved", "downloaded", "saved_and_downloaded"].includes(state.dataPipeSave?.status);
  if (!showCode) {
    return "";
  }

  return `
    <div class="mini-panel" style="margin-bottom: 18px;">
      <h2>完了コード</h2>
      <p class="lead" style="margin-bottom: 8px;">クラウドワークスでの完了報告時に、このコードを入力してください。</p>
      <p style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.08em;">${state.completionCode}</p>
    </div>
  `;
}

function renderDebriefing() {
  return `
    <div class="mini-panel" style="margin-bottom: 18px;">
      <h2>デブリーフィング</h2>
      <p class="lead" style="margin-bottom: 8px;">
        事前説明では「言語表現と思考プロセスの研究」とお伝えしましたが、実際には「自分の好みと異なる文章を書くことで、その対象への評価がどう変化するか（認知的不協和理論）」を調査する実験でした。<br>
        正確な結果を得るため、意図的な隠蔽（カバーストーリーの使用）があったことをお詫び申し上げます。
      </p>
    </div>
  `;
}

export function createFinishTrial({ state }) {
  // 最後の画面はキー入力を受け付けず、完了コードや保存エラーを確認させます。
  const { jsPsychHtmlKeyboardResponse } = window;

  return {
    type: jsPsychHtmlKeyboardResponse,
    stimulus: () => {
      const finishCopy = getFinishCopy(state);

      return `
        <div class="finish-card">
          <div class="eyebrow">${finishCopy.eyebrow}</div>
          <h1>${finishCopy.title}</h1>
          <p class="lead">${finishCopy.lead}</p>
          ${renderCompletionCode(state)}
          ${renderValidationErrors(state)}
          ${renderDebriefing()}
          <p class="summary-note">${finishCopy.note}</p>
        </div>
      `;
    },
    choices: "NO_KEYS",
    data: {
      phase: "finish",
    },
  };
}
