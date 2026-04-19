// ============================================================
// AI要件定義システム - ローカルプロキシサーバー
// ブラウザ → localhost:3001 → Anthropic API という中継役
// Node.js 標準モジュールのみ使用（npm install 不要）
// 起動方法: node server.js
// ============================================================

// Node.js 標準モジュールを読み込む
var http         = require('http');         // ブラウザからのリクエストを受け付けるHTTPサーバー
var https        = require('https');        // Anthropic APIへのHTTPSリクエストを送るモジュール
var path         = require('path');         // ファイルパス操作
var fs           = require('fs');           // ファイル読み込み（静的ファイル配信用）
var childProcess = require('child_process'); // ブラウザ自動起動用

// プロキシサーバーが最初に試みるポート番号
var BASE_PORT = 3001;

// ===== EXE化対応：静的ファイルの基準ディレクトリを決定する =====
// pkg でビルドした EXE として実行中は process.pkg が truthy になる。
// その場合、EXE ファイルと同じディレクトリ（process.execPath）を基準にする。
// 通常の node 実行時は server.js と同じディレクトリ（__dirname）を使う。
var basePath = process.pkg ? path.dirname(process.execPath) : __dirname;

// 拡張子ごとの Content-Type マッピング
var MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.js':   'application/javascript',
  '.css':  'text/css'
};

// ===== 静的ファイルをブラウザへ返すヘルパー =====
function serveStaticFile(res, filePath) {
  var ext         = path.extname(filePath).toLowerCase();
  var contentType = MIME_TYPES[ext] || 'application/octet-stream';
  fs.readFile(filePath, function(err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found: ' + path.basename(filePath));
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

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

  // ===== 静的ファイルの配信（GETリクエスト）=====
  if (req.method === 'GET') {
    var url = req.url.split('?')[0]; // クエリ文字列を除去する
    if (url === '/' || url === '/index.html') {
      serveStaticFile(res, path.join(basePath, 'index.html'));
    } else if (url === '/icon.png') {
      serveStaticFile(res, path.join(basePath, 'icon.png'));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    }
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

// ===== 空きポートを探してサーバーを起動する =====
// 指定ポートが使用中なら次のポートを試す（最大100ポートまで）
server.on('error', function(err) {
  if (err.code === 'EADDRINUSE') {
    var usedPort = server.address ? server.address().port : '?';
    // まだ listen していない場合は err.port から取れる
    var tryPort = (err.port || usedPort || BASE_PORT) + 1;
    if (tryPort > BASE_PORT + 99) {
      console.error('空きポートが見つかりませんでした（' + BASE_PORT + '〜' + (BASE_PORT + 99) + '）');
      process.exit(1);
    }
    console.log('ポート ' + (tryPort - 1) + ' は使用中です。ポート ' + tryPort + ' を試します...');
    server.listen(tryPort);
  } else {
    console.error('サーバー起動エラー:', err.message);
    process.exit(1);
  }
});

server.on('listening', function() {
  var port = server.address().port;
  var url  = 'http://localhost:' + port;
  console.log('========================================');
  console.log('AI要件定義システム プロキシサーバー起動');
  console.log('URL: ' + url);
  console.log('停止するには Ctrl+C を押してください');
  console.log('========================================');

  // ブラウザを自動で開く（Windows の start コマンドを使用）
  childProcess.exec('start ' + url, function(err) {
    if (err) {
      console.log('ブラウザの自動起動に失敗しました。手動で ' + url + ' を開いてください。');
    }
  });
});

server.listen(BASE_PORT);
