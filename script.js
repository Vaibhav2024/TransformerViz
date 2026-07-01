/* ──────────────────────────────────────────────────────
   LLM VISUALIZER — script.js
   ────────────────────────────────────────────────────── */

'use strict';

/* ══════════════════════════════════════════
   SLIDE DATA
   ══════════════════════════════════════════ */
const SLIDES = [
  { label: 'Introduction' },
  { label: 'The Big Picture' },
  { label: 'What Is an LLM?' },
  { label: 'Sending a Message' },
  { label: 'Tokenization' },
  { label: 'Vector Embeddings' },
  { label: 'Transformers' },
  { label: 'Controls' },
  { label: 'Summary' },
];

const TOTAL = SLIDES.length - 1; // 0-indexed last slide

/* ══════════════════════════════════════════
   STATE
   ══════════════════════════════════════════ */
let currentIndex = 0;
let isAnimating   = false;

/* ══════════════════════════════════════════
   DOM REFS
   ══════════════════════════════════════════ */
const slides     = [...document.querySelectorAll('.slide')];
const prevBtn    = document.getElementById('prev-btn');
const nextBtn    = document.getElementById('next-btn');
const navLabel   = document.getElementById('nav-label');
const stepLabel  = document.getElementById('step-label');
const stepTotal  = document.getElementById('step-total');
const progressBar= document.getElementById('progress-bar');
const dotNav     = document.getElementById('dot-nav');
const kbHint     = document.getElementById('keyboard-hint');
const startBtn   = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

/* ══════════════════════════════════════════
   INIT
   ══════════════════════════════════════════ */
function init() {
  stepTotal.textContent = TOTAL;

  // Build dot nav
  SLIDES.forEach((s, i) => {
    const btn = document.createElement('button');
    btn.className = 'dot-nav-item' + (i === 0 ? ' active' : '');
    btn.setAttribute('aria-label', s.label);
    btn.title = s.label;
    btn.addEventListener('click', () => goTo(i));
    dotNav.appendChild(btn);
  });

  updateUI();
  initBgCanvas();
  initPipelineAnimation();
  initTokenizer();
  initEmbeddingCanvas();
  initAttentionDemo();
  initContextSlider();
  initTempSlider();

  startBtn.addEventListener('click', () => goTo(1));
  restartBtn.addEventListener('click', () => goTo(0));
}

/* ══════════════════════════════════════════
   NAVIGATION
   ══════════════════════════════════════════ */
function goTo(index) {
  if (isAnimating || index === currentIndex) return;
  if (index < 0 || index > TOTAL) return;

  isAnimating = true;
  const old = currentIndex;
  currentIndex = index;

  const oldSlide = slides[old];
  const newSlide = slides[index];

  // Exit old slide
  oldSlide.classList.remove('active');
  oldSlide.classList.add(index > old ? 'exit-up' : 'exit-down');

  // Enter new slide
  newSlide.style.transform = index > old ? 'translateY(30px)' : 'translateY(-30px)';
  newSlide.style.opacity = '0';
  newSlide.classList.add('active');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      newSlide.style.transform = '';
      newSlide.style.opacity = '';
      setTimeout(() => {
        oldSlide.classList.remove('exit-up', 'exit-down');
        isAnimating = false;
        onSlideEnter(index);
      }, 550);
    });
  });

  updateUI();
  // Hide keyboard hint after first nav
  setTimeout(() => kbHint.classList.add('hidden'), 3000);
}

function updateUI() {
  // Progress bar
  const pct = (currentIndex / TOTAL) * 100;
  progressBar.style.width = pct + '%';

  // Buttons
  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === TOTAL;

  // Labels
  navLabel.textContent = SLIDES[currentIndex].label;
  stepLabel.textContent = currentIndex === 0 ? 'Intro' : `Step ${currentIndex}`;

  // Dot nav
  [...dotNav.querySelectorAll('.dot-nav-item')].forEach((d, i) => {
    d.classList.toggle('active', i === currentIndex);
  });
}

prevBtn.addEventListener('click', () => goTo(currentIndex - 1));
nextBtn.addEventListener('click', () => goTo(currentIndex + 1));

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(currentIndex + 1);
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   goTo(currentIndex - 1);
});

/* ══════════════════════════════════════════
   ON SLIDE ENTER HOOKS
   ══════════════════════════════════════════ */
function onSlideEnter(index) {
  switch (index) {
    case 3: startPipelineSequence(); break;
    case 5: drawEmbeddingCanvas();   break;
    case 7: initContextSlider(); initTempSlider(); break;
  }
}

