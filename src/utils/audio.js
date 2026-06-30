/* ─────────────────────────────────────────────────────
   AUDIO NARRATION ENGINE — Web Speech API
   ───────────────────────────────────────────────────── */

export const NARRATIONS = [
  /* Slide 1 — Tokenization */
  `Welcome to Step 1: Tokenization.
  Before a language model can understand your text, it needs to convert it into numbers.
  This process is called tokenization. Your sentence is broken into small pieces called tokens — these could be whole words, or even parts of words for rare terms.
  Each token is then assigned a unique ID number from the model's vocabulary.
  For example, the word "hello" might become the number 7843, and "world" becomes 2264.
  The model never sees your raw text — only these token ID numbers.
  Try typing your own text in the input box and watch how it gets split into tokens in real time.`,

  /* Slide 2 — Embeddings */
  `Step 2: Embeddings and Positional Encoding.
  A token ID like 7592 is just a number — it has no meaning by itself.
  An embedding converts each token ID into a vector — a list of hundreds of numbers that capture meaning. Similar words like "king" and "queen" end up with similar vectors.
  But there is a problem — if we only use embeddings, "dog bites man" and "man bites dog" look identical to the model, because the same words appear.
  This is why we also add Positional Encoding — a mathematical signature using sine and cosine waves that tells the model the exact position of each token in the sequence.
  The embedding and positional encoding are added together before passing into the transformer.`,

  /* Slide 3 — Self-Attention */
  `Step 3: Self-Attention with Query, Key, and Value vectors.
  Self-attention is the most important idea in the transformer. It lets every word look at every other word and decide how much attention to pay to it.
  For each token, we create three vectors called Q, K, and V — Query, Key, and Value.
  Think of it like a search engine. The Query asks what am I looking for, the Key says what do I contain, and the Value says here is my information.
  The attention score is computed by taking the dot product of the Query with every Key, dividing by the square root of the dimension, and applying softmax.
  This gives us attention weights — numbers between zero and one that sum to one.
  Finally, each token's output is a weighted combination of all the Value vectors using these attention weights.`,

  /* Slide 4 — Add & Norm */
  `Step 4: Add and Norm — the Residual Connection.
  After the attention layer produces its output, we do two important things.
  First, we add the original input back to the attention output. This is called a residual connection or skip connection. It helps gradients flow backwards during training, preventing the vanishing gradient problem.
  Think of it like keeping fresh ingredients on the side while cooking — the final dish never completely loses the original flavor.
  Second, we apply Layer Normalization, which rescales all the values to have a mean of zero and a standard deviation of one.
  This keeps the numbers in a stable range and makes training much faster and more reliable.`,

  /* Slide 5 — Feed Forward */
  `Step 5: The Feed Forward Network.
  After attention has gathered context across all positions, each token goes through a Feed Forward Network independently.
  This is a simple two-layer neural network applied to each position separately.
  The first layer expands the dimension by four times — so if the input is 512 numbers, it becomes 2048 numbers.
  Then a ReLU activation function is applied, which simply zeros out any negative values. This introduces non-linearity.
  The second layer compresses it back down to the original size.
  The Feed Forward layers are where most of the model's factual knowledge is stored.`,

  /* Slide 6 — Backpropagation */
  `Step 6: Backpropagation — How the Model Learns.
  Learning happens in two phases.
  In the forward pass, the model takes input tokens, runs them through all the layers, and produces a prediction — the most likely next token.
  We then compare this prediction to the correct answer using a loss function. A high loss means the prediction was wrong.
  In the backward pass, we use calculus — the chain rule — to compute the gradient of the loss with respect to every single weight in the model.
  These gradients tell each weight: move in this direction by this amount to reduce the loss.
  The optimizer then updates all the weights slightly. Click the buttons below to see this animated.`,

  /* Slide 7 — Controls */
  `Step 7: Context Window and Temperature.
  As an AI application developer, you control two important parameters when calling the model.
  The first is the Context Window — the maximum number of tokens the model can see at once. This is its short-term memory. If a conversation gets longer than the context window, older messages are cut off.
  The second parameter is Temperature, which controls how creative or predictable the output is.
  A low temperature makes the model pick the single most likely next word every time — great for code or math.
  A high temperature makes it take more risks — great for creative writing or brainstorming.
  Use both sliders to see how these parameters change model behavior.`,

  /* Slide 8 — Summary */
  `You have completed the full transformer pipeline! Let us quickly recap.
  Step 1: Your text is tokenized into IDs. Step 2: Those IDs become rich embedding vectors with positional information. Step 3: Self-attention lets every token look at every other token and gather context. Step 4: Residual connections and layer normalization stabilize the signal. Step 5: Feed forward networks process each position independently. Finally, softmax converts the output into probabilities over the vocabulary, and the most likely next token is selected.
  This cycle repeats — one token at a time — until the model generates a complete response.`,
];

/* ── State ── */
let isSpeaking  = false;
let userStopped = false;          // set true when user explicitly stops; cleared on replay
const playedSlides = new Set();   // tracks which slides have already been auto-narrated

export function getIsSpeaking() { return isSpeaking; }
export function getUserStopped() { return userStopped; }

/* ── Core speak function ── */
export function speak(text, { onStart, onEnd } = {}) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  isSpeaking = false;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate   = 0.92;
  utterance.pitch  = 1.0;
  utterance.volume = 1.0;

  // Prefer a natural English voice
  const voices    = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium')) &&
    v.lang.startsWith('en')
  ) || voices.find(v => v.lang.startsWith('en'));
  if (preferred) utterance.voice = preferred;

  utterance.onstart = () => { isSpeaking = true;  onStart?.(); updateBtn(); };
  utterance.onend   = () => { isSpeaking = false; onEnd?.();   updateBtn(); };
  utterance.onerror = () => { isSpeaking = false;              updateBtn(); };

  window.speechSynthesis.speak(utterance);
}

export function stop() {
  window.speechSynthesis?.cancel();
  isSpeaking  = false;
  userStopped = true;   // user explicitly muted — don't auto-play again until replay
  updateBtn();
}

/**
 * Auto-play narration for a slide on first visit.
 * Plays automatically when navigating to a slide — exactly once per slide.
 * Stopping mid-narration does NOT silence future slides.
 */
export function speakSlide(index) {
  if (playedSlides.has(index)) return;   // already played this slide — skip
  if (index < 0 || index >= NARRATIONS.length) return;

  playedSlides.add(index);
  userStopped = false;                   // reset so button shows correct state
  speak(NARRATIONS[index]);
}

/**
 * Replay a slide's narration on demand (ignores playedSlides / userStopped).
 */
export function replaySlide(index) {
  if (index < 0 || index >= NARRATIONS.length) return;
  userStopped = false;            // user explicitly asked to hear it — unmute
  speak(NARRATIONS[index]);
}

/* ── Update header button label ── */
function updateBtn() {
  const btn = document.getElementById('audio-btn');
  if (!btn) return;
  const label = btn.querySelector('.audio-label');
  const dot   = btn.querySelector('.audio-dot');
  if (isSpeaking) {
    btn.classList.add('speaking');
    if (label) label.textContent = 'Stop';
    if (dot)   dot.style.animation = '';
  } else {
    btn.classList.remove('speaking');
    if (label) label.textContent = 'Replay';
    if (dot)   dot.style.animation = 'none';
  }
}

/* ── Load voices async ── */
if (window.speechSynthesis?.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = () => {};
}
