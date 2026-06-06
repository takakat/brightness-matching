# Experiment System Structure Spec

## 1. Purpose

この文書は、この実験システムの構成を素早く把握し、次のような変更を安全に行うための保守用仕様書です。

- 実験の説明文や同意文の変更
- ライティング課題文の変更
- SD法の項目や表示モードの変更
- 刺激画像や刺激数の変更
- 条件割当・出力・テストの関連箇所の確認

## 2. System Overview

このシステムは `jsPsych` ベースの単一ページ実験です。ブラウザで `index.html` を開くと `app.js` が全体タイムラインを組み立て、各ページ部品とロジックを順番に実行します。

実験フローは次の通りです。

1. イントロ
2. 同意
3. 事前 SD 評定
4. 評定結果からターゲット作品・統制作品・事後 SD 対象を選定
5. 事前マッチング
6. 条件別ライティング
7. 事後マッチング
8. 事後 SD 評定
9. CSV 保存または DataPipe 送信
10. 終了画面

## 3. High-Level File Map

### Entry / runtime

| File | Role |
| --- | --- |
| `index.html` | jsPsych 本体・プラグイン・`runtime-config.js`・`app.js` を読み込むエントリ |
| `app.js` | 実験全体の状態管理、タイムライン構築、選定処理、保存処理の中心 |
| `styles.css` | すべての画面の見た目 |
| `runtime-config.js` | 本番用の DataPipe 接続設定 |
| `server.js` | ローカル確認用の簡易 HTTP サーバ |

### Configuration

| File | Role |
| --- | --- |
| `config/experiment.js` | 実験全体の基本設定、イントロ文、同意文 |
| `config/conditions.js` | 条件一覧、条件名、ライティング課題文、どの刺激に書かせるか |
| `config/scales.js` | SD法の項目定義、因子、ラベル、表示モード |
| `config/stimuli.js` | 刺激一覧、画像パス、表示順、使用可否 |

### Page components

| File | Role |
| --- | --- |
| `pages/intro.js` | イントロ画面 |
| `pages/consent.js` | 同意画面、属性入力、チェック必須制御 |
| `pages/sdScale.js` | 事前 SD と事後 SD の画面生成 |
| `pages/matching.js` | 明るさマッチング画面と試行計画 |
| `pages/writing.js` | 条件別ライティング画面 |
| `pages/finish.js` | 終了画面、保存状態・検証エラー表示 |

### Logic

| File | Role |
| --- | --- |
| `logic/conditionAssignment.js` | 参加者 ID 発行、URL 指定、DataPipe 条件割当 |
| `logic/selection.js` | pre-SD からターゲット・統制・post-SD 対象を選ぶ |
| `logic/dataSummary.js` | 保存前の件数検証、要約情報の作成 |
| `logic/analysisExport.js` | 分析用 CSV の列定義と行生成 |
| `logic/testScenario.js` | テストモード用の自動回答シナリオ |

### Scripts / tests / docs

| Path | Role |
| --- | --- |
| `scripts/prepare-pages.mjs` | GitHub Pages 用の配布物を `dist/pages/` に生成 |
| `scripts/export-standalone.mjs` | 別リポジトリ向けのスタンドアロン書き出し |
| `tests/*.mjs` | 選定、条件、CSV、検証などのスモークテスト |
| `test-production.js` | Puppeteer による通しの E2E テスト |
| `README.md` | セットアップと実行方法 |
| `specification.md` | 実験フロー仕様の要約 |
| `preview-urls.md` | 画面別プレビュー URL |
| `TEST_PRODUCTION.md` | 本番確認の手順メモ |

## 4. Editing Guide

### 4.1 実験の説明文を変えたい

変更箇所は主に次です。

- `config/experiment.js`
  - `experimentTitle`
  - `INTRO_CONTENT.overviewPoints`
  - `INTRO_CONTENT.notes`
  - `CONSENT_TEXT.title`
  - `CONSENT_TEXT.sections`
  - `CONSENT_TEXT.checklist`

画面の HTML 組み立て自体は `pages/intro.js` と `pages/consent.js` にあります。通常は文面変更だけなら `config/experiment.js` だけ見れば足ります。

### 4.2 ライティング課題文を変えたい

変更箇所は `config/conditions.js` です。

- `EXPERIMENT_CONDITIONS`
  - `label`: 条件名
  - `writingTask.instructions`: 実際の指示文
  - `writingTask.stimulusRole`: `target` か `non_target`

条件ごとの意味は次です。

- `counter_attitudinal`: ターゲット作品について書かせる
- `objective_description_control`: ターゲット作品について客観描写を書かせる
- `irrelevant_control`: 統制作品 1 枚目について書かせる

実際にどの刺激が表示されるかは `pages/writing.js` の `getWritingStimulus()` で決まります。

### 4.3 SD法の項目を変えたい

主な変更箇所は `config/scales.js` です。