/* ══════════════════════════════════════════
   BACKGROUND CANVAS — PARTICLE GRID
   ══════════════════════════════════════════ */
function initBgCanvas() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles, animId;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    spawnParticles();
  }

  function spawnParticles() {
    const count = Math.floor((W * H) / 14000);
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      alpha: Math.random() * 0.5 + 0.1,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(99,102,241,${0.06 * (1 - dist / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Draw particles
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99,102,241,${p.alpha})`;
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
    });

    animId = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
}

/* ══════════════════════════════════════════
   SLIDE 3 — PIPELINE ANIMATION
   ══════════════════════════════════════════ */
function initPipelineAnimation() {
  const typedEl = document.getElementById('typed-demo');
  const text = 'Explain transformers to me';
  let charIdx = 0, interval;

  function typeChar() {
    if (charIdx < text.length) {
      typedEl.textContent = text.slice(0, ++charIdx);
    } else {
      clearInterval(interval);
    }
  }

  // Store for re-trigger
  window._startPipelineType = () => {
    charIdx = 0;
    typedEl.textContent = '';
    clearInterval(interval);
    interval = setInterval(typeChar, 55);
  };
}

let pipelineTimeout;
function startPipelineSequence() {
  clearTimeout(pipelineTimeout);

  // Reset
  const steps = document.querySelectorAll('.pipeline-step');
  steps.forEach(s => s.classList.remove('active-step'));

  window._startPipelineType?.();

  let delay = 800;
  steps.forEach((step, i) => {
    pipelineTimeout = setTimeout(() => {
      steps.forEach((s, j) => s.classList.toggle('active-step', j <= i));
    }, delay + i * 700);
    delay += 200;
  });
}

/* ══════════════════════════════════════════
   SLIDE 4 — TOKENIZER (interactive)
   ══════════════════════════════════════════ */
function initTokenizer() {
  const input  = document.getElementById('token-input');
  const output = document.getElementById('token-output');
  const idsWrap= document.getElementById('token-ids-wrap');
  const idsEl  = document.getElementById('token-ids');
  const cntEl  = document.getElementById('token-count');
  const charEl = document.getElementById('char-count');

  // Colour palette for token chips
  const PALETTES = [
    { bg: 'rgba(99,102,241,0.18)', col: '#a5b4fc' },
    { bg: 'rgba(56,189,248,0.15)', col: '#7dd3fc' },
    { bg: 'rgba(52,211,153,0.15)', col: '#6ee7b7' },
    { bg: 'rgba(251,146,60,0.15)', col: '#fcd34d' },
    { bg: 'rgba(244,114,182,0.15)',col: '#f9a8d4' },
    { bg: 'rgba(167,139,250,0.15)',col: '#c4b5fd' },
  ];

  // Very lightweight BPE-like tokenizer simulation
  function tokenize(text) {
    if (!text.trim()) return [];
    const tokens = [];
    // Split on spaces + punctuation
    const words = text.match(/\w+'?\w*|[^\w\s]+|\s+/g) || [];
    words.forEach(word => {
      if (/\s+/.test(word)) {
        // space token absorbed into next
      } else if (word.length > 7 && /^\w+$/.test(word)) {
        // Break long words into sub-tokens
        const mid = Math.ceil(word.length / 2);
        tokens.push(word.slice(0, mid));
        tokens.push(word.slice(mid));
      } else {
        tokens.push(word);
      }
    });
    return tokens;
  }

  function hashToken(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }

  function fakeTokenId(str) {
    return 100 + (hashToken(str) % 49900);
  }

  function render(text) {
    const tokens = tokenize(text);
    charEl.textContent = text.length;
    cntEl.textContent  = tokens.length;

    if (!tokens.length) {
      output.innerHTML = '<div class="token-placeholder">Type something above to see tokenization ↑</div>';
      idsWrap.style.display = 'none';
      return;
    }

    output.innerHTML = '';
    idsEl.innerHTML  = '';
    idsWrap.style.display = 'block';

    tokens.forEach((tok, i) => {
      const pal = PALETTES[i % PALETTES.length];
      const chip = document.createElement('div');
      chip.className = 'token-chip';
      chip.style.background = pal.bg;
      chip.style.color = pal.col;
      chip.style.border = `1px solid ${pal.col}44`;
      chip.style.animationDelay = `${i * 0.04}s`;
      chip.textContent = tok;
      output.appendChild(chip);

      const id = fakeTokenId(tok);
      const idChip = document.createElement('div');
      idChip.className = 'token-id-chip';
      idChip.style.animationDelay = `${i * 0.04}s`;
      idChip.textContent = id;
      idsEl.appendChild(idChip);
    });
  }

  input.addEventListener('input', () => render(input.value));
  // Default
  render('Hello, I am Vaibhav Patil');
  input.value = 'Hello, I am Vaibhav Patil';
}

/* ══════════════════════════════════════════
   SLIDE 5 — EMBEDDING CANVAS
   ══════════════════════════════════════════ */
const EMBEDDING_WORDS = [
  // Animals
  { word: 'cat',    x: 0.15, y: 0.25, cat: 0 },
  { word: 'dog',    x: 0.22, y: 0.35, cat: 0 },
  { word: 'lion',   x: 0.12, y: 0.45, cat: 0 },
  { word: 'tiger',  x: 0.28, y: 0.20, cat: 0 },
  // Finance
  { word: 'bank',   x: 0.68, y: 0.22, cat: 1 },
  { word: 'money',  x: 0.75, y: 0.32, cat: 1 },
  { word: 'stock',  x: 0.62, y: 0.38, cat: 1 },
  { word: 'invest', x: 0.80, y: 0.18, cat: 1 },
  // Nature
  { word: 'river',  x: 0.65, y: 0.72, cat: 2 },
  { word: 'ocean',  x: 0.75, y: 0.80, cat: 2 },
  { word: 'forest', x: 0.58, y: 0.82, cat: 2 },
  { word: 'lake',   x: 0.70, y: 0.62, cat: 2 },
  // Code
  { word: 'function', x: 0.25, y: 0.72, cat: 3 },
  { word: 'array',    x: 0.32, y: 0.82, cat: 3 },
  { word: 'class',    x: 0.18, y: 0.82, cat: 3 },
  { word: 'loop',     x: 0.38, y: 0.70, cat: 3 },
];

const EMB_COLORS = ['#6ee7b7', '#93c5fd', '#fca5a5', '#fcd34d'];
const EMB_CLUSTERS = [
  [0.18, 0.30], // animals
  [0.72, 0.25], // finance
  [0.67, 0.74], // nature
  [0.28, 0.76], // code
];

let embCanvas, embCtx, embW, embH;
let embAnimWords, embAnimFrame;
let embAnimating = false;

function initEmbeddingCanvas() {
  embCanvas = document.getElementById('embedding-canvas');
  if (!embCanvas) return;
  embCtx = embCanvas.getContext('2d');
  embW = embCanvas.width;
  embH = embCanvas.height;

  // Copy words and add animation positions (start scattered)
  embAnimWords = EMBEDDING_WORDS.map(w => ({
    ...w,
    ax: Math.random(),
    ay: Math.random(),
    tx: w.x,
    ty: w.y,
    alpha: 0,
  }));
}

function drawEmbeddingCanvas() {
  if (!embCanvas) return;
  cancelAnimationFrame(embAnimFrame);
  embAnimating = true;

  // Reset to scattered
  embAnimWords.forEach(w => {
    w.ax = Math.random();
    w.ay = Math.random();
    w.alpha = 0;
  });

  const startTime = performance.now();
  const DURATION = 1800;

  function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

  function frame(now) {
    const t = Math.min(1, (now - startTime) / DURATION);
    const et = ease(t);

    embCtx.clearRect(0, 0, embW, embH);

    // Background grid
    embCtx.strokeStyle = 'rgba(255,255,255,0.03)';
    embCtx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      embCtx.beginPath();
      embCtx.moveTo(i * embW/10, 0);
      embCtx.lineTo(i * embW/10, embH);
      embCtx.stroke();
      embCtx.beginPath();
      embCtx.moveTo(0, i * embH/10);
      embCtx.lineTo(embW, i * embH/10);
      embCtx.stroke();
    }

    // Cluster halos
    if (t > 0.4) {
      const ct = Math.min(1, (t - 0.4) / 0.6);
      EMB_CLUSTERS.forEach((cl, ci) => {
        const grd = embCtx.createRadialGradient(
          cl[0]*embW, cl[1]*embH, 0,
          cl[0]*embW, cl[1]*embH, 80
        );
        grd.addColorStop(0, EMB_COLORS[ci] + Math.floor(ct * 18).toString(16).padStart(2,'0'));
        grd.addColorStop(1, 'transparent');
        embCtx.beginPath();
        embCtx.arc(cl[0]*embW, cl[1]*embH, 80, 0, Math.PI*2);
        embCtx.fillStyle = grd;
        embCtx.fill();
      });
    }

    // In-cluster connections
    if (t > 0.6) {
      const lt = Math.min(1, (t - 0.6) / 0.4);
      for (let i = 0; i < embAnimWords.length; i++) {
        for (let j = i+1; j < embAnimWords.length; j++) {
          if (embAnimWords[i].cat !== embAnimWords[j].cat) continue;
          const ax = embAnimWords[i].ax * embW;
          const ay = embAnimWords[i].ay * embH;
          const bx = embAnimWords[j].ax * embW;
          const by = embAnimWords[j].ay * embH;
          embCtx.beginPath();
          embCtx.moveTo(ax, ay);
          embCtx.lineTo(bx, by);
          embCtx.strokeStyle = EMB_COLORS[embAnimWords[i].cat] + Math.floor(lt * 30).toString(16).padStart(2,'0');
          embCtx.lineWidth = 1;
          embCtx.stroke();
        }
      }
    }

    // Dots + labels
    embAnimWords.forEach(w => {
      w.ax = w.ax + (w.tx - w.ax) * et;
      w.ay = w.ay + (w.ty - w.ay) * et;
      w.alpha = Math.min(1, w.alpha + 0.04);

      const px = w.ax * embW;
      const py = w.ay * embH;

      // Dot
      embCtx.beginPath();
      embCtx.arc(px, py, 5, 0, Math.PI*2);
      embCtx.fillStyle = EMB_COLORS[w.cat] + Math.floor(w.alpha * 220).toString(16).padStart(2,'0');
      embCtx.fill();
      embCtx.strokeStyle = EMB_COLORS[w.cat];
      embCtx.lineWidth = 1.5;
      embCtx.stroke();

      // Label
      embCtx.font = `600 11px 'Inter', sans-serif`;
      embCtx.fillStyle = `rgba(240,244,255,${w.alpha * 0.9})`;
      embCtx.fillText(w.word, px + 8, py + 4);
    });

    // Axes labels
    embCtx.font = '11px Inter';
    embCtx.fillStyle = 'rgba(139,151,184,0.5)';
    embCtx.fillText('Semantic Meaning →', 10, embH - 8);
    embCtx.save();
    embCtx.translate(14, embH - 60);
    embCtx.rotate(-Math.PI/2);
    embCtx.fillText('Context →', 0, 0);
    embCtx.restore();

    if (t < 1) embAnimFrame = requestAnimationFrame(frame);
  }

  embAnimFrame = requestAnimationFrame(frame);
}

/* ══════════════════════════════════════════
   SLIDE 6 — SELF-ATTENTION DEMO
   ══════════════════════════════════════════ */
const ATTENTION_MAP = {
  // word index → { attending: [indices], explanation }
  0: { attending: [1,3,6], explanation: '"We" attends to "sat", "bank", and "river" to understand the full context of who is doing what, where.' },
  1: { attending: [0,2,3], explanation: '"Sat" focuses on "We" (subject), "by" (direction), "bank" (location) to understand the scene.' },
  2: { attending: [1,3,4], explanation: '"By" links "sat" to what comes after it — the landmark ("bank of the river").' },
  3: { attending: [0,4,5,6], explanation: '"Bank" strongly attends to "river" — this tells the model it\'s a riverbank, NOT a financial bank. Context wins!' },
  4: { attending: [3,5,6], explanation: '"Of" connects "bank" and "the river" — a structural word that signals possession.' },
  5: { attending: [3,4,6], explanation: '"The" attends to what follows — it\'s a determiner pointing to "river".' },
  6: { attending: [0,1,3,4], explanation: '"River" attends to "We sat by bank of" — confirming this is a natural setting, not finance.' },
};

function initAttentionDemo() {
  const words = document.querySelectorAll('.att-word');
  const explainEl = document.getElementById('att-explanation');

  words.forEach(word => {
    word.addEventListener('click', () => {
      const i = parseInt(word.dataset.i);
      const map = ATTENTION_MAP[i];

      // Reset
      words.forEach(w => {
        w.classList.remove('attending', 'low-att', 'focus-word');
        w.classList.add('low-att');
      });

      word.classList.remove('low-att');
      word.classList.add('focus-word');

      map.attending.forEach(j => {
        words[j].classList.remove('low-att');
        words[j].classList.add('attending');
      });

      explainEl.textContent = map.explanation;
    });
  });

  // Auto-trigger "bank" on enter
  window._triggerBankAttention = () => {
    setTimeout(() => words[3]?.click(), 1200);
  };
}

/* ══════════════════════════════════════════
   SLIDE 7 — CONTEXT WINDOW SLIDER
   ══════════════════════════════════════════ */
function initContextSlider() {
  const slider  = document.getElementById('context-slider');
  const visual  = document.getElementById('context-visual');
  if (!slider || !visual) return;

  const TOTAL_TOKENS = 24;

  function render(windowSize) {
    visual.innerHTML = '';
    for (let i = 0; i < TOTAL_TOKENS; i++) {
      const tok = document.createElement('div');
      tok.className = 'ctx-token ' + (i < windowSize ? 'in-window' : 'out-window');
      tok.title = i < windowSize ? `Token ${i+1} (in context)` : `Token ${i+1} (forgotten)`;
      visual.appendChild(tok);
    }
  }

  slider.addEventListener('input', () => render(parseInt(slider.value)));
  render(parseInt(slider.value));
}

/* ══════════════════════════════════════════
   SLIDE 7 — TEMPERATURE SLIDER
   ══════════════════════════════════════════ */
const TEMP_WORDS_LOW = [
  { word: 'The', c: '#93c5fd' },
  { word: 'answer', c: '#93c5fd' },
  { word: 'is', c: '#6ee7b7' },
  { word: '42', c: '#fcd34d' },
];
const TEMP_WORDS_MID = [
  { word: 'I', c: '#6ee7b7' },
  { word: 'think', c: '#a5b4fc' },
  { word: 'perhaps', c: '#fda4af' },
  { word: 'around', c: '#fcd34d' },
  { word: '40', c: '#fdba74' },
];
const TEMP_WORDS_HIGH = [
  { word: 'Behold!', c: '#f472b6' },
  { word: 'The', c: '#fb923c' },
  { word: 'cosmic', c: '#fcd34d' },
  { word: 'answer', c: '#a78bfa' },
  { word: 'dances', c: '#6ee7b7' },
  { word: 'between', c: '#93c5fd' },
  { word: '41', c: '#f9a8d4' },
  { word: 'and', c: '#fda4af' },
  { word: 'infinity!', c: '#fb923c' },
];

function initTempSlider() {
  const slider  = document.getElementById('temp-slider');
  const wordsEl = document.getElementById('temp-words');
  const valEl   = document.getElementById('temp-val');
  if (!slider || !wordsEl || !valEl) return;

  function render(val) {
    const t = val / 100;
    valEl.textContent = t.toFixed(1);

    let words;
    if (t < 0.33)       words = TEMP_WORDS_LOW;
    else if (t < 0.66)  words = TEMP_WORDS_MID;
    else                words = TEMP_WORDS_HIGH;

    wordsEl.innerHTML = '';
    words.forEach((w, i) => {
      const chip = document.createElement('div');
      chip.className = 'tw-chip';
      chip.style.background = w.c + '22';
      chip.style.color = w.c;
      chip.style.border = `1px solid ${w.c}44`;
      chip.style.animationDelay = `${i * 0.05}s`;
      chip.textContent = w.word;
      wordsEl.appendChild(chip);
    });
  }

  slider.addEventListener('input', () => render(parseInt(slider.value)));
  render(parseInt(slider.value));
}

/* ══════════════════════════════════════════
   SLIDE 6 — ARCH BLOCK TOOLTIPS
   ══════════════════════════════════════════ */
const ARCH_TOOLTIPS = {
  'arch-emb':      'Input Embedding: Converts token IDs into dense vector representations that capture meaning.',
  'arch-attn':     'Multi-Head Attention: Multiple attention heads look at different relationships in parallel.',
  'arch-addnorm1': 'Add & Norm: Residual connection + Layer Normalization for stable training.',
  'arch-ff':       'Feed Forward: A two-layer MLP that processes each position independently.',
  'arch-addnorm2': 'Add & Norm: Another residual connection after the feed-forward layer.',
  'arch-linear':   'Linear: Projects the decoder output to vocabulary-sized logits.',
  'arch-softmax':  'Softmax: Converts logits to probabilities over the full vocabulary. Highest = next token.',
};

Object.entries(ARCH_TOOLTIPS).forEach(([id, tip]) => {
  const el = document.getElementById(id);
  if (!el) return;

  const explainEl = document.getElementById('att-explanation');

  el.addEventListener('mouseenter', () => {
    el.classList.add('highlighted');
    if (explainEl) explainEl.textContent = tip;
  });
  el.addEventListener('mouseleave', () => {
    el.classList.remove('highlighted');
  });
});

/* ══════════════════════════════════════════
   AUTO-ADVANCE ON SLIDE ENTER
   ══════════════════════════════════════════ */
const _origOnSlideEnter = onSlideEnter;
function onSlideEnter(index) {
  _origOnSlideEnter(index);
  if (index === 6) {
    window._triggerBankAttention?.();
  }
}

/* ══════════════════════════════════════════
   KICK OFF
   ══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', init);
