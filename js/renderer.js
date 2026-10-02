// ─── PackMockup Canvas Renderer ──────────────────────────────
'use strict';

// Polyfill for roundRect (Safari < 15.4, older Chrome)
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    const radii = Array.isArray(r) ? r : [r, r, r, r];
    const [tl = 0, tr = 0, br = 0, bl = 0] = radii;
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.arcTo(x + w, y, x + w, y + tr, tr);
    this.lineTo(x + w, y + h - br);
    this.arcTo(x + w, y + h, x + w - br, y + h, br);
    this.lineTo(x + bl, y + h);
    this.arcTo(x, y + h, x, y + h - bl, bl);
    this.lineTo(x, y + tl);
    this.arcTo(x, y, x + tl, y, tl);
  };
}

// ════════════════════════════════════════════════════════════
// COLOR UTILITIES
// ════════════════════════════════════════════════════════════

const hexToRgb = hex => {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const colorAdjust = (hex, factor) => {
  const [r, g, b] = hexToRgb(hex);
  const c = v => Math.min(255, Math.max(0, Math.round(v * factor)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
};

const colorAlpha = (hex, a) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

const isDark = hex => {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
};

// ════════════════════════════════════════════════════════════
// CANVAS PRIMITIVES
// ════════════════════════════════════════════════════════════

const quadPath = (ctx, [tl, tr, br, bl]) => {
  ctx.beginPath();
  ctx.moveTo(tl[0], tl[1]);
  ctx.lineTo(tr[0], tr[1]);
  ctx.lineTo(br[0], br[1]);
  ctx.lineTo(bl[0], bl[1]);
  ctx.closePath();
};

const fillQuad = (ctx, quad, style, alpha = 1) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  quadPath(ctx, quad);
  ctx.fillStyle = style;
  ctx.fill();
  ctx.restore();
};

const strokeQuad = (ctx, quad, style, lw = 1, alpha = 1) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  quadPath(ctx, quad);
  ctx.strokeStyle = style;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
};

const drawDropShadow = (ctx, cx, cy, rx, ry) => {
  ctx.save();
  ctx.scale(1, ry / rx);
  const syAdj = cy * rx / ry;
  const g = ctx.createRadialGradient(cx, syAdj, 0, cx, syAdj, rx);
  g.addColorStop(0,   'rgba(0,0,0,0.28)');
  g.addColorStop(0.55,'rgba(0,0,0,0.10)');
  g.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.beginPath();
  ctx.arc(cx, syAdj, rx, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
};

// ════════════════════════════════════════════════════════════
// IMAGE MAPPING
// ════════════════════════════════════════════════════════════

/**
 * Map a user image onto a parallelogram face using 2D affine transform.
 * quad = [[tl_x,tl_y],[tr_x,tr_y],[br_x,br_y],[bl_x,bl_y]]
 * The image is scaled to cover the face (object-fit: cover).
 */
const mapImageToFace = (ctx, img, quad, opts = {}) => {
  if (!img) return;
  const { scale = 1, ox = 0, oy = 0, rotation = 0, opacity = 1 } = opts;
  const [tl, tr, br, bl] = quad;

  const fw = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]);
  const fh = Math.hypot(bl[0] - tl[0], bl[1] - tl[1]);
  if (fw < 1 || fh < 1) return;

  const iw = img.naturalWidth || img.width || 1;
  const ih = img.naturalHeight || img.height || 1;

  // Cover-fit scale
  const sc = Math.max(fw / iw, fh / ih) * scale;
  const sw = iw * sc;
  const sh = ih * sc;

  ctx.save();
  quadPath(ctx, quad);
  ctx.clip();
  ctx.globalAlpha = opacity;

  // Affine: maps face coords (fw x fh rect) to canvas parallelogram
  const ax = (tr[0] - tl[0]) / fw, ay = (tr[1] - tl[1]) / fw;
  const bx = (bl[0] - tl[0]) / fh, by = (bl[1] - tl[1]) / fh;
  ctx.transform(ax, ay, bx, by, tl[0], tl[1]);

  // Center image in face space with optional offset/rotation
  if (rotation !== 0) {
    ctx.translate(fw / 2 + ox, fh / 2 + oy);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
  } else {
    const dx = (fw - sw) / 2 + ox;
    const dy = (fh - sh) / 2 + oy;
    ctx.drawImage(img, dx, dy, sw, sh);
  }
  ctx.restore();
};

/**
 * Map user image onto a cylindrical surface (front 180° visible).
 * Uses strip-based rendering with arcsin-based UV unwrapping.
 */
