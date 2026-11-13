// Runs decoded face networks with 16-bit fixed-point arithmetic.
(function (root) {
  function rs(x, s) {
    if (s <= 0) return x * Math.pow(2, -s);
    const d = Math.pow(2, s);
    return Math.floor(x / d + 0.5);
  }

  function sat(x) {
    return x > 32767 ? 32767 : x < -32768 ? -32768 : x;
  }

  class Net {
    constructor(spec, buf) {
      this.ops = spec.ops;
      this.buf = buf;
    }

    run(hwc) {
      const T = {};
      const ops = this.ops;
      const buf = this.buf;

      for (const o of ops) {
        if (o.op === 'data') {
          const n = o.h * o.w;
          const ch = [];
          for (let c = 0; c < o.c; c++) {
            const p = new Int16Array(n);
            for (let i = 0; i < n; i++) p[i] = hwc[i * o.c + c];
            ch.push(p);
          }
          T[o.name] = { c: ch, h: o.h, w: o.w, f: o.frac };
        } else if (o.op === 'conv' || o.op === 'dw') {
          const X = T[o.top];
          const H = X.h;
          const W = X.w;
          const S = o.s;
          const P = o.p;
          const kh = o.kh;
          const kw = o.kw;
          const oh = Math.floor((H + 2 * P - kh) / S) + 1;
          const ow = Math.floor((W + 2 * P - kw) / S) + 1;
          const N = oh * ow;
          const dw = o.op === 'dw';
          const cnt = dw ? kh * kw * o.o : o.o * kh * kw * o.i;
          const wt = new Int16Array(buf, o.wOff, cnt);
          const bt = o.bias ? new Int32Array(buf, o.bOff, o.o) : null;
          const ch = [];
          const acc = new Float64Array(N);
          const sh = X.f + o.wf - o.of;

          for (let c = 0; c < o.o; c++) {
            acc.fill(bt ? rs(bt[c], o.bf - (X.f + o.wf)) : 0);
            for (let ky = 0; ky < kh; ky++) {
              for (let kx = 0; kx < kw; kx++) {
                const iters = dw ? 1 : o.i;
                for (let ii = 0; ii < iters; ii++) {
                  const wv = dw
                    ? wt[(ky * kw + kx) * o.o + c]
                    : wt[((c * kh + ky) * kw + kx) * o.i + ii];
                  if (!wv) continue;
                  const src = X.c[dw ? c : ii];
                  for (let y = 0; y < oh; y++) {
                    const sy = y * S + ky - P;
                    if (sy < 0 || sy >= H) continue;
                    const row = sy * W;
                    const or = y * ow;
                    for (let x = 0; x < ow; x++) {
                      const sx = x * S + kx - P;
                      if (sx < 0 || sx >= W) continue;
                      acc[or + x] += wv * src[row + sx];
                    }
                  }
                }
              }
            }
            const p = new Int16Array(N);
            for (let i = 0; i < N; i++) {
              let v = sat(rs(acc[i], sh));
              if (o.act && v < 0) v = 0;
              p[i] = v;
            }
            ch.push(p);
          }
          T[o.bot] = { c: ch, h: oh, w: ow, f: o.of };
        } else if (o.op === 'add') {
          const A = T[o.a];
          const B = T[o.b];
          const sa = A.f - o.of;
          const sb = B.f - o.of;
          const ch = [];
          for (let c = 0; c < A.c.length; c++) {
            const a = A.c[c];
            const b = B.c[c];
            const n = a.length;
            const p = new Int16Array(n);
            for (let i = 0; i < n; i++) {
              let v = sat(rs(a[i], sa) + rs(b[i], sb));
              if (o.act && v < 0) v = 0;
              p[i] = v;
            }
            ch.push(p);
          }
          T[o.bot] = { c: ch, h: A.h, w: A.w, f: o.of };
        } else if (o.op === 'concat') {
          const first = T[o.tops[0]];
          const ch = [];
          for (const nm of o.tops) {
            const X = T[nm];
            const s = X.f - o.of;
            for (const a of X.c) {
              const n = a.length;
              const p = new Int16Array(n);
              for (let i = 0; i < n; i++) p[i] = sat(rs(a[i], s));
              ch.push(p);
            }
          }
          T[o.bot] = { c: ch, h: first.h, w: first.w, f: o.of };
        } else if (o.op === 'gap') {
          const X = T[o.top];
          const sc = Math.pow(2, X.f);
          const v = new Float64Array(X.c.length);
          for (let c = 0; c < X.c.length; c++) {
            let s = 0;
            const p = X.c[c];
            for (let i = 0; i < p.length; i++) s += p[i];
            v[c] = s / p.length / sc;
          }
          T[o.bot] = { v };
        } else if (o.op === 'flat') {
          T[o.bot] = T[o.top];
        } else if (o.op === 'fc') {
          const x = T[o.top].v;
          const w = new Float32Array(buf, o.wOff, o.o * o.i);
          const b = new Float32Array(buf, o.bOff, o.o);
          const v = new Float64Array(o.o);
          for (let j = 0; j < o.o; j++) {
            let s = b[j];
            for (let i = 0; i < o.i; i++) s += w[j * o.i + i] * x[i];
            v[j] = s;
          }
          T[o.bot] = { v };
        } else if (o.op === 'softmax') {
          const x = T[o.top].v;
          let m = -Infinity;
          for (const a of x) m = Math.max(m, a);
          let s = 0;
          const v = x.map((a) => {
            const e = Math.exp(a - m);
            s += e;
            return e;
          });
          T[o.bot] = { v: v.map((e) => e / s) };
        }
      }
      return T;
    }
  }

  function expScores(T) {
    return {
      attractiveRaw: T.predict_attractive.v[0],
      attractive: Math.min(100, Math.max(0, T.predict_attractive.v[0] + 15)),
      happy: T.predict_happy.v[0],
      valence: T.predict_valence.v[0],
      arousal: T.predict_arousal.v[0],
      exp: Array.from(T.prob_exp.v),
    };
  }

  function ageScores(T) {
    return {
      age: T.predict_age.v[0] * 10,
      boy: T.prob_gender.v[1],
    };
  }

  root.FaceNet = { Net, expScores, ageScores };
  if (typeof module !== 'undefined') module.exports = { Net, expScores, ageScores };
})(typeof self !== 'undefined' ? self : globalThis);
