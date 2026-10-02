// ─── PackMockup Application Logic ────────────────────────────
// All 10+ packaging items are full 3D interactive studio models!
'use strict';

// ════════════════════════════════════════════════════════════
// 3D CONFIGURATION & PRESETS
// ════════════════════════════════════════════════════════════

const FOLDABLE_MODELS = new Set(['tuck-box', 'mailer-box', 'square-box', 'sleeve-box', 'pyramid-box']);

const MOCKUP_3D_DIMS = {
  'tuck-box':      { w: 1.7, h: 2.55, d: 1.1 },
  'mailer-box':    { w: 2.3, h: 1.45, d: 1.65 },
  'square-box':    { w: 2.0, h: 2.00, d: 2.0 },
  'soda-can':      { radius: 0.8, height: 2.8 },
  'paper-cup':     { topR: 1.0, botR: 0.72, height: 2.6 },
  'cosmetic-jar':  { radius: 1.1, height: 1.4 },
  'spray-bottle':  { radius: 0.8, height: 3.2 },
  'standup-pouch': { w: 2.2, h: 3.0, d: 1.0 },
  'flat-pouch':    { w: 1.8, h: 2.4 },
  'shopping-bag':  { w: 2.4, h: 3.0, d: 1.2 },
  'sleeve-box':    { w: 2.0, h: 1.2, d: 2.4 },
  'pillow-box':    { w: 2.2, h: 2.8, d: 0.9 },
  'pyramid-box':   { baseW: 2.2, height: 2.4 }
};

const FACE_CONFIG = [
  { idx: 'front',  name: 'Front',  icon: '⬛' },
  { idx: 'back',   name: 'Back',   icon: '⬜' },
  { idx: 'left',   name: 'Left',   icon: '◀'  },
  { idx: 'right',  name: 'Right',  icon: '▶'  },
  { idx: 'top',    name: 'Top',    icon: '▲'  },
  { idx: 'bottom', name: 'Bottom', icon: '▼'  },
];

// ════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════

const state = {
  activeCat:   'all',
  searchQuery: '',
  filterMode:  'all',

  editor: {
    open:         false,
    mockupId:     null,
    color:        '#f5f5f5',
    finish:       'matte',
    foldProgress: 1.0,
    activeFace:   'front',
    imgEl:        null,      // uploaded image element
    scale:        1.0,
    ox:           0,
    oy:           0,
    rotation:     0,
    opacity:      1.0,
    background:   '#ffffff',
    resolution:   2000,
    transparentBg:false,
  },

  viewer3d: null,
};

// ════════════════════════════════════════════════════════════
// DOM REFERENCES
// ════════════════════════════════════════════════════════════

const $ = id => document.getElementById(id);
let dom = {};

const initDom = () => {
  dom = {
    galleryPage:      $('gallery-page'),
    editorPage:       $('editor-page'),
    mockupGrid:       $('mockup-grid'),
    sidebarCats:      $('sidebar-cats'),
    searchInput:      $('search-input'),
    toolbarTitle:     $('toolbar-title'),
    toolbarCount:     $('toolbar-count'),
    filterAll:        $('filter-all'),
    filterPopular:    $('filter-popular'),
    filterNew:        $('filter-new'),

    // Editor Header
    ctrlBack:         $('ctrl-back'),
    ctrlTitle:        $('ctrl-title'),
    ctrlCategory:     $('ctrl-category'),
    badge3d:          $('badge-3d'),

    // Tabs
    tabBtns:          document.querySelectorAll('.studio-tab-btn'),
    tabPanes:         document.querySelectorAll('.tab-pane'),

    // Upload & Artwork Tab
    uploadBtn:        $('upload-btn'),
    uploadBtnSmall:   $('upload-btn-small'),
    fileInput:        $('file-input'),
    uploadLabel:      $('upload-label'),
    uploadHint:       $('upload-hint'),
    uploadedPreview:  $('uploaded-preview'),
    uploadedImg:      $('uploaded-img'),
    uploadedRemove:   $('uploaded-remove'),
    faceSelectorSec:  $('face-selector-section'),
    faceGrid:         $('face-grid'),

    // Sliders
    sliderScale:      $('slider-scale'),
    sliderOx:         $('slider-ox'),
    sliderOy:         $('slider-oy'),
    sliderRot:        $('slider-rot'),
    sliderOpacity:    $('slider-opacity'),
    valScale:         $('val-scale'),
    valOx:            $('val-ox'),
    valOy:            $('val-oy'),
    valRot:           $('val-rot'),
    valOpacity:       $('val-opacity'),

    // Material & Color Tab
    appFinishGrid:    $('app-finish-grid'),
    variantsGrid:     $('variants-grid'),

    // Fold Tab
    tabFoldBtn:       document.querySelector('[data-tab="tab-fold"]'),
    appFoldSlider:    $('app-fold-slider'),
    appFoldVal:       $('app-fold-val'),
    appBtnAnimFold:   $('app-btn-anim-fold'),

    // Scene & Lighting Tab
    camHero:          $('cam-hero'),
    camFront:         $('cam-front'),
    camSide:          $('cam-side'),
    camTop:           $('cam-top'),
    camIso:           $('cam-iso'),
    camUnfolded:      $('cam-unfolded'),
    btnAutoRotate:    $('btn-auto-rotate'),
    btnResetView:     $('btn-reset-view'),
    bgWhite:          $('bg-white'),
    bgLight:          $('bg-light'),
    bgDark:           $('bg-dark'),
    bgCustom:         $('bg-custom'),
    bgColorInput:     $('bg-color-input'),

    // Export Tab
    resolutionSel:    $('resolution-sel'),
    chkTransparentBg: $('chk-transparent-bg'),
    exportBtn:        $('export-btn'),
    exportGlbBtn:     $('export-glb-btn'),

    // Canvas
    previewCanvas:    $('preview-canvas'),
    viewer3dWrap:     $('viewer3d-wrap'),
    canvasBadgeId:    $('canvas-mockup-id'),
    canvasHint:       $('canvas-hint'),
    toast:            $('toast'),
  };
};

