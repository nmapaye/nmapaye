// Finds a face, crops and aligns it to canonical templates, and runs the two face networks.
import './engine.mjs';

const BASE = new URL('./', import.meta.url).href;
export const EXP = { S: 256, E: [126.63, 75.15], M: [127.65, 179.75] };
export const AGE = { S: 224, E: [111.92, 75.01], M: [112.63, 148.25] };
const MAX_SIDE = 2800;
const CONF = { det: 0.5, pres: 0.6 };
const MAX_FACES = 6;

let En = null;
let An = null;
let finder = null;

async function net(name) {
  const [spec, bin] = await Promise.all([
    fetch(`${BASE}${name}.json`).then((r) => r.json()),
    fetch(`${BASE}${name}.bin`).then((r) => r.arrayBuffer()),
  ]);
  return new self.FaceNet.Net(spec, bin);
}

async function loadFinder() {
  try {
    const { FaceLandmarker } = await import('./vendor/vision_bundle.mjs');
    finder = await FaceLandmarker.createFromOptions(
      {
        wasmLoaderPath: `${BASE}vendor/vision_wasm_internal.mjs`,
        wasmBinaryPath: `${BASE}vendor/vision_wasm_internal.wasm`,
      },
      {
        baseOptions: {
          modelAssetPath: `${BASE}vendor/face_landmarker.task`,
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        numFaces: MAX_FACES,
        minFaceDetectionConfidence: CONF.det,
        minFacePresenceConfidence: CONF.pres,
        minTrackingConfidence: CONF.pres,
      },
    );
  } catch (err) {
    finder = null;
    console.warn('Face finder unavailable', err);
  }
}

export const ready = (async () => {
  [En, An] = await Promise.all([net('expnet'), net('agenet')]);
  await loadFinder();
})();

export function makePhoto(img) {
  const w = img.width || img.naturalWidth;
  const h = img.height || img.naturalHeight;
  const k = Math.min(1, MAX_SIDE / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return { c, w: c.width, h: c.height, mips: [c] };
}

function mip(p, level) {
  while (p.mips.length <= level) {
    const a = p.mips[p.mips.length - 1];
    const b = document.createElement('canvas');
    b.width = Math.max(1, a.width >> 1);
    b.height = Math.max(1, a.height >> 1);
    const x = b.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(a, 0, 0, b.width, b.height);
    p.mips.push(b);
  }
  return p.mips[level];
}

// Similarity transform that maps the eye midpoint and mouth midpoint onto the template.
export function transform(t, e, m) {
  const dx = m[0] - e[0];
  const dy = m[1] - e[1];
  const Dx = t.M[0] - t.E[0];
  const Dy = t.M[1] - t.E[1];
  const n = dx * dx + dy * dy;
  const re = (Dx * dx + Dy * dy) / n;
  const im = (Dy * dx - Dx * dy) / n;
  return {
    re,
    im,
    tx: t.E[0] - (re * e[0] - im * e[1]),
    ty: t.E[1] - (im * e[0] + re * e[1]),
  };
}

export function drawCrop(ctx, S, t, p, e, m, k = 1) {
  const f = transform(t, e, m);
  let s = Math.hypot(f.re, f.im) * k;
  let level = 0;
  while (s < 0.25 && level < 6) {
    s *= 2;
    level++;
  }
  const src = mip(p, level);
  const scale = p.w / src.width;
  const re = f.re * scale;
  const im = f.im * scale;
  const h = 0.5 / k;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, S, S);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low';
  ctx.setTransform(
    re * k,
    im * k,
    -im * k,
    re * k,
    (f.tx + h - (re - im) * h) * k,
    (f.ty + h - (im + re) * h) * k,
  );
  ctx.drawImage(src, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function tensor(t, p, e, m) {
  const c = document.createElement('canvas');
  c.width = c.height = t.S;
  const x = c.getContext('2d', { willReadFrequently: true });
  drawCrop(x, t.S, t, p, e, m);
  const d = x.getImageData(0, 0, t.S, t.S).data;
  const o = new Int16Array(t.S * t.S * 3);
  for (let i = 0; i < t.S * t.S; i++) {
    o[i * 3] = d[i * 4 + 2] - 128;
    o[i * 3 + 1] = d[i * 4 + 1] - 128;
    o[i * 3 + 2] = d[i * 4] - 128;
  }
  return o;
}

const pause = () => new Promise((r) => setTimeout(r, 10));

export async function scoreFace(p, e, m) {
  await ready;
  await pause();
  const a = self.FaceNet.expScores(En.run(tensor(EXP, p, e, m)));
  await pause();
  const b = self.FaceNet.ageScores(An.run(tensor(AGE, p, e, m)));
  return { ...a, ...b };
}

export const finderReady = async () => {
  await ready;
  return !!finder;
};

function faceFrom(L, w, h) {
  const P = (i) => [L[i].x * w, L[i].y * h];
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const l = mid(P(33), P(133));
  const r = mid(P(362), P(263));
  const e = mid(l, r);
  const m = mid(P(61), P(291));
  return {
    e,
    m,
    eyes: Math.hypot(r[0] - l[0], r[1] - l[1]),
    span: Math.hypot(m[0] - e[0], m[1] - e[1]),
  };
}

const believable = (f) => f.span >= 8 && f.eyes / f.span > 0.35 && f.eyes / f.span < 1.9;

function look(p, sx, sy, sw, sh, deg, pad = 1) {
  const k = Math.min(1280 / (Math.max(sw, sh) * pad), 4);
  const T = document.createElement('canvas');
  const w = Math.round(sw * k);
  const h = Math.round(sh * k);
  const rad = (deg * Math.PI) / 180;
  const W = deg ? Math.ceil(Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad))) : Math.round(w * pad);
  const H = deg ? Math.ceil(Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad))) : Math.round(h * pad);
  T.width = W;
  T.height = H;
  const x = T.getContext('2d');
  x.fillStyle = '#808080';
  x.fillRect(0, 0, W, H);
  x.imageSmoothingQuality = 'high';
  x.translate(W / 2, H / 2);
  x.rotate(rad);
  x.drawImage(p.c, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
  const back = (a) => {
    const dx = a[0] - W / 2;
    const dy = a[1] - H / 2;
    const c = Math.cos(-rad);
    const s = Math.sin(-rad);
    return [(c * dx - s * dy + w / 2) / k + sx, (s * dx + c * dy + h / 2) / k + sy];
  };
  return finder
    .detect(T)
    .faceLandmarks.map((L) => faceFrom(L, W, H))
    .map((f) => ({ e: back(f.e), m: back(f.m), eyes: f.eyes / k, span: f.span / k }))
    .filter(believable)
    .sort((a, b) => b.span - a.span);
}

