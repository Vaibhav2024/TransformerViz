import { gsap } from 'gsap';
import { relu, fakeEmbedding, seededRand } from '../utils/math.js';
import { currentTokens } from './slide1-tokenizer.js';

const INPUT_DIM  = 4;
const HIDDEN_DIM = 8;
const OUTPUT_DIM = 4;

export function enterSlide5() {
  drawFFNCanvas();
  drawReLUCanvas();
  gsap.from('#slide-5 .ffn-canvas-wrap', { y: 14, opacity: 0, duration: 0.5 });
  gsap.from('#slide-5 .relu-section',    { y: 14, opacity: 0, duration: 0.5, delay: 0.2 });
}

function drawFFNCanvas() {
  const canvas = document.getElementById('ffn-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const tok = currentTokens[0] || { id: 7592 };
  const inputVec = fakeEmbedding(tok.id, INPUT_DIM);
  const r = seededRand(tok.id + 42);

  const W1 = Array.from({ length: HIDDEN_DIM }, () =>
    Array.from({ length: INPUT_DIM }, () => r() * 2 - 1)
  );
  const pre    = W1.map(row => row.reduce((s, w, i) => s + w * inputVec[i], 0));
  const hidden = pre.map(relu);

  const W2 = Array.from({ length: OUTPUT_DIM }, () =>
    Array.from({ length: HIDDEN_DIM }, () => r() * 2 - 1)
  );
  const output = W2.map(row => row.reduce((s, w, i) => s + w * hidden[i], 0));

  const layerX       = [90, W / 2, W - 90];
  const layerCounts  = [INPUT_DIM, HIDDEN_DIM, OUTPUT_DIM];
  const layerLabels  = ['Input (d=4)', 'Hidden — ReLU (d=8)', 'Output (d=4)'];
  const allVals      = [inputVec, hidden, output];

  const maxAbs = Math.max(...allVals.flat().map(Math.abs), 0.001);
  const getY   = (i, total) => (H * 0.15) + (i / (total - 1)) * (H * 0.7);

  // Connections
  function drawConnections(li) {
    const x1 = layerX[li], x2 = layerX[li + 1];
    const n1 = layerCounts[li], n2 = layerCounts[li + 1];
    for (let i = 0; i < n1; i++) {
      for (let j = 0; j < n2; j++) {
        const alpha = Math.abs(allVals[li][i]) / maxAbs * 0.12;
        ctx.beginPath();
        ctx.moveTo(x1, getY(i, n1)); ctx.lineTo(x2, getY(j, n2));
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth = 0.5; ctx.stroke();
      }
    }
  }
  drawConnections(0); drawConnections(1);

  // Nodes
  layerCounts.forEach((count, li) => {
    const x = layerX[li];
    ctx.fillStyle = '#666';
    ctx.font = '600 10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(layerLabels[li], x, 14);

    for (let i = 0; i < count; i++) {
      const y   = getY(i, count);
      const v   = allVals[li][i];
      const t   = v / maxAbs;
      const abs = Math.abs(t);

      // Active glow
      if (abs > 0.15) {
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${abs * 0.06})`;
        ctx.fill();
      }

      // Node fill: bright = active, dark = inactive (ReLU killed)
      const bright = li === 1 && v <= 0 ? 25 : Math.round(40 + abs * 190);
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${bright},${bright},${bright})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.15 + abs * 0.25})`;
      ctx.lineWidth = 1.5; ctx.stroke();

      // Value text
      ctx.fillStyle = '#666';
      ctx.font = '9px "JetBrains Mono"';
      ctx.textAlign = 'left';
      const label = li === 1 && v <= 0 ? '→0' : v.toFixed(2);
      ctx.fillText(label, x + 10, y + 3);
    }
  });

  // Formula labels
  ctx.fillStyle = '#333';
  ctx.font = '10px "JetBrains Mono"';
  ctx.textAlign = 'center';
  ctx.fillText('xW₁ + b₁', (layerX[0] + layerX[1]) / 2, H - 10);
  ctx.fillText('ReLU( · )W₂ + b₂', (layerX[1] + layerX[2]) / 2, H - 10);

  // Pulse animation
  animatePulse(canvas, layerX, layerCounts, getY);
}

function animatePulse(canvas, layerX, layerCounts, getY) {
  let layer = 0, node = 0, frame = 0;
  const interval = setInterval(() => {
    const ctx   = canvas.getContext('2d');
    const count = layerCounts[layer];
    const x     = layerX[layer];
    const y     = getY(node, count);

    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    node++;
    if (node >= count) { node = 0; layer = (layer + 1) % layerX.length; }
    if (++frame > 60) clearInterval(interval);
  }, 100);
}

function drawReLUCanvas() {
  const canvas = document.getElementById('relu-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const padL = 50, padR = 20, padT = 20, padB = 30;
  const pW   = W - padL - padR;
  const pH   = H - padT - padB;
  const midX = padL + pW / 2;
  const midY = padT + pH / 2;

  // Axes
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + pH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(padL, midY); ctx.lineTo(padL + pW, midY); ctx.stroke();

  // Axis labels
  ctx.fillStyle = '#444'; ctx.font = '11px Inter'; ctx.textAlign = 'center';
  ctx.fillText('Input x', padL + pW / 2, padT + pH + 22);
  ctx.save(); ctx.translate(14, midY); ctx.rotate(-Math.PI / 2);
  ctx.fillText('ReLU(x)', 0, 0); ctx.restore();

  // Tick marks
  ctx.font = '9px "JetBrains Mono"'; ctx.fillStyle = '#333';
  [-2, -1, 1, 2].forEach(v => {
    const px = padL + ((v + 2) / 4) * pW;
    ctx.fillText(v, px, midY + 14);
  });

  // Negative region shading
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  ctx.fillRect(padL, padT, pW / 2, pH);

  // Negative line — dark, flat
  ctx.beginPath(); ctx.strokeStyle = '#333'; ctx.lineWidth = 2.5;
  ctx.moveTo(padL, midY); ctx.lineTo(padL + pW / 2, midY); ctx.stroke();

  // Positive line — bright white
  ctx.beginPath(); ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 2.5;
  ctx.moveTo(padL + pW / 2, midY); ctx.lineTo(padL + pW, padT + 5); ctx.stroke();

  // Labels
  ctx.fillStyle = '#444'; ctx.font = '11px Inter'; ctx.textAlign = 'center';
  ctx.fillText('x < 0 → output = 0', padL + pW * 0.25, midY - 10);
  ctx.fillStyle = '#ccc';
  ctx.fillText('x > 0 → output = x', padL + pW * 0.82, padT + 22);

  // Kink point
  ctx.beginPath(); ctx.arc(padL + pW / 2, midY, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#fff'; ctx.fill();
}
