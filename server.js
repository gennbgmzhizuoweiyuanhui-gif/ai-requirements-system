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
    // provider フィールドを除いた Claude 用ボディを組み立てる
    var claudeBody = {
      model:      parsed.model      || 'claude-sonnet-4-20250514',
      max_tokens: parsed.max_tokens || 4000,
      system:     parsed.system,
      messages:   parsed.messages
    };
    var bodyBuffer = Buffer.from(JSON.stringify(claudeBody)); // Content-Lengthを正確に計算するためBufferに変換
    var options = {
      hostname: 'api.anthropic.com',      // Anthropic APIのホスト名
      path:     '/v1/messages',            // メッセージ生成エンドポイント
      method:   'POST',                    // HTTPメソッド
      headers: {
        'Content-Type':      'application/json', // JSONを送ることを宣言
        'x-api-key':         apiKey,              // ブラウザから受け取ったAPIキーをそのまま転送
        'anthropic-version': '2023-06-01',        // APIバージョンを指定
        'Content-Length':    bodyBuffer.length    // ボディのバイト数を正確に指定
        // ※ anthropic-dangerous-direct-browser-calls は不要（サーバーからの呼び出しなので）
      }
    };

    // ===== Anthropic API へリクエストを送信する =====
    var proxyReq = https.request(options, function(proxyRes) {
      // Anthropic API からのレスポンスステータスとJSONヘッダーをそのままブラウザへ返す
      res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
      // レスポンスボディをそのままパイプしてブラウザへ流す
      proxyRes.pipe(res);
    });

    // ===== Anthropic API への接続エラー処理（ネット切断など）=====
    proxyReq.on('error', function(err) {
      console.error('Anthropic API への接続エラー:', err.message);
      // まだレスポンスを送っていない場合のみエラーを返す
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Anthropic API への接続に失敗しました: ' + err.message }));
      }
    });

    // ===== ブラウザから受け取ったリクエストボディを Anthropic API へ転送する =====
    proxyReq.write(bodyBuffer);
    proxyReq.end();
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