// ════════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ════════════════════════════════════════════════════════════

let toastTimer;
const showToast = (msg, type = 'success') => {
  dom.toast.textContent = msg;
  dom.toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 3200);
};

// ════════════════════════════════════════════════════════════
// GALLERY
// ════════════════════════════════════════════════════════════

const CAT_ICONS = { all:'🗂', boxes:'📦', pouches:'🫙', cans:'🥫', cups:'☕', jars:'🧴', bottles:'🍶', bags:'🛍' };

const getFiltered = () => {
  let list = MOCKUPS_DATA;
  if (state.activeCat !== 'all') list = list.filter(m => m.category === state.activeCat);
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      m.tags.some(t => t.includes(q))
    );
  }
  if (state.filterMode === 'popular') list = list.filter(m => m.popular);
  if (state.filterMode === 'new')     list = list.filter(m => m.new);
  return list;
};

const renderSidebar = () => {
  dom.sidebarCats.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const n = cat.id === 'all' ? MOCKUPS_DATA.length : MOCKUPS_DATA.filter(m => m.category === cat.id).length;
    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (state.activeCat === cat.id ? ' active' : '');
    btn.dataset.cat = cat.id;
    btn.innerHTML = `<span class="cat-icon">${CAT_ICONS[cat.id]||'📦'}</span><span>${cat.name}</span><span class="cat-count">${n}</span>`;
    btn.addEventListener('click', () => { state.activeCat = cat.id; renderSidebar(); renderGallery(); });
    dom.sidebarCats.appendChild(btn);
  });
};

const renderGallery = () => {
  const list = getFiltered();
  const catName = state.activeCat === 'all' ? 'All Mockups'
    : CATEGORIES.find(c => c.id === state.activeCat)?.name || '';

  dom.toolbarTitle.textContent = catName;
  dom.toolbarCount.textContent = `${list.length} template${list.length !== 1 ? 's' : ''}`;
  dom.mockupGrid.innerHTML = '';

  if (!list.length) {
    dom.mockupGrid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">No mockups found</div><p>Try a different search or category</p></div>`;
    return;
  }

  list.forEach((mockup, idx) => {
    const card = document.createElement('div');
    card.className = 'mockup-card';
    card.style.animationDelay = `${Math.min(idx * 0.04, 0.4)}s`;
    card.dataset.id = mockup.id;

    const dots = mockup.variants.slice(0, 6).map(v =>
      `<span class="color-dot" style="background:${v.color}" title="${v.name}"></span>`
    ).join('');
    const badge = mockup.popular ? '<span class="card-badge popular">Popular</span>'
                : mockup.new     ? '<span class="card-badge new">New</span>'
                : '<span class="card-badge is3d">3D</span>';

    card.innerHTML = `
      <div class="card-thumb">
        <canvas id="thumb-${mockup.id}" width="300" height="300"></canvas>
        ${badge}
        <div class="card-hover-overlay">
          <div class="card-hover-btn">⬡ Open 3D Studio</div>
        </div>
      </div>
      <div class="card-info">
        <div class="card-name">${mockup.name}</div>
        <div class="card-variants">${dots}</div>
      </div>`;

    card.addEventListener('click', () => openEditor(mockup.id));
    dom.mockupGrid.appendChild(card);

    // Fast 2D preview thumbnail
    setTimeout(() => {
      const cv = $(`thumb-${mockup.id}`);
      if (cv && window.renderMockup) {
        window.renderMockup(cv, mockup.render, { color: mockup.variants[0]?.color || '#f2f2f2', background: '#f7f7fb' });
      }
    }, idx * 15 + 30);
  });
};

