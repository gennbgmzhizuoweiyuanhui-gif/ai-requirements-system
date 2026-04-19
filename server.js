// ============================================================
// AI要件定義システム - ローカルプロキシサーバー
// ブラウザ → localhost:3001 → Anthropic API という中継役
// Node.js 標準モジュールのみ使用（npm install 不要）
// 起動方法: node server.js
// ============================================================

// Node.js 標準モジュールを読み込む
var http  = require('http'); // ブラウザからのリクエストを受け付けるHTTPサーバー
var https = require('https'); // Anthropic APIへのHTTPSリクエストを送るモジュール

// プロキシサーバーが待ち受けるポート番号
var PORT = 3001;

// HTTPサーバーを作成する
var server = http.createServer(function(req, res) {

  // ===== CORS ヘッダーを全レスポンスに付与 =====
  // ブラウザの同一オリジンポリシーを緩和し、index.htmlからのアクセスを許可する
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // ===== プリフライトリクエスト（OPTIONSメソッド）への応答 =====
  // ブラウザはPOSTの前にOPTIONSで通信可能か確認してくる
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // ===== /api/claude へのPOSTリクエストのみ処理する =====
  if (req.method !== 'POST' || req.url !== '/api/claude') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // ===== APIキーの確認 =====
  // ブラウザのindex.htmlがx-api-keyヘッダーにAPIキーを入れて送ってくる
  var apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'x-api-key header is required' }));
    return;
  }

  // ===== リクエストボディ（JSON文字列）を受け取る =====
  var body = '';
  req.on('data', function(chunk) {
    body += chunk; // データが届くたびに連結する
  });

  req.on('end', function() {
    // ボディが空の場合はエラーを返す
    if (!body) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Request body is required' }));
      return;
    }

    // ===== リクエストボディをJSONとして解析してプロバイダーを判定する =====
    var parsed;
    try {
      parsed = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Request body must be valid JSON' }));
      return;
    }

    var provider = parsed.provider || 'claude'; // 'claude' または 'gemini'

    // ===== デバッグ：リクエスト内容をコンソールに出力する =====
    console.log('[' + new Date().toISOString() + '] provider=' + provider +
      ' model=' + parsed.model +
      ' max_tokens=' + parsed.max_tokens +
      ' system_length=' + (parsed.system || '').length +
      ' user_length=' + ((parsed.messages && parsed.messages[0] && parsed.messages[0].content) || '').length);

    // ===== Gemini API へのルーティング =====
    if (provider === 'gemini') {
      // system プロンプトとユーザーメッセージを結合して Gemini 形式に変換する
      var systemText = parsed.system || '';
      var userText   = (parsed.messages && parsed.messages[0] && parsed.messages[0].content) || '';
      var fullText   = systemText ? systemText + '\n\n' + userText : userText;

      var geminiBody       = JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: fullText }] }]
      });
      var geminiBodyBuffer = Buffer.from(geminiBody);

      var geminiOptions = {
        hostname: 'generativelanguage.googleapis.com',
        path:     '/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey,
        method:   'POST',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': geminiBodyBuffer.length
        }
      };

      var geminiReq = https.request(geminiOptions, function(geminiRes) {
        var geminiData = '';
        geminiRes.on('data', function(chunk) { geminiData += chunk; });
        geminiRes.on('end', function() {
          // Gemini エラーレスポンス（4xx/5xx）はそのままブラウザへ返す
          if (geminiRes.statusCode !== 200) {
            res.writeHead(geminiRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(geminiData);
            return;
          }
          // 正常レスポンスを Claude 形式（{content:[{text:"..."}]}）に正規化して返す
          try {
            var geminiJson = JSON.parse(geminiData);
            var text       = geminiJson.candidates[0].content.parts[0].text;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ content: [{ type: 'text', text: text }] }));
          } catch (e) {
            console.error('Gemini レスポンス解析エラー:', e.message);
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Gemini APIのレスポンス解析に失敗しました: ' + e.message }));
          }
        });
      });

      geminiReq.on('error', function(err) {
        console.error('Gemini API への接続エラー:', err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Gemini API への接続に失敗しました: ' + err.message }));
        }
      });

      geminiReq.write(geminiBodyBuffer);
      geminiReq.end();
      return; // ここで処理を終了する
    }

    // ===== Claude（Anthropic）API へのルーティング =====
    // ユーザー指示に従い、Anthropicへ送るフィールドを厳密に4つだけ取り出して構築する。
    // parsed（受信ボディ）から provider / その他の内部フィールドは一切含めない。
    var anthropicBody = {
      model:      'claude-sonnet-4-20250514', // 使用モデルを固定する
      max_tokens: 4096,                        // 最大生成トークン数
      system:     parsed.system   || '',       // システムプロンプト（未指定時は空文字）
      messages:   parsed.messages              // ユーザーメッセージ配列
    };

    // デバッグ：Anthropicへ送信するボディの先頭200文字をログ出力する
    console.log('[Claude] 送信ボディ:', JSON.stringify(anthropicBody).slice(0, 200));

    var anthropicBodyBuffer = Buffer.from(JSON.stringify(anthropicBody));

    var anthropicOptions = {
      hostname: 'api.anthropic.com',
      path:     '/v1/messages',
      method:   'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,           // ヘッダーから取得したAPIキー（req.body経由は使わない）
        'anthropic-version': '2023-06-01',
        'Content-Length':    anthropicBodyBuffer.length
      }
    };

    var anthropicReq = https.request(anthropicOptions, function(anthropicRes) {
      console.log('[Claude] レスポンスステータス:', anthropicRes.statusCode);
      // エラーレスポンスはボディを収集してログ出力してからブラウザへ返す
      if (anthropicRes.statusCode !== 200) {
        var errBody = '';
        anthropicRes.on('data', function(c) { errBody += c; });
        anthropicRes.on('end', function() {
          console.error('[Claude] エラーレスポンス:', errBody);
          res.writeHead(anthropicRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(errBody);
        });
        return;
      }
      // 正常レスポンスはそのままブラウザへパイプする
      res.writeHead(anthropicRes.statusCode, { 'Content-Type': 'application/json' });
      anthropicRes.pipe(res);
    });

    anthropicReq.on('error', function(err) {
      console.error('[Claude] 接続エラー:', err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Anthropic APIへの接続に失敗しました: ' + err.message }));
      }
    });

    anthropicReq.write(anthropicBodyBuffer);
    anthropicReq.end();
  });

  // ===== ブラウザからのリクエスト受信エラー処理 =====
  req.on('error', function(err) {
    console.error('リクエスト受信エラー:', err.message);
  });
});

// ===== サーバーを起動する =====
server.listen(PORT, function() {
  console.log('========================================');
  console.log('AI要件定義システム プロキシサーバー起動');
  console.log('URL: http://localhost:' + PORT);
  console.log('停止するには Ctrl+C を押してください');
  console.log('========================================');
});
