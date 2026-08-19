// ─── PackMockup Dieline UI Logic ────────────────────────────────
'use strict';

const state = {
  templateId: 'tuck-box',
  params: { W: 70, H: 100, D: 40, bleed: 3, thickness: 0.5 },
  unit: 'mm',
  zoom: 1.0,
  svgData: null,
  
  // Design overlay state
  designImg: null,
  dScale: 1.0,
  dx: 0,
  dy: 0,
  
  // 3D Viewers
  viewer3d: null,     // Modal full 3D viewer
  miniViewer: null,   // Live mini 3D viewer
  
  // Throttle state for live 3D updates
  texUpdatePending: false
};

const TEMPLATES = [
  { id: 'tuck-box', name: 'Tuck End Box', icon: '📦', desc: 'Classic folding box', dims: ['W','H','D','bleed'] },
  { id: 'mailer-box', name: 'Mailer Box', icon: '📮', desc: 'Shipping & e-commerce', dims: ['W','H','D','bleed'] },
  { id: 'sleeve-box', name: 'Sleeve Box', icon: '🗂', desc: 'Open-end sleeve wrap', dims: ['W','H','D','bleed'] },
  { id: 'pillow-box', name: 'Pillow Box', icon: '🎁', desc: 'Curved gift packaging', dims: ['W','H','bleed'] },
  { id: 'pyramid-box', name: 'Pyramid Box', icon: '🔺', desc: '4-sided pyramid box', dims: ['W','H','bleed'] },
  { id: 'paper-bag', name: 'Paper Bag', icon: '🛍', desc: 'Retail shopping bag', dims: ['W','H','D','bleed'] },
];

const DIM_LABELS = { W: 'Width (W)', H: 'Height (H)', D: 'Depth (D)', bleed: 'Bleed Margin' };
const DIM_DEFAULTS = { W: 70, H: 100, D: 40, bleed: 3 };

const $ = id => document.getElementById(id);
let dom = {};