// A real face turns up again, in the right place, once it's cropped and aligned.
function confirmed(p, f) {
  const k = 1.5;
  const S = 256 * k;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  drawCrop(c.getContext('2d'), S, EXP, p, f.e, f.m, k);
  return finder
    .detect(c)
    .faceLandmarks.map((L) => faceFrom(L, S, S))
    .some(
      (g) =>
        Math.hypot(g.e[0] - EXP.E[0] * k, g.e[1] - EXP.E[1] * k) < S * 0.12 &&
        Math.hypot(g.m[0] - EXP.M[0] * k, g.m[1] - EXP.M[1] * k) < S * 0.12,
    );
}

const real = (p, list) => list.filter((f) => confirmed(p, f));

// Tries the whole photo, then a padded view for close-ups, then tilted views.
export async function findFaces(p) {
  await ready;
  if (!finder) return [];
  const { w, h } = p;
  let hit = real(p, look(p, 0, 0, w, h, 0));
  if (hit.length) return hit;
  await pause();
  hit = real(p, look(p, 0, 0, w, h, 0, 1.7));
  if (hit.length) return hit;
  for (const deg of [-30, 30, -60, 60, -90, 90]) {
    await pause();
    hit = real(p, look(p, 0, 0, w, h, deg));
    if (hit.length) return hit;
  }
  return [];
}

// Tighter sliding windows pick up smaller faces once a real face is confirmed.
export async function moreFaces(p, known) {
  const { w, h } = p;
  const found = [...known];
  for (const f of [0.7, 0.45, 0.28]) {
    const sw = Math.round(Math.min(w, h) * f);
    const step = Math.round(sw * 0.6);
    const xs = [];
    const ys = [];
    for (let x = 0; x <= w - sw; x += step) xs.push(x);
    if (xs[xs.length - 1] !== w - sw) xs.push(w - sw);
    for (let y = 0; y <= h - sw; y += step) ys.push(y);
    if (ys[ys.length - 1] !== h - sw) ys.push(h - sw);
    for (const x of xs) {
      for (const y of ys) {
        await pause();
        for (const g of real(p, look(p, x, y, sw, sw, 0))) {
          if (!found.some((o) => Math.hypot(o.e[0] - g.e[0], o.e[1] - g.e[1]) < o.span)) {
            found.push(g);
          }
        }
      }
    }
  }
  return found.slice(0, MAX_FACES);
}

// Re-aligns a manually adjusted crop to exact eye/mouth landmarks.
export async function snapInCrop(p, e, m) {
  await ready;
  if (!finder) return null;
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  drawCrop(c.getContext('2d'), 1024, EXP, p, e, m, 4);
  const q = { c, w: 1024, h: 1024 };
  for (const deg of [0, -30, 30, -60, 60, -90, 90]) {
    const hit = look(q, 0, 0, 1024, 1024, deg)[0];
    if (hit) {
      const f = transform(EXP, e, m);
      const n = f.re * f.re + f.im * f.im;
      const back = (a) => {
        const x = a[0] / 4 - f.tx;
        const y = a[1] / 4 - f.ty;
        return [(f.re * x + f.im * y) / n, (-f.im * x + f.re * y) / n];
      };
      const r = { e: back(hit.e), m: back(hit.m) };
      if (confirmed(p, r)) return r;
    }
    await pause();
  }
  return null;
}
