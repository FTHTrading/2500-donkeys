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

/**
 * Split text into chunks of at most maxLen characters,
 * breaking on sentence boundaries (. ! ? followed by space/newline).
 */
function chunkText(text, maxLen = 4000) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    // Find last sentence-ending punctuation within maxLen
    let cut = -1;
    for (let i = maxLen; i > maxLen * 0.5; i--) {
      if ('.!?'.includes(remaining[i - 1]) && (i === remaining.length || /\s/.test(remaining[i]))) {
        cut = i;
        break;
      }
    }
    // Fallback: break on last newline
    if (cut === -1) {
      const nl = remaining.lastIndexOf('\n', maxLen);
      cut = nl > maxLen * 0.3 ? nl + 1 : maxLen;
    }
    chunks.push(remaining.substring(0, cut));
    remaining = remaining.substring(cut).trimStart();
  }
  return chunks;
}

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

  const fullText = text.trim();
  const chunks = chunkText(fullText, 4000);

  // Generate TTS audio for each chunk (sequentially to preserve order)
  const audioBuffers = [];
  for (const chunk of chunks) {
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
          input: chunk,
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

    audioBuffers.push(await ttsResponse.arrayBuffer());
  }

  // Concatenate all MP3 buffers into a single response
  const totalLen = audioBuffers.reduce((sum, b) => sum + b.byteLength, 0);
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  for (const buf of audioBuffers) {
    combined.set(new Uint8Array(buf), offset);
    offset += buf.byteLength;
  }

  return new Response(combined.buffer, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
