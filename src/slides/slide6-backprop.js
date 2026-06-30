import { gsap } from 'gsap';

/* ══════════════════════════════════════════════════════
   NETWORK DEFINITION
   ══════════════════════════════════════════════════════ */
const LAYERS_DEF = [
  { label: 'Input',      sublabel: 'Tokens',    nodes: 4 },
  { label: 'Embedding',  sublabel: 'd = 512',   nodes: 5 },
  { label: 'Attention',  sublabel: 'Q · K · V', nodes: 6 },
  { label: 'Feed Fwd',   sublabel: 'ReLU',      nodes: 6 },
  { label: 'Softmax',    sublabel: 'Output',    nodes: 3 },
];

const NODE_R      = 14;   // node radius
const PULSE_SPEED = 0.006; // fraction of connection length per frame
const LAYER_MS    = 900;   // ms between layer activations
const NODE_MS     = 160;   // ms between node activations within a layer
const LOSS_HOLD   = 1200;  // ms to show loss before backward pass

/* ── Animation state ── */
let raf;
let canvas, ctx;
let W, H;
let layerX = [];       // x coordinate per layer
let nodeY  = [];       // nodeY[l][n] = y coordinate

/* activation[l][n] = 0..1 (0=dark, 1=bright) */
let activation = [];
/* gradient[l][n] = string label shown on backward pass */
let gradLabel  = [];
/* pulses: {x1,y1,x2,y2,t,dir} where t=0..1, dir='fwd'|'bwd' */
let pulses     = [];

let phase      = 'idle'; // idle | forward | backward | done
let lossShown  = false;

/* ── Seeded rand for consistent gradient values ── */
function seedRand(s) {
  let x = s;
  return () => { x = (x * 1664525 + 1013904223) & 0xFFFFFFFF; return (x >>> 0) / 0xFFFFFFFF; };
}

/* ══════════════════════════════════════════════════════
   INIT & LAYOUT
   ══════════════════════════════════════════════════════ */