const mapImageToCylinder = (ctx, img, x, y, w, h, opts = {}) => {
  if (!img) return;
  const { scale = 1, oy = 0, opacity = 1 } = opts;

  const iw = img.naturalWidth || img.width || 1;
  const ih = img.naturalHeight || img.height || 1;

  // Scale image so it fills the label height, with slight width overage
  const sc = Math.max((w * 1.05) / iw, h / ih) * scale;
  const siw = iw * sc;
  const sih = ih * sc;
  const imgY = y + (h - sih) / 2 + oy;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.globalAlpha = opacity;

  for (let i = 0; i <= w; i++) {
    const px = x + i;
    const t = (i / (w - 1)) * 2 - 1;              // -1..+1 across cylinder
    const tc = Math.max(-0.9999, Math.min(0.9999, t));
    const theta = Math.asin(tc);                   // -PI/2..+PI/2
    const u = (theta + Math.PI / 2) / Math.PI;    // 0..1

    // Source strip width (derivative of u w.r.t. i)
    const cosTheta = Math.cos(theta);
    const stripW = Math.max(0.5, siw * 2 / (Math.PI * (w - 1) * cosTheta));
    const srcX = u * siw - stripW / 2;

    ctx.drawImage(img, srcX, 0, stripW, ih, px, imgY, 1, sih);
  }
  ctx.restore();
};

// ════════════════════════════════════════════════════════════
// BOX GEOMETRY HELPER
// ════════════════════════════════════════════════════════════

/**
 * Returns face quads for an isometric box.
 * All coordinates are canvas pixels.
 */
const boxGeometry = (cw, ch, frontW, frontH, depthX, depthY) => {
  // Center everything. depthY is negative (top face goes up-right).
  const totalW = frontW + Math.abs(depthX);
  const totalH = frontH + Math.abs(depthY);
  const sx = (cw - totalW) / 2;
  const sy = (ch - totalH) / 2 + 15; // slight downward shift for shadow

  // Front face top-left starts below the top face
  const fx = sx;
  const fy = sy + Math.abs(depthY);

  const frontTL = [fx,            fy           ];
  const frontTR = [fx + frontW,   fy           ];
  const frontBR = [fx + frontW,   fy + frontH  ];
  const frontBL = [fx,            fy + frontH  ];

  const topTL   = [fx,                    fy            ];
  const topTR   = [fx + frontW,           fy            ];
  const topBR   = [fx + frontW + depthX,  fy + depthY   ]; // depthY < 0 = up
  const topBL   = [fx + depthX,           fy + depthY   ];

  const rightTL = [fx + frontW,           fy            ];
  const rightTR = [fx + frontW + depthX,  fy + depthY   ];
  const rightBR = [fx + frontW + depthX,  fy + depthY + frontH];
  const rightBL = [fx + frontW,           fy + frontH   ];

  return {
    front: [frontTL, frontTR, frontBR, frontBL],
    top:   [topTL,   topTR,   topBR,   topBL  ],
    right: [rightTL, rightTR, rightBR, rightBL],
    shadow: {
      cx: fx + frontW / 2 + depthX / 2,
      cy: fy + frontH + 18,
      rx: (frontW + depthX) * 0.5,
      ry: 16
    }
  };
};

// Draw the three faces of an isometric box
const drawBox = (ctx, { cw, ch, color, img, imgOpts, frontW, frontH, depthX, depthY }) => {
  const geo = boxGeometry(cw, ch, frontW, frontH, depthX, depthY);
  const { front, top, right, shadow } = geo;
  const dark = isDark(color);

  const topColor   = colorAdjust(color, dark ? 1.45 : 1.14);
  const rightColor = colorAdjust(color, dark ? 0.52 : 0.66);
  const edgeAlpha  = dark ? 0.18 : 0.10;
  const hiColor    = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.7)';

  drawDropShadow(ctx, shadow.cx, shadow.cy, shadow.rx, shadow.ry);

  // Right face (darkest)
  fillQuad(ctx, right, rightColor);
  const rg = ctx.createLinearGradient(right[0][0], 0, right[1][0], 0);
  rg.addColorStop(0, 'rgba(0,0,0,0.04)');
  rg.addColorStop(1, 'rgba(0,0,0,0.18)');
  fillQuad(ctx, right, rg);

  // Top face (lightest)
  fillQuad(ctx, top, topColor);
  const tg = ctx.createLinearGradient(0, top[0][1], 0, top[2][1]);
  tg.addColorStop(0, 'rgba(255,255,255,0.3)');
  tg.addColorStop(1, 'rgba(0,0,0,0.04)');
  fillQuad(ctx, top, tg);

  // Front face + user image
  fillQuad(ctx, front, color);
  mapImageToFace(ctx, img, front, imgOpts);

  // Subtle left-to-right gradient on front
  const fg = ctx.createLinearGradient(front[0][0], 0, front[1][0], 0);
  fg.addColorStop(0, 'rgba(255,255,255,0.10)');
  fg.addColorStop(0.6,'rgba(255,255,255,0)');
  fg.addColorStop(1, 'rgba(0,0,0,0.07)');
  fillQuad(ctx, front, fg);

  // Edges
  strokeQuad(ctx, front, `rgba(0,0,0,${edgeAlpha})`, 1.5);
  strokeQuad(ctx, top,   `rgba(0,0,0,${edgeAlpha})`, 1);
  strokeQuad(ctx, right, `rgba(0,0,0,${edgeAlpha})`, 1);

  // Left + top highlight edge
  ctx.save();
  ctx.strokeStyle = hiColor;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(front[0][0], front[0][1]);
  ctx.lineTo(front[3][0], front[3][1]);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(front[0][0], front[0][1]);
  ctx.lineTo(front[1][0], front[1][1]);
  ctx.stroke();
  ctx.restore();
};

