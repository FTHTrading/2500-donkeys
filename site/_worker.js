/**
 * Cloudflare Pages Advanced Mode Worker — donkeys.xxxiii.io
 *
 * Routes:
 *   POST /api/tts  → OpenAI TTS proxy (requires OPENAI_API_KEY env var)
 *   *              → Static asset passthrough via env.ASSETS
 *
 * Set OPENAI_API_KEY in Cloudflare Pages → Settings → Environment Variables
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── /api/tts ─────────────────────────────────────────────────
    if (url.pathname === '/api/tts') {
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      }
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
      }
      return handleTTS(request, env);
    }

    // ── Everything else: static assets ───────────────────────────
    return env.ASSETS.fetch(request);
  },
};

async function handleTTS(request, env) {
  let text;
  try {
    text = await request.text();
  } catch (_) {
    return new Response('Cannot read request body', { status: 400 });
  }

  if (!text || text.trim().length === 0) {
    return new Response('Empty text', { status: 400 });
  }

  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const inputText = text.trim().substring(0, 4000);

  let ttsResponse;
  try {
    ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: 'onyx',
        input: inputText,
        response_format: 'mp3',
        speed: 0.95,
      }),
    });
  } catch (err) {
    return new Response('Failed to reach OpenAI API', { status: 502 });
  }

  if (!ttsResponse.ok) {
    const msg = await ttsResponse.text().catch(() => '');
    return new Response(`OpenAI error ${ttsResponse.status}: ${msg}`, { status: 502 });
  }

  const audioBuffer = await ttsResponse.arrayBuffer();

  return new Response(audioBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
