import {
  EXP,
  makePhoto,
  drawCrop,
  transform,
  scoreFace,
  findFaces,
  moreFaces,
  snapInCrop,
} from './face.mjs';

const $ = (i) => document.getElementById(i);
const tell = () => {};

const MOOD = ['Angry', 'Disgust', 'Fear', 'Happy', 'Sad', 'Surprise', 'Neutral'];
const BLANK = ['Happy', 'Neutral', 'Sad', 'Surprise', 'Angry', 'Fear', 'Disgust'];
const KEY = 'what-tiktok-sees.v1';
const KEEP = 24;
const MIN_AGE = 16;
const MOSAIC = 10;

let photo = null;
let e = null;
let m = null;
let run = 0;
let cur = null;
let faces = [];
let face = 0;
let sampleRun = false;
let hide = false;
let res = null;
let saved = null;
let cardRun = 0;
let cardFile = null;

function setText(row, a, b) {
  const x = document.createElement('div');
  x.className = 'm';
  const l = document.createElement('span');
  l.textContent = a;
  const r = document.createElement('span');
  r.textContent = b;
  x.append(l, r);
  row.append(x);
}

function blank() {
  $('attr').textContent = '\u2013';
  $('age').textContent = '\u2013';
  $('gender').textContent = '\u2013';
  const r = $('moods');
  r.textContent = '';
  BLANK.forEach((n) => setText(r, n, '\u2013'));
}

function shrink(a, n) {
  const b = document.createElement('canvas');
  b.width = b.height = n;
  const x = b.getContext('2d');
  x.imageSmoothingQuality = 'high';
  x.drawImage(a, 0, 0, n, n);
  return b;
}

// Downsamples through powers of two down to MOSAIC x MOSAIC blocks.
function mosaic(ctx, src, x, y, S) {
  let a = src;
  for (let n = src.width >> 1; n > MOSAIC; n >>= 1) a = shrink(a, n);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(shrink(a, MOSAIC), x, y, S, S);
  ctx.imageSmoothingEnabled = true;
}

function crop(S) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  if (photo) drawCrop(x, S, EXP, photo, e, m, S / 256);
  else if (saved) x.drawImage(saved, 0, 0, S, S);
  return c;
}

function show() {
  const x = $('view').getContext('2d');
  if (hide && $('card').dataset.state !== 'adjust') {
    mosaic(x, crop(512), 0, 0, 512);
    return;
  }
  if (photo) drawCrop(x, 512, EXP, photo, e, m, 2);
  else if (saved) x.drawImage(saved, 0, 0, 512, 512);
}

function busy(on) {
  $('scan').hidden = !on;
  $('card').classList.toggle('busy', on);
}

function say(t) {
  $('msg').textContent = t || '';
  $('msg').hidden = !t;
}

function chip() {
  $('next').hidden = $('card').dataset.state === 'adjust' || faces.length < 2;
  if (faces.length > 1) $('next').textContent = `${face + 1}/${faces.length}`;
}

function state(s) {
  $('card').dataset.state = s;
  const has = s !== 'empty';
  const adj = s === 'adjust';
  $('view').hidden = !has;
  $('add').hidden = has;
  $('guides').hidden = !adj;
  $('sample').hidden = has;
  $('newbtn').hidden = !has || adj;
  $('adjust').hidden = !has || adj || !photo;
  $('done').hidden = !adj;
  $('px').hidden = !has || adj;
  $('share').hidden = true;
  chip();
  $('pic').tabIndex = adj ? 0 : -1;
  say('');
}

function count(el, to) {
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) {
    el.textContent = to.toFixed(1);
    return;
  }
  const t0 = performance.now();
  (function f(t) {
    const p = Math.min(1, (t - t0) / 450);
    el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(1);
    if (p < 1) requestAnimationFrame(f);
  })(t0);
}

function paint(r, animate) {
  const ok = r.age >= MIN_AGE;
  res = r;
  $('share').hidden = !ok;
  if (ok && animate) count($('attr'), r.attractive);
  else $('attr').textContent = ok ? r.attractive.toFixed(1) : '\u2013';
  say(ok ? '' : 'No score under 16');
  $('age').textContent = Math.round(r.age);
  const male = r.boy >= 0.5;
  const g = $('gender');
  g.textContent = `${male ? 'Male' : 'Female'} `;
  const pct = document.createElement('small');
  pct.textContent = `${Math.round(100 * (male ? r.boy : 1 - r.boy))}%`;
  g.append(pct);
  const row = $('moods');
  row.textContent = '';
  r.exp
    .map((p, i) => [MOOD[i], p])
    .sort((x, y) => y[1] - x[1])
    .forEach(([n, p]) => setText(row, n, `${Math.round(p * 100)}%`));
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
}

