# AI要件定義システム 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 現場の曖昧な発話をClaude APIが精密な要件定義書に変換する、インストール不要の単一HTMLファイルWebアプリを作成する

**Architecture:** `index.html` 1ファイルに HTML・CSS・JS をすべてインライン記述。外部ライブラリ依存ゼロ。Web Speech APIで音声入力、Claude APIで要件定義書生成、自前MarkdownパーサーでHTML整形表示する。

**Tech Stack:** HTML5 / CSS3 / Vanilla JS / Web Speech API / Claude API (claude-sonnet-4-20250514)

---

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.html` | アプリ全体（HTML構造 + CSSスタイル + JSロジック） |

---

### Task 1: HTML骨格とAPIキー入力欄

**Files:**
- Create: `C:/Users/kawak/Documents/ai-requirements-system/index.html`

- [ ] **Step 1: index.html の骨格を作成する**

以下の内容で `index.html` を作成する：

```html
<!DOCTYPE html>
<!-- AI要件定義システム：現場の曖昧な発話を要件定義書に変換するWebアプリ -->
<html lang="ja">
<head>
  <!-- 文字コードをUTF-8に設定（日本語対応） -->
  <meta charset="UTF-8">
  <!-- スマホ・タブレットでも正しく表示されるようにビューポートを設定 -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- ブラウザのタブに表示されるタイトル -->
  <title>AI要件定義システム</title>
  <style>
    /* ===== 全体リセット：ブラウザごとのデフォルトスタイルをそろえる ===== */
    * {
      box-sizing: border-box; /* パディングをサイズに含める */
      margin: 0;              /* 余白をゼロリセット */
      padding: 0;             /* 内側余白をゼロリセット */
    }

    /* ===== ページ全体のスタイル ===== */
    body {
      font-family: 'Meiryo', 'メイリオ', 'Hiragino Sans', sans-serif; /* 日本語フォント */
      font-size: 16px;           /* 基本フォントサイズ */
      background-color: #f0f4f8; /* 薄いグレー背景 */
      color: #2d3748;            /* 文字色：濃いグレー */
      min-height: 100vh;         /* 画面いっぱいの高さ */
    }

    /* ===== ヘッダー部分 ===== */
    header {
      background-color: #2b6cb0; /* 建設業らしい落ち着いたブルー */
      color: white;              /* 文字色：白 */
      padding: 16px 24px;        /* 内側余白 */
      display: flex;             /* 横並びレイアウト */
      align-items: center;       /* 縦方向中央揃え */
      flex-wrap: wrap;           /* 画面が狭いときは折り返す */
      gap: 12px;                 /* 要素間の隙間 */
    }

    /* ===== ヘッダーのタイトル文字 ===== */
    header h1 {
      font-size: 20px;  /* タイトルのフォントサイズ */
      flex: 1;          /* 残りスペースを占有する */
    }

    /* ===== APIキー入力欄のラベル ===== */
    #api-key-label {
      font-size: 13px; /* 小さめのラベル文字 */
      white-space: nowrap; /* 折り返さない */
    }

    /* ===== APIキー入力テキストボックス ===== */
    #api-key-input {
      padding: 8px 12px;         /* 内側余白 */
      border: none;              /* 枠線なし */
      border-radius: 6px;        /* 角丸 */
      font-size: 14px;           /* フォントサイズ */
      width: 280px;              /* 横幅 */
      background-color: #ebf4ff; /* 薄いブルー背景 */
      color: #2d3748;            /* 文字色 */
    }

    /* ===== メインコンテンツエリア ===== */
    main {
      max-width: 860px;    /* 最大横幅 */
      margin: 32px auto;   /* 上下余白＋左右自動で中央揃え */
      padding: 0 16px;     /* 左右の余白（スマホ対応） */
    }

    /* ===== セクションカード（入力・出力エリアの白いボックス） ===== */
    .card {
      background-color: white;  /* 白背景 */
      border-radius: 10px;      /* 角丸 */
      padding: 24px;            /* 内側余白 */
      margin-bottom: 24px;      /* カード間の隙間 */
      box-shadow: 0 2px 8px rgba(0,0,0,0.08); /* 薄い影 */
    }

    /* ===== セクションタイトル ===== */
    .section-title {
      font-size: 15px;         /* フォントサイズ */
      font-weight: bold;       /* 太字 */
      color: #2b6cb0;          /* ブルー */
      margin-bottom: 16px;     /* 下余白 */
      padding-bottom: 8px;     /* 下内余白 */
      border-bottom: 2px solid #bee3f8; /* 薄いブルーの下線 */
    }
  </style>
