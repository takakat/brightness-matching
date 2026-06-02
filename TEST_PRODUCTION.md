# 本番環境テスト実行ガイド

本番環境でのデータ収集テストを実行するための完全ガイドです。

## 🎯 テスト方法の概要

### 3つのアプローチ

| 方法 | 用途 | 難易度 |
|------|------|--------|
| **HTMLデフォルト値** | 開発環境での手動テスト | ⭐ |
| **?test=trueパラメータ** | 開発環境での自動テスト | ⭐⭐ |
| **Puppeteer自動テスト** | 本番環境での自動化テスト | ⭐⭐⭐ |

---

## 📋 方法1: HTMLデフォルト値（手動テスト）

### 実装方法

フォームフィールドに `value` 属性と `autocomplete` 属性を追加します。

**同意ページ（consent.js）の例：**

```javascript
<input id="consent-signature-input" 
       type="text" 
       placeholder="同意者名を入力してください"
       value="テスト者名"
       autocomplete="name">
```

**評価スケール（sdScale.js）の例：**

```javascript
<input type="radio" 
       name="Q0" 
       value="3"
       autocomplete="off">
```

### メリット・デメリット

✅ ブラウザのオートフィル機能が利用できる
✅ UIの検証が容易
❌ 入力を毎回手動で消す必要がある
❌ テストの自動化ができない

---

## 🤖 方法2: URLパラメータを使った自動テスト（?test=true）

### 実装方法

**1. 同意ページの修正（pages/consent.js）:**

```javascript
export function createConsentTrial() {
  const { jsPsychHtmlButtonResponse } = window;
  const isTestMode = new URLSearchParams(window.location.search).get("test") === "true";
  const consentState = {
    agreedItems: new Array(CONSENT_TEXT.checklist.length).fill(isTestMode),
    date: new Date().toISOString().slice(0, 10),
    signature: isTestMode ? "Test User" : "",
  };
  
  // ... HTMLテンプレート内 ...
  <input id="consent-signature-input" 
         type="text" 
         value="${isTestMode ? "Test User" : ""}"
         placeholder="同意者名を入力してください">
  
  // on_loadで自動チェック
  on_load: () => {
    if (isTestMode) {
      document.querySelectorAll("[data-consent-index]").forEach(checkbox => {
        checkbox.checked = true;
      });
    }
  }
}
```

**2. 評価スケールの修正（pages/sdScale.js）:**

```javascript
export function createPreSdTimeline({ stimuli, questions, evaluationKeys }) {
  const { jsPsychSurveyLikert } = window;
  const isTestMode = new URLSearchParams(window.location.search).get("test") === "true";

  return stimuli.map((stimulus, zeroBasedIndex) => ({
    type: jsPsychSurveyLikert,
    // ... 設定 ...
    on_load: isTestMode ? function() {
      setTimeout(() => {
        // 中央値（3番目）を自動選択
        const inputs = document.querySelectorAll("input[type='radio']");
        inputs.forEach(input => {
          if (parseInt(input.value) === 3) {
            input.checked = true;
          }
        });
      }, 100);
    } : undefined,
  }));
}
```

**3. ライティングページの修正（pages/writing.js）:**

```javascript
export function createWritingTrial({ state }) {
  const { jsPsychSurveyText } = window;
  const isTestMode = new URLSearchParams(window.location.search).get("test") === "true";
  const minChars = EXPERIMENT_CONFIG.writingMinCharacters;
  const defaultText = isTestMode ? "テスト用のテキスト。" + "あ".repeat(Math.max(0, minChars - 10)) : "";

  return {
    type: jsPsychSurveyText,
    // ... 設定 ...
    questions: [
      {
        prompt: "",
        rows: EXPERIMENT_CONFIG.writingTextareaRows,
        columns: EXPERIMENT_CONFIG.writingTextareaColumns,
        required: true,
        name: "essay",
        value: defaultText,  // デフォルト値を設定
      },
    ],
    on_load: () => {
      // テストモードではボタンを有効化
      if (isTestMode) {
        document.getElementById("jspsych-survey-text-next").disabled = false;
      }
    }
  };
}
```

### 実行方法

```
http://localhost:8080?test=true&preview=true
```

パラメータ：
- `test=true` - テストモード（自動入力有効）
- `preview=true` - プレビューモード（特定のページのみ表示）
- `preview=pre-sd` - 事前評価ページだけを表示

### メリット・デメリット

✅ URLパラメータで簡単に切り替え可能
✅ 開発環境での高速テスト
✅ GitHubで履歴管理できる
❌ ブラウザを操作できない（自動化できない）
❌ 本番環境での自動テストができない

---

## 🦾 方法3: Puppeteer を使った自動テスト（推奨：本番環境用）

### セットアップ

**1. Puppeteerをインストール：**

```bash
npm install puppeteer --save-dev
```