// ════════════════════════════════════════════════════════════
// 3D STUDIO EDITOR
// ════════════════════════════════════════════════════════════

const openEditor = (mockupId) => {
  const mockup = MOCKUPS_DATA.find(m => m.id === mockupId);
  if (!mockup) return;

  const isFoldable = FOLDABLE_MODELS.has(mockupId);

  // Reset editor state
  Object.assign(state.editor, {
    open:         true,
    mockupId,
    color:        mockup.variants[0]?.color || '#f5f5f5',
    finish:       'matte',
    foldProgress: 1.0,
    activeFace:   'front',
    imgEl:        null,
    scale:        1.0,
    ox:           0,
    oy:           0,
    rotation:     0,
    opacity:      1.0,
    background:   '#ffffff',
  });

  // Header Titles
  dom.ctrlTitle.textContent     = mockup.name;
  dom.ctrlCategory.textContent  = mockup.category;
  dom.canvasBadgeId.textContent = mockup.name;
  dom.badge3d.textContent       = '⬡ 3D Studio';

  // Fold Tab visibility
  if (dom.tabFoldBtn) {
    dom.tabFoldBtn.style.display = isFoldable ? 'flex' : 'none';
  }
  dom.faceSelectorSec.style.display = isFoldable ? 'block' : 'none';

  // Switch to Artwork tab by default
  switchTab('tab-artwork');

  // Populate Color variants
  dom.variantsGrid.innerHTML = '';
  mockup.variants.forEach((v, i) => {
    const btn = document.createElement('button');
    btn.className = 'variant-btn' + (i === 0 ? ' active' : '');
    btn.style.background = v.color;
    btn.title = v.name;
    btn.dataset.color = v.color;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.variant-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.editor.color = v.color;
      if (state.viewer3d) state.viewer3d.setColor(v.color);
    });
    dom.variantsGrid.appendChild(btn);
  });

  // Reset Finishes buttons
  dom.appFinishGrid.querySelectorAll('.finish-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.finish === 'matte');
  });

  // Reset Sliders
  dom.sliderScale.value   = 100;
  dom.sliderOx.value      = 0;
  dom.sliderOy.value      = 0;
  dom.sliderRot.value     = 0;
  dom.sliderOpacity.value = 100;
  dom.appFoldSlider.value = 100;
  dom.appFoldVal.textContent = '100%';
  updateSliderValues();

  // Reset Artwork Preview
  dom.uploadedPreview.classList.remove('has-image');
  dom.uploadedImg.src = '';

  // Background presets
  document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
  dom.bgWhite.classList.add('active');

  // Build Face selector buttons (for boxes)
  if (isFoldable) {
    buildFaceGrid();
  }

  // Switch view from Gallery to Editor
  dom.galleryPage.style.display = 'none';
  dom.editorPage.classList.add('open');

  // Initialize Three.js 3D Viewer
  init3DStudio(mockupId);
};

const closeEditor = () => {
  state.editor.open = false;
  dom.editorPage.classList.remove('open');
  dom.galleryPage.style.display = '';
  dispose3DStudio();
};

const init3DStudio = (mockupId) => {
  dispose3DStudio();
  const dims = MOCKUP_3D_DIMS[mockupId] || { w: 1.8, h: 2.5, d: 1.1 };
  
  state.viewer3d = new Viewer3D(dom.viewer3dWrap, {
    modelType: mockupId,
    dims,
    color: state.editor.color,
    finish: state.editor.finish,
    foldProgress: state.editor.foldProgress
  });

  state.viewer3d.setBackground(state.editor.background);
  refreshAutoRotateBtn();
};

const dispose3DStudio = () => {
  if (state.viewer3d) {
    state.viewer3d.dispose();
    state.viewer3d = null;
  }
};

// ─── TAB NAVIGATION ─────────────────────────────────────
const switchTab = (targetId) => {
  dom.tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === targetId));
  dom.tabPanes.forEach(pane => {
    pane.style.display = pane.id === targetId ? 'block' : 'none';
  });
};