const initDom = () => {
  dom = {
    templateGrid: $('template-grid'),
    dimInputs: $('dim-inputs'),
    svgWrap: $('dieline-svg-wrap'),
    svgContainer: $('svg-container'),
    sheetDim: $('sheet-dim'),
    toast: $('toast'),
    zoomTxt: $('zoom-txt'),
    badgeName: $('badge-tpl-name'),
    
    // Design upload
    inpUpload: $('inp-design-upload'),
    designLayer: $('design-layer'),
    btn3dPreview: $('btn-3d-preview'),
    designControls: $('design-controls'),
    designAdjustTitle: $('design-adjust-title'),
    
    // Sliders
    slScale: $('inp-dsg-scale'),
    slX: $('inp-dsg-x'),
    slY: $('inp-dsg-y'),
    
    // 3D Canvas elements
    mini3dCanvas: $('mini-3d-canvas'),
    modal3d: $('modal-3d'),
    modal3dCanvas: $('modal-3d-canvas'),
    btnCloseModal: $('btn-close-modal')
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
  
  document.querySelectorAll('.template-btn').forEach((b, i) => {
    b.classList.toggle('active', TEMPLATES[i].id === id);
  });
  
  resetDesign();
  buildDimInputs(tpl);
  regenerate();
  setTimeout(fitToView, 50);
};

const buildDimInputs = (tpl) => {
  dom.dimInputs.innerHTML = '';
  tpl.dims.forEach(d => {
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

// SVG Generation
let rebuildTimeout;
const regenerate = () => {
  if (!window.PackDieline) return;
  state.svgData = window.PackDieline.generateDieline(state.templateId, state.params);
  dom.svgContainer.innerHTML = state.svgData.svgString;
  updateSheetInfo();
  
  // Debounce rebuilding the WebGL viewer to avoid crashing browser when sliding inputs fast
  clearTimeout(rebuildTimeout);
  rebuildTimeout = setTimeout(() => {
    const hasFaces = state.svgData.faces && state.svgData.faces.length > 0;
    if (hasFaces) rebuildMiniViewer();
  }, 250);
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
  
  const svgPxW = w * 3.7795; 
  const svgPxH = h * 3.7795;
  const scaleX = availableW / svgPxW;
  const scaleY = availableH / svgPxH;
  setZoom(Math.min(scaleX, scaleY, 1.0));
};

// ─── DESIGN OVERLAY ────────────────────────────────────
const resetDesign = () => {
  state.designImg = null;
  dom.designLayer.style.display = 'none';
  dom.designLayer.src = '';
  dom.designAdjustTitle.style.display = 'none';
  dom.designControls.style.display = 'none';
  state.dScale = 1.0; state.dx = 0; state.dy = 0;
  dom.slScale.value = 100; dom.slX.value = 0; dom.slY.value = 0;
};

const applyDesignTransform = () => {
  dom.designLayer.style.transform = `translate(${state.dx}%, ${state.dy}%) scale(${state.dScale})`;
  // Trigger 3D Texture Update smoothly
  requestTextureUpdate();
};

const handleDesignUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    state.designImg = img;
    dom.designLayer.src = url;
    dom.designLayer.style.display = 'block';
    dom.designAdjustTitle.style.display = 'flex';
    dom.designControls.style.display = 'flex';
    applyDesignTransform();
  };
  img.src = url;
  e.target.value = ''; 
};

// ─── DRAG INTERACTION ──────────────────────────────────
let isDragging = false;
let startX, startY;

const startDrag = (e) => {
  if (!state.designImg) return;
  if (e.target.closest('.zoom-controls') || e.target.closest('.preview-actions')) return;
  isDragging = true;
  startX = e.clientX || e.touches[0].clientX;
  startY = e.clientY || e.touches[0].clientY;
};

const doDrag = (e) => {
  if (!isDragging) return;
  e.preventDefault();
  const clientX = e.clientX || (e.touches ? e.touches[0].clientX : 0);
  const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
  
  const moveX = clientX - startX;
  const moveY = clientY - startY;
  
  const rect = dom.svgWrap.getBoundingClientRect();
  const percX = (moveX / rect.width) * 100;
  const percY = (moveY / rect.height) * 100;
  
  state.dx += percX / state.zoom;
  state.dy += percY / state.zoom;
  
  state.dx = Math.max(-200, Math.min(200, state.dx));
  state.dy = Math.max(-200, Math.min(200, state.dy));
  
  dom.slX.value = state.dx;
  dom.slY.value = state.dy;
  
  applyDesignTransform();
  
  startX = clientX;
  startY = clientY;
};

const stopDrag = () => {
  isDragging = false;
};


// ─── 3D SLICING & PREVIEW ──────────────────────────────

// Setup or Re-setup the Mini Viewer (called when dimensions change)
const rebuildMiniViewer = () => {
  if (state.miniViewer) state.miniViewer.dispose();
  
  const W = state.params.W / 30;
  const H = state.params.H / 30;
  const D = state.params.D / 30;
  
  // Use off-white color to simulate cardboard inside
  state.miniViewer = new Viewer3D(dom.mini3dCanvas, {
    color: '#ffffff',
    dims: { w: W, h: H, d: D }
  });
  
  // Delay slightly to ensure canvas is attached and dimensioned
  setTimeout(() => {
    state.miniViewer._onResize();
    applyTexturesToViewer(state.miniViewer, 1000); // 1000px resolution is enough for mini preview
  }, 50);
};

// Throttle wrapper to maintain 60fps while dragging
const requestTextureUpdate = () => {
  if (state.texUpdatePending) return;
  state.texUpdatePending = true;
  requestAnimationFrame(() => {
    if (state.miniViewer) applyTexturesToViewer(state.miniViewer, 1000);
    if (state.viewer3d && dom.modal3d.style.display === 'flex') applyTexturesToViewer(state.viewer3d, 3000);
    state.texUpdatePending = false;
  });
};

// The Core Slicing Engine
const applyTexturesToViewer = (viewer, masterRes = 2000) => {
  if (!state.svgData || !state.svgData.faces) return;

  const b = state.params.bleed;
  const pad = 10; 
  const CW = state.svgData.TW + (b + pad) * 2;
  const CH = state.svgData.TH + (b + pad) * 2;
  
  const scaleRes = masterRes / Math.max(CW, CH);
  
  const mCanvas = document.createElement('canvas');
  mCanvas.width = CW * scaleRes;
  mCanvas.height = CH * scaleRes;
  const ctx = mCanvas.getContext('2d');
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, mCanvas.width, mCanvas.height);
  
  if (state.designImg) {
    const iAspect = state.designImg.width / state.designImg.height;
    const cAspect = mCanvas.width / mCanvas.height;
    
    let drawW, drawH, drawX, drawY;
    if (iAspect > cAspect) {
      drawW = mCanvas.width;
      drawH = mCanvas.width / iAspect;
    } else {
      drawH = mCanvas.height;
      drawW = mCanvas.height * iAspect;
    }
    
    drawX = (mCanvas.width - drawW) / 2;
    drawY = (mCanvas.height - drawH) / 2;
    
    const cx = mCanvas.width / 2;
    const cy = mCanvas.height / 2;
    ctx.translate(cx, cy);
    ctx.translate(state.dx/100 * mCanvas.width, state.dy/100 * mCanvas.height);
    ctx.scale(state.dScale, state.dScale);
    ctx.translate(-cx, -cy);
    
    ctx.drawImage(state.designImg, drawX, drawY, drawW, drawH);
  }
  
  state.svgData.faces.forEach(faceData => {
    const fx = (faceData.x + b + pad) * scaleRes;
    const fy = (faceData.y + b + pad) * scaleRes;
    const fw = faceData.w * scaleRes;
    const fh = faceData.h * scaleRes;
    
    if (fw <= 0 || fh <= 0) return;
    
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = fw;
    faceCanvas.height = fh;
    const fCtx = faceCanvas.getContext('2d');
    
    if (faceData.rot === 180) {
      fCtx.translate(fw/2, fh/2);
      fCtx.rotate(Math.PI);
      fCtx.translate(-fw/2, -fh/2);
    }
    
    fCtx.drawImage(mCanvas, fx, fy, fw, fh, 0, 0, fw, fh);
    viewer.setFaceImage(faceData.face, faceCanvas);
  });
};

// Modal preview
const open3DPreview = () => {
  if (!state.svgData || !state.svgData.faces) return;
  dom.modal3d.style.display = 'flex';
  dom.modal3dCanvas.offsetHeight; // force layout
  
  if (state.viewer3d) state.viewer3d.dispose();
  
  const W = state.params.W / 30;
  const H = state.params.H / 30;
  const D = state.params.D / 30;
  
  state.viewer3d = new Viewer3D(dom.modal3dCanvas, {
    color: '#ffffff',
    dims: { w: W, h: H, d: D }
  });
  
  applyTexturesToViewer(state.viewer3d, 4000);
  setTimeout(() => { if (state.viewer3d) state.viewer3d._onResize(); }, 100);
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
  selectTemplate('tuck-box'); 
  
  $('btn-zoom-in').onclick = () => setZoom(state.zoom + 0.1);
  $('btn-zoom-out').onclick = () => setZoom(state.zoom - 0.1);
  $('btn-zoom-fit').onclick = fitToView;
  
  $('btn-export-svg').onclick = exportSVG;
  $('btn-export-png').onclick = () => exportPNG(3000);
  $('btn-export-pdf').onclick = exportPDF;
  
  dom.inpUpload.addEventListener('change', handleDesignUpload);
  
  dom.slScale.addEventListener('input', (e) => { state.dScale = e.target.value / 100; applyDesignTransform(); });
  dom.slX.addEventListener('input', (e) => { state.dx = parseFloat(e.target.value); applyDesignTransform(); });
  dom.slY.addEventListener('input', (e) => { state.dy = parseFloat(e.target.value); applyDesignTransform(); });
  
  dom.btn3dPreview.addEventListener('click', open3DPreview);
  dom.btnCloseModal.addEventListener('click', () => { dom.modal3d.style.display = 'none'; });
  
  dom.svgWrap.parentElement.addEventListener('mousedown', startDrag);
  dom.svgWrap.parentElement.addEventListener('mousemove', doDrag);
  window.addEventListener('mouseup', stopDrag);
  
  dom.svgWrap.parentElement.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(state.zoom - e.deltaY * 0.001);
    }
  }, { passive: false });
});