// ════════════════════════════════════════════════════════════
// MOCKUP RENDERERS
// ════════════════════════════════════════════════════════════

const drawTuckBox = (ctx, { cw, ch, color, img, imgOpts }) => {
  ctx.clearRect(0, 0, cw, ch);
  drawBox(ctx, {
    cw, ch, color, img, imgOpts,
    frontW: cw * 0.37, frontH: ch * 0.53,
    depthX: cw * 0.14, depthY: -ch * 0.072,
  });
};

const drawMailerBox = (ctx, { cw, ch, color, img, imgOpts }) => {
  ctx.clearRect(0, 0, cw, ch);
  drawBox(ctx, {
    cw, ch, color, img, imgOpts,
    frontW: cw * 0.43, frontH: ch * 0.42,
    depthX: cw * 0.13, depthY: -ch * 0.062,
  });
  // Add seal line on top face
  const geo = boxGeometry(cw, ch, cw*0.43, ch*0.42, cw*0.13, -ch*0.062);
  const [tl,,, tr3] = geo.top;
  const [tr, tr2] = [geo.top[1], geo.top[2]];
  const dark = isDark(color);
  ctx.save();
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  // midline of top face
  const mx1 = (tl[0] + tr3[0]) / 2, my1 = (tl[1] + tr3[1]) / 2;
  const mx2 = (tr[0] + tr2[0]) / 2, my2 = (tr[1] + tr2[1]) / 2;
  ctx.moveTo(mx1, my1);
  ctx.lineTo(mx2, my2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
};

const drawSquareBox = (ctx, { cw, ch, color, img, imgOpts }) => {
  ctx.clearRect(0, 0, cw, ch);
  const s = Math.min(cw * 0.37, ch * 0.38);
  drawBox(ctx, {
    cw, ch, color, img, imgOpts,
    frontW: s, frontH: s,
    depthX: cw * 0.13, depthY: -ch * 0.065,
  });
};

// ─── Stand-up Pouch ──────────────────────────────────────────

const drawStandupPouch = (ctx, { cw, ch, color, img, imgOpts }) => {
  ctx.clearRect(0, 0, cw, ch);
  const dark = isDark(color);

  const pw  = cw * 0.44;
  const ph  = ch * 0.60;
  const px  = (cw - pw) / 2;
  const py  = (ch - ph) / 2;
  const gw  = pw * 0.11;  // gusset width
  const zh  = ph * 0.065; // zipper height
  const brh = ph * 0.11;  // bottom rounded height

  const mainX = px + gw;
  const mainY = py + zh;
  const mainW = pw - 2 * gw;
  const mainH = ph - zh - brh;
  const rr = 10;

  drawDropShadow(ctx, cw / 2, py + ph + 12, pw * 0.44, 13);

  // Left gusset
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(px, py + zh);
  ctx.quadraticCurveTo(px, py + ph - brh, px + gw * 0.3, py + ph);
  ctx.lineTo(px + gw, py + ph - brh * 0.4);
  ctx.lineTo(px + gw, py + zh);
  ctx.closePath();
  ctx.fillStyle = colorAdjust(color, dark ? 0.52 : 0.70);
  ctx.fill();
  ctx.restore();

  // Right gusset
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(px + pw, py + zh);
  ctx.quadraticCurveTo(px + pw, py + ph - brh, px + pw - gw * 0.3, py + ph);
  ctx.lineTo(px + pw - gw, py + ph - brh * 0.4);
  ctx.lineTo(px + pw - gw, py + zh);
  ctx.closePath();
  ctx.fillStyle = colorAdjust(color, dark ? 0.52 : 0.70);
  ctx.fill();
  ctx.restore();

  // Main front body
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(mainX + rr, mainY);
  ctx.lineTo(mainX + mainW - rr, mainY);
  ctx.arcTo(mainX + mainW, mainY, mainX + mainW, mainY + rr, rr);
  ctx.lineTo(mainX + mainW, mainY + mainH - rr);
  ctx.arcTo(mainX + mainW, mainY + mainH, mainX + mainW - rr, mainY + mainH, rr);
  ctx.lineTo(mainX + rr, mainY + mainH);
  ctx.arcTo(mainX, mainY + mainH, mainX, mainY + mainH - rr, rr);
  ctx.lineTo(mainX, mainY + rr);
  ctx.arcTo(mainX, mainY, mainX + rr, mainY, rr);
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = color;
  ctx.fill();

  // User image
  if (img) {
    const o = imgOpts || {};
    const { scale = 1, ox = 0, oy = 0, rotation = 0, opacity = 1 } = o;
    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;
    const sc = Math.max(mainW / iw, mainH / ih) * scale;
    const sw = iw * sc, sh = ih * sc;
    ctx.globalAlpha = opacity;
    if (rotation !== 0) {
      ctx.translate(mainX + mainW / 2 + ox, mainY + mainH / 2 + oy);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
    } else {
      ctx.drawImage(img, mainX + (mainW - sw) / 2 + ox, mainY + (mainH - sh) / 2 + oy, sw, sh);
    }
    ctx.globalAlpha = 1;
  }

  // Gloss gradient
  const grad = ctx.createLinearGradient(mainX, 0, mainX + mainW, 0);
  grad.addColorStop(0,    'rgba(255,255,255,0.38)');
  grad.addColorStop(0.22, 'rgba(255,255,255,0.08)');
  grad.addColorStop(0.7,  'rgba(255,255,255,0)');
  grad.addColorStop(1,    'rgba(0,0,0,0.14)');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // Zipper strip
  ctx.save();
  ctx.beginPath();
  ctx.rect(mainX, py, mainW, zh + rr);
  ctx.clip();
  ctx.fillStyle = colorAdjust(color, dark ? 0.72 : 0.86);
  ctx.fill();
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(mainX + 8, py + zh * 0.52);
  ctx.lineTo(mainX + mainW - 8, py + zh * 0.52);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Bottom gusset
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(mainX, mainY + mainH);
  ctx.lineTo(mainX + mainW, mainY + mainH);
  ctx.arcTo(mainX + mainW, mainY + mainH + brh * 0.5, mainX + mainW - gw, mainY + mainH + brh, gw);
  ctx.lineTo(mainX + gw, mainY + mainH + brh);
  ctx.arcTo(mainX, mainY + mainH + brh * 0.5, mainX, mainY + mainH, gw);
  ctx.closePath();
  ctx.fillStyle = colorAdjust(color, dark ? 0.68 : 0.86);
  ctx.fill();
  ctx.restore();

  // Edge lines
  ctx.save();
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(mainX, mainY); ctx.lineTo(mainX, mainY + mainH); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(mainX + mainW, mainY); ctx.lineTo(mainX + mainW, mainY + mainH); ctx.stroke();
  ctx.restore();
};

// ─── Flat Sachet ─────────────────────────────────────────────

const drawFlatPouch = (ctx, { cw, ch, color, img, imgOpts }) => {
  ctx.clearRect(0, 0, cw, ch);
  const dark = isDark(color);

  const pw = cw * 0.54;
  const ph = ch * 0.56;
  const px = (cw - pw) / 2;
  const py = (ch - ph) / 2;
  const r  = 14;
  const sh = ph * 0.08; // seal height

  drawDropShadow(ctx, cw / 2, py + ph + 12, pw * 0.46, 12);

  // Body
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px, py + sh, pw, ph - 2 * sh, r);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fill();

  if (img) {
    const o = imgOpts || {};
    const { scale = 1, ox = 0, oy = 0, rotation = 0, opacity = 1 } = o;
    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;
    const mainW = pw, mainH = ph - 2 * sh;
    const sc = Math.max(mainW / iw, mainH / ih) * scale;
    const sw = iw * sc, dsh = ih * sc;
    ctx.globalAlpha = opacity;
    if (rotation !== 0) {
      ctx.translate(px + mainW / 2 + ox, py + sh + mainH / 2 + oy);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.drawImage(img, -sw / 2, -dsh / 2, sw, dsh);
    } else {
      ctx.drawImage(img, px + (mainW - sw) / 2 + ox, py + sh + (mainH - dsh) / 2 + oy, sw, dsh);
    }
    ctx.globalAlpha = 1;
  }

  const g = ctx.createLinearGradient(px, 0, px + pw, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.42)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.10)');
  g.addColorStop(0.7, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.16)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();

  // Top seal
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px, py, pw, sh + r, [r, r, 0, 0]);
  ctx.clip();
  ctx.fillStyle = colorAdjust(color, dark ? 0.68 : 0.83);
  ctx.fill();
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    const lx = px + pw * 0.06 + (pw * 0.88 / 8) * i;
    ctx.beginPath(); ctx.moveTo(lx, py + 3); ctx.lineTo(lx, py + sh - 3); ctx.stroke();
  }
  ctx.restore();

  // Bottom seal
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px, py + ph - sh - r, pw, sh + r, [0, 0, r, r]);
  ctx.clip();
  ctx.fillStyle = colorAdjust(color, dark ? 0.68 : 0.83);
  ctx.fill();
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    const lx = px + pw * 0.06 + (pw * 0.88 / 8) * i;
    ctx.beginPath(); ctx.moveTo(lx, py + ph - sh + 3); ctx.lineTo(lx, py + ph - 3); ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, r); ctx.stroke();
  ctx.restore();
};