// ─── FACE GRID ──────────────────────────────────────────
const buildFaceGrid = () => {
  dom.faceGrid.innerHTML = '';
  FACE_CONFIG.forEach(fc => {
    const btn = document.createElement('button');
    btn.className = 'face-btn' + (fc.idx === state.editor.activeFace ? ' active' : '');
    btn.dataset.face = fc.idx;
    btn.innerHTML = `<span>${fc.icon} ${fc.name}</span>`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.face-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.editor.activeFace = fc.idx;
      if (state.viewer3d) state.viewer3d.setCameraPreset(fc.idx === 'top' ? 'top' : (fc.idx === 'back' ? 'side' : 'hero'));
    });
    dom.faceGrid.appendChild(btn);
  });
};

// ─── ARTWORK & TEXTURE MAPPING ──────────────────────────
const updateSliderValues = () => {
  dom.valScale.textContent   = `${dom.sliderScale.value}%`;
  dom.valOx.textContent      = dom.sliderOx.value;
  dom.valOy.textContent      = dom.sliderOy.value;
  dom.valRot.textContent     = `${dom.sliderRot.value}°`;
  dom.valOpacity.textContent = `${dom.sliderOpacity.value}%`;
};

// Generates an adjusted canvas from the uploaded artwork
const generateArtworkCanvas = (img, size = 1024) => {
  if (!img) return null;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');

  const scale = parseFloat(dom.sliderScale.value) / 100;
  const ox = (parseFloat(dom.sliderOx.value) / 100) * size;
  const oy = (parseFloat(dom.sliderOy.value) / 100) * size;
  const rot = (parseFloat(dom.sliderRot.value) * Math.PI) / 180;
  const op = parseFloat(dom.sliderOpacity.value) / 100;

  const iw = img.naturalWidth || img.width || 1;
  const ih = img.naturalHeight || img.height || 1;
  const baseScale = Math.max(size / iw, size / ih);
  const dw = iw * baseScale * scale;
  const dh = ih * baseScale * scale;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.translate(size / 2 + ox, size / 2 + oy);
  ctx.rotate(rot);
  ctx.globalAlpha = op;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();

  return cv;
};

const applyArtworkTo3D = () => {
  if (!state.viewer3d || !state.editor.imgEl) return;
  const cv = generateArtworkCanvas(state.editor.imgEl);
  state.viewer3d.setFaceImage(state.editor.activeFace, cv);
};

const handleImageLoad = (img, url) => {
  state.editor.imgEl = img;
  dom.uploadedImg.src = url;
  dom.uploadedPreview.classList.add('has-image');
  applyArtworkTo3D();
  showToast('✓ Artwork applied to 3D model!');
};

// ─── AUTO-ROTATE BUTTON ─────────────────────────────────
const refreshAutoRotateBtn = () => {
  const on = state.viewer3d?.isAutoRotating() ?? false;
  dom.btnAutoRotate?.classList.toggle('active', on);
};

// ════════════════════════════════════════════════════════════
// EVENT INITIALIZATION
// ════════════════════════════════════════════════════════════

