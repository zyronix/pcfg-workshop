'use strict';

// ---------------------------------------------------------------------------
// Course content lives in content/*.md. The navigation is read from
// content/_nav.md, and every ```question block in a page becomes a widget.
// ---------------------------------------------------------------------------

const CONTENT_DIR = 'content/';
const STORE_PREFIX = 'pcfg-workshop:';

const store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(STORE_PREFIX + key)); } catch (e) { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  },
  clear() {
    try {
      Object.keys(localStorage).filter(k => k.startsWith(STORE_PREFIX)).forEach(k => localStorage.removeItem(k));
    } catch (e) { /* storage unavailable */ }
  },
};

// SHA-256 in plain JS. crypto.subtle only exists on https or localhost, and a
// workshop server is often plain http on a LAN address.
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function utf8Bytes(str) {
  return Array.from(unescape(encodeURIComponent(str)), c => c.charCodeAt(0));
}

function sha256(str) {
  const bytes = utf8Bytes(str);
  const len = bytes.length;
  const n = ((len + 9 + 63) >> 6) << 6;
  const m = new Uint8Array(n);
  m.set(bytes);
  m[len] = 0x80;
  const bitLen = len * 8;
  const dv = new DataView(m.buffer);
  dv.setUint32(n - 8, Math.floor(bitLen / 0x100000000));
  dv.setUint32(n - 4, bitLen >>> 0);

  const rotr = (x, r) => (x >>> r) | (x << (32 - r));
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Array(64);

  for (let i = 0; i < n; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + SHA256_K[t] + w[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

// ---------------------------------------------------------------------------
// Question blocks
// ---------------------------------------------------------------------------

// Parses the body of a ```question block. See README.md for the format.
function parseQuestion(body) {
  const q = { id: '', ask: '', answers: [], hashes: [], options: [], hint: '', explain: '', exact: false };
  let current = null;

  for (const raw of body.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const option = line.match(/^\s*-\s*\[( |x|X)\]\s+(.*)$/);
    const field = line.match(/^(\w+):\s?(.*)$/);

    if (option) {
      q.options.push({ text: option[2], correct: option[1] !== ' ' });
      current = null;
    } else if (field) {
      const key = field[1].toLowerCase();
      const value = field[2];
      if (key === 'answer') q.answers.push(value.trim());
      else if (key === 'sha256') q.hashes.push(value.trim().toLowerCase());
      else if (key === 'case') q.exact = value.trim().toLowerCase() === 'exact';
      else if (key in q && typeof q[key] === 'string') { q[key] = value; current = key; continue; }
      current = null;
    } else if (current && line.trim() !== '') {
      q[current] += '\n' + line.trim();
    } else {
      current = null;
    }
  }

  q.type = q.options.length === 0 ? 'text' : (q.options.filter(o => o.correct).length > 1 ? 'multi' : 'single');
  return q;
}

function normalise(q, value) {
  const v = value.trim();
  return q.exact ? v : v.toLowerCase();
}

function checkText(q, value) {
  const v = normalise(q, value);
  if (v === '') return false;
  if (q.answers.some(a => normalise(q, a) === v)) return true;
  return q.hashes.length > 0 && q.hashes.includes(sha256(v));
}

function checkChoice(q, selected) {
  return q.options.every((o, i) => o.correct === selected.includes(i));
}

// Replaces every ```question block with a placeholder div and returns the
// rewritten markdown plus the parsed questions in page order.
function extractQuestions(markdown) {
  const questions = [];
  const text = markdown.replace(/^```question[ \t]*\n([\s\S]*?)^```[ \t]*$/gm, (_, body) => {
    questions.push(parseQuestion(body));
    return `\n<div class="question" data-index="${questions.length - 1}"></div>\n`;
  });
  return { text, questions };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

let nav = [];
let pageKey = '';

function inline(md) {
  return marked.parseInline(md || '');
}

function block(md) {
  return marked.parse(md || '');
}

function el(tag, attrs = {}, html = '') {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (html) node.innerHTML = html;
  return node;
}

function questionKey(q, index) {
  return `q:${pageKey}:${q.id || index}`;
}

function renderQuestion(container, q, index, onChange) {
  const key = questionKey(q, index);
  const saved = store.get(key);

  container.appendChild(el('div', { class: 'question-label' }, 'Question'));
  container.appendChild(el('div', { class: 'question-ask' }, block(q.ask)));

  const form = el('form', { class: 'question-form', autocomplete: 'off' });
  let read;

  if (q.type === 'text') {
    const input = el('input', { type: 'text', class: 'question-input', spellcheck: 'false', 'aria-label': 'Your answer' });
    if (saved && saved.correct) input.value = saved.value;
    form.appendChild(input);
    read = () => input.value;
  } else {
    const list = el('div', { class: 'question-options' });
    const name = `opt-${index}`;
    q.options.forEach((o, i) => {
      const label = el('label', { class: 'question-option' });
      const box = el('input', { type: q.type === 'multi' ? 'checkbox' : 'radio', name, value: String(i) });
      if (saved && saved.correct && saved.value.includes(i)) box.checked = true;
      label.appendChild(box);
      label.appendChild(el('span', {}, inline(o.text)));
      list.appendChild(label);
    });
    if (q.type === 'multi') list.appendChild(el('div', { class: 'question-note' }, 'Select all that apply.'));
    form.appendChild(list);
    read = () => Array.from(form.querySelectorAll('input:checked')).map(b => Number(b.value));
  }

  const button = el('button', { type: 'submit', class: 'question-check' }, 'Check');
  form.appendChild(button);
  container.appendChild(form);

  const feedback = el('div', { class: 'question-feedback', role: 'status', 'aria-live': 'polite' });
  container.appendChild(feedback);

  const showCorrect = () => {
    container.classList.add('is-correct');
    container.classList.remove('is-wrong');
    feedback.innerHTML = `<p class="verdict">Correct.</p>${block(q.explain)}`;
  };

  if (saved && saved.correct) showCorrect();

  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const value = read();
    const correct = q.type === 'text' ? checkText(q, value) : checkChoice(q, value);
    if (correct) {
      store.set(key, { correct: true, value });
      showCorrect();
    } else {
      container.classList.remove('is-correct');
      container.classList.add('is-wrong');
      const hint = q.hint ? `<p class="hint"><strong>Hint:</strong> ${inline(q.hint)}</p>` : '';
      feedback.innerHTML = `<p class="verdict">Not quite. Try again.</p>${hint}`;
    }
    onChange();
  });
}

function addCopyButtons(root) {
  root.querySelectorAll('pre > code').forEach(code => {
    const pre = code.parentElement;
    const button = el('button', { type: 'button', class: 'copy', 'aria-label': 'Copy to clipboard' }, 'Copy');
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.innerText.replace(/\n$/, ''));
        button.textContent = 'Copied';
      } catch (e) {
        const range = document.createRange();
        range.selectNodeContents(code);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        button.textContent = 'Press Ctrl+C';
      }
      setTimeout(() => { button.textContent = 'Copy'; }, 1500);
    });
    pre.appendChild(button);
  });
}