// ─── Beverage Can ────────────────────────────────────────────

const drawSodaCan = (ctx, { cw, ch, color, img, imgOpts }) => {
  ctx.clearRect(0, 0, cw, ch);
  const dark = isDark(color);

  const cx   = cw / 2;
  const canW = cw * 0.30;
  const canH = ch * 0.58;
  const canX = cx - canW / 2;
  const canY = (ch - canH) / 2;
  const rx   = canW / 2;
  const ryE  = canW * 0.155; // ellipse vertical radius

  drawDropShadow(ctx, cx, canY + canH + 14, rx * 1.1, 14);

  // Body
  ctx.save();
  ctx.beginPath();
  ctx.rect(canX, canY + ryE, canW, canH - 2 * ryE);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(canX, canY + ryE, canW, canH - 2 * ryE);

  const lblY = canY + ryE * 2;
  const lblH = canH - ryE * 4.5;
  mapImageToCylinder(ctx, img, canX, lblY, canW, lblH, imgOpts);

  const cg = ctx.createLinearGradient(canX, 0, canX + canW, 0);
  cg.addColorStop(0,    'rgba(255,255,255,0.50)');
  cg.addColorStop(0.12, 'rgba(255,255,255,0.16)');
  cg.addColorStop(0.42, 'rgba(255,255,255,0)');
  cg.addColorStop(0.75, 'rgba(0,0,0,0.04)');
  cg.addColorStop(0.92, 'rgba(0,0,0,0.26)');
  cg.addColorStop(1,    'rgba(0,0,0,0.38)');
  ctx.fillStyle = cg;
  ctx.fillRect(canX, canY + ryE, canW, canH - 2 * ryE);
  ctx.restore();

  // Bottom ellipse
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, canY + canH - ryE, rx, ryE, 0, 0, Math.PI * 2);
  ctx.fillStyle = colorAdjust(color, dark ? 0.58 : 0.72);
  ctx.fill();
  ctx.restore();

  // Seam line between body and bottom
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, canY + canH - ryE, rx, ryE, 0, 0, Math.PI * 2);
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Top ellipse (main)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, canY + ryE, rx, ryE, 0, 0, Math.PI * 2);
  ctx.fillStyle = colorAdjust(color, dark ? 0.85 : 0.84);
  ctx.fill();
  ctx.restore();

  // Top cap (raised neck)
  const capRx = rx * 0.88, capRy = ryE * 0.88;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, canY + ryE * 0.72, capRx, capRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = colorAdjust(color, dark ? 1.1 : 0.80);
  ctx.fill();
  // Cap highlight
  const hg = ctx.createRadialGradient(cx - capRx * 0.3, canY + ryE * 0.5, 0, cx, canY + ryE, capRx);
  hg.addColorStop(0, 'rgba(255,255,255,0.25)');
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.ellipse(cx, canY + ryE * 0.72, capRx, capRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.restore();

  // Pull tab
  ctx.save();
  const tabX = cx + capRx * 0.12;
  const tabY = canY + ryE * 0.72;
  ctx.beginPath();
  ctx.roundRect(tabX - 8, tabY - capRy * 0.4, 16, capRy * 1.9, 8);
  ctx.fillStyle = colorAdjust(color, dark ? 1.8 : 0.58);
  ctx.fill();
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 0.75;
  ctx.stroke();
  // Hole in tab
  ctx.beginPath();
  ctx.arc(tabX, tabY - capRy * 0.1, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = colorAdjust(color, dark ? 0.85 : 0.80);
  ctx.fill();
  ctx.restore();
};

// ─── Paper Cup ───────────────────────────────────────────────

const drawPaperCup = (ctx, { cw, ch, color, img, imgOpts }) => {
  ctx.clearRect(0, 0, cw, ch);
  const dark = isDark(color);

  const cx    = cw / 2;
  const topW  = cw * 0.38;
  const botW  = cw * 0.26;
  const cupH  = ch * 0.52;
  const cupY  = (ch - cupH) / 2 - 8;
  const ryTop = topW * 0.125;
  const ryBot = botW * 0.125;
  const topRx = topW / 2;
  const botRx = botW / 2;

  drawDropShadow(ctx, cx, cupY + cupH + 12, topW * 0.48, 13);

  // Body (trapezoid)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - topRx, cupY + ryTop);
  ctx.bezierCurveTo(cx - topRx, cupY + ryTop * 0.2, cx + topRx, cupY + ryTop * 0.2, cx + topRx, cupY + ryTop);
  ctx.lineTo(cx + botRx, cupY + cupH - ryBot);
  ctx.bezierCurveTo(cx + botRx, cupY + cupH - ryBot * 0.2, cx - botRx, cupY + cupH - ryBot * 0.2, cx - botRx, cupY + cupH - ryBot);
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = color;
  ctx.fill();

  // Label
  const lblY = cupY + ryTop * 2;
  const lblH = cupH - ryTop * 2 - ryBot * 2;
  mapImageToCylinder(ctx, img, cx - topRx, lblY, topW, lblH, imgOpts);

  // Gradient
  const cg = ctx.createLinearGradient(cx - topRx, 0, cx + topRx, 0);
  cg.addColorStop(0,    'rgba(255,255,255,0.42)');
  cg.addColorStop(0.16, 'rgba(255,255,255,0.12)');
  cg.addColorStop(0.55, 'rgba(255,255,255,0)');
  cg.addColorStop(0.88, 'rgba(0,0,0,0.06)');
  cg.addColorStop(1,    'rgba(0,0,0,0.24)');
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.restore();

  // Top rim ellipse
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cupY + ryTop, topRx, ryTop, 0, 0, Math.PI * 2);
  ctx.fillStyle = colorAdjust(color, dark ? 1.35 : 0.88);
  ctx.fill();
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Bottom ellipse
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cupY + cupH - ryBot, botRx, ryBot, 0, 0, Math.PI * 2);
  ctx.fillStyle = colorAdjust(color, dark ? 0.58 : 0.78);
  ctx.fill();
  ctx.restore();

  // Sleeve band
  const sY = cupY + cupH * 0.35;
  const sH = cupH * 0.28;
  const sT = topRx - (topRx - botRx) * 0.35;
  const sB = topRx - (topRx - botRx) * 0.65;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - sT, sY);
  ctx.lineTo(cx + sT, sY);
  ctx.lineTo(cx + sB, sY + sH);
  ctx.lineTo(cx - sB, sY + sH);
  ctx.closePath();
  ctx.fillStyle = colorAdjust(color, dark ? 0.65 : 0.84);
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.restore();
};

