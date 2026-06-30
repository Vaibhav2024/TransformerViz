/* Shared math utilities */

export function softmax(arr) {
  const max = Math.max(...arr);
  const exps = arr.map(v => Math.exp(v - max));
  const sum  = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sum);
}

export function dot(a, b) {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

export function normalize(arr) {
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
  const std = Math.sqrt(variance + 1e-8);
  return { normalized: arr.map(v => (v - mean) / std), mean, std };
}

export function relu(x) { return Math.max(0, x); }

export function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

export function lerp(a, b, t) { return a + (b - a) * t; }

export function randRange(lo, hi) { return lo + Math.random() * (hi - lo); }

export function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/* A very lightweight BPE-like tokenizer simulation */
const FIXED_VOCAB = {
  'hello':7843, 'world':2264, 'hi':7592, 'the':262, 'a':257, 'is':318,
  'how':703, 'are':389, 'you':345, 'i':314, 'love':1842, 'ai':7379,
  'cat':3797, 'dog':3290, 'good':922, 'what':644, 'this':428, 'that':326,
  'in':287, 'to':284, 'of':286, 'and':290, 'it':340, 'my':616,
  'transformer':9156, 'attention':3241, 'model':2746, 'token':11241,
  'learn':4532, 'deep':2769, 'neural':17019, 'network':3127, 'language':3303,
  'large':1588, 'vector':15879, 'embed':20521, 'weight':3463, 'bias':3885,
  'train':4512, 'data':1366, 'input':5128, 'output':5072, 'layer':7679,
  'predict':7548, 'next':1306, 'word':1573, 'text':2420, 'chat':6979,
};

export function tokenize(text) {
  if (!text.trim()) return [];
  const raw = text.toLowerCase().match(/[a-z']+|[0-9]+|[^a-z0-9\s]+|\s+/g) || [];
  const tokens = [];
  raw.forEach(w => {
    if (/^\s+$/.test(w)) return; // skip whitespace tokens
    const clean = w.replace(/[^a-z0-9]/g, '');
    if (!clean) {
      tokens.push({ text: w, id: 100 + (hashStr(w) % 49000) });
      return;
    }
    if (FIXED_VOCAB[clean]) {
      tokens.push({ text: w, id: FIXED_VOCAB[clean] });
    } else if (clean.length > 6) {
      // split long unknown words
      const mid = Math.ceil(clean.length / 2);
      tokens.push({ text: clean.slice(0, mid), id: 200 + (hashStr(clean.slice(0,mid)) % 49000) });
      tokens.push({ text: clean.slice(mid),    id: 200 + (hashStr(clean.slice(mid))   % 49000) });
    } else {
      tokens.push({ text: w, id: 200 + (hashStr(clean) % 49000) });
    }
  });
  return tokens.filter(t => t.text.trim().length > 0);
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/* Generate a fake but consistent embedding vector for a token id */
export function fakeEmbedding(tokenId, dims = 8) {
  const r = seededRand(tokenId * 137 + 71);
  return Array.from({ length: dims }, () => +(r() * 2 - 1).toFixed(3));
}

/* Positional encoding: sin/cos */
export function positionalEncoding(pos, dims = 8) {
  return Array.from({ length: dims }, (_, i) => {
    const freq = 1 / Math.pow(10000, (2 * Math.floor(i / 2)) / dims);
    return i % 2 === 0 ? Math.sin(pos * freq) : Math.cos(pos * freq);
  }).map(v => +v.toFixed(3));
}
