const DEFAULT_DATAPIPE_CONFIG = {
  environmentName: "public",
  useConditionAssignment: false,
  saveData: false,
  experimentId: "",
  osfProjectId: "",
  osfDataComponentId: "",
  conditionEndpoint: "https://pipe.jspsych.org/api/condition/",
  dataEndpoint: "https://pipe.jspsych.org/api/data/",
};

const runtimeDataPipeConfig = globalThis.EXPERIMENT_RUNTIME?.dataPipe ?? {};

const EXPERIMENT_CONFIG = {
  experimentTitle: "絵画の見えと評価に関するオンライン実験プロトタイプ",
  prototypeStimulusCount: 20,
  sdDisplayMode: "full",
  controlStimulusCount: 3,
  postSdLowScoreCount: 10,
  writingMinCharacters: 150,
  writingTextareaRows: 12,
  writingTextareaColumns: 72,
  dataPipe: {
    ...DEFAULT_DATAPIPE_CONFIG,
    ...runtimeDataPipeConfig,
  },
  matching: {
    minValue: 0,
    maxValue: 255,
    trialsPerArtwork: 4,
    directionsPerArtwork: {
      darkStart: 2,
      brightStart: 2,
    },
    startValueRanges: {
      dark: {
        min: 32,
        max: 96,
      },
      bright: {
        min: 160,
        max: 224,
      },
    },
    coarseStep: 8,
    fineStep: 1,
    shellWidthPx: 1120,
    figureFrameWidthPx: 320,
    frameSizePx: 320,
    stageGapPx: 24,
    patchInsetPx: 18,
    patchLabel: "比較刺激",
  },
};

const INTRO_CONTENT = {
  overviewPoints: [
    "同意画面の確認",
    "事前の SD 法による絵画評価",
    "評価性スコアが最も低い作品のターゲット選定",
    "ターゲット作品に対する明るさマッチング",
    "ライティング課題",
    "事後の明るさマッチング",
    "低評価作品に対する再 SD 評価",
  ],
  notes: [
    "この版は画面構成と選定ロジックを確認するためのプロトタイプです。",
    "DataPipe 経由で条件割り当てと CSV データ送信を行います。",
    "初期刺激数は 6 枚で、manifest の編集で後から増やせます。",
  ],
};

const CONSENT_TEXT = {
  title: "研究対象者への説明事項・参加同意",
  documentTitle: "芸術作品の見え方と印象形成に関する調査",
  metadataRows: [
    {
      label: "研究責任者",
      value: "京都工芸繊維大学 情報工学・人間科学系 梶村昇吾",
    },
    {
      label: "研究課題名",
      value: "芸術作品の見え方と印象形成に関する調査",
    },
    {
      label: "研究実施場所",
      value: "オンライン",
    },
    {
      label: "研究実施期間",
      value: "承認日から2027年3月31日まで",
    },
  ],
  sections: [
    {
      heading: "1. 研究の目的",
      body: "本研究は、芸術作品を見たときの見え方や印象の捉え方、およびそれらを言葉で表す過程の特徴を調査することを目的としています。",
    },
    {
      heading: "2. 研究の方法",
      body: "この実験では、まず抽象画20枚に対する印象評価を行っていただきます。その後、事前の回答内容に基づいて選ばれた複数の作品について、画面横に表示される灰色の四角形の明るさをキーボードで調整し、作品全体の見え方に対応すると感じられるところで決定していただきます。続いて、指定された条件に従って、作品について文章作成課題に取り組んでいただきます。文章作成後には、再度同様の調整課題を行い、最後に一部作品についてもう一度印象評価を行っていただきます。実験はPC上で行い、所要時間は約45〜60分です。",
    },
    {
      heading: "3. 研究参加の任意性と撤回の自由",
      body: "研究対象者の実験等への参加は任意です。研究対象者は、いつでも同意を取り消すことができます。また、同意を取り消した場合でも、一切の不利益を受けないことが保証されます。",
    },
    {
      heading: "4. 研究対象者に生じる不利益等と倫理上の配慮",
      body: "本研究において、研究対象者に生じる不利益、苦痛又は危険は想定されませんが、心理的なストレス等に十分に配慮しながら計画を実施いたします。",
    },
    {
      heading: "5. 個人情報の取扱い",
      body: "研究対象者の個人情報やこの研究で得られたデータについて、研究対象者の同意を得ることなく公表されることはありません。また、この研究計画の目的以外に使用することはありません。他の情報と照合しない限り特定の個人を識別することができない水準に加工し、電子媒体は外部から遮断されたコンピュータでパスワード管理のうえ保管し、紙媒体は鍵のかかる書棚等に厳重に保管します。廃棄時は、電子媒体は復元できない方法を使用し、紙媒体はシュレッダーを使用して処理します。",
    },
    {
      heading: "6. 問い合わせ先",
      body: "京都工芸繊維大学工芸科学部設計工学域情報工学課程ブレインサイエンス研究室\n研究責任者：梶村昇吾\n研究担当者: 藤井貴久\n連絡先: m26622045@edu.kit.ac.jp",
      
    },
  ],
  checklist: [
    "研究の目的",
    "研究の方法",
    "研究参加の任意性と撤回の自由",
    "研究対象者に生じる不利益等と倫理上の配慮",
    "個人情報の取扱い",
    "問い合わせ先",
  ],
  acknowledgement:
    "上記の説明事項をよく読み、内容を理解したうえで、本研究に参加することに同意いただける場合は、本日の日付を入力し、各確認項目にチェックを入れてください。",
  agreementTitle: "理解した事項（全てにチェックを入れてください）",
  agreementStatement:
    "これらの説明事項を確認し、内容を理解したうえで、この研究に参加することに同意します。",
  dateLabel: "同意日",
  signatureLabel: "署名",
};

const WRITING_CONTENT = {
  title: "ライティング課題",
  promptTitle: "選ばれた作品について自由記述で回答してください",
  promptBody:
    "ターゲット作品を見て、どのような印象を持ったか、どのような点が気になったか、どのように感じたかを自由に記述してください。",
};

export { CONSENT_TEXT, EXPERIMENT_CONFIG, INTRO_CONTENT, WRITING_CONTENT };