function store(list) {
  for (let l = list; l.length; l = l.slice(0, -1)) {
    try {
      localStorage.setItem(KEY, JSON.stringify(l));
      return;
    } catch {
      // Retry with fewer entries if storage quota is full.
    }
  }
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Ignore storage removal errors.
  }
}

function strip() {
  const list = load();
  const s = $('strip');
  $('hist').hidden = !list.length;
  s.textContent = '';
  list.forEach((h) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'h';
    b.setAttribute('aria-pressed', String(h.id === cur));
    b.setAttribute(
      'aria-label',
      `Open scan, ${h.age >= MIN_AGE ? `score ${h.attractive.toFixed(1)}` : `age guess ${Math.round(h.age)}`}`,
    );
    const i = document.createElement('img');
    i.src = h.img;
    i.alt = '';
    i.width = 72;
    i.height = 72;
    const t = document.createElement('span');
    t.textContent = h.age >= MIN_AGE ? h.attractive.toFixed(1) : '\u2013';
    b.append(i, t);
    b.addEventListener('click', () => reopen(h.id));
    s.append(b);
  });
  if (list.length) {
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'h-x';
    x.textContent = '\u00d7';
    x.setAttribute('aria-label', 'Clear your scans');
    x.addEventListener('click', () => {
      try {
        localStorage.removeItem(KEY);
      } catch {
        // Ignore storage removal errors.
      }
      cur = null;
      strip();
    });
    s.append(x);
  }
}

function remember(r, isSample) {
  if (isSample) return;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  drawCrop(c.getContext('2d'), 256, EXP, photo, e, m);
  const rec = {
    id: cur || Date.now(),
    img: c.toDataURL('image/jpeg', 0.78),
    attractive: r.attractive,
    age: r.age,
    boy: r.boy,
    exp: r.exp,
  };
  cur = rec.id;
  store([rec, ...load().filter((h) => h.id !== rec.id)].slice(0, KEEP));
  strip();
}

