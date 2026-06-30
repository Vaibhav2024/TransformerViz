import { gsap } from 'gsap';
import { fakeEmbedding, positionalEncoding } from '../utils/math.js';
import { currentTokens } from './slide1-tokenizer.js';

export function enterSlide2() {
  const tokens = currentTokens.length ? currentTokens : [{ text: 'hi', id: 7592 }];
  const tok    = tokens[0];
  const embed  = fakeEmbedding(tok.id, 8);
  const peVec  = positionalEncoding(0, 8);

  updatePipeline(tok, embed);
  renderBars(embed, tok.text);
  drawPECanvas(peVec, embed);
  renderPEAddition(embed, peVec);

  gsap.from('#slide-2 .embed-pipeline',    { y: 14, opacity: 0, duration: 0.5 });
  gsap.from('#slide-2 .embed-bars-section',{ y: 14, opacity: 0, duration: 0.5, delay: 0.12 });
  gsap.from('#slide-2 .pe-section',        { y: 14, opacity: 0, duration: 0.5, delay: 0.24 });
}

function updatePipeline(tok, embed) {
  document.getElementById('ep-token-id').textContent   = tok.id;
  document.getElementById('ep-token-word').textContent = `"${tok.text}"`;
  document.getElementById('ep-row-label').textContent  = `row ${tok.id} selected`;

  const grid   = document.getElementById('embed-grid');
  grid.innerHTML = '';
  const rows = 4, selRow = Math.min(Math.floor(tok.id / (50000 / rows)), rows - 1);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 4; c++) {
      const cell = document.createElement('div');
      cell.className = 'embed-grid-cell' + (r === selRow ? ' selected' : '');
      grid.appendChild(cell);
    }
  }

  const vdisplay = document.getElementById('embed-vector-display');
  vdisplay.innerHTML = '';
  embed.forEach((v, i) => {
    const row = document.createElement('div');
    row.className = 'embed-vector-row';
    const cls = v >= 0 ? 'embed-val-pos' : 'embed-val-neg';
    row.innerHTML = `<span class="embed-dim-label">d${i}:</span><span class="${cls}">${v.toFixed(3)}</span>`;
    vdisplay.appendChild(row);
  });
}

function renderBars(embed, word) {
  document.getElementById('embed-word-label').textContent = word;
  const container = document.getElementById('embed-bars');
  const dimsEl    = document.getElementById('dim-labels');
  container.innerHTML = '';
  dimsEl.innerHTML    = '';

  const maxAbs = Math.max(...embed.map(Math.abs), 0.01);

  embed.forEach((v, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'embed-bar-wrap';

    const pct   = Math.abs(v) / maxAbs;
    const isPos = v >= 0;

    const bar = document.createElement('div');
    bar.className  = 'embed-bar';
    // White for positive, mid-gray for negative
    bar.style.background = isPos
      ? `rgba(255,255,255,${0.4 + pct * 0.55})`
      : `rgba(255,255,255,${0.15 + pct * 0.2})`;
    bar.style.height = '3px';

    if (isPos) {
      wrap.style.justifyContent = 'flex-end';
      bar.style.marginTop = 'auto';
    } else {
      wrap.style.justifyContent = 'flex-start';
    }

    wrap.appendChild(bar);
    container.appendChild(wrap);

    const targetH = Math.max(pct * 44, 3);
    gsap.to(bar, { height: targetH, duration: 0.7, delay: i * 0.06, ease: 'power2.out' });

    const lbl = document.createElement('div');
    lbl.className = 'dim-label';
    lbl.textContent = `d${i}`;
    dimsEl.appendChild(lbl);
  });
}

function drawPECanvas(peVec, embed) {
  const canvas = document.getElementById('pe-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const waves = [
    { label: 'sin₀', brightness: 0.8, fn: x => Math.sin(x * 1.0)  },
    { label: 'cos₁', brightness: 0.6, fn: x => Math.cos(x * 1.0)  },
    { label: 'sin₂', brightness: 0.5, fn: x => Math.sin(x * 0.5)  },
    { label: 'cos₃', brightness: 0.3, fn: x => Math.cos(x * 0.5)  },
  ];

  const waveH = H / waves.length;
  const dotX  = 0.15 * (W - 80) + 60;

  waves.forEach((wave, wi) => {
    const yBase = wi * waveH + waveH / 2;
    const col   = `rgba(255,255,255,${wave.brightness})`;

    // Axis
    ctx.strokeStyle = '#1e1e1e'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(60, yBase); ctx.lineTo(W - 20, yBase); ctx.stroke();

    // Label
    ctx.fillStyle = col; ctx.font = '600 10px "JetBrains Mono"';
    ctx.fillText(wave.label, 4, yBase + 4);

    // Wave
    ctx.beginPath(); ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    for (let px = 60; px <= W - 20; px++) {
      const t = (px - 60) / (W - 80) * Math.PI * 4;
      const y = yBase - wave.fn(t) * (waveH * 0.38);
      if (px === 60) ctx.moveTo(px, y); else ctx.lineTo(px, y);
    }
    ctx.stroke();

    // Dot at position 0
    const vy = yBase - wave.fn(0.15 * Math.PI * 4) * (waveH * 0.38);
    ctx.beginPath(); ctx.arc(dotX, vy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();

    // Value
    ctx.fillStyle = '#666'; ctx.font = '600 10px "JetBrains Mono"';
    ctx.fillText(peVec[wi].toFixed(3), W - 52, yBase + 4);
  });

  ctx.fillStyle = '#333'; ctx.font = '10px Inter';
  ctx.fillText('White dot = value at position 0. Each position gives a unique dot position.', 4, H - 4);
}

function renderPEAddition(embed, pe) {
  const row = document.getElementById('pe-addition-row');
  row.innerHTML = '';
  const result = embed.map((v, i) => +(v + pe[i]).toFixed(3));

  function makeRow(label, vals) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:6px;width:100%';
    const lbl = document.createElement('span');
    lbl.className = 'pe-label'; lbl.textContent = label;
    wrap.appendChild(lbl);
    vals.forEach(v => {
      const span = document.createElement('span');
      span.className = 'pe-val';
      span.textContent = v.toFixed ? v.toFixed(2) : v;
      wrap.appendChild(span);
    });
    return wrap;
  }

  const divider = document.createElement('span');
  divider.className = 'pe-divider'; divider.textContent = '+';

  row.appendChild(makeRow('Embedding:', embed));
  row.appendChild(divider);
  row.appendChild(makeRow('Position 0:', pe));
  const eqRow = makeRow('= Final Input:', result);
  eqRow.querySelectorAll('.pe-val').forEach(el => {
    el.style.cssText += ';border-color:#3a3a3a;color:#ccc';
  });
  row.appendChild(eqRow);
}