// ─── Cosmetic Jar ────────────────────────────────────────────

const drawCosmeticJar = (ctx, { cw, ch, color, img, imgOpts }) => {
  ctx.clearRect(0, 0, cw, ch);
  const dark = isDark(color);

  const cx  = cw / 2;
  const jw  = cw * 0.46;
  const jh  = ch * 0.33;
  const jy  = ch * 0.36;
  const rx  = jw / 2;
  const ryE = jw * 0.135;
  const lidH = jh * 0.42;

  drawDropShadow(ctx, cx, jy + jh + 12, rx * 1.05, 13);

  // Body
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - rx, jy + ryE);
  ctx.lineTo(cx - rx, jy + jh - ryE);
  ctx.ellipse(cx, jy + jh - ryE, rx, ryE, 0, Math.PI, 0);
  ctx.lineTo(cx + rx, jy + ryE);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fill();

  mapImageToCylinder(ctx, img, cx - rx, jy + ryE, jw, jh - 2 * ryE - 4, imgOpts);

  const cg = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  cg.addColorStop(0,    'rgba(255,255,255,0.38)');
  cg.addColorStop(0.18, 'rgba(255,255,255,0.10)');
  cg.addColorStop(0.55, 'rgba(255,255,255,0)');
  cg.addColorStop(0.85, 'rgba(0,0,0,0.05)');
  cg.addColorStop(1,    'rgba(0,0,0,0.28)');
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.restore();

  // Bottom ellipse
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, jy + jh - ryE, rx, ryE, 0, 0, Math.PI * 2);
  ctx.fillStyle = colorAdjust(color, dark ? 0.52 : 0.70);
  ctx.fill();
  ctx.restore();

  // Lid body
  const lidY = jy - lidH;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - rx, lidY + ryE);
  ctx.lineTo(cx - rx, lidY + lidH - ryE);
  ctx.ellipse(cx, lidY + lidH - ryE, rx, ryE, 0, Math.PI, 0);
  ctx.lineTo(cx + rx, lidY + ryE);
  ctx.closePath();
  ctx.fillStyle = colorAdjust(color, dark ? 1.30 : 0.87);
  ctx.fill();
  const lg = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  lg.addColorStop(0,   'rgba(255,255,255,0.30)');
  lg.addColorStop(0.5, 'rgba(255,255,255,0)');
  lg.addColorStop(1,   'rgba(0,0,0,0.22)');
  ctx.fillStyle = lg;
  ctx.fill();
  ctx.restore();

  // Lid top ellipse
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, lidY + ryE, rx, ryE, 0, 0, Math.PI * 2);
  ctx.fillStyle = colorAdjust(color, dark ? 1.5 : 0.94);
  ctx.fill();
  // Specular
  const sg = ctx.createRadialGradient(cx - rx * 0.28, lidY + ryE * 0.55, 0, cx, lidY + ryE, rx * 0.75);
  sg.addColorStop(0, 'rgba(255,255,255,0.45)');
  sg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.ellipse(cx, lidY + ryE, rx, ryE, 0, 0, Math.PI * 2);
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.restore();

  // Rim seam
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, jy + ryE, rx, ryE, 0, 0, Math.PI * 2);
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
};

