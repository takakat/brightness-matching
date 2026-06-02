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
  sdDisplayMode: "minimal",
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
  title: "実験参加への同意",
  sections: [
    {
      heading: "1. 実験の目的",
      body: "本実験では、絵画を見たときの主観的評価と、明るさの判断との関係を調べます。現在のプロトタイプでは、画面構成と回答導線の確認を主目的としています。",
    },
    {
      heading: "2. 実施内容",
      body: "複数の絵画作品を見て SD 法で評価したあと、選定された作品に対して明るさマッチング課題とライティング課題に回答していただきます。",
    },
    {
      heading: "3. 所要時間",
      body: "刺激数を絞ったプロトタイプのため、現段階では短時間で完了します。本番時は刺激数に応じて所要時間が延びます。",
    },
    {
      heading: "4. 自由意思と中断",
      body: "参加は任意です。回答の途中でも、希望すればいつでも中断できます。",
    },
    {
      heading: "5. 取り扱い",
      body: "回答データは DataPipe 経由で OSF の保存先に送信されます。そのため、送信先の説明を確認したうえで参加してください。",
    },
  ],
  checklist: [
    "実験の目的と流れを確認しました。",
    "回答は任意であり、途中で中断できることを理解しました。",
    "回答データが OSF の保存先に送信されることを確認しました。",
    "上記を理解したうえで参加に同意します。",
  ],
};

const WRITING_CONTENT = {
  title: "ライティング課題",
  promptTitle: "選ばれた作品について自由記述で回答してください",
  promptBody:
    "ターゲット作品を見て、どのような印象を持ったか、どのような点が気になったか、どのように感じたかを自由に記述してください。",
};

export { CONSENT_TEXT, EXPERIMENT_CONFIG, INTRO_CONTENT, WRITING_CONTENT };