</head>
<body>

  <!-- ===== ヘッダー：タイトルとAPIキー入力 ===== -->
  <header>
    <!-- アプリのタイトル -->
    <h1>🏗 AI要件定義システム</h1>
    <!-- APIキー入力ラベル -->
    <span id="api-key-label">Claude APIキー：</span>
    <!-- APIキー入力欄（セキュリティのためtype="password"にして見えないようにする） -->
    <input
      type="password"
      id="api-key-input"
      placeholder="sk-ant-api03-..."
      title="Claude APIキーを入力してください"
    >
  </header>

  <!-- ===== メインコンテンツ ===== -->
  <main>
    <!-- 入力エリアカード（後続タスクで中身を追加） -->
    <div class="card">
      <div class="section-title">📝 現場の状況・要望を入力</div>
      <!-- Task 2 で音声・テキスト入力を追加 -->
    </div>

    <!-- 出力エリアカード（後続タスクで中身を追加） -->
    <div class="card" id="output-card" style="display:none;">
      <div class="section-title">📄 生成された要件定義書</div>
      <!-- Task 5 で出力内容を追加 -->
    </div>
  </main>

  <script>
    // ===== JavaScriptの初期化処理 =====
    // DOMが読み込まれた後に実行する
    document.addEventListener('DOMContentLoaded', function() {
      // APIキー入力欄の要素を取得する
      var apiKeyInput = document.getElementById('api-key-input');

      // ページ読み込み時にlocalStorageからAPIキーを復元する（入力の手間を省く）
      var savedKey = localStorage.getItem('claude_api_key');
      if (savedKey) {
        apiKeyInput.value = savedKey; // 保存済みキーを復元
      }

      // APIキーが変更されたらlocalStorageに保存する
      apiKeyInput.addEventListener('change', function() {
        localStorage.setItem('claude_api_key', apiKeyInput.value);
      });
    });
  </script>

</body>
</html>
```

- [ ] **Step 2: ブラウザで開いて動作確認する**

`index.html` をブラウザで開く（ダブルクリックまたはドラッグ＆ドロップ）。

確認項目：
- ブルーのヘッダーが表示される
- タイトル「🏗 AI要件定義システム」が見える
- APIキー入力欄（パスワードマスク）が右上に表示される
- 「📝 現場の状況・要望を入力」カードが表示される
- コンソールにエラーが出ない（F12 → Consoleタブ）

---

### Task 2: テキスト入力エリアと生成ボタン

**Files:**
- Modify: `C:/Users/kawak/Documents/ai-requirements-system/index.html`

- [ ] **Step 1: `<style>` の末尾（`</style>` の直前）にCSSを追加する**

```css
    /* ===== テキスト入力エリア ===== */
    #input-textarea {
      width: 100%;            /* 横幅いっぱい */
      height: 160px;          /* 高さ */
      padding: 12px;          /* 内側余白 */
      border: 2px solid #bee3f8; /* 薄いブルー枠線 */
      border-radius: 8px;     /* 角丸 */
      font-size: 15px;        /* フォントサイズ（現場担当者が読みやすいサイズ） */
      font-family: inherit;   /* 親要素のフォントを引き継ぐ */
      resize: vertical;       /* 縦方向にだけリサイズ可能 */
      line-height: 1.6;       /* 行間を広めにして読みやすくする */
      color: #2d3748;         /* 文字色 */
    }

    /* ===== テキスト入力エリア：フォーカス時の見た目 ===== */
    #input-textarea:focus {
      outline: none;                /* デフォルトのアウトラインを消す */
      border-color: #2b6cb0;        /* ブルーに変える */
      box-shadow: 0 0 0 3px rgba(43,108,176,0.15); /* 薄いブルーのグロー */
    }

    /* ===== ボタン共通スタイル ===== */
    .btn {
      padding: 12px 24px;     /* 押しやすい大きさの内側余白 */
      border: none;           /* 枠線なし */
      border-radius: 8px;     /* 角丸 */
      font-size: 15px;        /* フォントサイズ */
      font-weight: bold;      /* 太字 */
      cursor: pointer;        /* カーソルをポインターに */
      transition: all 0.2s;  /* ホバー時にアニメーションをつける */
    }

    /* ===== 生成ボタン ===== */
    #generate-btn {
      background-color: #2b6cb0; /* ブルー背景 */
      color: white;              /* 白文字 */
      width: 100%;               /* 横幅いっぱい */
      margin-top: 16px;          /* 上余白 */
      font-size: 17px;           /* 少し大きめの文字 */
    }

    /* ===== 生成ボタン：ホバー時 ===== */
    #generate-btn:hover {
      background-color: #2c5282; /* 少し暗くする */
      transform: translateY(-1px); /* 少し浮き上がる */
    }

    /* ===== 生成ボタン：ローディング中（非活性状態） ===== */
    #generate-btn:disabled {
      background-color: #a0aec0; /* グレーに変える */
      cursor: not-allowed;       /* カーソルを禁止マークに */
      transform: none;           /* アニメーションなし */
    }

    /* ===== 文字数カウンター ===== */
    #char-count {
      text-align: right;   /* 右揃え */
      font-size: 12px;     /* 小さい文字 */
      color: #718096;      /* グレー */
      margin-top: 4px;     /* 上余白 */
    }