function updateProgress(questions) {
  const done = questions.filter((q, i) => (store.get(questionKey(q, i)) || {}).correct).length;
  const bar = document.getElementById('progress');
  if (questions.length === 0) {
    bar.hidden = true;
  } else {
    bar.hidden = false;
    bar.querySelector('.progress-text').textContent = `${done} of ${questions.length} questions answered`;
    bar.querySelector('.progress-fill').style.width = `${(100 * done) / questions.length}%`;
  }
  store.set(`page:${pageKey}`, { done, total: questions.length });
  renderNav();
}

function renderNav() {
  const list = document.getElementById('nav-list');
  list.innerHTML = '';
  nav.forEach(item => {
    const state = store.get(`page:${item.key}`);
    const complete = state && state.total > 0 && state.done === state.total;
    const li = el('li');
    const a = el('a', { href: `#${item.key}` });
    a.textContent = item.title;
    if (item.key === pageKey) a.setAttribute('aria-current', 'page');
    li.appendChild(a);
    if (state && state.total > 0) {
      li.appendChild(el('span', { class: complete ? 'nav-count is-complete' : 'nav-count' }, complete ? '&#10003;' : `${state.done}/${state.total}`));
    }
    list.appendChild(li);
  });
}

function renderPager() {
  const pager = document.getElementById('pager');
  pager.innerHTML = '';
  const i = nav.findIndex(item => item.key === pageKey);
  if (i > 0) pager.appendChild(el('a', { href: `#${nav[i - 1].key}`, class: 'prev' }, `&larr; ${nav[i - 1].title}`));
  if (i >= 0 && i < nav.length - 1) pager.appendChild(el('a', { href: `#${nav[i + 1].key}`, class: 'next' }, `${nav[i + 1].title} &rarr;`));
}

async function fetchText(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${res.statusText}`);
  return res.text();
}

function parseNav(markdown) {
  const items = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\.md\)/g;
  let m;
  while ((m = re.exec(markdown)) !== null) items.push({ title: m[1], key: m[2] });
  return items;
}

async function showPage() {
  const requested = decodeURIComponent(location.hash.replace(/^#/, ''));
  const item = nav.find(n => n.key === requested) || nav[0];
  pageKey = item.key;

  const main = document.getElementById('content');
  try {
    const { text, questions } = extractQuestions(await fetchText(`${CONTENT_DIR}${item.key}.md`));
    main.innerHTML = block(text);

    // Relative links and images in the markdown point into content/.
    main.querySelectorAll('a[href], img[src]').forEach(node => {
      const attr = node.tagName === 'A' ? 'href' : 'src';
      const value = node.getAttribute(attr);
      if (/^(#|[a-z]+:|\/)/i.test(value)) return;
      if (attr === 'href' && /\.md$/.test(value)) { node.setAttribute('href', `#${value.replace(/\.md$/, '')}`); return; }
      node.setAttribute(attr, CONTENT_DIR + value);
      if (attr === 'href') node.setAttribute('download', '');
    });

    main.querySelectorAll('.question').forEach(div => {
      const index = Number(div.dataset.index);
      renderQuestion(div, questions[index], index, () => updateProgress(questions));
    });

    addCopyButtons(main);
    updateProgress(questions);
    renderPager();
    document.title = `${item.title} · PCFG Workshop`;
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } catch (err) {
    main.innerHTML = `<p class="error">Could not load this page (${err.message}).</p>`;
  }
}

async function init() {
  marked.setOptions({ gfm: true });
  try {
    nav = parseNav(await fetchText(`${CONTENT_DIR}_nav.md`));
  } catch (err) {
    document.getElementById('content').innerHTML =
      `<p class="error">Could not load the course (${err.message}). Serve this folder over http, for example with <code>python3 -m http.server</code>.</p>`;
    return;
  }

  document.getElementById('reset').addEventListener('click', () => {
    if (confirm('Clear all your answers on this computer?')) {
      store.clear();
      showPage();
    }
  });

  window.addEventListener('hashchange', showPage);
  showPage();
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}