function reopen(id) {
  const h = load().find((x) => x.id === id);
  if (!h) return;
  run++;
  busy(false);
  photo = null;
  saved = null;
  faces = [];
  cur = id;
  state('ready');
  paint(h, false);
  const i = new Image();
  i.onload = () => {
    saved = i;
    show();
  };
  i.src = h.img;
  strip();
  $('card').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

async function score(isSample) {
  const id = ++run;
  busy(true);
  const r = await scoreFace(photo, e, m);
  if (id !== run) return;
  busy(false);
  paint(r, true);
  remember(r, isSample);
}

function setHide(on) {
  hide = on;
  $('px').setAttribute('aria-pressed', String(on));
  $('px').setAttribute('aria-label', on ? 'Unpixelate face' : 'Pixelate face');
  $('cardpx').textContent = on ? 'Show face' : 'Pixelate face';
  $('hist').classList.toggle('masked', on);
  show();
  if ($('sheet').open) drawCard();
}

async function drawCard() {
  const id = ++cardRun;
  cardFile = null;
  $('send').disabled = true;
  await document.fonts.load('400 200px Instrument');
  if (id !== cardRun) return;
  const c = $('cardview');
  const x = c.getContext('2d');
  const W = c.width;
  const H = c.height;
  const P = 48;
  const S = W - 2 * P;
  const r = res;
  const sans = getComputedStyle(document.documentElement).getPropertyValue('--sans');

  x.fillStyle = '#f4f2ed';
  x.fillRect(0, 0, W, H);
  x.save();
  x.beginPath();
  x.roundRect(P, P, S, S, 32);
  x.clip();
  const src = crop(photo ? S : 512);
  if (hide) mosaic(x, src, P, P, S);
  else x.drawImage(src, P, P, S, S);
  x.restore();

  const text = (t, tx, ty, font, fill, align = 'left') => {
    x.font = font;
    x.fillStyle = fill;
    x.textAlign = align;
    x.fillText(t, tx, ty);
  };
  const [mood, p] = r.exp.map((v, i) => [MOOD[i], v]).sort((a, b) => b[1] - a[1])[0];
  const male = r.boy >= 0.5;

  text('Attractiveness', P + 4, 1084, `400 30px ${sans}`, '#6e6a62');
  text(r.attractive.toFixed(1), P, 1270, '400 200px Instrument', '#171614');
  [
    ['Age guess', String(Math.round(r.age))],
    ['Gender guess', `${male ? 'Male' : 'Female'} ${Math.round(100 * (male ? r.boy : 1 - r.boy))}%`],
    ['Mood', `${mood} ${Math.round(p * 100)}%`],
  ].forEach(([a, b], i) => {
    const y = 1084 + i * 93;
    text(a, 560, y, `400 30px ${sans}`, '#6e6a62');
    text(b, W - P - 4, y, `600 32px ${sans}`, '#171614', 'right');
  });
  text('What TikTok sees', P + 4, H - 28, `400 24px ${sans}`, '#9a958b');
  text('nmapaye.com', W - P - 4, H - 28, `400 24px ${sans}`, '#9a958b', 'right');

  const blob = await new Promise((f) => c.toBlob(f, 'image/jpeg', 0.92));
  if (id !== cardRun || !blob) return;
  cardFile = new File([blob], 'what-tiktok-sees.jpg', { type: 'image/jpeg' });
  $('send').disabled = false;
}

function pick(i) {
  face = i;
  e = faces[i].e;
  m = faces[i].m;
  cur = null;
  state('ready');
  show();
  score(sampleRun);
}

async function take(img, isSample) {
  run++;
  const id = run;
  photo = makePhoto(img);
  cur = null;
  faces = [];
  face = 0;
  sampleRun = isSample;
  strip();
  const { w, h } = photo;
  const d = Math.min(w, h) * 0.27;
  e = [w / 2, h * 0.42];
  m = [w / 2, h * 0.42 + d];
  state('ready');
  show();
  busy(true);
  blank();
  const list = await findFaces(photo);
  if (id !== run) return;
  faces = list;
  busy(false);
  if (!list.length) {
    state('ready');
    say('No face detected');
    if (!isSample) tell('no_face');
    return;
  }
  pick(0);
  const me = photo;
  const all = await moreFaces(me, list);
  if (photo === me && faces.length) {
    faces = all;
    chip();
    if (all.length > 1 && !isSample) tell('multi', all.length);
  }
}

async function openFile(f) {
  if (!f || !f.type.startsWith('image/')) return;
  tell('scan');
  try {
    await take(await createImageBitmap(f, { imageOrientation: 'from-image' }), false);
  } catch {
    state('empty');
    blank();
  }
}

function inv(p) {
  const f = transform(EXP, e, m);
  const n = f.re * f.re + f.im * f.im;
  const x = p[0] - f.tx;
  const y = p[1] - f.ty;
  return [(f.re * x + f.im * y) / n, (-f.im * x + f.re * y) / n];
}

function pan(dx, dy) {
  const f = transform(EXP, e, m);
  const n = f.re * f.re + f.im * f.im;
  const ix = (f.re * dx + f.im * dy) / n;
  const iy = (-f.im * dx + f.re * dy) / n;
  e = [e[0] - ix, e[1] - iy];
  m = [m[0] - ix, m[1] - iy];
}

function zoomBy(r) {
  const c = inv([128, 128]);
  const z = (a) => [c[0] + (a[0] - c[0]) / r, c[1] + (a[1] - c[1]) / r];
  e = z(e);
  m = z(m);
}

function turnBy(rad) {
  const c = inv([128, 128]);
  const co = Math.cos(-rad);
  const si = Math.sin(-rad);
  const t = (a) => {
    const x = a[0] - c[0];
    const y = a[1] - c[1];
    return [c[0] + co * x - si * y, c[1] + si * x + co * y];
  };
  e = t(e);
  m = t(m);
}

const pic = $('pic');
const touches = new Map();
let gesture = null;
const adjusting = () => $('card').dataset.state === 'adjust';

pic.addEventListener('pointerdown', (ev) => {
  if (!adjusting()) return;
  touches.set(ev.pointerId, [ev.clientX, ev.clientY]);
  pic.setPointerCapture(ev.pointerId);
  pic.classList.add('moving');
  gesture = null;
  say('');
});

pic.addEventListener('pointermove', (ev) => {
  if (!adjusting() || !touches.has(ev.pointerId)) return;
  const was = touches.get(ev.pointerId);
  const s = 256 / pic.clientWidth;
  touches.set(ev.pointerId, [ev.clientX, ev.clientY]);
  if (touches.size === 1) {
    pan((ev.clientX - was[0]) * s, (ev.clientY - was[1]) * s);
  } else {
    const [a, b] = [...touches.values()];
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    if (gesture) {
      const r = d / gesture.d;
      let da = ang - gesture.ang;
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      pan((mx - gesture.mx) * s, (my - gesture.my) * s);
      zoomBy(r);
      turnBy(da);
    }
    gesture = { d, ang, mx, my };
  }
  show();
});

['pointerup', 'pointercancel'].forEach((n) =>
  pic.addEventListener(n, (ev) => {
    touches.delete(ev.pointerId);
    gesture = null;
    if (!touches.size) pic.classList.remove('moving');
  }),
);

pic.addEventListener('dblclick', () => {
  if (!adjusting()) return;
  zoomBy(1.6);
  show();
});

pic.addEventListener(
  'wheel',
  (ev) => {
    if (!adjusting()) return;
    ev.preventDefault();
    zoomBy(Math.exp(-ev.deltaY * (ev.ctrlKey ? 0.01 : 0.002)));
    show();
  },
  { passive: false },
);

pic.addEventListener('keydown', (ev) => {
  if (!adjusting()) return;
  const k = {
    ArrowLeft: [-6, 0],
    ArrowRight: [6, 0],
    ArrowUp: [0, -6],
    ArrowDown: [0, 6],
  }[ev.key];
  if (k) {
    ev.preventDefault();
    pan(k[0], k[1]);
    show();
  }
});

$('adjust').addEventListener('click', () => {
  run++;
  busy(false);
  state('adjust');
  show();
  tell('adjust');
});

$('next').addEventListener('click', () => pick((face + 1) % faces.length));

$('px').addEventListener('click', () => {
  if (!hide) tell('pixelate', 'photo');
  setHide(!hide);
});

$('cardpx').addEventListener('click', () => {
  if (!hide) tell('pixelate', 'card');
  setHide(!hide);
});

const inApp =
  /; wv\)/.test(navigator.userAgent) ||
  (/iPhone|iPad/.test(navigator.userAgent) && !/Safari/.test(navigator.userAgent));