```

- [ ] **Step 2: 入力カードの `<!-- Task 2 で音声・テキスト入力を追加 -->` を以下に置き換える**

```html
      <!-- テキスト入力エリア：直接キーボードで入力できる -->
      <textarea
        id="input-textarea"
        placeholder="例：「現場の進捗管理をもっと楽にしたい。今は紙の日報を使っているけど、スマホで写真を撮って報告できるようにしたい。所長も現場に来なくても状況が分かるようにしたい。」"
      ></textarea>
      <!-- 文字数カウンター（入力量の目安） -->
      <div id="char-count">0 文字</div>

      <!-- ===== 音声入力ボタン（Task 3 で機能を追加）===== -->
      <div id="voice-area" style="margin-top:12px; display:flex; gap:12px; align-items:center;">
        <!-- 音声入力ボタン：Web Speech API非対応ブラウザでは非表示にする -->
        <button class="btn" id="voice-btn" style="background:#38a169;color:white;" title="ボタンを押している間、音声を録音します">
          🎤 音声入力（押している間）
        </button>
        <!-- 録音中のステータス表示 -->
        <span id="voice-status" style="font-size:14px; color:#718096;"></span>
      </div>

      <!-- 要件定義書を生成するボタン -->
      <button class="btn" id="generate-btn">
        ✨ 要件定義書を生成する
      </button>
```

- [ ] **Step 3: `<script>` の `DOMContentLoaded` の中（末尾の `});` の直前）にJSを追加する**

```javascript
      // テキスト入力エリアの要素を取得する
      var textarea = document.getElementById('input-textarea');
      // 文字数カウンターの要素を取得する
      var charCount = document.getElementById('char-count');
      // 生成ボタンの要素を取得する
      var generateBtn = document.getElementById('generate-btn');

      // テキストが入力されるたびに文字数を更新する
      textarea.addEventListener('input', function() {
        charCount.textContent = textarea.value.length + ' 文字';
      });

      // 生成ボタンをクリックしたときの処理（Task 4 で実装）
      generateBtn.addEventListener('click', function() {
        // Task 4 で Claude API 呼び出し処理を追加する
        alert('（開発中）APIを呼び出します');
      });
```

- [ ] **Step 4: ブラウザで開いて動作確認する**

確認項目：
- テキスト入力エリアが表示される
- 文字を入力すると右下の文字数カウンターが増える
- 「🎤 音声入力」ボタンが表示される（機能は次のタスク）
- 「✨ 要件定義書を生成する」ボタンが表示される
- 生成ボタンをクリックすると「（開発中）APIを呼び出します」アラートが出る

---

### Task 3: 音声入力機能（Web Speech API）

**Files:**
- Modify: `C:/Users/kawak/Documents/ai-requirements-system/index.html`

- [ ] **Step 1: `<style>` の末尾（`</style>` の直前）にCSSを追加する**

```css
    /* ===== 音声入力ボタン：録音中の状態 ===== */
    #voice-btn.recording {
      background-color: #e53e3e; /* 録音中は赤色に変える */
      animation: pulse 1s infinite; /* 点滅アニメーション */
    }

    /* ===== 録音中の点滅アニメーション定義 ===== */
    @keyframes pulse {
      0%   { opacity: 1; }    /* 完全表示 */
      50%  { opacity: 0.6; }  /* 半透明 */
      100% { opacity: 1; }    /* 完全表示に戻る */
    }
```

- [ ] **Step 2: `<script>` の `DOMContentLoaded` の中の末尾（`});` の直前）にJSを追加する**

```javascript
      // ===== 音声入力機能（Web Speech API）=====

      // 音声入力ボタンの要素を取得する
      var voiceBtn = document.getElementById('voice-btn');
      // 録音中ステータス表示の要素を取得する
      var voiceStatus = document.getElementById('voice-status');

      // Web Speech APIがブラウザで使えるか確認する
      // Chrome / Edge は対応、Firefox は非対応
      var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        // 非対応ブラウザの場合：音声ボタンを非表示にする
        document.getElementById('voice-area').style.display = 'none';
      } else {
        // 対応ブラウザの場合：音声認識オブジェクトを作成する
        var recognition = new SpeechRecognition();

        // 日本語で認識するように設定する
        recognition.lang = 'ja-JP';

        // 連続して認識し続けるモードにする（ボタンを離すまで継続）
        recognition.continuous = true;

        // 途中結果も取得するように設定する（リアルタイム表示のため）
        recognition.interimResults = true;

        // 音声認識中にテキストが取得できたときの処理
        recognition.onresult = function(event) {
          // 途中結果（まだ確定していない文字）を収集する
          var interimText = '';
          // 確定した文字を収集する
          var finalText = '';

          // 全ての認識結果をループして確定・途中を仕分ける
          for (var i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              // 確定した文字（確実に認識できた部分）
              finalText += event.results[i][0].transcript;
            } else {
              // 途中結果（まだ認識中の部分）
              interimText += event.results[i][0].transcript;
            }
          }

          // 確定した文字をテキストエリアに追記する
          if (finalText) {
            textarea.value += finalText;
            // 文字数カウンターを更新する
            charCount.textContent = textarea.value.length + ' 文字';
          }

          // 途中結果をステータス欄に表示する（リアルタイムフィードバック）
          if (interimText) {
            voiceStatus.textContent = '認識中：' + interimText;
          }
        };

        // 音声認識でエラーが発生したときの処理
        recognition.onerror = function(event) {
          // エラーの種類によってメッセージを出し分ける
          if (event.error === 'no-speech') {
            voiceStatus.textContent = '音声が検出されませんでした';
          } else if (event.error === 'not-allowed') {
            voiceStatus.textContent = 'マイクの使用が許可されていません';
          } else {
            voiceStatus.textContent = 'エラーが発生しました：' + event.error;
          }
        };

        // 音声認識が終了したときの処理（ボタンのスタイルをリセットする）
        recognition.onend = function() {
          // 録音中スタイルを削除する
          voiceBtn.classList.remove('recording');
          // ボタンのテキストを元に戻す
          voiceBtn.textContent = '🎤 音声入力（押している間）';
          // ステータスを「録音完了」に変える
          if (voiceStatus.textContent.startsWith('認識中')) {
            voiceStatus.textContent = '録音完了';
          }
        };

        // ===== 音声入力ボタンの「押している間だけ録音」を実装する =====

        // マウスボタンを押し下げたとき（録音開始）
        voiceBtn.addEventListener('mousedown', function() {
          voiceStatus.textContent = '録音中...';           // ステータスを「録音中」に変える
          voiceBtn.classList.add('recording');              // 赤い点滅スタイルを追加する
          voiceBtn.textContent = '🔴 録音中（離したら停止）'; // ボタンテキストを変える
          recognition.start();                             // 音声認識を開始する
        });

        // マウスボタンを離したとき（録音停止）
        voiceBtn.addEventListener('mouseup', function() {
          recognition.stop(); // 音声認識を停止する
        });

        // マウスがボタン外に出たとき（録音停止：押したまま外に出た場合の対処）
        voiceBtn.addEventListener('mouseleave', function() {
          recognition.stop(); // 音声認識を停止する
        });

        // タッチ操作：タッチ開始時（スマホ・タブレット対応）
        voiceBtn.addEventListener('touchstart', function(e) {
          e.preventDefault();                               // デフォルトのタッチ動作を防ぐ
          voiceStatus.textContent = '録音中...';
          voiceBtn.classList.add('recording');
          voiceBtn.textContent = '🔴 録音中（離したら停止）';
          recognition.start();
        });

        // タッチ操作：タッチ終了時（スマホ・タブレット対応）
        voiceBtn.addEventListener('touchend', function() {
          recognition.stop(); // 音声認識を停止する
        });
      }
