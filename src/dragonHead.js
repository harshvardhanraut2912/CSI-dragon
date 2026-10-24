// dragonHead.js — optimized TOP-VIEW dragon head (canvas 2D).
// PERFORMANCE: every expensive thing (gradients, clipping, scale arcs, horns, shadows) is drawn ONCE into
// small offscreen sprites. Per frame we only blit ~5 sprites + a few cheap shapes (eyes, mane, tongue-glow).
// No shadowBlur, no per-frame gradients, no per-frame clip() — safe for low-end phones/laptops.
// LOOK: uses the body's own language — hsl red ramp (same hs()), dark #160000 outlines, back-facing scale
// arcs, two-tone "crystal" spikes, red->orange mane strands, cream claws/teeth. Lighting is symmetric
// (lit from above the camera) so the baked sprites stay correct while the dragon turns.
// API unchanged: drawHead(ctx, {time, jaw, breath, a}).
const TAU = Math.PI * 2, mix = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const tab = (T, x) => { if (x <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (x <= T[i][0]) return mix(T[i - 1][1], T[i][1], (x - T[i - 1][0]) / (T[i][0] - T[i - 1][0])); return T[T.length - 1][1]; };
const hs = (k, l, a = 1) => `hsla(${4 + k * 10},${92 - k * 35}%,${Math.max(3, Math.min(90, l))}%,${a})`;   // identical to body hs()
const bz = (p0, p1, p2, p3, u) => { const v = 1 - u; return [v*v*v*p0[0] + 3*v*v*u*p1[0] + 3*v*u*u*p2[0] + u*u*u*p3[0], v*v*v*p0[1] + 3*v*v*u*p1[1] + 3*v*u*u*p2[1] + u*u*u*p3[1]]; };
const OUT = '#160000', CREAM = '#efe2c6', CREAM_OUT = '#2a2010';

function sym(st, segs) {
  const p = new Path2D(), pts = [st]; p.moveTo(st[0], st[1]);
  segs.forEach(s => { p.bezierCurveTo(...s); pts.push([s[4], s[5]]); });
  for (let i = segs.length - 1; i >= 0; i--) { const s = segs[i], q = pts[i]; p.bezierCurveTo(s[2], -s[3], s[0], -s[1], q[0], -q[1]); }
  p.closePath(); return p;
}
// skull: wide cheeks, then a long taper back into a neck-width stub that overlaps the first body segment
const SKULL = sym([-54, 0], [[-54, 8, -54, 17, -52, 23], [-47, 23.2, -42, 23.2, -36, 23.6], [-30, 24, -22, 25.5, -12, 29], [-4, 32, 8, 33, 17, 29.5], [26, 26, 32, 20, 46, 18], [60, 16.5, 72, 16.5, 84, 15.5], [92, 14.8, 98, 11, 99, 6], [99.6, 3.5, 99.6, 1, 99, 0]]);
const UW = [[-54, 0], [-53, 20], [-52, 23], [-36, 23.6], [-22, 25.5], [-12, 29], [0, 32], [10, 32], [17, 29.5], [28, 24], [46, 18], [72, 16.5], [92, 14], [99, 5]];
const JAW = sym([-6, 0], [[-6, 12, -2, 22, 10, 25], [28, 27, 50, 21, 72, 17], [88, 15, 99, 11, 103, 5], [104.4, 2.5, 104.4, 1, 104, 0]]);
const FLOOR = sym([-2, 0], [[-2, 11, 3, 18, 12, 21], [28, 22, 50, 17, 72, 13], [86, 11, 96, 8, 100, 3], [101, 1.5, 101, .5, 100.5, 0]]);
const FW = [[12, 21], [30, 20.5], [50, 17], [72, 13], [86, 10.5], [96, 7], [100, 3]];
const UP_T = [[50, 4.4], [60, 3.8], [70, 7], [80, 3.8], [90, 3.4]];
const LO_T = [[44, 3.6], [56, 4], [68, 5.4], [80, 3.8], [92, 3]];

// ---------- sprite baking ----------
const X0 = -104, Y0 = -66, SW = 244, SH = 132, K = 1.8;      // sprite covers head-space box, K px per unit
const SP = {};
function bake(fn) {
  const cv = document.createElement('canvas'); cv.width = Math.ceil(SW * K); cv.height = Math.ceil(SH * K);
  const x = cv.getContext('2d'); x.scale(K, K); x.translate(-X0, -Y0); x.lineCap = x.lineJoin = 'round'; fn(x); return cv;
}
const blit = (c, s) => c.drawImage(s, X0, Y0, SW, SH);

// body-style scale arcs (back-facing "(" arcs, same stroke as the body)
function scaleArcs(x, path, x0, x1) {
  const rows = []; for (let px = x0, i = 0; px < x1; i++) { const sr = clamp(mix(7.6, 2.6, (px + 30) / 100), 2.6, 7.6), sp = sr * 1.55; rows.push([px, sr, sp, i]); px += sr * 1.15; }
  const arcs = (hl) => { x.beginPath(); rows.forEach(([px, sr, sp, i]) => { const w = tab(UW, px), n = Math.floor(w * .9 / sp), xx = px + (i & 1) * sr * .45;
    for (let q = -n; q <= n; q++) { const py = q * sp * (w * .9 / Math.max(1, n * sp) > 1 ? 1 : 1);
      if (hl) { x.moveTo(xx - sr * .2, py - sr * .55); x.lineTo(xx - sr * .2, py + sr * .55); } else { const a0 = Math.PI - 1.2; x.moveTo(xx + Math.cos(a0) * sr, py + Math.sin(a0) * sr); x.arc(xx, py, sr, a0, a0 + 2.4); } } }); x.stroke(); };
  x.save(); x.clip(path); x.strokeStyle = 'rgba(20,0,0,.55)'; x.lineWidth = 1.2; arcs(false);
  x.strokeStyle = 'rgba(255,170,110,.14)'; x.lineWidth = .8; arcs(true); x.restore();
}
// body-style two-tone crystal spike pointing along angle a, base centre (px,py)
function crystal(x, px, py, a, len, w, k, lit = 58) {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, T = [px + ux * len, py + uy * len], A = [px + nx * w, py + ny * w], B = [px - nx * w, py - ny * w], F = [px + ux * w * .25, py + uy * w * .25];
  x.lineWidth = .9; x.strokeStyle = '#200';
  x.fillStyle = hs(k, lit); x.beginPath(); x.moveTo(...F); x.lineTo(...A); x.lineTo(...T); x.closePath(); x.fill(); x.stroke();
  x.fillStyle = hs(k, lit * .45); x.beginPath(); x.moveTo(...F); x.lineTo(...B); x.lineTo(...T); x.closePath(); x.fill(); x.stroke();
}
// thick curved horn, body-coloured (dark crimson root -> hot orange tip), banded; baked so cost is irrelevant
function horn(x, P, w0, w1, rings) {
  const n = 22, Lp = [], Rp = [], C = [];
  for (let i = 0; i <= n; i++) { const u = i / n, p = bz(...P, u), q = bz(...P, Math.min(1, u + .02)), r = bz(...P, Math.max(0, u - .02)), dx = q[0] - r[0], dy = q[1] - r[1], l = Math.hypot(dx, dy) || 1, w = mix(w0, w1, Math.pow(u, .85)) * .5;
    Lp.push([p[0] - dy / l * w, p[1] + dx / l * w]); Rp.push([p[0] + dy / l * w, p[1] - dx / l * w]); C.push([p, dx / l, dy / l]); }
  for (let i = 0; i < n; i++) {
    const u = (i + .5) / n, hue = 4 + 30 * u * u, g = x.createLinearGradient(...Lp[i], ...Rp[i]);
    g.addColorStop(0, `hsl(${hue},90%,${mix(18, 30, u)}%)`); g.addColorStop(.35, `hsl(${hue},92%,${mix(48, 62, u)}%)`); g.addColorStop(1, `hsl(${hue},88%,${mix(10, 20, u)}%)`);
    x.fillStyle = g; x.strokeStyle = g; x.lineWidth = .6; x.beginPath(); x.moveTo(...Lp[i]); x.lineTo(...Lp[i + 1]); x.lineTo(...Rp[i + 1]); x.lineTo(...Rp[i]); x.closePath(); x.fill(); x.stroke();
  }
  x.strokeStyle = 'rgba(20,0,0,.55)'; x.lineWidth = 1; x.beginPath();
  for (let i = 3; i < n - 1; i += Math.max(1, Math.round(n / rings))) { const k = C[i]; x.moveTo(...Lp[i]); x.quadraticCurveTo(k[0][0] + k[1] * 2, k[0][1] + k[2] * 2, ...Rp[i]); } x.stroke();
  x.strokeStyle = OUT; x.lineWidth = .9; x.beginPath(); Lp.forEach((p, i) => i ? x.lineTo(...p) : x.moveTo(...p)); x.lineTo(...Rp[n]); for (let i = n; i >= 0; i--) x.lineTo(...Rp[i]); x.stroke();
}
function tooth(x, px, py, dx, dy, len, w) {
  const d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
  x.fillStyle = CREAM; x.strokeStyle = CREAM_OUT; x.lineWidth = .7; x.beginPath(); x.moveTo(px + nx * w, py + ny * w); x.quadraticCurveTo(px + nx * w * .6 + ux * len * .6, py + ny * w * .6 + uy * len * .6, px + ux * len, py + uy * len);
  x.quadraticCurveTo(px - nx * w * .6 + ux * len * .6, py - ny * w * .6 + uy * len * .6, px - nx * w, py - ny * w); x.closePath(); x.fill(); x.stroke();
}
const bodyGrad = (x, k, l, y = 34) => { const g = x.createLinearGradient(0, -y, 0, y); g.addColorStop(0, hs(k, l * .3)); g.addColorStop(.28, hs(k, l * 1.05)); g.addColorStop(.5, hs(k, l * 1.5)); g.addColorStop(.72, hs(k, l * 1.05)); g.addColorStop(1, hs(k, l * .3)); return g; };

function build() {
  // --- A. things behind everything: short cheek spikes (two-tone crystals like the body spines) ---
  SP.back = bake(x => {
    [1, -1].forEach(s => {
      [[26, 13, .30, 6], [16, 15, .34, 6.4], [6, 17, .38, 6.8], [-4, 19, .42, 7], [-14, 20, .46, 7], [-24, 21, .5, 6.6], [-34, 23, .54, 6.2]].forEach(([px, len, d, w]) => {
        const ang = s > 0 ? Math.PI - d : -Math.PI + d;        // sweeps backward along the neck
        crystal(x, px, s * (tab(UW, px) - 2), ang, len, w, 0, 56);
      });
      [[36, 21, 7], [46, 18.5, 6], [56, 17, 5]].forEach(([px, py, len]) => crystal(x, px, s * py, s > 0 ? Math.PI / 2 + .2 : -Math.PI / 2 - .2, len, 3.6, 0, 52));
    });
  });
  // --- B. lower jaw (cool + hot throat versions) ---
  const jawSprite = hot => bake(x => {
    x.fillStyle = bodyGrad(x, 0, 30, 28); x.fill(JAW); scaleArcs(x, JAW, -2, 100); x.strokeStyle = OUT; x.lineWidth = 1.2; x.stroke(JAW);
    x.save(); x.clip(FLOOR);
    let g = x.createLinearGradient(-4, 0, 102, 0); g.addColorStop(0, '#0e0106'); g.addColorStop(.35, '#3c0814'); g.addColorStop(.75, '#7a1620'); g.addColorStop(1, '#a82c34'); x.fillStyle = g; x.fillRect(-10, -25, 130, 50);
    if (hot) { g = x.createRadialGradient(24, 0, 1, 24, 0, 84); g.addColorStop(0, 'rgba(255,225,120,1)'); g.addColorStop(.35, 'rgba(255,120,25,.75)'); g.addColorStop(1, 'rgba(120,10,0,0)'); x.fillStyle = g; x.fillRect(-10, -25, 130, 50); }
    x.strokeStyle = 'rgba(20,0,4,.6)'; x.lineWidth = 8; x.stroke(FLOOR); x.restore();
    // tongue (static)
    x.beginPath(); x.moveTo(16, 6); x.quadraticCurveTo(54, 4.5, 94, 2.6); x.lineTo(101, 3); x.lineTo(98.5, .4); x.lineTo(101, -3); x.lineTo(94, -2.6); x.quadraticCurveTo(54, -4.5, 16, -6); x.closePath();
    g = x.createLinearGradient(0, -6, 0, 6); g.addColorStop(0, '#6a1022'); g.addColorStop(.5, '#d0505c'); g.addColorStop(1, '#6a1022'); x.fillStyle = g; x.fill(); x.strokeStyle = 'rgba(60,5,20,.75)'; x.lineWidth = .8; x.stroke();
    x.strokeStyle = 'rgba(70,5,20,.55)'; x.beginPath(); x.moveTo(18, 0); x.lineTo(98, 0); x.stroke();
    LO_T.forEach(([px, l]) => [1, -1].forEach(s => tooth(x, px, s * (tab(FW, px) + 1.6), .3, -s, l + 1.5, l * .38)));
  });
  SP.jaw = jawSprite(false); SP.jawHot = jawSprite(true);
  // --- C. skull base: horns, skull, scales, side bulges ---
  SP.horns = bake(x => { [1, -1].forEach(s => { x.save(); x.scale(1, s); horn(x, [[12, 22], [-8, 35], [-36, 46], [-64, 40]], 21, 4.5, 9); x.restore(); }); });
  SP.skull = bake(x => {
    x.fillStyle = bodyGrad(x, 0, 34, 34); x.fill(SKULL);
    scaleArcs(x, SKULL, -54, 98);
    x.save(); x.clip(SKULL);
    x.strokeStyle = 'rgba(20,0,0,.5)'; x.lineWidth = 10; x.stroke(SKULL);               // edge falloff = rounded volume
    let g = x.createLinearGradient(-46, 0, -14, 0); g.addColorStop(0, 'rgba(20,0,0,.35)'); g.addColorStop(1, 'rgba(20,0,0,0)'); x.fillStyle = g; x.fillRect(-48, -36, 34, 72);
    [[30, 0, 34, 14, .22], [82, 0, 20, 9, .2]].forEach(([cx, cy, rx, ry, a]) => { x.save(); x.translate(cx, cy); x.scale(rx, ry); g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgba(255,180,120,${a})`); g.addColorStop(1, 'rgba(255,180,120,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, TAU); x.fill(); x.restore(); });
    x.restore();
    // two bony nasal ridges
    [1, -1].forEach(s => { x.strokeStyle = 'rgba(25,0,0,.6)'; x.lineWidth = 5; x.beginPath(); x.moveTo(30, s * 11); x.bezierCurveTo(48, s * 10, 68, s * 9.5, 84, s * 8); x.stroke(); x.strokeStyle = hs(0, 40); x.lineWidth = 3; x.stroke(); x.strokeStyle = 'rgba(255,170,110,.25)'; x.lineWidth = .9; x.beginPath(); x.moveTo(30, s * 10); x.bezierCurveTo(48, s * 9, 68, s * 8.5, 84, s * 7); x.stroke(); });
    // eye sockets (dark pit the live eye sits in)
    [1, -1].forEach(s => { g = x.createRadialGradient(33, s * 21, 1, 33, s * 21, 14); g.addColorStop(0, 'rgba(15,0,0,.95)'); g.addColorStop(1, 'rgba(15,0,0,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(33, s * 21, 15, 11, 0, 0, TAU); x.fill(); });
    x.strokeStyle = OUT; x.lineWidth = 1.2; x.stroke(SKULL);
    // fade the neck end out so it melts into the first body segment (no cut-off line)
    x.globalCompositeOperation = 'destination-out'; g = x.createLinearGradient(-54, 0, -30, 0); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(-60, -40, 32, 80);
  });
  // --- D. skull top layer (drawn after the live eyes): brows, crest, nostrils, upper teeth ---
  SP.top = bake(x => {
    UP_T.forEach(([px, l]) => [1, -1].forEach(s => tooth(x, px, s * (tab(UW, px) - 1), .25, s, l + 1.5, l * .34 + .8)));
    // brow ridges: thick rounded bars
    [1, -1].forEach(s => { const B = [[10, s * 15], [24, s * 12], [38, s * 12], [47, s * 21]], path = () => { x.beginPath(); x.moveTo(...B[0]); x.bezierCurveTo(...B[1], ...B[2], ...B[3]); };
      x.lineCap = 'round'; path(); x.strokeStyle = 'rgba(20,0,0,.7)'; x.lineWidth = 9; x.stroke(); path(); x.strokeStyle = hs(0, 40); x.lineWidth = 6.6; x.stroke(); path(); x.strokeStyle = hs(0, 58); x.lineWidth = 3.2; x.stroke(); path(); x.strokeStyle = 'rgba(255,225,170,.4)'; x.lineWidth = 1; x.stroke();
      x.strokeStyle = 'rgba(20,0,0,.6)'; x.lineWidth = 1; x.beginPath(); [18, 28, 38].forEach(px => { const p = bz(...B, (px - 10) / 37 * .9 + .05); x.moveTo(p[0], p[1] - 3); x.lineTo(p[0] - 1, p[1] + 3); }); x.stroke(); });
    // centre crest: body-style crystal spines, small & fat, pointing back, growing toward the forehead
    for (let px = 70; px > -30; px -= 7.5) { const u = clamp((px + 30) / 100, 0, 1); crystal(x, px, 0, Math.PI, mix(11, 6, u) * .85, mix(4.6, 2.6, u), 0, 54); }
    // nostrils on raised pads
    [1, -1].forEach(s => { x.fillStyle = hs(0, 42); x.strokeStyle = OUT; x.lineWidth = .9; x.beginPath(); x.ellipse(91, s * 7.5, 6, 4.8, s * .4, 0, TAU); x.fill(); x.stroke();
      x.fillStyle = 'rgba(255,170,110,.3)'; x.beginPath(); x.ellipse(89.4, s * 8.8, 2.4, 1.1, 0, 0, TAU); x.fill();
      x.fillStyle = '#120201'; x.beginPath(); x.ellipse(91.6, s * 7, 3.3, 1.9, s * .45, 0, TAU); x.fill(); });
    // wet highlight on the snout
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 6); g.addColorStop(0, 'rgba(255,238,205,.45)'); g.addColorStop(1, 'rgba(255,238,205,0)');
    x.save(); x.translate(80, 0); x.scale(3.2, 1); x.fillStyle = g; x.fillRect(-7, -7, 14, 14); x.restore();
  });
  // --- E. mouth firelight ---
  SP.glow = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'), g = x.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, 'rgba(255,170,60,1)'); g.addColorStop(1, 'rgba(255,120,20,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); return cv; })();
}

export function drawHead(c, S) {
  if (!SP.skull) build();
  const t = S.time, br = S.breath, j = Math.max(S.jaw, .12 + .03 * Math.sin(t * 1.9)), blink = (t % 4.6) < .14;
  const sx = 1 - .2 * j, sy = 1 + .04 * j;
  c.save(); c.lineCap = c.lineJoin = 'round';

  // 1. neck mane (same strand colours as the body mane): few strands, 3 batched strokes
  c.lineWidth = 1.4;
  [['#4a0508', 0], ['#c3201a', .3], ['#ff6a2a', .62]].forEach(([col, s0], pass) => {
    c.strokeStyle = col; c.beginPath();
    for (let k = 0; k < 9; k++) { const u = k / 8, px = mix(8, -40, u), len = 13 + 8 * Math.sin(k * 1.3 + 1) ** 2 + u * 9;
      [1, -1].forEach(s => { const y = s * (tab(UW, px) - 4), a = Math.PI - s * mix(.35, .75, u), sw = Math.sin(t * 3 - k * .35) * .3 * s, mx = px + Math.cos(a + sw * .5) * len * .55, my = y + Math.sin(a + sw * .5) * len * .55, ex = px + Math.cos(a + sw) * len, ey = y + Math.sin(a + sw) * len;
        c.moveTo(mix(px, mx, s0), mix(y, my, s0)); c.quadraticCurveTo(mx, my, ex, ey); }); }
    c.stroke();
  });

  // 2. cheek spikes
  blit(c, SP.back);

  // 3. lower jaw (+ hot throat crossfade while breathing fire)
  c.save(); c.translate(j * 4, 0); blit(c, SP.jaw);
  if (br > .02) { c.globalAlpha = Math.min(1, br * 1.1); blit(c, SP.jawHot); c.globalAlpha = 1; }
  c.restore();

  // 4. skull (foreshortens as the mouth opens)
  c.save(); c.translate(-6, 0); c.scale(sx, sy); c.translate(6, 0);
  blit(c, SP.horns); blit(c, SP.skull);
  // live eyes: flat fills only
  const ey = blink ? .5 : 3.7, hot = 52 + br * 22;
  [1, -1].forEach(s => {
    c.fillStyle = `hsl(40,100%,${hot}%)`; c.beginPath(); c.ellipse(33, s * 21, 6.4, ey, s * .45, 0, TAU); c.fill();
    if (!blink) { c.fillStyle = 'rgba(255,140,0,.35)'; c.beginPath(); c.ellipse(33, s * 21, 3.2, ey - .8, s * .45, 0, TAU); c.fill();
      c.fillStyle = '#100100'; c.beginPath(); c.ellipse(33.4, s * 21, .9 + br * 1.2, 3.4, s * .45, 0, TAU); c.fill(); }
    c.strokeStyle = '#150100'; c.lineWidth = 1.3; c.beginPath(); c.ellipse(33, s * 21, 6.4, ey, s * .45, 0, TAU); c.stroke();
  });
  blit(c, SP.top);
  if (br > .05) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = br * .55; c.drawImage(SP.glow, 34, -30, 80, 60); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  c.restore();

  // 5. bloom around the mouth
  if (br > .05) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = br * .4; c.drawImage(SP.glow, 20, -75, 170, 150); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  c.restore();
}