export function enterSlide6() {
  canvas = document.getElementById('backprop-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  W   = canvas.width;
  H   = canvas.height;

  computeLayout();
  resetState();
  drawFrame();   // static first frame

  // Wire buttons explicitly when slide is entered
  document.getElementById('bp-forward-btn').onclick  = startForward;
  document.getElementById('bp-backward-btn').onclick = startBackward;
  document.getElementById('bp-reset-btn').onclick    = () => {
    clearTimers();
    cancelAnimationFrame(raf);
    phase     = 'idle';
    lossShown = false;
    resetState();
    drawFrame();
    document.getElementById('loss-display').style.display = 'none';
    setStatus('Click "Run Forward Pass" to begin a training step');
    updateButtons();
  };

  setStatus('Click "Run Forward Pass" to begin a training step');
  updateButtons();
  loop();
}

function computeLayout() {
  const padL = 60, padR = 60, padT = 70, padB = 60;
  const n = LAYERS_DEF.length;
  layerX = LAYERS_DEF.map((_, i) => padL + (i / (n - 1)) * (W - padL - padR));
  nodeY  = LAYERS_DEF.map((ld, l) => {
    const count  = ld.nodes;
    const usable = H - padT - padB;
    const step   = usable / (count + 1);
    return Array.from({ length: count }, (_, n) => padT + step * (n + 1));
  });
}

function resetState() {
  phase     = 'idle';
  pulses    = [];
  activation = LAYERS_DEF.map(ld => Array(ld.nodes).fill(0));
  gradLabel  = LAYERS_DEF.map(ld => Array(ld.nodes).fill(''));
}

let timers = [];

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

/* ══════════════════════════════════════════════════════
   FORWARD PASS
   ══════════════════════════════════════════════════════ */
function startForward() {
  clearTimers();
  phase     = 'forward';
  lossShown = false;
  resetState();
  pulses = [];
  cancelAnimationFrame(raf);
  updateButtons();
  setStatus('→ Forward pass: activating each layer in sequence…');
  document.getElementById('loss-display').style.display = 'none';

  /* Schedule each layer activation */
  LAYERS_DEF.forEach((ld, l) => {
    const layerDelay = l * LAYER_MS;

    /* Animate nodes in this layer one by one */
    ld.nodes && Array.from({ length: ld.nodes }).forEach((_, n) => {
      const t = setTimeout(() => {
        if (phase !== 'forward') return;
        const obj = { val: 0 };
        gsap.to(obj, {
          val: 1,
          duration: 0.5,
          ease: 'power2.out',
          onUpdate: () => {
            activation[l][n] = obj.val;
          }
        });
      }, layerDelay + n * NODE_MS);
      timers.push(t);
    });

    /* Spawn connection pulses toward next layer */
    if (l < LAYERS_DEF.length - 1) {
      const pDelay = layerDelay + (ld.nodes * NODE_MS) * 0.4;
      const t = setTimeout(() => {
        if (phase !== 'forward') return;
        spawnPulses(l, l + 1, 'fwd');
      }, pDelay);
      timers.push(t);
    }
  });

  /* After all layers done → show loss */
  const totalFwd = (LAYERS_DEF.length - 1) * LAYER_MS + LAYERS_DEF[LAYERS_DEF.length - 1].nodes * NODE_MS + 400;
  const tFinal = setTimeout(() => {
    if (phase !== 'forward') return;
    showLoss();
    phase = 'idle';
    updateButtons();
    setStatus('✓ Forward pass complete. Model predicted "runs" — incorrect! Run backward pass to compute gradients.');
  }, totalFwd);
  timers.push(tFinal);

  /* Start render loop */
  loop();
}

/* ══════════════════════════════════════════════════════
   BACKWARD PASS
   ══════════════════════════════════════════════════════ */
function startBackward() {
  clearTimers();
  phase  = 'backward';
  pulses = [];
  cancelAnimationFrame(raf);
  updateButtons();
  setStatus('← Backward pass: computing ∂L/∂W for every weight via chain rule…');

  const r = seedRand(42);
  const lastL = LAYERS_DEF.length - 1;

  /* Schedule each layer (right to left) */
  for (let l = lastL; l >= 0; l--) {
    const delay = (lastL - l) * LAYER_MS;

    LAYERS_DEF[l].nodes && Array.from({ length: LAYERS_DEF[l].nodes }).forEach((_, n) => {
      const t = setTimeout(() => {
        if (phase !== 'backward') return;
        /* Dim to ~40% then pulse with gradient glow */
        const obj = { val: activation[l][n] };
        gsap.to(obj, {
          val: 0.35,
          duration: 0.3,
          ease: 'power1.in',
          onUpdate: () => {
            activation[l][n] = obj.val;
          },
          onComplete: () => {
            if (phase !== 'backward') return;
            const obj2 = { val: 0.35 };
            gsap.to(obj2, {
              val: 0.7,
              duration: 0.4,
              ease: 'power2.out',
              onUpdate: () => {
                activation[l][n] = obj2.val;
              }
            });
          }
        });
        /* Show gradient annotation */
        const gval = (r() * 0.48 + 0.01).toFixed(3);
        gradLabel[l][n] = `∂L/∂w=${gval}`;
      }, delay + n * NODE_MS);
      timers.push(t);
    });

    /* Backward pulses toward previous layer */
    if (l > 0) {
      const pDelay = delay + LAYERS_DEF[l].nodes * NODE_MS * 0.4;
      const t = setTimeout(() => {
        if (phase !== 'backward') return;
        spawnPulses(l, l - 1, 'bwd');
      }, pDelay);
      timers.push(t);
    }
  }

  /* Done */
  const totalBwd = lastL * LAYER_MS + LAYERS_DEF[0].nodes * NODE_MS + 600;
  const tFinal = setTimeout(() => {
    if (phase !== 'backward') return;
    phase = 'done';
    updateButtons();
    setStatus('✓ All weights updated:  W ← W − α · ∂L/∂W  (α = 0.0001). Loss will be lower next forward pass!');
    showWeightUpdateOverlay();
  }, totalBwd);
  timers.push(tFinal);

  loop();
}

/* ══════════════════════════════════════════════════════
   PULSE SPAWNING
   ══════════════════════════════════════════════════════ */
function spawnPulses(fromL, toL, dir) {
  const fromNodes = LAYERS_DEF[fromL].nodes;
  const toNodes   = LAYERS_DEF[toL].nodes;

  /* Only spawn a representative subset so screen doesn't get cluttered */
  const maxPulses = Math.min(fromNodes * toNodes, 18);
  let spawned = 0;

  for (let fn = 0; fn < fromNodes && spawned < maxPulses; fn++) {
    for (let tn = 0; tn < toNodes && spawned < maxPulses; tn++) {
      const delay = (fn * toNodes + tn) * 45;
      const t = setTimeout(() => {
        if (phase !== dir.replace('bwd', 'backward').replace('fwd', 'forward') && phase !== 'backward' && phase !== 'forward') return;
        pulses.push({
          x1: layerX[fromL], y1: nodeY[fromL][fn],
          x2: layerX[toL],   y2: nodeY[toL][tn],
          t: 0,
          dir,
          id: Math.random(),
        });
      }, delay);
      timers.push(t);
      spawned++;
    }
  }
}

/* ══════════════════════════════════════════════════════
   RENDER LOOP
   ══════════════════════════════════════════════════════ */
function loop() {
  cancelAnimationFrame(raf);
  function tick() {
    update();
    drawFrame();
    if (document.getElementById('slide-6')?.classList.contains('active')) {
      raf = requestAnimationFrame(tick);
    }
  }
  raf = requestAnimationFrame(tick);
}

function update() {
  /* Move pulses forward */
  pulses.forEach(p => { p.t = Math.min(p.t + PULSE_SPEED, 1); });
  /* Remove completed pulses */
  pulses = pulses.filter(p => p.t < 1);
}

/* ══════════════════════════════════════════════════════
   DRAW FRAME
   ══════════════════════════════════════════════════════ */
function drawFrame() {
  ctx.clearRect(0, 0, W, H);
  drawGrid();
  drawConnections();
  drawPulses();
  drawNodes();
  drawLayerLabels();
}

/* Subtle background grid */
function drawGrid() {
  ctx.strokeStyle = '#0f0f0f';
  ctx.lineWidth   = 0.5;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

/* Static connections (dim lines) */
function drawConnections() {
  for (let l = 0; l < LAYERS_DEF.length - 1; l++) {
    const nFrom = LAYERS_DEF[l].nodes;
    const nTo   = LAYERS_DEF[l + 1].nodes;
    for (let fn = 0; fn < nFrom; fn++) {
      for (let tn = 0; tn < nTo; tn++) {
        const aFrom = activation[l][fn];
        const aTo   = activation[l + 1][tn];
        const alpha = Math.max(aFrom, aTo) * 0.18 + 0.03;
        ctx.beginPath();
        ctx.moveTo(layerX[l],     nodeY[l][fn]);
        ctx.lineTo(layerX[l + 1], nodeY[l + 1][tn]);
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
        ctx.lineWidth   = 0.6;
        ctx.stroke();
      }
    }
  }
}

/* Animated pulses travelling along connections */
function drawPulses() {
  pulses.forEach(p => {
    const x = p.x1 + (p.x2 - p.x1) * p.t;
    const y = p.y1 + (p.y2 - p.y1) * p.t;

    /* Pulse glow */
    const grd = ctx.createRadialGradient(x, y, 0, x, y, 9);
    if (p.dir === 'fwd') {
      grd.addColorStop(0, 'rgba(255,255,255,0.95)');
      grd.addColorStop(0.4, 'rgba(200,200,200,0.5)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
    } else {
      grd.addColorStop(0, 'rgba(180,180,180,0.9)');
      grd.addColorStop(0.4, 'rgba(120,120,120,0.45)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
    }

    /* Trail line */
    const trailLen = 0.12;
    const tx = p.x1 + (p.x2 - p.x1) * Math.max(0, p.t - trailLen);
    const ty = p.y1 + (p.y2 - p.y1) * Math.max(0, p.t - trailLen);
    const grad = ctx.createLinearGradient(tx, ty, x, y);
    if (p.dir === 'fwd') {
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(1, 'rgba(255,255,255,0.6)');
    } else {
      grad.addColorStop(0, 'rgba(200,200,200,0)');
      grad.addColorStop(1, 'rgba(160,160,160,0.55)');
    }
    ctx.beginPath();
    ctx.moveTo(tx, ty); ctx.lineTo(x, y);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = 2;
    ctx.stroke();

    /* Dot */
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
  });
}

/* Neural nodes */
function drawNodes() {
  for (let l = 0; l < LAYERS_DEF.length; l++) {
    const nCount = LAYERS_DEF[l].nodes;
    for (let n = 0; n < nCount; n++) {
      const x   = layerX[l];
      const y   = nodeY[l][n];
      const act = activation[l][n];
      const isBack = phase === 'backward' || phase === 'done';

      /* Outer glow when active */
      if (act > 0.1) {
        const glowR = NODE_R + 10 + act * 8;
        const grd   = ctx.createRadialGradient(x, y, 0, x, y, glowR);
        grd.addColorStop(0, `rgba(255,255,255,${act * (isBack ? 0.12 : 0.18)})`);
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(x, y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }

      /* Node circle fill */
      const bright = Math.round(18 + act * 210);
      ctx.beginPath();
      ctx.arc(x, y, NODE_R, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${bright},${bright},${bright})`;
      ctx.fill();

      /* Node border */
      const borderAlpha = 0.1 + act * 0.45;
      ctx.strokeStyle = `rgba(255,255,255,${borderAlpha})`;
      ctx.lineWidth   = act > 0.5 ? 2 : 1;
      ctx.stroke();

      /* Activation value inside node */
      if (act > 0.25) {
        ctx.fillStyle = act > 0.6 ? '#000' : `rgba(255,255,255,${act * 0.8})`;
        ctx.font      = `600 8px "JetBrains Mono"`;
        ctx.textAlign = 'center';
        ctx.fillText(act.toFixed(1), x, y + 3);
      }

      /* Gradient annotation on backward pass */
      const gl = gradLabel[l][n];
      if (gl && (phase === 'backward' || phase === 'done')) {
        /* Small tag above the node */
        const tagW = 82, tagH = 16;
        const tx = x - tagW / 2, ty = y - NODE_R - tagH - 5;
        ctx.fillStyle   = 'rgba(30,30,30,0.9)';
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth   = 0.5;
        roundRect(ctx, tx, ty, tagW, tagH, 3);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(200,200,200,0.85)';
        ctx.font      = '7px "JetBrains Mono"';
        ctx.textAlign = 'center';
        ctx.fillText(gl, x, ty + 11);
      }
    }
  }
}

/* Layer name labels at top and bottom */
function drawLayerLabels() {
  LAYERS_DEF.forEach((ld, l) => {
    const x   = layerX[l];
    const act = Math.max(...activation[l]);

    /* Top label */
    ctx.fillStyle = act > 0.3 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)';
    ctx.font      = `600 11px Inter`;
    ctx.textAlign = 'center';
    ctx.fillText(ld.label, x, 18);

    /* Sublabel */
    ctx.fillStyle = act > 0.3 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)';
    ctx.font      = '9px "JetBrains Mono"';
    ctx.fillText(ld.sublabel, x, 32);

    /* Bottom: node count */
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.font      = '9px Inter';
    ctx.fillText(`${ld.nodes} nodes`, x, H - 10);
  });
}

/* Weight update banner at the very end */
function showWeightUpdateOverlay() {
  const bannerY = H - 52;
  roundRect(ctx, 24, bannerY, W - 48, 28, 5);
  ctx.fillStyle   = 'rgba(255,255,255,0.06)';
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth   = 1;
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font      = '600 11px "JetBrains Mono"';
  ctx.textAlign = 'center';
  ctx.fillText('W  ←  W  −  α · ∂L/∂W      (learning rate α = 0.0001)', W / 2, bannerY + 18);
}

/* ══════════════════════════════════════════════════════
   UI HELPERS
   ══════════════════════════════════════════════════════ */
function showLoss() {
  const el   = document.getElementById('loss-display');
  const pred = document.getElementById('bp-predicted');
  const corr = document.getElementById('bp-correct');
  const loss = document.getElementById('bp-loss');
  if (!el) return;

  el.style.display = 'block';
  if (pred) { pred.textContent = '"runs"';  pred.style.color = '#666'; }
  if (corr) { corr.textContent = '"jumps"'; corr.style.color = '#bbb'; }
  if (loss) { loss.textContent = '2.48'; }
  lossShown = true;

  gsap.from(el, { y: 8, opacity: 0, duration: 0.4 });
}

function updateButtons() {
  const fwd  = document.getElementById('bp-forward-btn');
  const bwd  = document.getElementById('bp-backward-btn');
  const rst  = document.getElementById('bp-reset-btn');

  const running  = phase === 'forward' || phase === 'backward';
  const canFwd   = !running && !lossShown;
  const canBwd   = !running && lossShown && phase !== 'done';

  if (fwd) fwd.disabled = !canFwd;
  if (bwd) bwd.disabled = !canBwd;
  if (rst) rst.disabled = running;
}

function setStatus(msg) {
  const el = document.getElementById('backprop-status');
  if (el) el.textContent = msg;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