```

- [ ] **Step 3: ブラウザ（Chrome推奨）で開いて動作確認する**

確認項目：
- 🎤 音声入力ボタンを押している間、赤く点滅して「🔴 録音中（離したら停止）」になる
- 話した内容がテキストエリアに追記される
- ボタンを離すと録音が止まり、ステータスが「録音完了」になる
- Firefoxで開いた場合は音声ボタンが非表示になり、エラーは出ない

---

### Task 4: Claude API呼び出し機能

**Files:**
- Modify: `C:/Users/kawak/Documents/ai-requirements-system/index.html`

- [ ] **Step 1: `<style>` の末尾（`</style>` の直前）にCSSを追加する**

```css
    /* ===== ローディングスピナー（API呼び出し中に表示） ===== */
    #loading-area {
      display: none;         /* 通常は非表示 */
      text-align: center;    /* 中央揃え */
      padding: 32px;         /* 余白 */
      color: #2b6cb0;        /* ブルー文字 */
      font-size: 16px;       /* フォントサイズ */
    }

    /* ===== くるくる回るスピナーのアニメーション ===== */
    .spinner {
      display: inline-block;  /* インラインブロック */
      width: 36px;            /* 幅 */
      height: 36px;           /* 高さ */
      border: 4px solid #bee3f8;         /* 薄いブルーの枠線 */
      border-top-color: #2b6cb0;         /* 上だけ濃いブルー（回転して見える） */
      border-radius: 50%;                /* 円形にする */
      animation: spin 0.8s linear infinite; /* 0.8秒で1回転 */
      margin-bottom: 12px;   /* 下余白 */
    }

    /* ===== スピナーの回転アニメーション定義 ===== */
    @keyframes spin {
      to { transform: rotate(360deg); } /* 360度回転 */
    }

    /* ===== エラーメッセージ表示エリア ===== */
    #error-area {
      display: none;              /* 通常は非表示 */
      background-color: #fff5f5;  /* 薄い赤背景 */
      border: 1px solid #feb2b2;  /* 赤枠線 */
      border-radius: 8px;         /* 角丸 */
      padding: 16px;              /* 内側余白 */
      color: #c53030;             /* 赤文字 */
      margin-top: 16px;           /* 上余白 */
      font-size: 14px;            /* フォントサイズ */
      line-height: 1.6;           /* 行間 */
    }
```

- [ ] **Step 2: 入力カードの生成ボタンの直後（`</div>` の直前）にHTMLを追加する**

```html
      <!-- ローディング表示（API呼び出し中に表示される） -->
      <div id="loading-area">
        <!-- くるくるスピナー -->
        <div class="spinner"></div>
        <div>Claude AIが要件定義書を生成しています...<br>しばらくお待ちください（10〜30秒程度）</div>
      </div>

      <!-- エラーメッセージ表示エリア -->
      <div id="error-area"></div>