// ─── Spray Bottle ────────────────────────────────────────────

const drawSprayBottle = (ctx, { cw, ch, color, img, imgOpts }) => {
  ctx.clearRect(0, 0, cw, ch);
  const dark = isDark(color);

  const cx  = cw / 2;
  const bw  = cw * 0.27;
  const bh  = ch * 0.52;
  const bx  = cx - bw / 2;
  const by  = ch * 0.26;
  const rx  = bw / 2;
  const ryE = bw * 0.12;

  const nw = bw * 0.56, nh = bh * 0.14, nx = cx - nw / 2, ny = by - nh;
  const cW = nw * 1.28, cH = nh * 1.45, capX = cx - cW / 2, capY = ny - cH;
  const nozzleW = bw * 1.18, nozzleH = bh * 0.045;

  drawDropShadow(ctx, cx, by + bh + 10, rx * 1.05, 12);

  // Bottle body
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(bx, by + ryE);
  ctx.arcTo(bx, by, bx + rx, by, ryE);
  ctx.arcTo(bx + bw, by, bx + bw, by + ryE, ryE);
  ctx.lineTo(bx + bw, by + bh - ryE);
  ctx.ellipse(cx, by + bh - ryE, rx, ryE, 0, 0, Math.PI);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fill();

  const lblY = by + ryE * 2, lblH = bh - ryE * 4;
  mapImageToCylinder(ctx, img, bx, lblY, bw, lblH, imgOpts);

  const bg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
  bg.addColorStop(0,    'rgba(255,255,255,0.48)');
  bg.addColorStop(0.20, 'rgba(255,255,255,0.12)');
  bg.addColorStop(0.60, 'rgba(255,255,255,0)');
  bg.addColorStop(1,    'rgba(0,0,0,0.30)');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.restore();

  // Bottom
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, by + bh - ryE, rx, ryE, 0, 0, Math.PI * 2);
  ctx.fillStyle = colorAdjust(color, dark ? 0.50 : 0.70);
  ctx.fill();
  ctx.restore();

  // Neck
  ctx.save();
  ctx.beginPath();
  ctx.rect(nx, ny, nw, nh + ryE);
  ctx.fillStyle = colorAdjust(color, dark ? 1.1 : 0.90);
  ctx.fill();
  const ng = ctx.createLinearGradient(nx, 0, nx + nw, 0);
  ng.addColorStop(0, 'rgba(255,255,255,0.28)');
  ng.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = ng;
  ctx.fill();
  ctx.restore();

  // Pump cap
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(capX, capY, cW, cH + ryE, 5);
  ctx.fillStyle = colorAdjust(color, dark ? 0.68 : 0.82);
  ctx.fill();
  const cgg = ctx.createLinearGradient(capX, 0, capX + cW, 0);
  cgg.addColorStop(0, 'rgba(255,255,255,0.24)');
  cgg.addColorStop(1, 'rgba(0,0,0,0.16)');
  ctx.fillStyle = cgg;
  ctx.fill();
  ctx.restore();

  // Nozzle body
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx - nozzleW / 2, capY - nozzleH, nozzleW, nozzleH, 3);
  ctx.fillStyle = colorAdjust(color, dark ? 0.60 : 0.74);
  ctx.fill();
  // Tip
  ctx.beginPath();
  ctx.roundRect(cx + nozzleW / 2 - 7, capY - nozzleH * 2, 7, nozzleH * 2, 3);
  ctx.fill();
  ctx.restore();
};

