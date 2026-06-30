import { gsap } from 'gsap';
import { softmax } from '../utils/math.js';

const TOTAL_TOKENS = 30;

// Candidate next words at different temperatures
const LOW_WORDS = [
  { w: 'is',    base: 0.65 },
  { w: 'was',   base: 0.20 },
  { w: 'are',   base: 0.10 },
  { w: 'were',  base: 0.04 },
  { w: 'be',    base: 0.01 },
];

const HIGH_WORDS = [
  { w: 'explodes', base: 0.12 },
  { w: 'dances',   base: 0.18 },
  { w: 'learns',   base: 0.20 },
  { w: 'creates',  base: 0.25 },
  { w: 'imagines', base: 0.25 },
];

const WORD_COLORS = ['#e8630a','#00bcd4','#4caf50','#7c4dff','#ffc107'];

export function initSlide7() {
  // Context slider
  const ctxSlider = document.getElementById('ctx-slider');
  const tokBox    = document.getElementById('context-tokens');

  function renderCtx(n) {
    tokBox.innerHTML = '';
    for (let i = 0; i < TOTAL_TOKENS; i++) {
      const t = document.createElement('div');
      t.className = 'ctx-tok ' + (i < n ? 'in' : 'out');
      tokBox.appendChild(t);
    }
  }

  ctxSlider?.addEventListener('input', () => renderCtx(+ctxSlider.value));
  renderCtx(+(ctxSlider?.value ?? 12));

  // Temperature slider
  const tempSlider  = document.getElementById('temp-slider');
  const tempValEl   = document.getElementById('temp-val-display');
  const tempWordsEl = document.getElementById('temp-words');
  const probBarsEl  = document.getElementById('prob-bars');

  const PALETTE = [
    { bg:'rgba(232,99,10,0.25)',  border:'rgba(232,99,10,0.5)',  color:'#ff9955' },
    { bg:'rgba(0,188,212,0.2)',   border:'rgba(0,188,212,0.4)',  color:'#4dd0e1' },
    { bg:'rgba(76,175,80,0.2)',   border:'rgba(76,175,80,0.4)',  color:'#81c784' },
    { bg:'rgba(124,77,255,0.2)',  border:'rgba(124,77,255,0.4)', color:'#b39ddb' },
    { bg:'rgba(255,193,7,0.2)',   border:'rgba(255,193,7,0.4)',  color:'#ffd54f' },
  ];

  function renderTemp(val) {
    const t = val / 100;
    if (tempValEl) tempValEl.textContent = t.toFixed(1);

    // Words display
    if (tempWordsEl) {
      const words = t < 0.35 ? LOW_WORDS : t > 0.65 ? HIGH_WORDS : [
        { w: 'is', base: 0.35 },{ w: 'was', base: 0.25 },{ w: 'seems', base: 0.2 },
        { w: 'feels', base: 0.12 },{ w: 'becomes', base: 0.08 },
      ];
      tempWordsEl.innerHTML = '';
      words.forEach((item, i) => {
        const pal = PALETTE[i % PALETTE.length];
        const chip = document.createElement('div');
        chip.className = 'tw-chip';
        chip.style.cssText = `background:${pal.bg};border:1px solid ${pal.border};color:${pal.color};animation-delay:${i*0.05}s`;
        chip.textContent = item.w;
        tempWordsEl.appendChild(chip);
      });
    }

    // Prob bars — apply temperature scaling
    if (probBarsEl) {
      const words = t < 0.35 ? LOW_WORDS : t > 0.65 ? HIGH_WORDS : [
        { w: 'is', base: 0.35 },{ w: 'was', base: 0.25 },{ w: 'seems', base: 0.2 },
        { w: 'feels', base: 0.12 },{ w: 'becomes', base: 0.08 },
      ];

      // Logits → softmax with temperature
      const logits = words.map(w => Math.log(w.base));
      const scaled = logits.map(l => l / Math.max(t, 0.01));
      const probs  = softmax(scaled);

      probBarsEl.innerHTML = '';
      probs.forEach((prob, i) => {
        const row = document.createElement('div');
        row.className = 'prob-bar-row';
        row.innerHTML = `
          <div class="prob-word">"${words[i].w}"</div>
          <div class="prob-track"><div class="prob-fill" style="width:${prob*100}%;background:${WORD_COLORS[i%WORD_COLORS.length]}"></div></div>
          <div class="prob-pct">${(prob*100).toFixed(1)}%</div>
        `;
        probBarsEl.appendChild(row);
      });
    }
  }

  tempSlider?.addEventListener('input', () => renderTemp(+tempSlider.value));
  renderTemp(+(tempSlider?.value ?? 50));
}

export function enterSlide7() {
  gsap.from('#slide-7 .ctrl-card', { y: 16, opacity: 0, duration: 0.5, stagger: 0.1 });
}