```

- [ ] **Step 3: `generateBtn.addEventListener('click', ...)` 全体を以下に置き換える**

`alert('（開発中）APIを呼び出します');` の行を含むイベントリスナー全体を置き換える：

```javascript
      // 生成ボタンをクリックしたときの処理
      generateBtn.addEventListener('click', async function() {

        // ===== 入力チェック =====

        // APIキーが入力されているか確認する
        var apiKey = apiKeyInput.value.trim();
        if (!apiKey) {
          alert('APIキーを入力してください。\nヘッダーの「Claude APIキー」欄に入力してください。');
          apiKeyInput.focus(); // APIキー入力欄にカーソルを移動する
          return; // 処理を中断する
        }

        // テキストが入力されているか確認する
        var inputText = textarea.value.trim();
        if (!inputText) {
          alert('要件の内容を入力してください。\n音声入力またはテキスト入力で現場の状況を入力してください。');
          textarea.focus(); // テキストエリアにカーソルを移動する
          return; // 処理を中断する
        }

        // ===== UI の状態を「生成中」に変える =====

        // 生成ボタンを非活性にする（二重クリック防止）
        generateBtn.disabled = true;
        generateBtn.textContent = '⏳ 生成中...';

        // ローディング表示を見せる
        document.getElementById('loading-area').style.display = 'block';

        // エラーエリアを非表示にする（前回のエラーをクリアする）
        var errorArea = document.getElementById('error-area');
        errorArea.style.display = 'none';
        errorArea.textContent = '';

        // 出力カードをいったん非表示にする
        document.getElementById('output-card').style.display = 'none';

        try {
          // ===== Claude API にリクエストを送る =====

          // Claude API のエンドポイントURL
          var apiUrl = 'https://api.anthropic.com/v1/messages';

          // APIに送るリクエストの内容を作成する
          var requestBody = {
            // 使用するClaudeモデル（指定されたモデルを使う）
            model: 'claude-sonnet-4-20250514',

            // 最大生成トークン数（長い要件定義書でも出力できるよう多めに設定）
            max_tokens: 4000,

            // システムプロンプト：Claudeへの指示（出力形式を固定する）
            system: `あなたはITシステムの要件定義の専門家です。
現場担当者から聞いた曖昧な発話・要望をもとに、
エンジニアが開発を始められる精密な要件定義書をMarkdown形式で作成してください。

必ず以下の6セクションをすべて含めてください。セクション名は正確に記載してください：

## システム名
（提案するシステムの名称。わかりやすい日本語で）

## 目的・背景
（なぜこのシステムが必要か、現状の課題と解決したいこと）

## 機能要件
（システムが「何をするか」を箇条書きで具体的に記述。- で始める）

## 非機能要件
（性能・セキュリティ・使いやすさ・対応デバイスなど。- で始める）

## 用語定義
（このシステムで使う専門用語・業界用語の定義。- 用語：説明 の形式で）

## 備考・確認事項
（不明点、要確認事項、今後の検討事項。- で始める）

---

注意事項：
- 建設業・現場担当者が話す言葉から本質的な要件を読み取ってください
- 曖昧な表現は合理的に補完してください
- 箇条書きは具体的・実装可能な粒度で記述してください
- 日本語で出力してください`,

            // ユーザーからのメッセージ（入力されたテキストをそのまま渡す）
            messages: [
              {
                role: 'user',
                content: '以下の現場の状況・要望をもとに要件定義書を作成してください。\n\n' + inputText
              }
            ]
          };

          // fetch API を使って Claude API にPOSTリクエストを送る
          var response = await fetch(apiUrl, {
            method: 'POST', // HTTPメソッドはPOST
            headers: {
              'Content-Type': 'application/json',         // JSONデータを送ることを宣言
              'x-api-key': apiKey,                        // APIキーを認証ヘッダーに設定
              'anthropic-version': '2023-06-01',          // APIのバージョンを指定
              'anthropic-dangerous-direct-browser-calls': 'true' // ブラウザからの直接呼び出しを許可
            },
            body: JSON.stringify(requestBody) // リクエストボディをJSON文字列に変換
          });

          // レスポンスが正常でない場合（4xx/5xxエラー）の処理
          if (!response.ok) {
            var errorData = await response.json();
            // エラー内容を日本語で表示する
            var errorMsg = 'APIエラーが発生しました（HTTPステータス：' + response.status + '）\n';
            if (response.status === 401) {
              errorMsg += 'APIキーが無効です。正しいAPIキーを入力してください。';
            } else if (response.status === 429) {
              errorMsg += 'APIの利用制限に達しました。しばらく待ってから再試行してください。';
            } else if (response.status === 400) {
              errorMsg += 'リクエストの形式が不正です。入力内容を確認してください。';
            } else {
              errorMsg += (errorData.error && errorData.error.message) ? errorData.error.message : '不明なエラー';
            }
            throw new Error(errorMsg);
          }

          // レスポンスをJSONとして解析する
          var data = await response.json();

          // Claudeの返答テキストを取得する
          var markdownText = data.content[0].text;

          // 生成したMarkdownテキストをグローバル変数に保存する（コピーボタン用）
          window.generatedMarkdown = markdownText;

          // Task 5 で出力表示処理を実装するため、ここではカードを表示するだけ
          document.getElementById('output-card').style.display = 'block';

          // Task 5 で実装するレンダリング関数を呼び出す（プレースホルダー）
          if (typeof renderMarkdown === 'function') {
            renderMarkdown(markdownText);
          } else {
            // Task 5 実装前の仮表示（プレーンテキスト）
            document.getElementById('output-content').textContent = markdownText;
          }

          // 出力エリアまでスクロールする（見えやすいように）
          document.getElementById('output-card').scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
          // ===== エラーが発生した場合の処理 =====

          // エラーメッセージを赤いエリアに表示する
          errorArea.style.display = 'block';
          errorArea.innerHTML = '⚠️ ' + error.message.replace(/\n/g, '<br>');

        } finally {
          // ===== 処理完了後（成功・失敗どちらでも）UIを元に戻す =====

          // ローディング表示を非表示にする
          document.getElementById('loading-area').style.display = 'none';

          // 生成ボタンを再び活性化する
          generateBtn.disabled = false;
          generateBtn.textContent = '✨ 要件定義書を生成する';
        }
      });
