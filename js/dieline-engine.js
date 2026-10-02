// ─── PackMockup Dieline Engine ────────────────────────────────
'use strict';

// ════════════════════════════════════════════════════════════
// UTILS & SVG PRIMITIVES
// ════════════════════════════════════════════════════════════
const f = n => parseFloat(n).toFixed(3);
const line = (x1, y1, x2, y2, cls) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" class="${cls}"/>`;
const rect = (x, y, w, h, cls) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" class="${cls}"/>`;
const path = (d, cls) => `<path d="${d}" class="${cls}"/>`;
const text = (x, y, txt, cls, rotate = '') => `<text x="${f(x)}" y="${f(y)}" class="${cls}" ${rotate}>${txt}</text>`;
const circle = (cx, cy, r, cls) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" class="${cls}"/>`;

const wrapSVG = (content, TW, TH, bleed) => {
  const pad = 10;
  const vbx = -bleed - pad;
  const vby = -bleed - pad;
  const vbw = TW + (bleed + pad) * 2;
  const vbh = TH + (bleed + pad) * 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(vbx)} ${f(vby)} ${f(vbw)} ${f(vbh)}" width="${f(vbw)}mm" height="${f(vbh)}mm">
<defs>
<style>
.fill-panel { fill: rgba(255,255,255,0.05); }
.fill-side { fill: rgba(255,255,255,0.05); }
.fill-glue { fill: rgba(200,200,200,0.12); }
.fill-tuck { fill: rgba(255,255,255,0.05); }
.fill-dust { fill: rgba(255,255,255,0.05); }
.cut { fill: none; stroke: #e11d48; stroke-width: 0.35; stroke-linecap: round; stroke-linejoin: round; }
.fold { fill: none; stroke: #2563eb; stroke-width: 0.3; stroke-dasharray: 4 2.5; stroke-linecap: butt; }
.bleed { fill: none; stroke: #f43f5e; stroke-width: 0.25; stroke-dasharray: 3 2; opacity: 0.6; }
.lbl-panel { font: bold 3.5px Inter, -apple-system, sans-serif; fill: #64748b; text-anchor: middle; dominant-baseline: middle; letter-spacing: 0.5px; }
.lbl-small { font: 2.5px Inter, -apple-system, sans-serif; fill: #94a3b8; text-anchor: middle; dominant-baseline: middle; }
</style>
<marker id="arr" markerWidth="4" markerHeight="4" refX="4" refY="2" orient="auto">
  <path d="M0,0 L4,2 L0,4 Z" fill="#94a3b8"/>
</marker>
<marker id="arr-start" markerWidth="4" markerHeight="4" refX="0" refY="2" orient="auto">
  <path d="M4,0 L0,2 L4,4 Z" fill="#94a3b8"/>
</marker>
</defs>
${content}
</svg>`;
};

// ════════════════════════════════════════════════════════════
// 1. TUCK END BOX
// ════════════════════════════════════════════════════════════

const genTuckBox = ({ W, H, D, bleed = 3 }) => {
  const gw = Math.max(12, Math.min(22, D * 0.28));
  const tuck_h = Math.max(22, D * 0.65 + 18);
  const dust_w = Math.max(8, (D - 6) / 2);
  const dust_h = tuck_h - 5;
  const lock_w = W * 0.65;
  const lock_h = Math.min(12, D * 0.3);
  const inset = (W - lock_w) / 2;
  const cr = 4;

  const x0=0, x1=gw, x2=x1+W, x3=x2+D, x4=x3+W, x5=x4+D, TW=x5;
  const y0=0, y1=tuck_h, y2=y1+H, y3=y2+tuck_h, TH=y3;
  const d1x=x2+(D-dust_w)/2, d2x=x4+(D-dust_w)/2;

  let svg = '';
  svg += rect(x0,y1,gw,H,'fill-glue');
  svg += rect(x1,y1,W,H,'fill-panel');
  svg += rect(x2,y1,D,H,'fill-side');
  svg += rect(x3,y1,W,H,'fill-panel');
  svg += rect(x4,y1,D,H,'fill-side');
  svg += rect(x3,y0,W,tuck_h,'fill-tuck');
  svg += rect(d1x,y1-dust_h,dust_w,dust_h,'fill-dust');
  svg += rect(d2x,y1-dust_h,dust_w,dust_h,'fill-dust');
  svg += rect(x3,y2,W,tuck_h,'fill-tuck');
  svg += rect(d1x,y2,dust_w,dust_h,'fill-dust');
  svg += rect(d2x,y2,dust_w,dust_h,'fill-dust');

  svg += line(x1,y1,x1,y2,'fold') + line(x2,y1,x2,y2,'fold') + line(x3,y1,x3,y2,'fold') + line(x4,y1,x4,y2,'fold');
  svg += line(x0,y1,x5,y1,'fold') + line(x0,y2,x5,y2,'fold');

  svg += path(`M${x0},${y1} L${x1},${y1} L${x2},${y1}`, 'cut');
  svg += path(`M${x3},${y1} L${x4},${y1} L${x5},${y1}`, 'cut');
  svg += path(`M${x0},${y2} L${x1},${y2} L${x2},${y2}`, 'cut');
  svg += path(`M${x3},${y2} L${x4},${y2} L${x5},${y2}`, 'cut');
  svg += line(x0,y1,x0,y2,'cut') + line(x5,y1,x5,y2,'cut');

  svg += line(x2,y1,d1x,y1,'cut') + line(d1x+dust_w,y1,x3,y1,'cut');
  svg += line(x2,y2,d1x,y2,'cut') + line(d1x+dust_w,y2,x3,y2,'cut');
  svg += line(x4,y1,d2x,y1,'cut') + line(d2x+dust_w,y1,x5,y1,'cut');
  svg += line(x4,y2,d2x,y2,'cut') + line(d2x+dust_w,y2,x5,y2,'cut');

  svg += path(`M${x3},${y1} L${x3},${y0+lock_h} L${x3+inset},${y0+lock_h} L${x3+inset},${y0} L${x4-inset},${y0} L${x4-inset},${y0+lock_h} L${x4},${y0+lock_h} L${x4},${y1}`,'cut');
  svg += path(`M${x3},${y2} L${x3},${y3-lock_h} L${x3+inset},${y3-lock_h} L${x3+inset},${y3} L${x4-inset},${y3} L${x4-inset},${y3-lock_h} L${x4},${y3-lock_h} L${x4},${y2}`,'cut');

  svg += path(`M${d1x},${y1} L${d1x},${y1-dust_h+cr} Q${d1x},${y1-dust_h} ${d1x+cr},${y1-dust_h} L${d1x+dust_w-cr},${y1-dust_h} Q${d1x+dust_w},${y1-dust_h} ${d1x+dust_w},${y1-dust_h+cr} L${d1x+dust_w},${y1}`,'cut');
  svg += path(`M${d2x},${y1} L${d2x},${y1-dust_h+cr} Q${d2x},${y1-dust_h} ${d2x+cr},${y1-dust_h} L${d2x+dust_w-cr},${y1-dust_h} Q${d2x+dust_w},${y1-dust_h} ${d2x+dust_w},${y1-dust_h+cr} L${d2x+dust_w},${y1}`,'cut');
  svg += path(`M${d1x},${y2} L${d1x},${y2+dust_h-cr} Q${d1x},${y2+dust_h} ${d1x+cr},${y2+dust_h} L${d1x+dust_w-cr},${y2+dust_h} Q${d1x+dust_w},${y2+dust_h} ${d1x+dust_w},${y2+dust_h-cr} L${d1x+dust_w},${y2}`,'cut');
  svg += path(`M${d2x},${y2} L${d2x},${y2+dust_h-cr} Q${d2x},${y2+dust_h} ${d2x+cr},${y2+dust_h} L${d2x+dust_w-cr},${y2+dust_h} Q${d2x+dust_w},${y2+dust_h} ${d2x+dust_w},${y2+dust_h-cr} L${d2x+dust_w},${y2}`,'cut');

  svg += text(x1+W/2, y1+H/2, 'BACK', 'lbl-panel') + text(x3+W/2, y1+H/2, 'FRONT', 'lbl-panel');
  svg += text(x2+D/2, y1+H/2, 'LEFT', 'lbl-panel') + text(x4+D/2, y1+H/2, 'RIGHT', 'lbl-panel');
  svg += text(x3+W/2, y1-tuck_h/2, 'TOP', 'lbl-small') + text(x3+W/2, y2+tuck_h/2, 'BOTTOM', 'lbl-small');
  svg += text(x0+gw/2, y1+H/2, 'GLUE', 'lbl-small', 'transform="rotate(-90,'+(x0+gw/2)+','+(y1+H/2)+')"');
  svg += rect(-bleed, -bleed, TW+bleed*2, TH+bleed*2, 'bleed');

  // Mappings for 3D slicing
  const faces = [
    { face: 'front', x: x3, y: y1, w: W, h: H },
    { face: 'back',  x: x1, y: y1, w: W, h: H },
    { face: 'left',  x: x2, y: y1, w: D, h: H },
    { face: 'right', x: x4, y: y1, w: D, h: H },
    { face: 'top',   x: x3, y: y1-D, w: W, h: D, rot: 180 },
    { face: 'bottom',x: x3, y: y2, w: W, h: D }
  ];
  return { svg, TW, TH, faces };
};

// ════════════════════════════════════════════════════════════
// 2. MAILER BOX
// ════════════════════════════════════════════════════════════

const genMailerBox = ({ W, H, D, bleed = 3 }) => {
  const gw = Math.max(12, D * 0.2);
  const cover_h = D * 0.5 + 5;
  const lid_h = D * 0.5 + 25;
  const bot_h = D * 0.5 + 5;

  const x0=0, x1=gw, x2=x1+W, x3=x2+D, x4=x3+W, x5=x4+D, TW=x5;
  const y0=0, y1=lid_h, y2=y1+H, y3=y2+bot_h, TH=y3;

  let svg = '';
  svg += rect(x0,y1,gw,H,'fill-glue') + rect(x1,y1,W,H,'fill-panel') + rect(x2,y1,D,H,'fill-side') + rect(x3,y1,W,H,'fill-panel') + rect(x4,y1,D,H,'fill-side');
  svg += rect(x3,y1-lid_h,W,lid_h,'fill-tuck') + rect(x1,y1-cover_h,W,cover_h,'fill-dust');
  svg += rect(x1,y2,W,bot_h,'fill-tuck') + rect(x3,y2,W,bot_h,'fill-dust');

  svg += line(x1,y1,x1,y2,'fold') + line(x2,y1,x2,y2,'fold') + line(x3,y1,x3,y2,'fold') + line(x4,y1,x4,y2,'fold');
  svg += line(x0,y1,x5,y1,'fold') + line(x0,y2,x5,y2,'fold');

  svg += path(`M${x0},${y1} L${x1},${y1} L${x1},${y1-cover_h} L${x2},${y1-cover_h} L${x2},${y1} L${x3},${y1} L${x3},${y1-lid_h} L${x4},${y1-lid_h} L${x4},${y1} L${x5},${y1}`,'cut');
  svg += path(`M${x0},${y2} L${x1},${y2} L${x1},${y2+bot_h} L${x2},${y2+bot_h} L${x2},${y2} L${x3},${y2} L${x3},${y2+bot_h} L${x4},${y2+bot_h} L${x4},${y2} L${x5},${y2}`,'cut');
  svg += line(x0,y1,x0,y2,'cut') + line(x5,y1,x5,y2,'cut');

  svg += text(x1+W/2, y1+H/2, 'BACK', 'lbl-panel') + text(x3+W/2, y1+H/2, 'FRONT', 'lbl-panel');
  svg += text(x2+D/2, y1+H/2, 'SIDE', 'lbl-panel') + text(x4+D/2, y1+H/2, 'SIDE', 'lbl-panel');
  svg += text(x0+gw/2, y1+H/2, 'GLUE', 'lbl-small', 'transform="rotate(-90,'+(x0+gw/2)+','+(y1+H/2)+')"');
  
  svg += rect(-bleed, -bleed, TW+bleed*2, TH+bleed*2, 'bleed');
  
  const faces = [
    { face: 'front', x: x3, y: y1, w: W, h: H },
    { face: 'back',  x: x1, y: y1, w: W, h: H },
    { face: 'left',  x: x2, y: y1, w: D, h: H },
    { face: 'right', x: x4, y: y1, w: D, h: H },
    { face: 'top',   x: x3, y: y1-D, w: W, h: D, rot: 180 },
    { face: 'bottom',x: x3, y: y2, w: W, h: D }
  ];
  return { svg, TW, TH, faces };
};

// ════════════════════════════════════════════════════════════
// 3. SLEEVE BOX
// ════════════════════════════════════════════════════════════

const genSleeveBox = ({ W, H, D, bleed = 3 }) => {
  const gw = Math.max(12, 15);
  const x0=0, x1=gw, x2=x1+W, x3=x2+D, x4=x3+W, x5=x4+D, TW=x5, TH=H;

  let svg = '';
  svg += rect(x0,0,gw,H,'fill-glue') + rect(x1,0,W,H,'fill-panel') + rect(x2,0,D,H,'fill-side') + rect(x3,0,W,H,'fill-panel') + rect(x4,0,D,H,'fill-side');
  svg += line(x1,0,x1,H,'fold') + line(x2,0,x2,H,'fold') + line(x3,0,x3,H,'fold') + line(x4,0,x4,H,'fold');
  svg += line(0,0,TW,0,'cut') + line(0,H,TW,H,'cut') + line(0,0,0,H,'cut') + line(TW,0,TW,H,'cut');

  svg += text(x1+W/2, H/2, 'TOP', 'lbl-panel') + text(x3+W/2, H/2, 'BOTTOM', 'lbl-panel');
  svg += text(x2+D/2, H/2, 'LEFT', 'lbl-panel') + text(x4+D/2, H/2, 'RIGHT', 'lbl-panel');
  svg += text(x0+gw/2, H/2, 'GLUE', 'lbl-small', 'transform="rotate(-90,'+(x0+gw/2)+','+(H/2)+')"');
  svg += rect(-bleed, -bleed, TW+bleed*2, TH+bleed*2, 'bleed');

  const faces = [
    { face: 'top',    x: x1, y: 0, w: W, h: H },
    { face: 'bottom', x: x3, y: 0, w: W, h: H },
    { face: 'left',   x: x2, y: 0, w: D, h: H },
    { face: 'right',  x: x4, y: 0, w: D, h: H }
  ];
  return { svg, TW, TH, faces };
};

// ════════════════════════════════════════════════════════════
// 4. PILLOW BOX
// ════════════════════════════════════════════════════════════

const genPillowBox = ({ W, H, bleed = 3 }) => {
  const gw = 15;
  const h_bow = W * 0.15;
  const x0=0, x1=gw, x2=x1+W, x3=x2+W, TW=x3;
  const y0=0, y1=h_bow, y2=y1+H, y3=y2+h_bow, TH=y3;
  const r = (W*W)/(8*h_bow) + h_bow/2;

  let svg = '';
  svg += rect(x0,y1,gw,H,'fill-glue') + rect(x1,y1,W,H,'fill-panel') + rect(x2,y1,W,H,'fill-panel');
  svg += line(x1,y1,x1,y2,'fold') + line(x2,y1,x2,y2,'fold');
  svg += line(x0,y1,x0,y2,'cut') + line(x3,y1,x3,y2,'cut');
  
  svg += path(`M${x1},${y1} A${r},${r} 0 0,1 ${x2},${y1} A${r},${r} 0 0,1 ${x3},${y1}`,'cut');
  svg += path(`M${x1},${y1} A${r},${r} 0 0,0 ${x2},${y1} A${r},${r} 0 0,0 ${x3},${y1}`,'fold');
  svg += path(`M${x1},${y2} A${r},${r} 0 0,0 ${x2},${y2} A${r},${r} 0 0,0 ${x3},${y2}`,'cut');
  svg += path(`M${x1},${y2} A${r},${r} 0 0,1 ${x2},${y2} A${r},${r} 0 0,1 ${x3},${y2}`,'fold');
  svg += line(x0,y1,x1,y1,'cut') + line(x0,y2,x1,y2,'cut');

  svg += text(x1+W/2, y1+H/2, 'FRONT', 'lbl-panel') + text(x2+W/2, y1+H/2, 'BACK', 'lbl-panel');
  svg += text(x0+gw/2, y1+H/2, 'GLUE', 'lbl-small', 'transform="rotate(-90,'+(x0+gw/2)+','+(y1+H/2)+')"');
  svg += rect(-bleed, -bleed, TW+bleed*2, TH+bleed*2, 'bleed');

  const faces = [
    { face: 'front', x: x1, y: y1, w: W, h: H },
    { face: 'back',  x: x2, y: y1, w: W, h: H }
  ];

  return { svg, TW, TH, faces };
};

// ════════════════════════════════════════════════════════════
// 5. PYRAMID BOX
// ════════════════════════════════════════════════════════════

const genPyramidBox = ({ W, H, bleed = 3 }) => {
  const TW = W + H*2;
  const TH = W + H*2;
  const cx = TW/2, cy = TH/2;
  const gw = 12;

  let svg = '';
  svg += rect(cx-W/2, cy-W/2, W, W, 'fill-panel');
  svg += line(cx-W/2,cy-W/2, cx+W/2,cy-W/2, 'fold') + line(cx-W/2,cy+W/2, cx+W/2,cy+W/2, 'fold');
  svg += line(cx-W/2,cy-W/2, cx-W/2,cy+W/2, 'fold') + line(cx+W/2,cy-W/2, cx+W/2,cy+W/2, 'fold');
  
  svg += path(`M${cx-W/2},${cy-W/2} L${cx},${0} L${cx+W/2},${cy-W/2} Z`, 'fill-side');
  svg += path(`M${cx-W/2},${cy+W/2} L${cx},${TH} L${cx+W/2},${cy+W/2} Z`, 'fill-side');
  svg += path(`M${cx-W/2},${cy-W/2} L${0},${cy} L${cx-W/2},${cy+W/2} Z`, 'fill-side');
  svg += path(`M${cx+W/2},${cy-W/2} L${TW},${cy} L${cx+W/2},${cy+W/2} Z`, 'fill-side');

  svg += path(`M${cx+W/2},${cy+W/2} L${TW},${cy} L${TW+gw},${cy+gw} L${cx+W/2+gw},${cy+W/2+gw} Z`, 'fill-glue');
  svg += line(cx+W/2,cy+W/2, TW,cy, 'fold');

  svg += path(`M${cx-W/2},${cy-W/2} L${cx},${0} L${cx+W/2},${cy-W/2} L${TW},${cy} L${TW+gw},${cy+gw} L${cx+W/2+gw},${cy+W/2+gw} L${cx+W/2},${cy+W/2} L${cx},${TH} L${cx-W/2},${cy+W/2} L${0},${cy} Z`, 'cut');

  svg += text(cx, cy, 'BASE', 'lbl-panel');
  svg += rect(-bleed, -bleed, Math.max(TW+gw, TW)+bleed*2, TH+bleed*2, 'bleed');

  const faces = [
    { face: 'front', x: cx-W/2, y: cy-W/2, w: W, h: W }
  ];

  return { svg, TW: TW+gw, TH, faces };
};

// ════════════════════════════════════════════════════════════
// 6. PAPER BAG
// ════════════════════════════════════════════════════════════

const genPaperBag = ({ W, H, D, bleed = 3 }) => {
  const gw = 15;
  const top_h = 35;
  const bot_h = D/2 + 10;
  
  const x0=0, x1=D/2, x2=x1+W, x3=x2+D/2, x4=x3+W, x5=x4+gw, TW=x5;
  const y0=0, y1=top_h, y2=y1+H, y3=y2+bot_h, TH=y3;

  let svg = '';
  svg += rect(x0,y1,D/2,H,'fill-side') + rect(x1,y1,W,H,'fill-panel') + rect(x2,y1,D/2,H,'fill-side') + rect(x3,y1,W,H,'fill-panel') + rect(x4,y1,gw,H,'fill-glue');
  
  svg += line(x0,y1,x5,y1,'fold') + line(x0,y2,x5,y2,'fold');
  svg += line(x1,0,x1,y3,'fold') + line(x2,0,x2,y3,'fold') + line(x3,0,x3,y3,'fold') + line(x4,0,x4,y3,'fold');
  svg += line(x0+D/4,y1,x0+D/4,y2,'fold') + line(x2+D/4,y1,x2+D/4,y2,'fold');

  svg += line(0,0,TW,0,'cut') + line(0,TH,TW,TH,'cut');
  svg += line(0,0,0,TH,'cut') + line(TW,0,TW,TH,'cut');

  svg += text(x1+W/2, y1+H/2, 'FRONT', 'lbl-panel') + text(x3+W/2, y1+H/2, 'BACK', 'lbl-panel');
  svg += rect(-bleed, -bleed, TW+bleed*2, TH+bleed*2, 'bleed');
  
  const faces = [
    { face: 'front', x: x1, y: y1, w: W, h: H },
    { face: 'back',  x: x3, y: y1, w: W, h: H }
  ];
  return { svg, TW, TH, faces };
};

// ════════════════════════════════════════════════════════════
// EXPORT FACTORY
// ════════════════════════════════════════════════════════════

const generateDieline = (templateId, params) => {
  let res;
  switch (templateId) {
    case 'tuck-box': res = genTuckBox(params); break;
    case 'mailer-box': res = genMailerBox(params); break;
    case 'sleeve-box': res = genSleeveBox(params); break;
    case 'pillow-box': res = genPillowBox(params); break;
    case 'pyramid-box': res = genPyramidBox(params); break;
    case 'paper-bag': res = genPaperBag(params); break;
    default: res = genTuckBox(params);
  }
  return { 
    svgString: wrapSVG(res.svg, res.TW, res.TH, params.bleed || 0), 
    TW: res.TW, 
    TH: res.TH,
    faces: res.faces || []
  };
};

window.PackDieline = { generateDieline };
