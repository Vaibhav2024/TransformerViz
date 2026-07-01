import { gsap } from 'gsap';

const STEPS = [
  { label: 'Tokenization',   desc: 'Text → token IDs'  },
  { label: 'Embeddings',     desc: 'IDs → vectors'      },
  { label: 'Self-Attention', desc: 'Q·K·V context'      },
  { label: 'Add & Norm',     desc: 'Residual + norm'    },
  { label: 'Feed Forward',   desc: 'Per-pos MLP'        },
  { label: 'Softmax',        desc: '→ next token'       },
];

let raf;

export function enterSlide8() {
  cancelAnimationFrame(raf);

  const cv = document.getElementById('pipeline-summary-canvas');
  if (cv) {
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const logicalW = 720;
    const logicalH = 240;

    cv.width = logicalW * dpr;
    cv.height = logicalH * dpr;
    cv.style.width = '100%';
    cv.style.maxWidth = `${logicalW}px`;
    cv.style.height = 'auto';

    ctx.resetTransform();
    ctx.scale(dpr, dpr);
  }

  drawStatic();
  animateDot();
  gsap.from('#slide-8 .summary-steps .sum-step', { y: 14, opacity: 0, duration: 0.4, stagger: 0.08 });
}

function getCtx() {
  const c = document.getElementById('pipeline-summary-canvas');
  return c ? { ctx: c.getContext('2d'), W: 720, H: 240 } : null;
}

function layout() {
  const cv = document.getElementById('pipeline-summary-canvas');
  if (!cv) return {};
  const W = 720, H = 240;
  const padL = 30, padR = 30;
  const blockW = (W - padL - padR - (STEPS.length - 1) * 18) / STEPS.length;
  const blockH = 88;
  const startY = (H - blockH) / 2;
  return { W, H, padL, blockW, blockH, startY };
}

function drawStatic() {
  const res = getCtx(); if (!res) return;
  const { ctx, W, H } = res;
  const { padL, blockW, blockH, startY } = layout();
  ctx.clearRect(0, 0, W, H);

  const arrowY = startY + blockH / 2;

  STEPS.forEach((step, i) => {
    const x = padL + i * (blockW + 18);

    // Arrow connector
    if (i > 0) {
      const ax = x - 18;
      ctx.beginPath(); ctx.moveTo(ax, arrowY); ctx.lineTo(ax + 12, arrowY);
      ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax + 12, arrowY - 4);
      ctx.lineTo(ax + 18, arrowY);
      ctx.lineTo(ax + 12, arrowY + 4);
      ctx.fillStyle = '#2a2a2a'; ctx.fill();
    }

    // Block — brightness increases with step
    const blockAlpha = 0.03 + i * 0.01;
    ctx.fillStyle   = `rgba(255,255,255,${blockAlpha})`;
    ctx.strokeStyle = `rgba(255,255,255,${0.06 + i * 0.02})`;
    ctx.lineWidth   = 1.2;
    roundRect(ctx, x, startY, blockW, blockH, 8);
    ctx.fill(); ctx.stroke();

    // Step number
    const numBright = 35 + i * 8;
    ctx.fillStyle = `rgb(${numBright},${numBright},${numBright})`;
    ctx.font = '700 23px Inter'; ctx.textAlign = 'center';
    ctx.fillText(`0${i + 1}`, x + blockW / 2, startY + 28);

    // Label
    ctx.fillStyle = `rgba(255,255,255,${0.65 + i * 0.08})`;
    ctx.font = '600 11px Inter';
    ctx.fillText(step.label, x + blockW / 2, startY + 48);

    // Desc
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '10px Inter';
    ctx.fillText(step.desc, x + blockW / 2, startY + 64);
  });
}

function animateDot() {
  const cv = document.getElementById('pipeline-summary-canvas');
  if (!cv) return;
  const { padL, blockW, blockH, startY } = layout();
  const arrowY = startY + blockH / 2;
  let pos = 0, progress = 0;

  function tick() {
    drawStatic();
    const ctx = cv.getContext('2d');
    const x1 = padL + pos * (blockW + 18) + blockW / 2;
    const x2 = pos < STEPS.length - 1
      ? padL + (pos + 1) * (blockW + 18) + blockW / 2
      : x1;
    const dotX = x1 + (x2 - x1) * progress;

    // Draw the flowing dot
    const grd = ctx.createRadialGradient(dotX, arrowY, 0, dotX, arrowY, 7);
    grd.addColorStop(0, 'rgba(255,255,255,0.9)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.beginPath(); ctx.arc(dotX, arrowY, 5, 0, Math.PI * 2);
    ctx.fillStyle = grd; ctx.fill();

    // Ripple
    ctx.beginPath(); ctx.arc(dotX, arrowY, 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1; ctx.stroke();

    progress += 0.016;
    if (progress >= 1) { progress = 0; pos = (pos + 1) % STEPS.length; }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
}
