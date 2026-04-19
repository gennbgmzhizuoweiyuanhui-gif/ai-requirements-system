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

    // ===== Anthropic API へのリクエスト設定 =====
    var bodyBuffer = Buffer.from(body); // Content-Lengthを正確に計算するためBufferに変換
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
