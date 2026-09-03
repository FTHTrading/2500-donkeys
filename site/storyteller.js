/**
 * XXXIII — Sovereign AI Storyteller & Audio Protocol Guide
 * Universal interactive narration and walkthrough engine for the XXXIII Library.
 * Explains LPS-1, The Three Works, ORCID, Zenodo DOI, Genesis Rust Crates, and On-Chain Verification.
 */
(function() {
  'use strict';

  // Audio Tour Tracks with rich, entertaining, charismatic scripts
  const TOURS = [
    {
      id: 'system-overview',
      title: 'The Sovereign Architecture',
      subtitle: 'Why Every Word is Cryptographically Anchored',
      duration: '3:15',
      durationSec: 195,
      paragraphs: [
        "Welcome to XXXIII. You are standing inside a literary publishing architecture where trust has been rendered obsolete. In traditional publishing, you trust an editor, a printing press, a distributor, and an imprint. Here, trust is replaced by mathematics.",
        "Every single word, paragraph, and chapter written by Kidd James is SHA-256 hashed at inception. These cryptographic hashes are organized into deterministic Merkle trees, and the Merkle root is anchored into immutable, non-upgradeable smart contracts deployed directly on Polygon Mainnet.",
        "There are no admin keys. No upgrade proxies. No backdoors. Once an edition is frozen on-chain, not even the author can alter a single comma without invalidating the entire cryptographic tree. It is permanently cross-anchored to Bitcoin via OpenTimestamps and content-addressed via IPFS. Read, listen, and verify. No trust required."
      ]
    },
    {
      id: 'three-works',
      title: 'The Three Works',
      subtitle: 'Donkeys, Private Placements & Crypto Scams',
      duration: '3:45',
      durationSec: 225,
      paragraphs: [
        "The XXXIII collection currently anchors three complete literary works by Kidd James, spanning 60 stories and more than 75,000 words.",
        "First: The 2,500 Donkeys. A 31-chapter novel exposing phantom gold deals, multi-tier WhatsApp broker chains, and the global financial architecture that connects them. It reveals how stories become deals, and commissions become the only tangible reality in a world where the commodity is optional.",
        "Second: Private Placement Programs. Fourteen satirical, laser-focused stories dissecting the mythology of Tier-1 banking corridors, MT799 swift communications, ghost monetizers, and sovereign whispers.",
        "Third: Volume III, Crypto War Room. Fifteen gripping blocks from inside the crypto scam ecosystem. From counterfeit USDT screenshots to sandwiching MEV bots and re-entrancy illusions, it maps how human belief collapses when speed outpaces verification."
      ]
    },
    {
      id: 'academic-provenance',
      title: 'Academic Provenance & Open Science',
      subtitle: 'ORCID, Zenodo DOI & Open Research',
      duration: '2:50',
      durationSec: 170,
      paragraphs: [
        "XXXIII is not merely fiction; it is an open research paradigm for deterministic digital provenance.",
        "The protocol author is verified through ORCID identity 0009-0008-8425-939X, providing unambiguous scholarly attribution.",
        "The core treatise, titled 'Deterministic Literary Publishing: A Multi-Layer Provenance Model for Verifiable Manuscripts', is formally archived and registered under Zenodo DOI 10.5281/zenodo.18646886.",
        "This gives every paragraph and edition an archival, citable, and permanently persistent digital object identifier recognized by global universities, research repositories, and citation indexes."
      ]
    },
    {
      id: 'rust-crates',
      title: 'Genesis Rust Simulation Crates',
      subtitle: 'Multi-Agent Economic Simulation',
      duration: '3:10',
      durationSec: 190,
      paragraphs: [
        "Behind the narrative sits Genesis: a high-performance, deterministic multi-agent economic simulation engine developed across 13 modular Rust crates.",
        "The Genesis simulation suite executes over 6,820 independent synthetic economies across 44 empirical experiments. It models counterparty trust degradation, broker cascade failures, and liquidity spirals.",
        "The same rigorous invariants governing the Rust simulation crates govern the LPS-1 smart contracts. The mathematical models of financial contagion in Genesis mirror the exact human behaviors chronicled in The 2,500 Donkeys and Private Placement Programs."
      ]
    },
    {
      id: 'verify-guide',
      title: 'Zero-Trust Client Verification',
      subtitle: 'How to Prove the Chain Yourself in 90 Seconds',
      duration: '2:20',
      durationSec: 140,
      paragraphs: [
        "The defining principle of LPS-1 is independent verification. You do not need to take our word for any of this.",
        "You can clone the open-source repository from GitHub, run our deterministic verification tool, and recalculate all Merkle trees locally on your own machine. 58 checks run across 2 comprehensive test suites with 293 tests passing.",
        "Compare the resulting roots against the state of Polygon contract 0xca9F6604A9b498DB31d113836E2957c0a9aAE037. When the hashes match, mathematical proof replaces human trust. Welcome to the future of sovereign literature."
      ]
    }
  ];

  class StorytellerEngine {
    constructor() {
      this.tours = TOURS;
      this.currentTrackIndex = 0;
      this.isPlaying = false;
      this.isMinimized = localStorage.getItem('xxxiii_st_minimized') === 'true';
      this.speed = 1.0;
      this.synth = window.speechSynthesis || null;
      this.currentUtterance = null;
      this.paragraphIndex = 0;
      this.audioCtx = null;
      this.synthNode = null;
      this.gainNode = null;
      this.analyser = null;
      this.animFrameId = null;
      this.transcriptVisible = false;

      this.initDOM();
      this.initAudioContext();
      this.attachEvents();
    }

    initAudioContext() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioCtx = new AudioContext();
          this.analyser = this.audioCtx.createAnalyser();
          this.analyser.fftSize = 64;
          this.gainNode = this.audioCtx.createGain();
          this.gainNode.gain.setValueAtTime(0.025, this.audioCtx.currentTime); // gentle ambient hum
          this.gainNode.connect(this.audioCtx.destination);
        }
      } catch (e) {
        console.warn('Web Audio API ambient engine unavailable:', e);
      }
    }

    startAmbientTone() {
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      try {
        if (!this.osc1) {
          this.osc1 = this.audioCtx.createOscillator();
          this.osc2 = this.audioCtx.createOscillator();
          this.filter = this.audioCtx.createBiquadFilter();

          this.osc1.type = 'sine';
          this.osc1.frequency.setValueAtTime(108, this.audioCtx.currentTime); // A2 harmonic drone
          this.osc2.type = 'triangle';
          this.osc2.frequency.setValueAtTime(162, this.audioCtx.currentTime); // E3 warm fifth

          this.filter.type = 'lowpass';
          this.filter.frequency.setValueAtTime(280, this.audioCtx.currentTime);

          this.osc1.connect(this.filter);
          this.osc2.connect(this.filter);
          this.filter.connect(this.gainNode);

          this.osc1.start();
          this.osc2.start();
        }
      } catch (e) {
        // silent fail
      }
    }

    stopAmbientTone() {
      try {
        if (this.osc1) {
          this.osc1.stop();
          this.osc1.disconnect();
          this.osc1 = null;
        }
        if (this.osc2) {
          this.osc2.stop();
          this.osc2.disconnect();
          this.osc2 = null;
        }
      } catch (e) {}
    }

    initDOM() {
      // Inject widget container if not present
      if (document.getElementById('xxxiii-storyteller-widget')) return;

      const widget = document.createElement('aside');
      widget.id = 'xxxiii-storyteller-widget';
      widget.className = `xxxiii-st-widget ${this.isMinimized ? 'minimized' : ''}`;
      widget.setAttribute('aria-label', 'XXXIII AI Storyteller & Protocol Audio Tour');

      widget.innerHTML = `
        <div class="st-floating-btn" id="st-toggle-btn" title="Open AI Storyteller & System Tour">
          <div class="st-wave-compact" id="st-compact-wave">
            <span></span><span></span><span></span><span></span>
          </div>
          <span class="st-btn-label">AI Storyteller</span>
        </div>

        <div class="st-card" id="st-main-card">
          <div class="st-header">
            <div class="st-header-meta">
              <span class="st-badge">AI NARRATOR &middot; PROTOCOL GUIDE</span>
              <h3 class="st-title" id="st-track-title">${this.tours[0].title}</h3>
              <p class="st-sub" id="st-track-sub">${this.tours[0].subtitle}</p>
            </div>
            <div class="st-header-actions">
              <button class="st-action-icon" id="st-transcript-toggle" title="Toggle Script Transcript" aria-label="Transcript">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h11"/></svg>
              </button>
              <button class="st-action-icon" id="st-minimize-btn" title="Minimize Guide" aria-label="Minimize">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
          </div>

          <!-- Waveform Visualizer -->
          <div class="st-waveform-container">
            <canvas id="st-visualizer-canvas" class="st-waveform-canvas" width="280" height="34"></canvas>
          </div>

          <!-- Progress bar -->
          <div class="st-timeline">
            <div class="st-time-display">
              <span id="st-time-current">0:00</span>
              <span id="st-time-total">${this.tours[0].duration}</span>
            </div>
            <div class="st-progress-rail" id="st-progress-rail">
              <div class="st-progress-fill" id="st-progress-fill" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Track Selector -->
          <div class="st-track-select-wrap">
            <label for="st-track-select" class="st-label">Tour Module:</label>
            <select id="st-track-select" class="st-track-select">
              ${this.tours.map((t, idx) => `<option value="${idx}">${idx + 1}. ${t.title}</option>`).join('')}
            </select>
          </div>

          <!-- Player Controls -->
          <div class="st-controls">
            <button class="st-ctrl-btn" id="st-prev-btn" title="Previous Module" aria-label="Previous">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
            </button>
            <button class="st-play-btn" id="st-play-btn" title="Play / Pause Storyteller" aria-label="Play">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" id="st-play-icon"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button class="st-ctrl-btn" id="st-next-btn" title="Next Module" aria-label="Next">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="m6 18 8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
            <div class="st-speed-wrap">
              <button class="st-speed-btn" id="st-speed-btn" title="Playback Speed">1.0x</button>
            </div>
          </div>

          <!-- Collapsible Transcript Box -->
          <div class="st-transcript-drawer" id="st-transcript-drawer" style="display: none;">
            <div class="st-transcript-content" id="st-transcript-text">
              ${this.tours[0].paragraphs.map((p, i) => `<p class="st-para" data-pindex="${i}">${p}</p>`).join('')}
            </div>
          </div>

          <!-- System Badges & Links -->
          <div class="st-footer-links">
            <a href="protocol.html" class="st-link">&bull; Protocol Spec</a>
            <a href="https://doi.org/10.5281/zenodo.18646886" target="_blank" rel="noopener" class="st-link">&bull; DOI Zenodo</a>
            <a href="https://orcid.org/0009-0008-8425-939X" target="_blank" rel="noopener" class="st-link">&bull; ORCID</a>
          </div>
        </div>
      `;

      document.body.appendChild(widget);
      this.drawWaveformIdle();
    }

    attachEvents() {
      const widget = document.getElementById('xxxiii-storyteller-widget');
      const toggleBtn = document.getElementById('st-toggle-btn');
      const minBtn = document.getElementById('st-minimize-btn');
      const playBtn = document.getElementById('st-play-btn');
      const prevBtn = document.getElementById('st-prev-btn');
      const nextBtn = document.getElementById('st-next-btn');
      const speedBtn = document.getElementById('st-speed-btn');
      const select = document.getElementById('st-track-select');
      const rail = document.getElementById('st-progress-rail');
      const transcriptToggle = document.getElementById('st-transcript-toggle');

      toggleBtn.addEventListener('click', () => this.toggleMinimize());
      minBtn.addEventListener('click', () => this.toggleMinimize());
      playBtn.addEventListener('click', () => this.togglePlay());
      prevBtn.addEventListener('click', () => this.changeTrack(-1));
      nextBtn.addEventListener('click', () => this.changeTrack(1));
      select.addEventListener('change', (e) => this.selectTrack(parseInt(e.target.value, 10)));
      speedBtn.addEventListener('click', () => this.cycleSpeed());

      transcriptToggle.addEventListener('click', () => {
        this.transcriptVisible = !this.transcriptVisible;
        const drawer = document.getElementById('st-transcript-drawer');
        drawer.style.display = this.transcriptVisible ? 'block' : 'none';
        transcriptToggle.classList.toggle('active', this.transcriptVisible);
      });

      rail.addEventListener('click', (e) => {
        const rect = rail.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const track = this.tours[this.currentTrackIndex];
        const targetPara = Math.floor(pct * track.paragraphs.length);
        this.seekParagraph(targetPara);
      });

      // Global window binding
      window.XXXIIIStoryteller = {
        playTrack: (indexOrId) => {
          let idx = typeof indexOrId === 'number' ? indexOrId : this.tours.findIndex(t => t.id === indexOrId);
          if (idx >= 0) {
            this.selectTrack(idx);
            this.play();
            this.maximize();
          }
        },
        toggle: () => this.togglePlay(),
        minimize: () => this.minimize(),
        maximize: () => this.maximize()
      };
    }

    toggleMinimize() {
      this.isMinimized = !this.isMinimized;
      const widget = document.getElementById('xxxiii-storyteller-widget');
      widget.classList.toggle('minimized', this.isMinimized);
      localStorage.setItem('xxxiii_st_minimized', this.isMinimized);
    }

    minimize() {
      this.isMinimized = true;
      document.getElementById('xxxiii-storyteller-widget').classList.add('minimized');
      localStorage.setItem('xxxiii_st_minimized', 'true');
    }

    maximize() {
      this.isMinimized = false;
      document.getElementById('xxxiii-storyteller-widget').classList.remove('minimized');
      localStorage.setItem('xxxiii_st_minimized', 'false');
    }

    selectTrack(idx) {
      if (idx < 0 || idx >= this.tours.length) return;
      this.stop();
      this.currentTrackIndex = idx;
      this.paragraphIndex = 0;
      this.updateTrackUI();
    }

    changeTrack(delta) {
      let nextIdx = (this.currentTrackIndex + delta + this.tours.length) % this.tours.length;
      this.selectTrack(nextIdx);
      if (this.isPlaying) this.play();
    }

    cycleSpeed() {
      const speeds = [1.0, 1.15, 1.25, 0.9];
      const cur = speeds.indexOf(this.speed);
      this.speed = speeds[(cur + 1) % speeds.length];
      document.getElementById('st-speed-btn').textContent = this.speed + 'x';
      if (this.isPlaying) {
        // restart current paragraph with new speed
        this.speakCurrentParagraph();
      }
    }

    updateTrackUI() {
      const track = this.tours[this.currentTrackIndex];
      document.getElementById('st-track-title').textContent = track.title;
      document.getElementById('st-track-sub').textContent = track.subtitle;
      document.getElementById('st-time-total').textContent = track.duration;
      document.getElementById('st-track-select').value = this.currentTrackIndex;

      // Update transcript
      const textContainer = document.getElementById('st-transcript-text');
      textContainer.innerHTML = track.paragraphs.map((p, i) =>
        `<p class="st-para ${i === this.paragraphIndex ? 'st-para-active' : ''}" data-pindex="${i}">${p}</p>`
      ).join('');

      this.updateProgressUI(0);
    }

    updateProgressUI(pct) {
      document.getElementById('st-progress-fill').style.width = `${Math.min(100, Math.max(0, pct))}%`;
      const track = this.tours[this.currentTrackIndex];
      const elapsedSec = Math.floor((pct / 100) * track.durationSec);
      const m = Math.floor(elapsedSec / 60);
      const s = elapsedSec % 60;
      document.getElementById('st-time-current').textContent = `${m}:${s < 10 ? '0' : ''}${s}`;

      // highlight active paragraph in transcript
      const paras = document.querySelectorAll('#st-transcript-text .st-para');
      paras.forEach((el, idx) => {
        el.classList.toggle('st-para-active', idx === this.paragraphIndex);
      });
    }

    togglePlay() {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    }

    play() {
      this.isPlaying = true;
      this.updatePlayStateUI(true);
      this.startAmbientTone();
      this.startVisualizer();
      this.speakCurrentParagraph();
    }

    pause() {
      this.isPlaying = false;
      this.updatePlayStateUI(false);
      this.stopAmbientTone();
      this.stopVisualizer();
      if (this.synth) {
        this.synth.cancel();
      }
    }

    stop() {
      this.isPlaying = false;
      this.paragraphIndex = 0;
      this.updatePlayStateUI(false);
      this.stopAmbientTone();
      this.stopVisualizer();
      if (this.synth) {
        this.synth.cancel();
      }
      this.updateProgressUI(0);
    }

    seekParagraph(idx) {
      const track = this.tours[this.currentTrackIndex];
      this.paragraphIndex = Math.max(0, Math.min(track.paragraphs.length - 1, idx));
      if (this.isPlaying) {
        this.speakCurrentParagraph();
      } else {
        const pct = (this.paragraphIndex / track.paragraphs.length) * 100;
        this.updateProgressUI(pct);
      }
    }

    speakCurrentParagraph() {
      if (!this.synth) {
        console.warn('SpeechSynthesis not supported on this client.');
        return;
      }

      this.synth.cancel();

      const track = this.tours[this.currentTrackIndex];
      if (this.paragraphIndex >= track.paragraphs.length) {
        // finished tour track
        this.changeTrack(1);
        return;
      }

      const text = track.paragraphs[this.paragraphIndex];
      const utter = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utter;

      utter.rate = this.speed;
      utter.pitch = 0.95; // deep, resonant narrator tone

      // Pick best voice available (prefer English male/narrator)
      const voices = this.synth.getVoices();
      if (voices && voices.length > 0) {
        const preferred = voices.find(v =>
          /Daniel|Oliver|George|Guy|Ryan|Arthur|Google UK English Male|en-GB/i.test(v.name)
        ) || voices.find(v => /en-US|en-GB|English/i.test(v.lang));
        if (preferred) utter.voice = preferred;
      }

      const basePct = (this.paragraphIndex / track.paragraphs.length) * 100;
      this.updateProgressUI(basePct);

      utter.onboundary = (e) => {
        if (e.charIndex && text.length > 0) {
          const charPct = (e.charIndex / text.length);
          const currentPct = ((this.paragraphIndex + charPct) / track.paragraphs.length) * 100;
          this.updateProgressUI(currentPct);
        }
      };

      utter.onend = () => {
        if (!this.isPlaying) return;
        this.paragraphIndex++;
        if (this.paragraphIndex < track.paragraphs.length) {
          setTimeout(() => this.speakCurrentParagraph(), 250);
        } else {
          // Finished track
          this.updateProgressUI(100);
          setTimeout(() => {
            this.changeTrack(1);
          }, 1000);
        }
      };

      utter.onerror = (err) => {
        console.warn('Storyteller audio utterance notice:', err);
      };

      this.synth.speak(utter);
    }

    updatePlayStateUI(playing) {
      const playBtn = document.getElementById('st-play-btn');
      const compactWave = document.getElementById('st-compact-wave');
      const playIcon = document.getElementById('st-play-icon');

      if (playing) {
        playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        compactWave.classList.add('animating');
        playBtn.setAttribute('title', 'Pause Storyteller');
      } else {
        playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
        compactWave.classList.remove('animating');
        playBtn.setAttribute('title', 'Play Storyteller');
      }
    }

    startVisualizer() {
      const canvas = document.getElementById('st-visualizer-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      let tick = 0;

      const render = () => {
        if (!this.isPlaying) return;
        ctx.clearRect(0, 0, w, h);
        tick += 0.08;

        const bars = 28;
        const barWidth = 6;
        const gap = 4;
        const startX = (w - (bars * (barWidth + gap))) / 2;

        for (let i = 0; i < bars; i++) {
          const sinFactor = Math.sin(tick + i * 0.35);
          const cosFactor = Math.cos(tick * 0.8 + i * 0.2);
          const heightPct = Math.abs(sinFactor * 0.6 + cosFactor * 0.4);
          const barHeight = Math.max(3, heightPct * (h - 6));
          const x = startX + i * (barWidth + gap);
          const y = (h - barHeight) / 2;

          // Golden gradient
          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          grad.addColorStop(0, '#e5ca80');
          grad.addColorStop(1, '#9b7a2d');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();
        }

        this.animFrameId = requestAnimationFrame(render);
      };

      this.animFrameId = requestAnimationFrame(render);
    }

    stopVisualizer() {
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      this.drawWaveformIdle();
    }

    drawWaveformIdle() {
      const canvas = document.getElementById('st-visualizer-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const bars = 28;
      const barWidth = 6;
      const gap = 4;
      const startX = (w - (bars * (barWidth + gap))) / 2;

      for (let i = 0; i < bars; i++) {
        const x = startX + i * (barWidth + gap);
        const barHeight = 4;
        const y = (h - barHeight) / 2;
        ctx.fillStyle = 'rgba(201, 168, 76, 0.25)';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    }
  }

  // Auto-instantiate on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new StorytellerEngine());
  } else {
    new StorytellerEngine();
  }
})();