- `SD_ITEM_BANK`
  - `name`: 内部キー
  - `factor`: 因子カテゴリ
  - `prompt`: 質問文
  - `labels`: 左右ラベル
- `SD_DISPLAY_MODES`
  - `minimal`
  - `full`

重要な注意点があります。

1. `factor: "evaluation"` の項目は、ターゲット選定に直接使われます。
   `logic/selection.js` ではなく、`pages/sdScale.js` で `EVALUATION_KEYS` の平均を `evaluation_score` として保存し、その値で選定します。
2. 項目を追加・削除・改名した場合、`logic/analysisExport.js` の `ANALYSIS_CSV_COLUMNS` も合わせて更新すべきです。
   ここに列名が固定で並んでいるため、`SD_ITEM_BANK` だけ変えると分析 CSV に新項目が出ない、または古い列が残る可能性があります。
3. `config/experiment.js` の `sdDisplayMode` を変えると、表示する因子群が切り替わります。

### 4.4 刺激画像や刺激数を変えたい

変更箇所は次です。

- `assets/stimuli/`
  - 実際の画像ファイル
- `config/stimuli.js`
  - `SOURCE_FILENAMES`
  - `STIMULI_MANIFEST`
- `config/experiment.js`
  - `prototypeStimulusCount`

補足です。

- 実験で使う順番は `displayOrder`
- 使用可否は `enabled`
- 実際に使う刺激は `getEnabledStimuli()` で取得
- `prototypeStimulusCount` が有効刺激数より小さい場合は、先頭からその枚数だけ使います

## 5. Selection / Matching / Export Rules

### 5.1 ターゲット選定

`logic/selection.js` が担当します。

- pre-SD の `evaluation_score` が最も低い刺激をターゲットにする
- 次点から `controlStimulusCount` 枚を統制刺激にする
- 低評価順の先頭 `postSdLowScoreCount` 枚を post-SD 対象にする
- 同点時は `displayOrder` で決める

### 5.2 マッチング

設定は `config/experiment.js` の `matching` にあります。

- `trialsPerArtwork`
- `directionsPerArtwork.darkStart`
- `directionsPerArtwork.brightStart`
- `startValueRanges`
- `coarseStep`
- `fineStep`

画面と試行生成は `pages/matching.js` です。対象は常にターゲット 1 枚 + 統制刺激群です。

### 5.3 保存・検証

保存処理の入口は `app.js`、検証ロジックは `logic/dataSummary.js`、CSV 生成は `logic/analysisExport.js` です。

保存前に主に次を検証します。

- ターゲットが選定されているか
- 統制刺激数が設定通りか
- ライティング回答が 1 件あり空でないか
- pre-matching 件数が期待値通りか
- post-matching 件数が期待値通りか

失敗すると終了画面でエラーを表示し、保存はブロックされます。

## 6. app.js の読み方

`app.js` は次の順で読むと把握しやすいです。

1. import 群
   どの設定・画面・ロジックを束ねているか分かる
2. `resolveConditionAssignment()`
   条件割当の決定方法
3. `state`
   実験全体で共有する状態
4. `assignSelectionState()`
   pre-SD 後の選定結果を state に反映
5. `createDataSaveTrial()`
   保存と検証の実行
6. `createNormalTimeline()`
   本番フロー全体
7. `createPreviewTimeline()`
   画面単体プレビュー

保守時は、まず `app.js` を見てから個別ファイルへ移るのが最短です。

## 7. Preview / Test / Deployment

### Preview

`preview-urls.md` に画面別プレビュー URL があります。`app.js` の `createPreviewTimeline()` が対応します。

### Test

- `npm run test:smoke`
  - ロジック単体の簡易確認
- `npm test`
  - ローカルサーバ起動後に E2E 実行

SD 項目、条件、選定ルール、CSV 列を変えたときは最低でも `npm run test:smoke` を回すべきです。

### Deployment

- `runtime-config.js`
  - DataPipe 保存の有効化
  - experiment ID
  - OSF 情報
- `npm run build`
  - `dist/pages/` に配布物を生成

公開前に `runtime-config.js` が意図した設定になっているかを必ず確認してください。

## 8. Recommended Change Workflow

### 実験文面の修正

1. `config/experiment.js` または `config/conditions.js` を修正
2. ブラウザで該当 preview を確認
3. 必要なら `npm run test:smoke`

### SD 項目の修正

1. `config/scales.js` を修正
2. 必要に応じて `config/experiment.js` の `sdDisplayMode` を確認
3. `logic/analysisExport.js` の `ANALYSIS_CSV_COLUMNS` を更新
4. `npm run test:smoke` を実行
5. pre-SD と post-SD の preview を確認

## 9. First Files to Open

初見で把握したい場合は、次の順が効率的です。

1. `app.js`
2. `config/experiment.js`
3. `config/conditions.js`
4. `config/scales.js`
5. `pages/sdScale.js`
6. `logic/selection.js`
7. `logic/analysisExport.js`

この順で読むと、「何を表示し」「どう選び」「どう保存するか」が一通りつながります。
