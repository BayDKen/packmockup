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
.fill-panel { fill: #FFF8F0; }
.fill-side { fill: #EDF4FF; }
.fill-glue { fill: #FFF0F8; }
.fill-tuck { fill: #F0FFF6; }
.fill-dust { fill: #FDFFF0; }
.fill-special { fill: #FFF5EE; }
.cut { fill: none; stroke: #CC0000; stroke-width: 0.3; stroke-linecap: round; stroke-linejoin: round; }
.fold { fill: none; stroke: #0066CC; stroke-width: 0.25; stroke-dasharray: 4 2.5; stroke-linecap: butt; }
.bleed { fill: none; stroke: #FF8888; stroke-width: 0.3; stroke-dasharray: 3 2; }
.reg-mark { fill: none; stroke: #FF8888; stroke-width: 0.25; }
.dim { fill: none; stroke: #AAAAAA; stroke-width: 0.2; marker-end: url(#arr); marker-start: url(#arr-start); }
.lbl-panel { font: bold 3.5px Inter, Arial, sans-serif; fill: #888888; text-anchor: middle; dominant-baseline: middle; }
.lbl-small { font: 2.5px Inter, Arial, sans-serif; fill: #AAAAAA; text-anchor: middle; dominant-baseline: middle; }
</style>
<marker id="arr" markerWidth="4" markerHeight="4" refX="4" refY="2" orient="auto">
  <path d="M0,0 L4,2 L0,4 Z" fill="#AAAAAA"/>
</marker>
<marker id="arr-start" markerWidth="4" markerHeight="4" refX="0" refY="2" orient="auto">
  <path d="M4,0 L0,2 L4,4 Z" fill="#AAAAAA"/>
</marker>
</defs>
${content}
</svg>`;
};

// ════════════════════════════════════════════════════════════
// GENERATORS
// ════════════════════════════════════════════════════════════

const genTuckBox = ({ W, H, D, bleed }) => {
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
  // Fills
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

  // Folds
  svg += line(x1,y1,x1,y2,'fold') + line(x2,y1,x2,y2,'fold') + line(x3,y1,x3,y2,'fold') + line(x4,y1,x4,y2,'fold');
  svg += line(x0,y1,x5,y1,'fold') + line(x0,y2,x5,y2,'fold');

  // Cuts - Perimeter
  svg += path(`M${x0},${y1} L${x1},${y1} L${x2},${y1}`, 'cut');
  svg += path(`M${x3},${y1} L${x4},${y1} L${x5},${y1}`, 'cut');
  svg += path(`M${x0},${y2} L${x1},${y2} L${x2},${y2}`, 'cut');
  svg += path(`M${x3},${y2} L${x4},${y2} L${x5},${y2}`, 'cut');
  svg += line(x0,y1,x0,y2,'cut') + line(x5,y1,x5,y2,'cut');

  // Side 1 top & bottom cuts
  svg += line(x2,y1,d1x,y1,'cut') + line(d1x+dust_w,y1,x3,y1,'cut');
  svg += line(x2,y2,d1x,y2,'cut') + line(d1x+dust_w,y2,x3,y2,'cut');
  // Side 2 top & bottom cuts
  svg += line(x4,y1,d2x,y1,'cut') + line(d2x+dust_w,y1,x5,y1,'cut');
  svg += line(x4,y2,d2x,y2,'cut') + line(d2x+dust_w,y2,x5,y2,'cut');

  // Tuck cuts
  svg += path(`M${x3},${y1} L${x3},${y0+lock_h} L${x3+inset},${y0+lock_h} L${x3+inset},${y0} L${x4-inset},${y0} L${x4-inset},${y0+lock_h} L${x4},${y0+lock_h} L${x4},${y1}`,'cut');
  svg += path(`M${x3},${y2} L${x3},${y3-lock_h} L${x3+inset},${y3-lock_h} L${x3+inset},${y3} L${x4-inset},${y3} L${x4-inset},${y3-lock_h} L${x4},${y3-lock_h} L${x4},${y2}`,'cut');

  // Dust flap cuts
  svg += path(`M${d1x},${y1} L${d1x},${y1-dust_h+cr} Q${d1x},${y1-dust_h} ${d1x+cr},${y1-dust_h} L${d1x+dust_w-cr},${y1-dust_h} Q${d1x+dust_w},${y1-dust_h} ${d1x+dust_w},${y1-dust_h+cr} L${d1x+dust_w},${y1}`,'cut');
  svg += path(`M${d2x},${y1} L${d2x},${y1-dust_h+cr} Q${d2x},${y1-dust_h} ${d2x+cr},${y1-dust_h} L${d2x+dust_w-cr},${y1-dust_h} Q${d2x+dust_w},${y1-dust_h} ${d2x+dust_w},${y1-dust_h+cr} L${d2x+dust_w},${y1}`,'cut');
  svg += path(`M${d1x},${y2} L${d1x},${y2+dust_h-cr} Q${d1x},${y2+dust_h} ${d1x+cr},${y2+dust_h} L${d1x+dust_w-cr},${y2+dust_h} Q${d1x+dust_w},${y2+dust_h} ${d1x+dust_w},${y2+dust_h-cr} L${d1x+dust_w},${y2}`,'cut');
  svg += path(`M${d2x},${y2} L${d2x},${y2+dust_h-cr} Q${d2x},${y2+dust_h} ${d2x+cr},${y2+dust_h} L${d2x+dust_w-cr},${y2+dust_h} Q${d2x+dust_w},${y2+dust_h} ${d2x+dust_w},${y2+dust_h-cr} L${d2x+dust_w},${y2}`,'cut');

  // Labels
  svg += text(x1+W/2, y1+H/2, 'BACK', 'lbl-panel') + text(x3+W/2, y1+H/2, 'FRONT', 'lbl-panel');
  svg += text(x2+D/2, y1+H/2, 'SIDE', 'lbl-panel') + text(x4+D/2, y1+H/2, 'SIDE', 'lbl-panel');
  svg += text(x3+W/2, y1-tuck_h/2, 'TOP TUCK', 'lbl-small') + text(x3+W/2, y2+tuck_h/2, 'BOTTOM', 'lbl-small');
  svg += text(d1x+dust_w/2, y1-dust_h/2, 'DUST', 'lbl-small') + text(d2x+dust_w/2, y1-dust_h/2, 'DUST', 'lbl-small');
  svg += text(d1x+dust_w/2, y2+dust_h/2, 'DUST', 'lbl-small') + text(d2x+dust_w/2, y2+dust_h/2, 'DUST', 'lbl-small');
  svg += text(x0+gw/2, y1+H/2, 'GLUE', 'lbl-small', 'transform="rotate(-90,'+(x0+gw/2)+','+(y1+H/2)+')"');

  // Bleed
  svg += rect(-bleed, -bleed, TW+bleed*2, TH+bleed*2, 'bleed');

  return { svg, TW, TH };
};

const genMailerBox = ({ W, H, D, bleed }) => {
  const gw = Math.max(12, D * 0.2);
  const cover_h = D * 0.5 + 5;
  const lid_h = D * 0.5 + 25;
  const bot_h = D * 0.5 + 5;

  const x0=0, x1=gw, x2=x1+W, x3=x2+D, x4=x3+W, x5=x4+D, TW=x5;
  const y0=0, y1=lid_h, y2=y1+H, y3=y2+bot_h, TH=y3;

  let svg = '';
  // Fills
  svg += rect(x0,y1,gw,H,'fill-glue') + rect(x1,y1,W,H,'fill-panel') + rect(x2,y1,D,H,'fill-side') + rect(x3,y1,W,H,'fill-panel') + rect(x4,y1,D,H,'fill-side');
  svg += rect(x3,y1-lid_h,W,lid_h,'fill-tuck') + rect(x1,y1-cover_h,W,cover_h,'fill-dust');
  svg += rect(x1,y2,W,bot_h,'fill-tuck') + rect(x3,y2,W,bot_h,'fill-dust');

  // Folds
  svg += line(x1,y1,x1,y2,'fold') + line(x2,y1,x2,y2,'fold') + line(x3,y1,x3,y2,'fold') + line(x4,y1,x4,y2,'fold');
  svg += line(x0,y1,x5,y1,'fold') + line(x0,y2,x5,y2,'fold');

  // Cuts
  svg += path(`M${x0},${y1} L${x1},${y1} L${x1},${y1-cover_h} L${x2},${y1-cover_h} L${x2},${y1} L${x3},${y1} L${x3},${y1-lid_h} L${x4},${y1-lid_h} L${x4},${y1} L${x5},${y1}`,'cut');
  svg += path(`M${x0},${y2} L${x1},${y2} L${x1},${y2+bot_h} L${x2},${y2+bot_h} L${x2},${y2} L${x3},${y2} L${x3},${y2+bot_h} L${x4},${y2+bot_h} L${x4},${y2} L${x5},${y2}`,'cut');
  svg += line(x0,y1,x0,y2,'cut') + line(x5,y1,x5,y2,'cut');

  // Crash lock simplified slots
  svg += line(x1+W/2,y2+bot_h/2,x1+W/2,y2+bot_h,'cut');

  // Labels
  svg += text(x1+W/2, y1+H/2, 'BACK', 'lbl-panel') + text(x3+W/2, y1+H/2, 'FRONT', 'lbl-panel');
  svg += text(x2+D/2, y1+H/2, 'SIDE', 'lbl-panel') + text(x4+D/2, y1+H/2, 'SIDE', 'lbl-panel');
  svg += text(x0+gw/2, y1+H/2, 'GLUE', 'lbl-small', 'transform="rotate(-90,'+(x0+gw/2)+','+(y1+H/2)+')"');
  
  svg += rect(-bleed, -bleed, TW+bleed*2, TH+bleed*2, 'bleed');
  return { svg, TW, TH };
};

const genSleeveBox = ({ W, H, D, bleed }) => {
  const gw = Math.max(12, 15);
  const x0=0, x1=gw, x2=x1+W, x3=x2+D, x4=x3+W, x5=x4+D, TW=x5, TH=H;

  let svg = '';
  svg += rect(x0,0,gw,H,'fill-glue') + rect(x1,0,W,H,'fill-panel') + rect(x2,0,D,H,'fill-side') + rect(x3,0,W,H,'fill-panel') + rect(x4,0,D,H,'fill-side');
  svg += line(x1,0,x1,H,'fold') + line(x2,0,x2,H,'fold') + line(x3,0,x3,H,'fold') + line(x4,0,x4,H,'fold');
  svg += line(0,0,TW,0,'cut') + line(0,H,TW,H,'cut') + line(0,0,0,H,'cut') + line(TW,0,TW,H,'cut');

  svg += text(x1+W/2, H/2, 'BACK', 'lbl-panel') + text(x3+W/2, H/2, 'FRONT', 'lbl-panel');
  svg += text(x2+D/2, H/2, 'SIDE', 'lbl-panel') + text(x4+D/2, H/2, 'SIDE', 'lbl-panel');
  svg += text(x0+gw/2, H/2, 'GLUE', 'lbl-small', 'transform="rotate(-90,'+(x0+gw/2)+','+(H/2)+')"');

  svg += rect(-bleed, -bleed, TW+bleed*2, TH+bleed*2, 'bleed');
  return { svg, TW, TH };
};

const genPillowBox = ({ W, H, bleed }) => {
  const gw = 15;
  const h_bow = W * 0.15;
  const x0=0, x1=gw, x2=x1+W, x3=x2+W, TW=x3;
  const y0=0, y1=h_bow, y2=y1+H, y3=y2+h_bow, TH=y3;
  const r = (W*W)/(8*h_bow) + h_bow/2;

  let svg = '';
  svg += rect(x0,y1,gw,H,'fill-glue') + rect(x1,y1,W,H,'fill-panel') + rect(x2,y1,W,H,'fill-panel');
  svg += line(x1,y1,x1,y2,'fold') + line(x2,y1,x2,y2,'fold');
  svg += line(x0,y1,x0,y2,'cut') + line(x3,y1,x3,y2,'cut');
  
  // Arcs
  svg += path(`M${x1},${y1} A${r},${r} 0 0,1 ${x2},${y1} A${r},${r} 0 0,1 ${x3},${y1}`,'cut');
  svg += path(`M${x1},${y1} A${r},${r} 0 0,0 ${x2},${y1} A${r},${r} 0 0,0 ${x3},${y1}`,'fold');
  svg += path(`M${x1},${y2} A${r},${r} 0 0,0 ${x2},${y2} A${r},${r} 0 0,0 ${x3},${y2}`,'cut');
  svg += path(`M${x1},${y2} A${r},${r} 0 0,1 ${x2},${y2} A${r},${r} 0 0,1 ${x3},${y2}`,'fold');
  svg += line(x0,y1,x1,y1,'cut') + line(x0,y2,x1,y2,'cut');

  svg += text(x1+W/2, y1+H/2, 'FRONT', 'lbl-panel') + text(x2+W/2, y1+H/2, 'BACK', 'lbl-panel');
  svg += text(x0+gw/2, y1+H/2, 'GLUE', 'lbl-small', 'transform="rotate(-90,'+(x0+gw/2)+','+(y1+H/2)+')"');

  svg += rect(-bleed, -bleed, TW+bleed*2, TH+bleed*2, 'bleed');
  return { svg, TW, TH };
};

const genPyramidBox = ({ W, H, bleed }) => {
  const TW = W + H*2;
  const TH = W + H*2;
  const cx = TW/2, cy = TH/2;
  const gw = 12;

  let svg = '';
  // Center Base
  svg += rect(cx-W/2, cy-W/2, W, W, 'fill-panel');
  // Folds
  svg += line(cx-W/2,cy-W/2, cx+W/2,cy-W/2, 'fold') + line(cx-W/2,cy+W/2, cx+W/2,cy+W/2, 'fold');
  svg += line(cx-W/2,cy-W/2, cx-W/2,cy+W/2, 'fold') + line(cx+W/2,cy-W/2, cx+W/2,cy+W/2, 'fold');
  
  // Triangles
  svg += path(`M${cx-W/2},${cy-W/2} L${cx},${0} L${cx+W/2},${cy-W/2} Z`, 'fill-side');
  svg += path(`M${cx-W/2},${cy+W/2} L${cx},${TH} L${cx+W/2},${cy+W/2} Z`, 'fill-side');
  svg += path(`M${cx-W/2},${cy-W/2} L${0},${cy} L${cx-W/2},${cy+W/2} Z`, 'fill-side');
  svg += path(`M${cx+W/2},${cy-W/2} L${TW},${cy} L${cx+W/2},${cy+W/2} Z`, 'fill-side');

  // Glue tab on right triangle
  svg += path(`M${cx+W/2},${cy+W/2} L${TW},${cy} L${TW+gw},${cy+gw} L${cx+W/2+gw},${cy+W/2+gw} Z`, 'fill-glue');
  svg += line(cx+W/2,cy+W/2, TW,cy, 'fold');

  // Cuts
  svg += path(`M${cx-W/2},${cy-W/2} L${cx},${0} L${cx+W/2},${cy-W/2} L${TW},${cy} L${TW+gw},${cy+gw} L${cx+W/2+gw},${cy+W/2+gw} L${cx+W/2},${cy+W/2} L${cx},${TH} L${cx-W/2},${cy+W/2} L${0},${cy} Z`, 'cut');

  svg += text(cx, cy, 'BASE', 'lbl-panel');
  svg += text(cx, H/2, 'SIDE 1', 'lbl-small') + text(cx, TH-H/2, 'SIDE 3', 'lbl-small');
  svg += text(H/2, cy, 'SIDE 2', 'lbl-small') + text(TW-H/2, cy, 'SIDE 4', 'lbl-small');

  svg += rect(-bleed, -bleed, Math.max(TW+gw, TW)+bleed*2, TH+bleed*2, 'bleed');
  return { svg, TW: TW+gw, TH };
};

const genPaperBag = ({ W, H, D, bleed }) => {
  const gw = 15;
  const top_h = 40;
  const bot_h = D/2 + 10;
  
  const x0=0, x1=D/2, x2=x1+W, x3=x2+D/2, x4=x3+W, x5=x4+gw, TW=x5;
  const y0=0, y1=top_h, y2=y1+H, y3=y2+bot_h, TH=y3;

  let svg = '';
  svg += rect(x0,y1,D/2,H,'fill-side') + rect(x1,y1,W,H,'fill-panel') + rect(x2,y1,D/2,H,'fill-side') + rect(x3,y1,W,H,'fill-panel') + rect(x4,y1,gw,H,'fill-glue');
  
  // Folds
  svg += line(x0,y1,x5,y1,'fold') + line(x0,y2,x5,y2,'fold');
  svg += line(x1,0,x1,y3,'fold') + line(x2,0,x2,y3,'fold') + line(x3,0,x3,y3,'fold') + line(x4,0,x4,y3,'fold');
  // Gusset folds
  svg += line(x0+D/4,y1,x0+D/4,y2,'fold') + line(x2+D/4,y1,x2+D/4,y2,'fold');

  // Cuts
  svg += line(0,0,TW,0,'cut') + line(0,TH,TW,TH,'cut');
  svg += line(0,0,0,TH,'cut') + line(TW,0,TW,TH,'cut');

  // Handle holes (ellipses)
  svg += path(`M${x1+W/2-W*0.15},${y1/2} A1,1 0 0,0 ${x1+W/2+W*0.15},${y1/2} A1,1 0 0,0 ${x1+W/2-W*0.15},${y1/2}`, 'cut');
  svg += path(`M${x3+W/2-W*0.15},${y1/2} A1,1 0 0,0 ${x3+W/2+W*0.15},${y1/2} A1,1 0 0,0 ${x3+W/2-W*0.15},${y1/2}`, 'cut');

  svg += text(x1+W/2, y1+H/2, 'FRONT', 'lbl-panel') + text(x3+W/2, y1+H/2, 'BACK', 'lbl-panel');
  svg += text(x0+D/4, y1+H/2, 'GUSSET', 'lbl-small') + text(x2+D/4, y1+H/2, 'GUSSET', 'lbl-small');
  
  svg += rect(-bleed, -bleed, TW+bleed*2, TH+bleed*2, 'bleed');
  return { svg, TW, TH };
};

// ════════════════════════════════════════════════════════════
// EXPORT
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
    TH: res.TH 
  };
};

window.PackDieline = { generateDieline };
