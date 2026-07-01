import './style.css';
import { gsap } from 'gsap';

import { initSlide1, enterSlide1 } from './slides/slide1-tokenizer.js';
import { enterSlide2 }              from './slides/slide2-embeddings.js';
import { enterSlide3 }              from './slides/slide3-attention.js';
import { enterSlide4 }              from './slides/slide4-addnorm.js';
import { enterSlide5 }              from './slides/slide5-feedforward.js';
import { enterSlide6 }              from './slides/slide6-backprop.js';
import { initSlide7, enterSlide7 }  from './slides/slide7-controls.js';
import { enterSlide8 }              from './slides/slide8-summary.js';
import { speakSlide, replaySlide, stop, getIsSpeaking, getUserStopped } from './utils/audio.js';

/* ═══════════════════════════════════════
   SLIDE REGISTRY
   ═══════════════════════════════════════ */
const SLIDES_CONFIG = [
  { id: 'slide-1', name: 'Tokenization',          onEnter: enterSlide1 },
  { id: 'slide-2', name: 'Embeddings & Pos. Enc.', onEnter: enterSlide2 },
  { id: 'slide-3', name: 'Self-Attention (Q,K,V)', onEnter: enterSlide3 },
  { id: 'slide-4', name: 'Add & Norm',             onEnter: enterSlide4 },
  { id: 'slide-5', name: 'Feed Forward Network',   onEnter: enterSlide5 },
  { id: 'slide-6', name: 'Backpropagation',        onEnter: enterSlide6 },
  { id: 'slide-7', name: 'Context & Temperature',  onEnter: enterSlide7 },
  { id: 'slide-8', name: 'Pipeline Summary',       onEnter: enterSlide8 },
];
const TOTAL = SLIDES_CONFIG.length;

let current   = 0;
let animating = false;

/* ═══════════════════════════════════════
   INIT
   ═══════════════════════════════════════ */
function init() {
  buildDotNav();
  initSlide1();
  initSlide7();

  // Activate first slide immediately
  document.getElementById(SLIDES_CONFIG[0].id)?.classList.add('active');

  // Short delay to let browser load voices, then auto-play slide 1
  setTimeout(() => {
    SLIDES_CONFIG[0].onEnter?.();
    speakSlide(0);
  }, 200);

  updateUI();

  // Button listeners
  document.getElementById('prev-btn').addEventListener('click', () => navigate(-1));
  document.getElementById('next-btn').addEventListener('click', () => navigate(1));
  document.getElementById('restart-btn')?.addEventListener('click', () => goTo(0));

  // Audio header button — toggle play/stop
  document.getElementById('audio-btn')?.addEventListener('click', () => {
    if (getIsSpeaking()) {
      stop();
    } else {
      replaySlide(current);
    }
  });

  // Narration cards (click to replay)
  document.querySelectorAll('.narration-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.slide ?? '0');
      replaySlide(idx);
    });
  });

  // Keyboard — guard against stealing input focus
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    const isTyping = tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable;
    if (isTyping) return; // don't intercept ANY key while user is typing

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate(1);
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   navigate(-1);
    if (e.key === ' ') {
      e.preventDefault();
      getIsSpeaking() ? stop() : replaySlide(current);
    }
  });
}

function buildDotNav() {
  const nav = document.getElementById('dot-nav');
  SLIDES_CONFIG.forEach((sc, i) => {
    const btn = document.createElement('button');
    btn.className = 'dot-item' + (i === 0 ? ' active' : '');
    btn.title = sc.name;
    btn.setAttribute('aria-label', sc.name);
    btn.addEventListener('click', () => goTo(i));
    nav.appendChild(btn);
  });
}

/* ═══════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════ */
function navigate(dir) { goTo(current + dir); }

function goTo(idx) {
  if (animating) return;
  if (idx < 0 || idx >= TOTAL || idx === current) return;
  animating = true;

  const old   = current;
  current     = idx;

  const oldEl = document.getElementById(SLIDES_CONFIG[old].id);
  const newEl = document.getElementById(SLIDES_CONFIG[idx].id);

  // Stop current audio before transition
  stop();

  // Exit old
  oldEl?.classList.add('exit-up');
  setTimeout(() => { oldEl?.classList.remove('active', 'exit-up'); }, 450);

  // Enter new
  if (newEl) {
    newEl.style.opacity   = '0';
    newEl.style.transform = `translateY(${idx > old ? '20px' : '-20px'})`;
    newEl.classList.add('active');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        newEl.style.opacity   = '';
        newEl.style.transform = '';
        setTimeout(() => {
          animating = false;
          SLIDES_CONFIG[idx].onEnter?.();
          // Play narration after slide finishes animating in
          setTimeout(() => speakSlide(idx), 300);
        }, 460);
      });
    });
  } else {
    animating = false;
  }

  updateUI();
}

function updateUI() {
  // Progress bar
  document.getElementById('progress-bar-fill').style.width = `${((current + 1) / TOTAL) * 100}%`;

  // Step pill
  document.getElementById('step-pill').textContent = `Step ${current + 1} / ${TOTAL}`;

  // Nav
  document.getElementById('prev-btn').disabled = current === 0;
  document.getElementById('next-btn').disabled = current === TOTAL - 1;
  document.getElementById('nav-slide-name').textContent = SLIDES_CONFIG[current].name;

  // Dot nav
  document.querySelectorAll('.dot-item').forEach((d, i) => d.classList.toggle('active', i === current));
}

/* ═══════════════════════════════════════
   SUBTLE BACKGROUND PARTICLES
   ═══════════════════════════════════════ */
function initParticles() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let W, H, particles;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    const count = Math.floor(W * H / 22000);
    particles = Array.from({ length: count }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      r:  Math.random() * 0.8 + 0.2,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      a:  Math.random() * 0.18 + 0.04,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach((p, i) => {
      // Connections
      for (let j = i + 1; j < Math.min(i + 8, particles.length); j++) {
        const q = particles[j];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < 100) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(255,255,255,${0.03 * (1 - d / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
      // Particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${p.a})`;
      ctx.fill();

      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize(); draw();
}

/* ═══════════════════════════════════════
   KICK OFF
   ═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  init();
});
