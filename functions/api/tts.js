/**
 * Cloudflare Pages Function: /api/tts
 * POST /api/tts — body: plain text (up to 4000 chars)
 * Returns: audio/mpeg stream from OpenAI TTS API
 *
 * Environment variable required:
 *   OPENAI_API_KEY — set in Cloudflare Pages → Settings → Environment Variables
 */

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS preflight (belt and suspenders)
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Read the text from request body
  let text;
  try {
    text = await request.text();
  } catch (_) {
    return new Response('Failed to read request body', { status: 400 });
  }

  if (!text || text.trim().length === 0) {
    return new Response('Empty text', { status: 400 });
  }

  // Clamp to OpenAI TTS max (4096 chars)
  const inputText = text.trim().substring(0, 4000);

  // API key from environment
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response('OpenAI API key not configured', { status: 500 });
  }

  // Call OpenAI TTS API
  let ttsResponse;
  try {
    ttsResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',          // tts-1 for speed, tts-1-hd for quality
        voice: 'onyx',           // onyx: deep, authoritative — best for narrative
        input: inputText,
        response_format: 'mp3',
        speed: 0.95,             // slightly slower than default for clarity
      }),
    });
  } catch (err) {
    console.error('OpenAI TTS fetch error:', err);
    return new Response('Failed to reach OpenAI API', { status: 502 });
  }

  if (!ttsResponse.ok) {
    const errText = await ttsResponse.text().catch(() => '(no body)');
    console.error('OpenAI TTS error:', ttsResponse.status, errText);
    return new Response(`OpenAI TTS error: ${ttsResponse.status}`, { status: 502 });
  }

  // Return the audio stream directly to the client
  const audioBuffer = await ttsResponse.arrayBuffer();

  return new Response(audioBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600, immutable', // cache 1hr — same text = same audio
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Handle OPTIONS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