**2. テストスクリプトを作成（test-production.js）:**

```javascript
import puppeteer from 'puppeteer';

async function testExperiment() {
  const BASE_URL = 'http://localhost:8080';
  
  console.log('🧪 本番環境テスト開始...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,  // ブラウザウィンドウを表示（デバッグ用）
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    
    // === 各ページの自動操作 ===
    
    // Intro ページ
    console.log('📄 Intro ページ...');
    await page.click('button');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Consent ページ
    console.log('📄 Consent ページ...');
    const checkboxes = await page.$$('[data-consent-index]');
    for (let i = 0; i < checkboxes.length; i++) {
      await page.click(`[data-consent-index="${i}"]`);
    }
    const signatureInput = await page.$('#consent-signature-input');
    if (signatureInput) {
      await signatureInput.type('Test User');
    }
    await page.click('button');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Pre-SD ページ（評価）
    console.log('📄 Pre-SD ページ...');
    const radioButtons = await page.$$('input[type="radio"]');
    for (const radio of radioButtons) {
      const value = await page.evaluate(el => el.value, radio);
      if (value === '3') {
        await radio.click();
      }
    }
    await page.click('button[type="button"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Writing ページ
    console.log('📄 Writing ページ...');
    const textarea = await page.$('textarea');
    if (textarea) {
      await textarea.type('テスト用のテキスト。'.repeat(10));
    }
    const buttons = await page.$$('button');
    if (buttons.length > 0) {
      await buttons[buttons.length - 1].click();
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
    }
    
    // データ検証
    console.log('\n📊 データ検証...');
    const experimentData = await page.evaluate(() => {
      return {
        dataPipeSaveResult: window.dataPipeSaveResult,
        participantId: window.experimentState?.participantId,
        condition: window.experimentState?.assignedCondition?.id,
      };
    });
    
    console.log('✅ 参加者ID:', experimentData.participantId);
    console.log('✅ 割り当て条件:', experimentData.condition);
    console.log('✅ データ保存結果:', experimentData.dataPipeSaveResult);
    
    console.log('\n🎉 テスト完了！');
    
  } catch (error) {
    console.error('❌ テスト失敗:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testExperiment();
```

### 実行手順

**ステップ1: サーバーを起動**

```powershell
cd "c:\Users\tkhsf\Desktop\shuron-reference-library\online-experiment"
node server.js
```

**ステップ2: 別ターミナルでテストを実行**

```powershell
cd "c:\Users\tkhsf\Desktop\shuron-reference-library\online-experiment"
node test-production.js
```

### テストの検証項目

テスト実行後、以下を確認してください：

1. **ページ遷移** - エラーなく全ページを通過したか
2. **データ取得** - `participantId` が生成されたか
3. **条件割り当て** - `condition` が正しく割り当てられたか
4. **DataPipe保存** - `dataPipeSaveResult` に成功情報があるか

### メリット・デメリット

✅ 本番環境で自動テスト可能
✅ CI/CDパイプラインに統合可能
✅ 複雑な操作（キーボード入力など）をシミュレート可能
✅ スクリーンショット/動画記録可能
❌ セットアップが複雑
❌ デバッグが難しい場合がある

---

## 🔍 各方法の比較表

| 項目 | HTML値 | URLパラメータ | Puppeteer |
|------|--------|--------------|-----------|
| セットアップ難度 | 簡単 | 中程度 | 複雑 |
| 開発環境テスト | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 本番環境テスト | ❌ | △ | ⭐⭐⭐ |
| 自動化 | ❌ | △ | ⭐⭐⭐ |
| CI/CD統合 | ❌ | △ | ⭐⭐⭐ |
| デバッグ容易性 | ⭐⭐⭐ | ⭐⭐ | ⭐ |

---

## 📝 推奨される使い分け

- **開発中** → 方法2（?test=true）で高速反復テスト
- **本番環境チェック** → 方法3（Puppeteer）で包括的なテスト
- **一度のチェック** → 方法1（HTMLデフォルト値）でUIを確認

---

## 🐛 トラブルシューティング

### セレクタが見つからない

```javascript
// デバッグ用：ページのHTMLをログ出力
const html = await page.content();
console.log(html);
```

### タイムアウトエラー

```javascript
await page.goto(BASE_URL, { 
  waitUntil: 'networkidle2',
  timeout: 60000  // 60秒に延長
});
```

### クリックできない要素

```javascript
// スクロールして要素を表示
await page.evaluate(() => {
  document.querySelector('button').scrollIntoView();
});
await page.click('button');
```

### Puppeteerのバージョン問題

```bash
npm install puppeteer@latest
```

---

## 📚 参考資料

- [Puppeteer公式ドキュメント](https://pptr.dev/)
- [jsPsychドキュメント](https://www.jspsych.org/)
- [Node.js HTTP Server](https://nodejs.org/en/docs/guides/nodejs-http-server/)