// ─── Shopping Bag ────────────────────────────────────────────

const drawShoppingBag = (ctx, { cw, ch, color, img, imgOpts }) => {
  ctx.clearRect(0, 0, cw, ch);
  const dark = isDark(color);

  const frontW = cw * 0.37, frontH = ch * 0.52;
  const depthX = cw * 0.12, depthY = -ch * 0.062;
  const geo = boxGeometry(cw, ch, frontW, frontH, depthX, depthY);
  const { front, top, right, shadow } = geo;

  const topColor   = colorAdjust(color, dark ? 1.32 : 1.12);
  const rightColor = colorAdjust(color, dark ? 0.52 : 0.68);
  const edgeAlpha  = dark ? 0.15 : 0.09;

  drawDropShadow(ctx, shadow.cx, shadow.cy, shadow.rx, shadow.ry);

  fillQuad(ctx, right, rightColor);
  fillQuad(ctx, top, topColor);
  const tg = ctx.createLinearGradient(0, top[0][1], 0, top[2][1]);
  tg.addColorStop(0, 'rgba(255,255,255,0.22)');
  tg.addColorStop(1, 'rgba(0,0,0,0.04)');
  fillQuad(ctx, top, tg);

  fillQuad(ctx, front, color);
  mapImageToFace(ctx, img, front, imgOpts);

  const fg = ctx.createLinearGradient(front[0][0], 0, front[1][0], 0);
  fg.addColorStop(0, 'rgba(255,255,255,0.10)');
  fg.addColorStop(1, 'rgba(0,0,0,0.06)');
  fillQuad(ctx, front, fg);

  strokeQuad(ctx, front, `rgba(0,0,0,${edgeAlpha})`, 1.5);
  strokeQuad(ctx, top,   `rgba(0,0,0,${edgeAlpha})`, 1);
  strokeQuad(ctx, right, `rgba(0,0,0,${edgeAlpha})`, 1);

  // Rope handles
  const hY   = front[0][1] + frontH * 0.11;
  const rope = dark ? 'rgba(255,255,255,0.5)' : 'rgba(80,50,18,0.65)';
  ctx.save();
  ctx.strokeStyle = rope;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(front[0][0] + frontW * 0.18, hY);
  ctx.bezierCurveTo(front[0][0] + frontW * 0.18, hY - frontH * 0.18, front[0][0] + frontW * 0.38, hY - frontH * 0.18, front[0][0] + frontW * 0.38, hY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(front[0][0] + frontW * 0.62, hY);
  ctx.bezierCurveTo(front[0][0] + frontW * 0.62, hY - frontH * 0.18, front[0][0] + frontW * 0.82, hY - frontH * 0.18, front[0][0] + frontW * 0.82, hY);
  ctx.stroke();
  ctx.restore();
};

// ════════════════════════════════════════════════════════════
// RENDERER REGISTRY & MAIN ENTRY
// ════════════════════════════════════════════════════════════

const RENDERERS = {
  'tuck-box':     drawTuckBox,
  'mailer-box':   drawMailerBox,
  'square-box':   drawSquareBox,
  'standup-pouch':drawStandupPouch,
  'flat-pouch':   drawFlatPouch,
  'soda-can':     drawSodaCan,
  'paper-cup':    drawPaperCup,
  'cosmetic-jar': drawCosmeticJar,
  'spray-bottle': drawSprayBottle,
  'shopping-bag': drawShoppingBag,
};

/**
 * Main render function.
 * @param {HTMLCanvasElement} canvas
 * @param {string} mockupId
 * @param {object} opts - { color, img, imgOpts, background }
 */
function renderMockup(canvas, mockupId, opts = {}) {
  const ctx = canvas.getContext('2d');
  const cw = canvas.width, ch = canvas.height;
  const { color = '#f2f2f2', img = null, imgOpts = {}, background = '#ffffff' } = opts;

  // Clear with background
  if (background === 'transparent') {
    ctx.clearRect(0, 0, cw, ch);
  } else {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, cw, ch);
  }

  const fn = RENDERERS[mockupId] || RENDERERS['square-box'] || RENDERERS['tuck-box'];
  if (!fn) { console.warn('No renderer:', mockupId); return; }
  fn(ctx, { cw, ch, color, img, imgOpts });
}