```

- [ ] **Step 4: ブラウザで開いてUI動作を確認する**

APIを呼び出さずにUIだけ確認する：

- APIキーが空の状態で「✨ 要件定義書を生成する」を押す → アラートが出て止まる
- テキストが空の状態でAPIキーを入れてボタンを押す → アラートが出て止まる
- コンソールにエラーが出ないことを確認する（F12 → Console）

---

### Task 5: Markdownレンダリングと出力表示エリア

**Files:**
- Modify: `C:/Users/kawak/Documents/ai-requirements-system/index.html`

- [ ] **Step 1: `<style>` の末尾（`</style>` の直前）にCSSを追加する**

```css
    /* ===== 出力エリアのヘッダー（タイトルとコピーボタンを横並び）===== */
    #output-header {
      display: flex;           /* 横並び */
      justify-content: space-between; /* 左右に振り分ける */
      align-items: center;     /* 縦中央揃え */
      margin-bottom: 16px;     /* 下余白 */
      padding-bottom: 8px;     /* 下内余白 */
      border-bottom: 2px solid #bee3f8; /* 薄いブルー下線 */
    }

    /* ===== コピーボタン ===== */
    #copy-btn {
      background-color: #48bb78; /* グリーン */
      color: white;              /* 白文字 */
      padding: 8px 20px;         /* 内側余白 */
      border: none;              /* 枠線なし */
      border-radius: 6px;        /* 角丸 */
      font-size: 14px;           /* フォントサイズ */
      font-weight: bold;         /* 太字 */
      cursor: pointer;           /* ポインターカーソル */
      transition: background 0.2s; /* ホバーアニメーション */
    }

    /* ===== コピーボタン：ホバー時 ===== */
    #copy-btn:hover {
      background-color: #38a169; /* 少し暗いグリーン */
    }

    /* ===== コピー成功時のスタイル ===== */
    #copy-btn.copied {
      background-color: #2b6cb0; /* ブルーに変える */
    }

    /* ===== Markdownレンダリング結果の表示エリア ===== */
    #output-content {
      line-height: 1.8;   /* 読みやすい行間 */
      font-size: 15px;    /* フォントサイズ */
      color: #2d3748;     /* 文字色 */
    }

    /* ===== 見出し2（## ）のスタイル ===== */
    #output-content h2 {
      font-size: 18px;             /* フォントサイズ */
      font-weight: bold;           /* 太字 */
      color: #2b6cb0;              /* ブルー */
      margin: 24px 0 12px;         /* 上下余白 */
      padding-bottom: 6px;         /* 下内余白 */
      border-bottom: 2px solid #bee3f8; /* 薄いブルー下線 */
    }

    /* ===== 見出し3（### ）のスタイル ===== */
    #output-content h3 {
      font-size: 16px;     /* フォントサイズ */
      font-weight: bold;   /* 太字 */
      color: #2c5282;      /* 少し暗いブルー */
      margin: 16px 0 8px;  /* 上下余白 */
    }

    /* ===== 箇条書きリストのスタイル ===== */
    #output-content ul {
      padding-left: 24px;  /* 左インデント */
      margin: 8px 0;       /* 上下余白 */
    }

    /* ===== 箇条書き各項目のスタイル ===== */
    #output-content li {
      margin-bottom: 6px;  /* 項目間の余白 */
      line-height: 1.7;    /* 行間 */
    }

    /* ===== 太字（**テキスト**）のスタイル ===== */
    #output-content strong {
      color: #2d3748;      /* 文字色 */
      font-weight: bold;   /* 太字 */
    }

    /* ===== 区切り線（---）のスタイル ===== */
    #output-content hr {
      border: none;                       /* デフォルト枠なし */
      border-top: 1px solid #e2e8f0;      /* 薄いグレーの横線 */
      margin: 20px 0;                     /* 上下余白 */
    }

    /* ===== 段落のスタイル ===== */
    #output-content p {
      margin: 8px 0;  /* 上下余白 */
    }
```

- [ ] **Step 2: 出力カード（`id="output-card"`）の中身全体を以下に置き換える**

```html
    <!-- ===== 生成結果表示エリア ===== -->
    <div class="card" id="output-card" style="display:none;">
      <!-- 出力エリアのヘッダー（タイトルとコピーボタン） -->
      <div id="output-header">
        <!-- 出力エリアのタイトル -->
        <div class="section-title" style="margin-bottom:0; border-bottom:none; padding-bottom:0;">
          📄 生成された要件定義書
        </div>
        <!-- Markdownをクリップボードにコピーするボタン -->
        <button id="copy-btn" title="Markdown形式でクリップボードにコピーします">
          📋 Markdownをコピー
        </button>
      </div>
      <!-- Markdownをレンダリングして表示するエリア -->
      <div id="output-content"></div>
    </div>