const initEvents = () => {
  // Tabs
  dom.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Search & Filter
  dom.searchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value.trim();
    renderGallery();
  });

  const setFilter = mode => {
    state.filterMode = mode;
    [dom.filterAll, dom.filterPopular, dom.filterNew].forEach(b => b?.classList.remove('active'));
    $(`filter-${mode}`)?.classList.add('active');
    renderGallery();
  };
  dom.filterAll.addEventListener('click',     () => setFilter('all'));
  dom.filterPopular.addEventListener('click', () => setFilter('popular'));
  dom.filterNew.addEventListener('click',     () => setFilter('new'));

  // Back / Close
  dom.ctrlBack.addEventListener('click', closeEditor);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.editor.open) closeEditor(); });

  // File Upload
  const triggerUpload = () => dom.fileInput.click();
  dom.uploadBtn.addEventListener('click', triggerUpload);
  dom.uploadBtnSmall?.addEventListener('click', triggerUpload);

  dom.fileInput.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast('Please upload an image file', 'error'); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => handleImageLoad(img, url);
    img.onerror = () => showToast('Failed to load image', 'error');
    img.src = url;
    dom.fileInput.value = '';
  });

  // Remove Artwork
  dom.uploadedRemove.addEventListener('click', () => {
    state.editor.imgEl = null;
    dom.uploadedPreview.classList.remove('has-image');
    dom.uploadedImg.src = '';
    if (state.viewer3d) {
      state.viewer3d.setFaceImage(state.editor.activeFace, null);
    }
  });

  // Sliders
  [dom.sliderScale, dom.sliderOx, dom.sliderOy, dom.sliderRot, dom.sliderOpacity].forEach(s => {
    s.addEventListener('input', () => {
      updateSliderValues();
      applyArtworkTo3D();
    });
  });

  // Finish selector
  dom.appFinishGrid.addEventListener('click', e => {
    const btn = e.target.closest('.finish-btn');
    if (!btn) return;
    dom.appFinishGrid.querySelectorAll('.finish-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.editor.finish = btn.dataset.finish;
    if (state.viewer3d) state.viewer3d.setFinish(state.editor.finish);
  });

  // Fold Slider & Button
  dom.appFoldSlider.addEventListener('input', e => {
    const val = parseFloat(e.target.value);
    state.editor.foldProgress = val / 100;
    dom.appFoldVal.textContent = `${Math.round(val)}%`;
    if (state.viewer3d) state.viewer3d.setFoldProgress(state.editor.foldProgress);
  });

  dom.appBtnAnimFold.addEventListener('click', () => {
    if (!state.viewer3d) return;
    const target = state.editor.foldProgress > 0.5 ? 0.0 : 1.0;
    state.viewer3d.animateFold(target, 1000, p => {
      state.editor.foldProgress = p;
      dom.appFoldSlider.value = p * 100;
      dom.appFoldVal.textContent = `${Math.round(p * 100)}%`;
    });
  });

  // Camera Presets
  dom.camHero?.addEventListener('click',      () => state.viewer3d?.setCameraPreset('hero'));
  dom.camFront?.addEventListener('click',     () => state.viewer3d?.setCameraPreset('front'));
  dom.camSide?.addEventListener('click',      () => state.viewer3d?.setCameraPreset('side'));
  dom.camTop?.addEventListener('click',       () => state.viewer3d?.setCameraPreset('top'));
  dom.camIso?.addEventListener('click',       () => state.viewer3d?.setCameraPreset('isometric'));
  dom.camUnfolded?.addEventListener('click',  () => state.viewer3d?.setCameraPreset('unfolded'));

  // Turntable
  dom.btnAutoRotate?.addEventListener('click', () => {
    if (!state.viewer3d) return;
    state.viewer3d.toggleAutoRotate();
    refreshAutoRotateBtn();
  });
  dom.btnResetView?.addEventListener('click', () => {
    if (!state.viewer3d) return;
    state.viewer3d.resetView();
    refreshAutoRotateBtn();
  });

  // Background
  const bgMap = { 'bg-white': '#ffffff', 'bg-light': '#f5f5f5', 'bg-dark': '#1a1a1a' };
  [dom.bgWhite, dom.bgLight, dom.bgDark].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.editor.background = bgMap[btn.id] || '#ffffff';
      if (state.viewer3d) state.viewer3d.setBackground(state.editor.background);
    });
  });

  dom.bgCustom?.addEventListener('click', () => dom.bgColorInput.click());
  dom.bgColorInput?.addEventListener('input', e => {
    document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
    dom.bgCustom?.classList.add('active');
    state.editor.background = e.target.value;
    if (state.viewer3d) state.viewer3d.setBackground(e.target.value);
  });

  // Export 4K PNG
  dom.exportBtn.addEventListener('click', () => {
    if (!state.viewer3d) return;
    const res = parseInt(dom.resolutionSel.value) || 2000;
    const isTransparent = dom.chkTransparentBg.checked;
    const dataURL = state.viewer3d.exportPNG(res, isTransparent);
    const link = document.createElement('a');
    link.download = `packmockup-${state.editor.mockupId}-${res}px.png`;
    link.href = dataURL;
    link.click();
    showToast(`✓ High-Res (${res}px) PNG exported!`);
  });

  // Export 3D Model (.GLB)
  dom.exportGlbBtn.addEventListener('click', () => {
    if (!state.viewer3d) return;
    state.viewer3d.exportGLTF(`packmockup-${state.editor.mockupId}.glb`);
    showToast('✓ 3D Model (.GLB) exported!');
  });

  // Drag & Drop Artwork onto 3D Canvas
  dom.viewer3dWrap?.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  dom.viewer3dWrap?.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => handleImageLoad(img, url);
    img.src = url;
  });
};

// ════════════════════════════════════════════════════════════
// DOM CONTENT LOADED
// ════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initDom();
  initEvents();
  renderSidebar();
  renderGallery();
  dom.filterAll.classList.add('active');
});
