// ============================================================
// AI要件定義システム - Vercel Serverless Function
// /api/claude エンドポイント（Claude・Gemini 両対応プロキシ）
// ============================================================

export default async function handler(req, res) {

  // ===== CORS ヘッダー（Vercel でも念のため付与）=====
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // プリフライトリクエスト
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ===== APIキー確認（x-api-key ヘッダーから取得）=====
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(400).json({ error: 'x-api-key header is required' });
  }

  // Vercel はリクエストボディを自動でパースする
  const { provider, system, messages } = req.body;

  // ===== デバッグログ =====
  console.log(`[${new Date().toISOString()}] provider=${provider} system_length=${(system || '').length} user_length=${(messages?.[0]?.content || '').length}`);

  // ===== Gemini API へのルーティング =====
  if (provider === 'gemini') {
    // system プロンプトとユーザーメッセージを結合して Gemini 形式に変換する
    const systemText = system || '';
    const userText   = messages?.[0]?.content || '';
    const fullText   = systemText ? `${systemText}\n\n${userText}` : userText;

    const geminiBody = {
      contents: [{ role: 'user', parts: [{ text: fullText }] }]
    };

    let geminiRes;
    try {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(geminiBody)
        }
      );
    } catch (err) {
      console.error('[Gemini] 接続エラー:', err.message);
      return res.status(502).json({ error: 'Gemini APIへの接続に失敗しました: ' + err.message });
    }

    const geminiData = await geminiRes.text();
    console.log('[Gemini] レスポンスステータス:', geminiRes.status);

    if (!geminiRes.ok) {
      console.error('[Gemini] エラーレスポンス:', geminiData);
      return res.status(geminiRes.status).send(geminiData);
    }

    // 正常レスポンスを Claude 形式（{content:[{text:"..."}]}）に正規化して返す
    try {
      const geminiJson = JSON.parse(geminiData);
      const text       = geminiJson.candidates[0].content.parts[0].text;
      return res.status(200).json({ content: [{ type: 'text', text }] });
    } catch (err) {
      console.error('[Gemini] レスポンス解析エラー:', err.message);
      return res.status(502).json({ error: 'Gemini APIのレスポンス解析に失敗しました: ' + err.message });
    }
  }

  // ===== Claude（Anthropic）API へのルーティング =====
  // Anthropic API に必要な 4 フィールドのみ明示的に組み立てる
  const anthropicBody = {
    model:      'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system:     system || '',
    messages
  };

  console.log('[Claude] 送信ボディ:', JSON.stringify(anthropicBody).slice(0, 200));

  let anthropicRes;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(anthropicBody)
    });
  } catch (err) {
    console.error('[Claude] 接続エラー:', err.message);
    return res.status(502).json({ error: 'Anthropic APIへの接続に失敗しました: ' + err.message });
  }

  const anthropicData = await anthropicRes.text();
  console.log('[Claude] レスポンスステータス:', anthropicRes.status);

  if (!anthropicRes.ok) {
    console.error('[Claude] エラーレスポンス:', anthropicData);
  }

  // レスポンスをそのままブラウザへ返す（正常・エラー問わず）
  res.setHeader('Content-Type', 'application/json');
  return res.status(anthropicRes.status).send(anthropicData);
}