```

- [ ] **Step 3: `<script>` の `DOMContentLoaded` の外（`</script>` の直前）にMarkdownパーサー関数を追加する**

`document.addEventListener('DOMContentLoaded', ...)` の `});` の後ろに追加する：

```javascript
    // ===== Markdownテキストを HTML に変換して表示する関数 =====
    // この関数は外部ライブラリを使わず、正規表現で自前実装しています
    function renderMarkdown(markdownText) {
      // 出力先の要素を取得する
      var outputContent = document.getElementById('output-content');

      // ===== Markdownを行ごとに処理してHTMLに変換する =====

      // 改行で分割して行の配列にする
      var lines = markdownText.split('\n');

      // 変換後のHTML文字列を入れる配列
      var htmlLines = [];

      // リスト（箇条書き）の開始・終了を管理するフラグ
      var inList = false;

      // 各行を順番に処理する
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        // --- 見出し2（## で始まる行）---
        if (line.startsWith('## ')) {
          if (inList) {
            htmlLines.push('</ul>'); // リストが開いていれば閉じる
            inList = false;
          }
          // ## を除いたテキストをh2タグで囲む
          htmlLines.push('<h2>' + escapeHtml(line.slice(3)) + '</h2>');
        }

        // --- 見出し3（### で始まる行）---
        else if (line.startsWith('### ')) {
          if (inList) {
            htmlLines.push('</ul>');
            inList = false;
          }
          // ### を除いたテキストをh3タグで囲む
          htmlLines.push('<h3>' + escapeHtml(line.slice(4)) + '</h3>');
        }

        // --- 箇条書き（- で始まる行）---
        else if (line.startsWith('- ') || line.startsWith('* ')) {
          if (!inList) {
            htmlLines.push('<ul>'); // リストをまだ開いていなければ開く
            inList = true;
          }
          // 「- 」を除いたテキストをliタグで囲む（太字も処理する）
          var itemText = line.slice(2);
          htmlLines.push('<li>' + applyInlineMarkdown(escapeHtml(itemText)) + '</li>');
        }

        // --- 区切り線（--- ）---
        else if (line.trim() === '---') {
          if (inList) {
            htmlLines.push('</ul>');
            inList = false;
          }
          htmlLines.push('<hr>');
        }

        // --- 空行 ---
        else if (line.trim() === '') {
          if (inList) {
            htmlLines.push('</ul>');
            inList = false;
          }
          htmlLines.push(''); // 空行はそのままスキップ
        }

        // --- 通常のテキスト行 ---
        else {
          if (inList) {
            htmlLines.push('</ul>');
            inList = false;
          }
          // 通常のテキストをpタグで囲む（太字も処理する）
          htmlLines.push('<p>' + applyInlineMarkdown(escapeHtml(line)) + '</p>');
        }
      }

      // リストが末尾まで閉じられていなければ閉じる
      if (inList) {
        htmlLines.push('</ul>');
      }

      // 生成したHTML文字列をまとめて出力エリアに表示する
      outputContent.innerHTML = htmlLines.join('\n');
    }

    // ===== インラインMarkdown（太字）を HTML に変換するヘルパー関数 =====
    function applyInlineMarkdown(text) {
      // **太字** を <strong>太字</strong> に変換する
      return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    }

    // ===== HTMLの特殊文字をエスケープするヘルパー関数（XSS対策）=====
    // ユーザー入力やAI出力をHTMLとして表示する際に必須の処理
    function escapeHtml(text) {
      return text
        .replace(/&/g, '&amp;')   // & → &amp;
        .replace(/</g, '&lt;')    // < → &lt;
        .replace(/>/g, '&gt;')    // > → &gt;
        .replace(/"/g, '&quot;')  // " → &quot;
        .replace(/'/g, '&#039;'); // ' → &#039;
    }
```

- [ ] **Step 4: ブラウザで動作を確認する（モック出力で）**

ブラウザコンソールで以下を実行して表示を確認する（F12 → Console）：

```javascript
window.generatedMarkdown = "## システム名\nテスト管理システム\n\n## 目的・背景\nテストのための仮データです。\n\n## 機能要件\n- 機能1：ログイン機能\n- 機能2：データ入力機能\n\n## 非機能要件\n- **レスポンス時間**：3秒以内\n\n## 用語定義\n- 現場担当者：システムを使う作業員\n\n## 備考・確認事項\n- 予算の確認が必要";
document.getElementById('output-card').style.display = 'block';
renderMarkdown(window.generatedMarkdown);
```

確認項目：
- `## システム名` が大きいブルーの見出しで表示される
- `- 機能1` が箇条書きで表示される
- `**レスポンス時間**` が太字で表示される
- HTMLタグが文字として表示されずに正しく装飾されている

---

### Task 6: コピーボタン機能

**Files:**
- Modify: `C:/Users/kawak/Documents/ai-requirements-system/index.html`

- [ ] **Step 1: `<script>` の `DOMContentLoaded` の中（末尾の `});` の直前）にJSを追加する**

```javascript
      // ===== コピーボタンの処理 =====

      // コピーボタンの要素を取得する
      var copyBtn = document.getElementById('copy-btn');

      // コピーボタンをクリックしたときの処理
      copyBtn.addEventListener('click', function() {

        // グローバル変数に保存されたMarkdownテキストを取得する
        var textToCopy = window.generatedMarkdown;

        // コピーするテキストがない場合は何もしない
        if (!textToCopy) {
          return;
        }

        // クリップボードAPIを使ってコピーする
        // navigator.clipboard は HTTPS または localhost でのみ動作する
        if (navigator.clipboard && window.isSecureContext) {
          // クリップボードAPIが使える場合（推奨）
          navigator.clipboard.writeText(textToCopy).then(function() {
            // コピー成功時のフィードバック
            copyBtn.textContent = '✅ コピーしました！';
            copyBtn.classList.add('copied');
            // 2秒後に元のテキストに戻す
            setTimeout(function() {
              copyBtn.textContent = '📋 Markdownをコピー';
              copyBtn.classList.remove('copied');
            }, 2000);
          }).catch(function() {
            // クリップボードAPIが失敗した場合はフォールバックを使う
            fallbackCopy(textToCopy);
          });
        } else {
          // HTTP環境など、クリップボードAPIが使えない場合のフォールバック
          fallbackCopy(textToCopy);
        }
      });

      // ===== クリップボードAPIが使えない環境でのコピー処理（フォールバック）=====
      function fallbackCopy(text) {
        // 一時的な非表示テキストエリアを作成する
        var tempTextarea = document.createElement('textarea');
        tempTextarea.value = text;
        // 画面外に配置して見えないようにする
        tempTextarea.style.position = 'fixed';
        tempTextarea.style.left = '-9999px';
        tempTextarea.style.top = '-9999px';
        document.body.appendChild(tempTextarea);
        tempTextarea.focus();
        tempTextarea.select(); // テキスト全体を選択する
        // 古いコピーコマンドを実行する
        var success = document.execCommand('copy');
        document.body.removeChild(tempTextarea); // 一時要素を削除する

        if (success) {
          // コピー成功フィードバック
          copyBtn.textContent = '✅ コピーしました！';
          copyBtn.classList.add('copied');
          setTimeout(function() {
            copyBtn.textContent = '📋 Markdownをコピー';
            copyBtn.classList.remove('copied');
          }, 2000);
        } else {
          // コピー失敗時のメッセージ
          alert('コピーに失敗しました。\n手動でテキストを選択してCtrl+Cでコピーしてください。');
        }
      }
```

- [ ] **Step 2: ブラウザで動作を確認する**

Task 5 のStep 4のコンソールコマンドを再実行してから：
- 「📋 Markdownをコピー」ボタンをクリックする
- ボタンが「✅ コピーしました！」に変わる
- 2秒後に元に戻る
- メモ帳や別のアプリに貼り付けて、Markdown形式でコピーされていることを確認する

---

### Task 7: エンドツーエンド動作確認とスタイル最終調整

**Files:**
- Modify: `C:/Users/kawak/Documents/ai-requirements-system/index.html`

- [ ] **Step 1: `<style>` の末尾（`</style>` の直前）にフッターCSSを追加する**

```css
    /* ===== フッター ===== */
    footer {
      text-align: center;   /* 中央揃え */
      padding: 24px;        /* 内側余白 */
      color: #a0aec0;       /* 薄いグレー文字 */
      font-size: 13px;      /* 小さいフォント */
    }
```

- [ ] **Step 2: `</main>` の直後にフッターを追加する**

```html
  <!-- フッター -->
  <footer>
    AI要件定義システム &copy; 2026 &nbsp;|&nbsp; Powered by Claude API
  </footer>
```

- [ ] **Step 3: 実際のClaude APIキーを使ってエンドツーエンドテストをする**

以下の手順でテストする：
1. ブラウザ（Chrome）で `index.html` を開く
2. APIキー欄に有効なClaude APIキーを入力する
3. テキストエリアに以下を入力する：

```
現場の日報管理をスマホでできるようにしたい。
今は紙に書いて事務所に持っていくのが面倒。
写真も一緒に送れるようにしたい。
所長が現場に来なくても進捗が分かるようにしたい。
```

4. 「✨ 要件定義書を生成する」をクリックする
5. ローディングスピナーが表示されることを確認する
6. 要件定義書が6セクション（システム名〜備考）で表示されることを確認する
7. 「📋 Markdownをコピー」でコピーして内容を確認する

- [ ] **Step 4: ページを再読み込みしてAPIキーが復元されることを確認する**

- F5（リロード）後、APIキー欄に前回入力したキーが自動入力されていることを確認する
- これはlocalStorageへの保存が機能している証拠

- [ ] **Step 5: 音声入力のエンドツーエンドテストをする（Chrome推奨）**

1. 🎤 音声入力ボタンを押す → マイクの許可ダイアログが出る
2. 許可する
3. 話す：「現場の安全管理をアプリでやりたい」
4. ボタンを離す
5. テキストエリアに話した内容が追記されることを確認する

- [ ] **Step 6: `index.html` を `C:/Users/kawak/Documents/ai-requirements-system/` に保存して完了とする**

完成した `index.html` が以下の場所にあることを確認する：
`C:/Users/kawak/Documents/ai-requirements-system/index.html`
