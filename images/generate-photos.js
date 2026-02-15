#!/usr/bin/env node
/**
 * Generate gallery photos using Cloudflare Workers AI
 * Model: @cf/stabilityai/stable-diffusion-xl-base-1.0
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ACCOUNT_ID = '07bcc4a189ef176261b818409c95891f';
const API_TOKEN = 't--rc22l3cWuwFqgBaOADkWz_9gDbctisRGShNMB';

const STYLE_PREFIX = 'Cinematic photograph, dramatic lighting, film grain, high contrast, moody atmosphere, editorial photography style';

const photos = [
  {
    file: 'procession-hero.jpg',
    prompt: `${STYLE_PREFIX}. A vast Sahelian desert landscape at golden hour. A long caravan of donkeys carrying heavy saddlebags walks along a dusty trail through sand dunes. The light is warm and cinematic, casting long shadows. Wide 16:9 composition.`,
    width: 1024,
    height: 576
  },
  {
    file: 'procession-caravan.jpg',
    prompt: `${STYLE_PREFIX}. A long line of donkeys carrying gold bars wrapped in cloth through golden sand dunes, wide angle shot from elevated position. Dust trails behind them. Sahel landscape, late afternoon light.`,
    width: 1024,
    height: 640
  },
  {
    file: 'procession-closeup.jpg',
    prompt: `${STYLE_PREFIX}. Close-up of a lead donkey with leather saddlebags bulging with heavy cargo, desert horizon behind. Golden hour light on the donkey's face. Shallow depth of field. Documentary photography style.`,
    width: 1024,
    height: 640
  },
  {
    file: 'deal-parking-lot.jpg',
    prompt: `${STYLE_PREFIX}. Two men in dark suits standing in an empty parking lot reviewing documents. Urban West African setting. Concrete and cars in background. Shot from behind, faces not visible. Noir style, grainy.`,
    width: 768,
    height: 1024
  },
  {
    file: 'deal-handoff.jpg',
    prompt: `${STYLE_PREFIX}. Two suited men exchanging manila envelope beside a black SUV in a dimly lit parking area. Only hands and torsos visible. Film noir aesthetic, high contrast shadows. Grainy documentary style.`,
    width: 768,
    height: 1024
  },
  {
    file: 'paper-whatsapp.jpg',
    prompt: `${STYLE_PREFIX}. Multiple smartphone screens on a dark table showing green messaging app interfaces with forwarded messages. Blue light from screens in dark room. Overhead shot. Technology surveillance aesthetic.`,
    width: 1024,
    height: 640
  },
  {
    file: 'paper-phones.jpg',
    prompt: `${STYLE_PREFIX}. A single smartphone screen glowing in darkness showing a text message at 9:17 AM. The phone lies on crumpled papers on a desk. Dramatic side lighting. Documentary close-up.`,
    width: 1024,
    height: 640
  },
  {
    file: 'gold-pyramid.jpg',
    prompt: `${STYLE_PREFIX}. A pyramid stack of gold bars gleaming in darkness with a single spotlight. Rich warm golden tones against pure black background. Luxury still life photography. Square composition.`,
    width: 1024,
    height: 1024
  },
  {
    file: 'gold-bars-desk.jpg',
    prompt: `${STYLE_PREFIX}. A single gold bar sitting beside an open laptop and calculator on a wooden desk. Office setting, harsh fluorescent overhead light. The gold bar looks out of place. Documentary style.`,
    width: 1024,
    height: 1024
  },
  {
    file: 'gold-bags-desert.jpg',
    prompt: `${STYLE_PREFIX}. Leather saddlebags spilling gold bars onto desert sand. Abandoned in the Sahel. Wind-swept sand and a vast empty horizon. Late afternoon golden light. Square composition, desolate mood.`,
    width: 1024,
    height: 1024
  },
  {
    file: 'infra-dashboard.jpg',
    prompt: `${STYLE_PREFIX}. A large monitor displaying a financial intelligence dashboard with world map, bar charts, and data streams. Dark control room. Blue and green screen glow. Surveillance operations center aesthetic.`,
    width: 1024,
    height: 640
  },
  {
    file: 'infra-room.jpg',
    prompt: `${STYLE_PREFIX}. An empty room with monitoring equipment, server racks and screens. A single window lets in harsh white light creating dramatic shadows. Abandoned surveillance post. Minimalist, eerie mood.`,
    width: 1024,
    height: 640
  }
];

async function generateImage(photo) {
  const outputDir = path.join(__dirname, 'photo');
  const siteOutputDir = path.join(__dirname, '..', 'site', 'images', 'photo');
  const outputPath = path.join(outputDir, photo.file);
  const siteOutputPath = path.join(siteOutputDir, photo.file);

  if (fs.existsSync(outputPath) && !process.argv.includes('--force')) {
    console.log(`  ⏭  ${photo.file} already exists, skipping (use --force to regenerate)`);
    return true;
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`;
  
  const body = JSON.stringify({
    prompt: photo.prompt,
    width: photo.width,
    height: photo.height,
    num_steps: 20
  });

  return new Promise((resolve) => {
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        
        // Workers AI returns raw PNG bytes on success
        if (res.statusCode === 200 && res.headers['content-type']?.includes('image')) {
          fs.writeFileSync(outputPath, buffer);
          fs.copyFileSync(outputPath, siteOutputPath);
          const kb = (buffer.length / 1024).toFixed(1);
          console.log(`  ✅ ${photo.file} — ${kb} KB`);
          resolve(true);
        } else {
          // Try to parse error response
          try {
            const json = JSON.parse(buffer.toString());
            console.error(`  ❌ ${photo.file} — API error:`, JSON.stringify(json.errors || json, null, 2));
          } catch {
            console.error(`  ❌ ${photo.file} — HTTP ${res.statusCode}: ${buffer.toString().substring(0, 200)}`);
          }
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`  ❌ ${photo.file} — Network error:`, err.message);
      resolve(false);
    });

    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('🖼️  Generating gallery photos via Cloudflare Workers AI');
  console.log(`   Model: @cf/stabilityai/stable-diffusion-xl-base-1.0`);
  console.log(`   Photos: ${photos.length}\n`);

  // Ensure output dirs exist
  const photoDir = path.join(__dirname, 'photo');
  const sitePhotoDir = path.join(__dirname, '..', 'site', 'images', 'photo');
  if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });
  if (!fs.existsSync(sitePhotoDir)) fs.mkdirSync(sitePhotoDir, { recursive: true });

  let success = 0;
  let failed = 0;

  for (const photo of photos) {
    console.log(`  ⏳ Generating ${photo.file} (${photo.width}x${photo.height})...`);
    const ok = await generateImage(photo);
    if (ok) success++;
    else failed++;
    
    // Small delay between requests to avoid rate limiting
    if (photos.indexOf(photo) < photos.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`\n📊 Results: ${success} generated, ${failed} failed`);
  
  if (failed > 0) {
    console.log('💡 Re-run with --force to regenerate all, or fix errors and re-run.');
  }
}

main().catch(console.error);