$('share').addEventListener('click', () => {
  const can = navigator.canShare?.({
    files: [new File([''], 'a.jpg', { type: 'image/jpeg' })],
  });
  $('send').textContent = can ? 'Share' : 'Save';
  $('send').hidden = !can && inApp;
  $('sheet').showModal();
  drawCard();
  tell('card_open');
});

$('sheetx').addEventListener('click', () => $('sheet').close());

$('sheet').addEventListener('click', (ev) => {
  if (ev.target === $('sheet')) $('sheet').close();
});

$('send').addEventListener('click', () => {
  if (!cardFile) return;
  if (navigator.canShare?.({ files: [cardFile] })) {
    navigator
      .share({ files: [cardFile] })
      .then(() => tell('card_save', 'share'), () => {});
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(cardFile);
  a.download = cardFile.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
  tell('card_save', 'save');
});

$('done').addEventListener('click', async () => {
  const hit = await snapInCrop(photo, e, m);
  if (!hit) {
    say('No face detected');
    return;
  }
  e = hit.e;
  m = hit.m;
  faces = [];
  state('ready');
  show();
  score(sampleRun);
});

['file', 'file2'].forEach((i) =>
  $(i).addEventListener('change', (ev) => {
    openFile(ev.target.files[0]);
    ev.target.value = '';
  }),
);

$('sample').addEventListener('click', async () => {
  tell('sample');
  const i = new Image();
  i.src = new URL('sample.jpg', import.meta.url).href;
  await i.decode();
  take(i, true);
});

const drop = $('add');
['dragover', 'dragenter'].forEach((n) =>
  document.addEventListener(n, (ev) => {
    ev.preventDefault();
    drop.classList.add('over');
  }),
);
['dragleave', 'drop'].forEach((n) =>
  document.addEventListener(n, (ev) => {
    ev.preventDefault();
    drop.classList.remove('over');
  }),
);
document.addEventListener('drop', (ev) => openFile(ev.dataTransfer.files[0]));
window.addEventListener('paste', (ev) => {
  const f = [...(ev.clipboardData?.files || [])][0];
  if (f) openFile(f);
});

blank();
strip();
