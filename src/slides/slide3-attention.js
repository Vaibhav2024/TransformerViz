import { gsap } from 'gsap';
import { softmax, fakeEmbedding, seededRand, dot } from '../utils/math.js';
import { currentTokens } from './slide1-tokenizer.js';

export function enterSlide3() {
  const tokens = currentTokens.length
    ? currentTokens.slice(0, 4)
    : [{ text: 'hi', id: 7592 }, { text: 'world', id: 2264 }];

  const embedDim = 4;
  const sqrtD    = Math.sqrt(embedDim);

  const tokenData = tokens.map((tok, pos) => {
    const emb = fakeEmbedding(tok.id, embedDim);
    const r   = seededRand(tok.id + pos * 1000);
    const q   = emb.map(v => +(v * 0.8 + (r() - 0.5) * 0.4).toFixed(2));
    const k   = emb.map(v => +(v * 0.6 + (r() - 0.5) * 0.5).toFixed(2));
    const v   = emb.map(v => +(v * 0.7 + (r() - 0.5) * 0.3).toFixed(2));
    return { tok, emb, q, k, v };
  });

  renderQKV(tokenData);

  const scores  = tokenData.map(row => tokenData.map(col => +(dot(row.q, col.k) / sqrtD).toFixed(2)));
  renderScores(tokenData, scores);

  const weights = scores.map(row => softmax(row));
  drawHeatmap(tokenData, weights);
  renderWeightedSum(tokenData, weights);

  gsap.from('#slide-3 .att-step', { y: 14, opacity: 0, duration: 0.4, stagger: 0.1 });
}

function renderQKV(tokenData) {
  const el = document.getElementById('qkv-display');
  el.innerHTML = '';
  const shades = [
    'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.07)',
    'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.03)'
  ];
  tokenData.forEach((td, i) => {
    const card = document.createElement('div');
    card.className = 'qkv-card';
    card.style.borderColor = `rgba(255,255,255,${0.08 + i * 0.04})`;
    card.innerHTML = `
      <div class="qkv-token" style="background:${shades[i]}">"${td.tok.text}" <span style="color:#444;font-size:0.62rem">pos ${i}</span></div>
      <div class="qkv-row"><span class="qkv-key qkv-q">Q:</span> [${td.q.join(', ')}]</div>
      <div class="qkv-row"><span class="qkv-key qkv-k">K:</span> [${td.k.join(', ')}]</div>
      <div class="qkv-row"><span class="qkv-key qkv-v">V:</span> [${td.v.join(', ')}]</div>
    `;
    el.appendChild(card);
  });
}

function renderScores(tokenData, scores) {
  const el  = document.getElementById('score-matrix');
  const tbl = document.createElement('table');
  tbl.className = 'score-table';

  const head = document.createElement('tr');
  head.innerHTML = '<th>Q \\ K</th>' + tokenData.map(td => `<th>"${td.tok.text}"</th>`).join('');
  tbl.appendChild(head);

  scores.forEach((row, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td style="color:#555">"${tokenData[i].tok.text}"</td>` +
      row.map(v => `<td class="score-val">${v}</td>`).join('');
    tbl.appendChild(tr);
  });

  el.innerHTML = '';
  el.appendChild(tbl);
}

function drawHeatmap(tokenData, weights) {
  const canvas = document.getElementById('attention-heatmap');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const n   = tokenData.length;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const pad   = 65;
  const cellW = (W - pad) / n;
  const cellH = (H - pad) / n;

  ctx.fillStyle = '#555';
  ctx.font = '600 11px Inter';
  ctx.textAlign = 'center';
  tokenData.forEach((td, j) => ctx.fillText(`"${td.tok.text}"`, pad + j * cellW + cellW / 2, 14));

  ctx.textAlign = 'right';
  tokenData.forEach((td, i) => ctx.fillText(`"${td.tok.text}"`, pad - 6, pad + i * cellH + cellH / 2 + 4));

  ctx.textAlign = 'center';
  weights.forEach((row, i) => {
    row.forEach((w, j) => {
      const x = pad + j * cellW, y = pad + i * cellH;
      // White with alpha for the attention heat map
      const brightness = Math.round(30 + w * 220);
      ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
      ctx.fillRect(x + 1, y + 1, cellW - 2, cellH - 2);
      ctx.fillStyle = w > 0.5 ? '#000' : '#999';
      ctx.font = `600 ${Math.max(9, cellH * 0.28)}px "JetBrains Mono"`;
      ctx.fillText(`${Math.round(w * 100)}%`, x + cellW / 2, y + cellH / 2 + 4);
    });
  });
}

function renderWeightedSum(tokenData, weights) {
  const el = document.getElementById('weighted-sum');
  const firstRow = weights[0];
  const parts = firstRow.map((w, j) =>
    `<span class="ws-formula">${Math.round(w * 100)}%</span> × V("${tokenData[j].tok.text}")`
  ).join(' + ');
  el.innerHTML = `
    <div style="margin-bottom:0.5rem;color:#555;font-size:0.78rem">Output for "${tokenData[0].tok.text}" =</div>
    <div class="ws-formula" style="line-height:2;word-break:break-word;color:#aaa">${parts}</div>
    <div style="margin-top:0.75rem;font-size:0.78rem;color:#555">Each token gathers a <span style="color:#bbb">weighted blend</span> of all other tokens' Value vectors — this is how context flows between words!</div>
  `;
}
