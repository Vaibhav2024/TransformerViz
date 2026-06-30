import { tokenize } from '../utils/math.js';
import { gsap } from 'gsap';

/* Chip colour palette */
const PALETTES = [
  { bg:'rgba(232,99,10,0.25)',  border:'rgba(232,99,10,0.5)',  color:'#ff9955' },
  { bg:'rgba(0,188,212,0.2)',   border:'rgba(0,188,212,0.4)',  color:'#4dd0e1' },
  { bg:'rgba(76,175,80,0.2)',   border:'rgba(76,175,80,0.4)',  color:'#81c784' },
  { bg:'rgba(124,77,255,0.2)',  border:'rgba(124,77,255,0.4)', color:'#b39ddb' },
  { bg:'rgba(255,193,7,0.2)',   border:'rgba(255,193,7,0.4)',  color:'#ffd54f' },
  { bg:'rgba(244,114,182,0.2)', border:'rgba(244,114,182,0.4)',color:'#f48fb1' },
];

const VOCAB_SAMPLE = [
  ['hello',15339],['the',262],['a',257],['is',318],['world',2264],
  ['how',703],['are',389],['you',345],['i',314],['love',1842],
  ['ai',7379],['cat',3797],['dog',3290],['good',922],
];

export let currentTokens = [];

export function initSlide1() {
  const input      = document.getElementById('tok-input');
  const display    = document.getElementById('tokens-display');
  const splitLabel = document.getElementById('tok-split-label');
  const vocabWrap  = document.getElementById('vocab-table-wrap');
  const vocabTable = document.getElementById('vocab-table');
  const takeaway   = document.getElementById('tok-takeaway');
  const tkText     = document.getElementById('tok-takeaway-text');
  const charCount  = document.getElementById('tok-char-count');

  // Build static vocab sample rows
  VOCAB_SAMPLE.forEach(([w, id]) => {
    const row = document.createElement('div');
    row.className = 'vocab-row';
    row.dataset.word = w;
    row.innerHTML = `<span class="vocab-word">${w}</span><span class="vocab-id">${id}</span>`;
    vocabTable.appendChild(row);
  });
  // More indicator
  const more = document.createElement('div');
  more.className = 'vocab-row';
  more.style.color = 'var(--text-dim)';
  more.style.gridColumn = '1 / -1';
  more.style.justifyContent = 'center';
  more.innerHTML = '…&nbsp;50,000 more';
  vocabTable.appendChild(more);

  function render(text) {
    charCount.textContent = text.length;
    const tokens = tokenize(text);
    currentTokens = tokens;

    display.innerHTML = '';

    if (!tokens.length) {
      splitLabel.style.display = 'none';
      vocabWrap.style.display = 'none';
      takeaway.style.display = 'none';
      return;
    }

    splitLabel.style.display = 'block';
    vocabWrap.style.display  = 'block';
    takeaway.style.display   = 'flex';

    tokens.forEach((tok, i) => {
      const pal  = PALETTES[i % PALETTES.length];
      const chip = document.createElement('div');
      chip.className = 'tok-chip';
      chip.style.cssText = `background:${pal.bg};border:1px solid ${pal.border};color:${pal.color};animation-delay:${i*0.05}s`;
      chip.innerHTML = `"${tok.text}"<span class="tok-chip-id">ID: ${tok.id}</span>`;
      display.appendChild(chip);
    });

    // Highlight vocab rows
    document.querySelectorAll('.vocab-row[data-word]').forEach(row => {
      const matched = tokens.some(t => t.text.toLowerCase() === row.dataset.word);
      row.classList.toggle('highlighted', matched);
    });

    const ids = tokens.map(t => `[${t.id}]`).join(' → ');
    tkText.textContent = `Key takeaway: "${text}" → ${ids}. Now the model can do math on it!`;
  }

  input.addEventListener('input', () => render(input.value));

  // Animate on first enter
  render(input.value || '');
}

export function enterSlide1() {
  gsap.from('#slide-1 .theory-box', { y: 16, opacity: 0, duration: 0.5, stagger: 0.1 });
}
