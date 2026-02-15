/**
 * Generate story-accurate chapter images for read.html
 * Uses Cloudflare Workers AI (Stable Diffusion XL)
 * Each image maps to one story arc — 9 total
 */

const fs = require('fs');
const path = require('path');

const ACCOUNT_ID = '07bcc4a189ef176261b818409c95891f';
const API_TOKEN = 't--rc22l3cWuwFqgBaOADkWz_9gDbctisRGShNMB';
const MODEL = '@cf/stabilityai/stable-diffusion-xl-base-1.0';

const STYLE_PREFIX = 'Cinematic illustration, dramatic lighting, dark moody atmosphere, high contrast, film noir style, photorealistic, 8k resolution, ';

const chapters = [
  {
    id: 'ch-00-genesis',
    alt: 'Genesis Hash',
    prompt: STYLE_PREFIX + 'A lone figure in a dark suit standing at a crossroads in the African desert at dawn, golden light on the horizon, dust swirling, a single donkey loaded with a leather satchel stands behind him, the beginning of a journey, wide establishing shot, muted earth tones and gold accents'
  },
  {
    id: 'ch-01-parking-lot',
    alt: 'The Parking Lots',
    prompt: STYLE_PREFIX + 'Two men in expensive dark suits standing beside a black SUV in an empty parking lot at night, exchanging documents under a single overhead lamp, briefcase on the car hood, shadows stretching long, yellow-orange sodium light, tense secretive mood, one man is Black African the other is Middle Eastern'
  },
  {
    id: 'ch-02-paper',
    alt: 'The Paper',
    prompt: STYLE_PREFIX + 'Close up dramatic shot of official-looking documents and certificates spread on a mahogany desk, golden seal stamps, a fountain pen, stacks of legal papers, an IMF letterhead visible, warm amber desk lamp glow, shallow depth of field, bureaucratic elegance'
  },
  {
    id: 'ch-03-whatsapp',
    alt: 'The WhatsApp Mutation',
    prompt: STYLE_PREFIX + 'Multiple smartphone screens showing WhatsApp chat messages glowing in a dark room, green chat bubbles with forwarded message labels, hands of different people holding phones in Lagos Dubai and Zurich simultaneously, split screen effect, blue glow of screens in darkness, the message chain spreading like a virus'
  },
  {
    id: 'ch-04-donkeys',
    alt: 'The Donkeys',
    prompt: STYLE_PREFIX + 'A long caravan of donkeys walking through a narrow desert canyon, each donkey carrying heavy leather saddlebags stuffed with gold bars, golden bars glinting in sunlight, 2500 donkeys stretching into the distance, dust clouds rising, a green corridor of vegetation on either side, epic scale wide shot, warm golden hour light'
  },
  {
    id: 'ch-05-procession',
    alt: 'The Procession',
    prompt: STYLE_PREFIX + 'A massive procession of donkeys loaded with gold-filled saddlebags crossing vast African desert plains, some donkeys have fallen behind exhausted, abandoned saddlebags and gold bars scattered in the sand, vultures circling overhead, a WeWork building visible incongruously on the horizon, attrition and loss, bandit silhouettes on distant ridgeline'
  },
  {
    id: 'ch-06-humanitarian',
    alt: 'The Humanitarian Settlement',
    prompt: STYLE_PREFIX + 'A humanitarian aid settlement camp in the African desert, white UN-style tents in rows, but beside them incongruously parked are luxury vehicles and a pallet of gold bars being unloaded from donkey saddlebags by workers, NGO flags flying, a suited businessman shaking hands with an aid worker, ESG theater, the hypocrisy of good intentions'
  },
  {
    id: 'ch-07-silence',
    alt: 'The Silence',
    prompt: STYLE_PREFIX + 'A solitary figure standing in an empty woodland clearing, dead silence, abandoned gold saddlebags from donkeys scattered around overgrown with moss, a summit meeting table with empty chairs in the background, nature reclaiming the evidence, fog and mist, winter bare trees, melancholy end of an era, everything stopped'
  },
  {
    id: 'ch-ep-genesis-remains',
    alt: 'The Genesis Remains',
    prompt: STYLE_PREFIX + 'A single donkey standing stoically in the desert at sunset, wearing ornate leather saddlebags with gold bars visible, the last of 2500, looking directly at the viewer with dignified calm, ancient ruins in the background, the chain is intact the provenance holds, golden light illuminating the scene, epic final shot, hopeful yet ambiguous ending'
  }
];

async function generateImage(chapter) {
  console.log(`Generating: ${chapter.id} (${chapter.alt})...`);
  
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: chapter.prompt,
      num_steps: 20,
      width: 1024,
      height: 768
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  
  // Save to images/chapters-new/
  const outDir = path.join(__dirname, 'images', 'chapters-new');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  const outPath = path.join(outDir, `${chapter.id}.png`);
  fs.writeFileSync(outPath, buffer);
  
  const kb = (buffer.length / 1024).toFixed(1);
  console.log(`  -> ${outPath} (${kb} KB)`);
  
  return { id: chapter.id, path: outPath, size: buffer.length };
}

async function main() {
  console.log('=== Generating Story-Accurate Chapter Images ===\n');
  console.log(`Style: Cinematic, dark moody, photorealistic`);
  console.log(`Model: ${MODEL}`);
  console.log(`Chapters: ${chapters.length}\n`);
  
  const results = [];
  
  for (const ch of chapters) {
    try {
      const result = await generateImage(ch);
      results.push(result);
      // Rate limit pause
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
    }
  }
  
  console.log('\n=== Summary ===');
  const totalKB = results.reduce((s, r) => s + r.size, 0) / 1024;
  console.log(`Generated: ${results.length}/${chapters.length}`);
  console.log(`Total size: ${totalKB.toFixed(1)} KB`);
  
  // Write manifest
  const manifest = chapters.map(ch => ({
    id: ch.id,
    alt: ch.alt,
    file: `${ch.id}.png`,
    prompt: ch.prompt.replace(STYLE_PREFIX, '[STYLE] ')
  }));
  fs.writeFileSync(
    path.join(__dirname, 'images', 'chapters-new', 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('Manifest written.');
}

main().catch(console.error);
