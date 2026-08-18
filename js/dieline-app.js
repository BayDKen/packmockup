// ─── PackMockup Dieline UI Logic ────────────────────────────────
'use strict';

const state = {
  templateId: 'tuck-box',
  params: { W: 70, H: 100, D: 40, bleed: 3, thickness: 0.5 },
  unit: 'mm',
  zoom: 1.0,
  svgData: null // stores current { svgString, TW, TH }
};

const TEMPLATES = [
  { id: 'tuck-box', name: 'Tuck End Box', icon: '📦', desc: 'Classic folding box', dims: ['W','H','D','bleed'] },
  { id: 'mailer-box', name: 'Mailer Box', icon: '📮', desc: 'Shipping & e-commerce', dims: ['W','H','D','bleed'] },
  { id: 'sleeve-box', name: 'Sleeve Box', icon: '🗂', desc: 'Open-end sleeve wrap', dims: ['W','H','D','bleed'] },
  { id: 'pillow-box', name: 'Pillow Box', icon: '🎁', desc: 'Curved gift packaging', dims: ['W','H','bleed'] },
  { id: 'pyramid-box', name: 'Pyramid Box', icon: '🔺', desc: '4-sided pyramid box', dims: ['W','H','bleed'] },
  { id: 'paper-bag', name: 'Paper Bag', icon: '🛍', desc: 'Retail shopping bag', dims: ['W','H','D','bleed'] },
];

const DIM_LABELS = {
  W: 'Width (W)', H: 'Height (H)', D: 'Depth (D)', bleed: 'Bleed Margin'
};
const DIM_DEFAULTS = {
  W: 70, H: 100, D: 40, bleed: 3
};

const $ = id => document.getElementById(id);
let dom = {};

const initDom = () => {
  dom = {
    templateGrid: $('template-grid'),
    dimInputs: $('dim-inputs'),
    svgWrap: $('dieline-svg-wrap'),
    sheetDim: $('sheet-dim'),
    toast: $('toast'),
    zoomTxt: $('zoom-txt'),
    badgeName: $('badge-tpl-name')
  };
};

const initTemplateGrid = () => {
  dom.templateGrid.innerHTML = '';
  TEMPLATES.forEach(t => {
    const btn = document.createElement('div');
    btn.className = 'template-btn' + (t.id === state.templateId ? ' active' : '');
    btn.innerHTML = `<div class="t-icon">${t.icon}</div><div class="t-name">${t.name}</div><div class="t-desc">${t.desc}</div>`;
    btn.onclick = () => selectTemplate(t.id);
    dom.templateGrid.appendChild(btn);
  });
};

const selectTemplate = (id) => {
  state.templateId = id;
  const tpl = TEMPLATES.find(t => t.id === id);
  dom.badgeName.textContent = tpl.name;
  
  // Update UI active state
  document.querySelectorAll('.template-btn').forEach((b, i) => {
    b.classList.toggle('active', TEMPLATES[i].id === id);
  });
  
  buildDimInputs(tpl);
  regenerate();
  setTimeout(fitToView, 50);
};

const buildDimInputs = (tpl) => {
  dom.dimInputs.innerHTML = '';
  tpl.dims.forEach(d => {
    // Reset missing params to defaults
    if (!(d in state.params)) state.params[d] = DIM_DEFAULTS[d];
    
    const div = document.createElement('div');
    div.className = 'dim-input-group';
    div.innerHTML = `
      <div class="dim-input-label">${DIM_LABELS[d]}</div>
      <div class="dim-input-row">
        <input type="number" class="dim-input" id="inp-${d}" value="${state.params[d]}" step="1" min="0" />
        <span class="dim-unit-badge">mm</span>
      </div>
    `;
    dom.dimInputs.appendChild(div);
    
    $(`inp-${d}`).addEventListener('input', (e) => {
      state.params[d] = parseFloat(e.target.value) || 0;
      regenerate();
    });
  });
};

const regenerate = () => {
  if (!window.PackDieline) return;
  state.svgData = window.PackDieline.generateDieline(state.templateId, state.params);
  dom.svgWrap.innerHTML = state.svgData.svgString;
  updateSheetInfo();
};

const updateSheetInfo = () => {
  if (!state.svgData) return;
  const w = state.svgData.TW + state.params.bleed * 2;
  const h = state.svgData.TH + state.params.bleed * 2;
  dom.sheetDim.textContent = `${w.toFixed(1)} × ${h.toFixed(1)} mm`;
};

// ─── ZOOM ──────────────────────────────────────────────
const setZoom = (z) => {
  state.zoom = Math.max(0.1, Math.min(z, 5.0));
  dom.svgWrap.style.transform = `scale(${state.zoom})`;
  dom.zoomTxt.textContent = Math.round(state.zoom * 100) + '%';
};

const fitToView = () => {
  if (!state.svgData) return;
  const padding = 60;
  const previewBox = dom.svgWrap.parentElement.getBoundingClientRect();
  const availableW = previewBox.width - padding;
  const availableH = previewBox.height - padding;
  
  const w = state.svgData.TW + state.params.bleed * 2;
  const h = state.svgData.TH + state.params.bleed * 2;
  
  // Simple assumption: 1mm = 3.78px approximately on screen, but SVG is naturally responsive if we don't set px size.
  // Actually, our SVG has width=...mm. Browsers render 1mm ~ 3.78px.
  const svgPxW = w * 3.7795275591; 
  const svgPxH = h * 3.7795275591;
  
  const scaleX = availableW / svgPxW;
  const scaleY = availableH / svgPxH;
  setZoom(Math.min(scaleX, scaleY, 1.0));
};

// ─── EXPORT ────────────────────────────────────────────
let toastTimer;
const showToast = (msg) => {
  dom.toast.textContent = msg;
  dom.toast.className = 'toast success show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 3000);
};

const exportSVG = () => {
  if (!state.svgData) return;
  const blob = new Blob([state.svgData.svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `dieline-${state.templateId}.svg`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
  showToast('✓ SVG exported successfully');
};

const exportPNG = (res = 3000) => {
  if (!state.svgData) return;
  const { svgString, TW, TH } = state.svgData;
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas');
    const aspect = TW / TH;
    cv.width = res;
    cv.height = Math.round(res / aspect);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    const link = document.createElement('a');
    link.download = `dieline-${state.templateId}-${res}px.png`;
    link.href = cv.toDataURL('image/png');
    link.click();
    URL.revokeObjectURL(url);
    showToast('✓ PNG exported successfully');
  };
  img.src = url;
};

const exportPDF = () => {
  if (!state.svgData) return;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html><head><title>Print Dieline</title>
    <style>@page { size: auto; margin: 0; } body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }</style>
    </head><body>
    ${state.svgData.svgString}
    <script>window.onload = () => { window.print(); window.close(); }</script>
    </body></html>
  `);
  printWindow.document.close();
};

// ─── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDom();
  initTemplateGrid();
  selectTemplate('tuck-box'); // Auto triggers buildInputs, regenerate, fitToView
  
  $('btn-zoom-in').onclick = () => setZoom(state.zoom + 0.1);
  $('btn-zoom-out').onclick = () => setZoom(state.zoom - 0.1);
  $('btn-zoom-fit').onclick = fitToView;
  
  $('btn-export-svg').onclick = exportSVG;
  $('btn-export-png').onclick = () => exportPNG(3000);
  $('btn-export-pdf').onclick = exportPDF;
  
  // Handle mouse wheel zoom
  dom.svgWrap.parentElement.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(state.zoom - e.deltaY * 0.001);
    }
  }, { passive: false });
});
