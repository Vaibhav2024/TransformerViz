import { gsap } from 'gsap';
import { normalize, fakeEmbedding, seededRand } from '../utils/math.js';
import { currentTokens } from './slide1-tokenizer.js';

export function enterSlide4() {
  const tokens = currentTokens.length ? currentTokens : [{ text: 'hi', id: 7592 }];
  const tok = tokens[0];

  const r = seededRand(tok.id);
  const inputX   = fakeEmbedding(tok.id, 7).map(v => +v.toFixed(2));
  const attnOut  = inputX.map(v => +(v * 0.4 + (r() - 0.5) * 0.6).toFixed(2));
  const added    = inputX.map((v, i) => +(v + attnOut[i]).toFixed(2));
  const { normalized, mean } = normalize(added);
  const normed   = normalized.map(v => +v.toFixed(2));

  // Render flow with GSAP animation
  animateFlow();
  renderCalc(inputX, attnOut, added, mean, normed);

  gsap.from('#slide-4 .addnorm-layout', { y: 16, opacity: 0, duration: 0.5 });
}

function animateFlow() {
  const boxes = [
    document.getElementById('flow-input'),
    document.getElementById('flow-attn'),
    document.getElementById('flow-add'),
    document.getElementById('flow-norm'),
    document.getElementById('flow-output'),
  ];

  const arrows = [
    document.getElementById('fa-1'),
    document.getElementById('fa-2'),
    document.getElementById('fa-3'),
    document.getElementById('fa-4'),
  ];

  // Reset
  boxes.forEach(b => { if (b) b.classList.remove('lit'); });

  const tl = gsap.timeline({ delay: 0.3 });
  boxes.forEach((box, i) => {
    if (!box) return;
    tl.call(() => box.classList.add('lit'), [], i * 0.5)
      .call(() => { if (i > 0) boxes[i-1]?.classList.remove('lit'); }, [], i * 0.5 + 0.4);
  });
}

function renderCalc(inputX, attnOut, added, mean, normed) {
  function fillRow(elId, values, cssClass) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = '';

    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-family:var(--mono);font-size:0.7rem;color:#555;margin-right:6px;white-space:nowrap';
    lbl.textContent = {
      'calc-original': 'Original input x:',
      'calc-attn':     'Attention output:',
      'calc-added':    'After Add (x + Att):',
      'calc-normed':   'After Layer Norm:',
    }[elId] || '';
    el.appendChild(lbl);

    values.forEach((v, i) => {
      const chip = document.createElement('div');
      chip.className = 'calc-val ' + (v >= 0 ? 'pos' : 'neg');
      chip.style.animationDelay = `${i * 0.04}s`;
      chip.textContent = v.toFixed(2);
      el.appendChild(chip);
    });
  }

  fillRow('calc-original', inputX);
  fillRow('calc-attn', attnOut);
  fillRow('calc-added', added);
  fillRow('calc-normed', normed);

  const noteEl = document.getElementById('calc-mean-note');
  if (noteEl) noteEl.textContent = `mean = ${mean.toFixed(3)} → will be centered to 0`;
}
