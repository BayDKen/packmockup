// ─── PackMockup Application Logic ────────────────────────────
'use strict';

// ════════════════════════════════════════════════════════════
// CONFIG — which mockups get real 3D viewer
// ════════════════════════════════════════════════════════════

const BOX_3D_IDS = new Set(['tuck-box', 'mailer-box', 'square-box']);

const BOX_3D_DIMS = {
  'tuck-box':   { w: 1.7, h: 2.55, d: 1.1  },
  'mailer-box': { w: 2.3, h: 1.50, d: 1.65 },
  'square-box': { w: 2.0, h: 2.00, d: 2.0  },
};

// Three.js face order for BoxGeometry:
// 0=+X Right, 1=-X Left, 2=+Y Top, 3=-Y Bottom, 4=+Z Front, 5=-Z Back
const FACE_CONFIG = [
  { idx: 4, name: 'Front',  icon: '⬛', gridArea: 'front'  },
  { idx: 5, name: 'Back',   icon: '⬜', gridArea: 'back'   },
  { idx: 1, name: 'Left',   icon: '◀',  gridArea: 'left'   },
  { idx: 0, name: 'Right',  icon: '▶',  gridArea: 'right'  },
  { idx: 2, name: 'Top',    icon: '▲',  gridArea: 'top'    },
  { idx: 3, name: 'Bottom', icon: '▼',  gridArea: 'bottom' },
];

// ════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════

const state = {
  activeCat:   'all',
  searchQuery: '',
  filterMode:  'all',

  editor: {
    open:       false,
    mockupId:   null,
    is3D:       false,
    color:      '#f2f2f2',
    activeFace: 4,        // 3D mode: which face the next upload goes to
    imgEl:      null,     // 2D mode image
    scale:      1.0,
    ox:         0,
    oy:         0,
    rotation:   0,
    opacity:    1.0,
    background: '#ffffff',
    resolution: 2000,
  },

  viewer3d: null,         // Viewer3D instance (or null)
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

    ctrlBack:         $('ctrl-back'),
    ctrlTitle:        $('ctrl-title'),
    ctrlCategory:     $('ctrl-category'),
    badge3d:          $('badge-3d'),
    variantsGrid:     $('variants-grid'),

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
    adjustmentsSec:   $('adjustments-section'),
    view3dSec:        $('view3d-section'),

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

    bgWhite:          $('bg-white'),
    bgLight:          $('bg-light'),
    bgDark:           $('bg-dark'),
    bgCustom:         $('bg-custom'),
    bgColorInput:     $('bg-color-input'),
    resolutionSel:    $('resolution-sel'),
    exportBtn:        $('export-btn'),

    previewCanvas:    $('preview-canvas'),
    viewer3dWrap:     $('viewer3d-wrap'),
    canvasBadgeId:    $('canvas-mockup-id'),
    canvasHint:       $('canvas-hint'),
    toast:            $('toast'),
  };
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

    const is3D = BOX_3D_IDS.has(mockup.id);
    const dots = mockup.variants.slice(0, 6).map(v =>
      `<span class="color-dot" style="background:${v.color}" title="${v.name}"></span>`
    ).join('');
    const badge = mockup.popular ? '<span class="card-badge popular">Popular</span>'
                : mockup.new     ? '<span class="card-badge new">New</span>'
                : is3D           ? '<span class="card-badge is3d">3D</span>' : '';

    card.innerHTML = `
      <div class="card-thumb">
        <canvas id="thumb-${mockup.id}" width="300" height="300"></canvas>
        ${badge}
        <div class="card-hover-overlay">
          <div class="card-hover-btn">${is3D ? '⬡ Open in 3D' : '✦ Customize Free'}</div>
        </div>
      </div>
      <div class="card-info">
        <div class="card-name">${mockup.name}</div>
        <div class="card-variants">${dots}</div>
      </div>`;

    card.addEventListener('click', () => openEditor(mockup.id));
    dom.mockupGrid.appendChild(card);

    setTimeout(() => {
      const cv = $(`thumb-${mockup.id}`);
      if (cv) renderMockup(cv, mockup.render, { color: mockup.variants[0]?.color || '#f2f2f2', background: '#f7f7fb' });
    }, idx * 20 + 50);
  });
};

// ════════════════════════════════════════════════════════════
// EDITOR — OPEN / CLOSE
// ════════════════════════════════════════════════════════════

const openEditor = (mockupId) => {
  const mockup = MOCKUPS_DATA.find(m => m.id === mockupId);
  if (!mockup) return;

  const is3D = BOX_3D_IDS.has(mockupId);

  // Reset state
  Object.assign(state.editor, {
    open: true,
    mockupId,
    is3D,
    color:      mockup.variants[0]?.color || '#f2f2f2',
    activeFace: 4,
    imgEl:      null,
    scale:      1.0,
    ox:         0,
    oy:         0,
    rotation:   0,
    opacity:    1.0,
    background: '#ffffff',
  });

  // Labels
  dom.ctrlTitle.textContent    = mockup.name;
  dom.ctrlCategory.textContent = mockup.category;
  dom.canvasBadgeId.textContent = mockup.name;
  dom.badge3d.style.display    = is3D ? '' : 'none';

  // Show/hide 3D vs 2D panels
  dom.faceSelectorSec.style.display  = is3D ? '' : 'none';
  dom.view3dSec.style.display        = is3D ? '' : 'none';
  dom.adjustmentsSec.style.display   = is3D ? 'none' : '';
  dom.canvasHint.textContent         = is3D ? ' · Click face button to select face' : ' · Drag image here to upload';

  if (is3D) {
    dom.uploadLabel.textContent = 'Upload Design for Selected Face';
    dom.uploadHint.textContent  = 'PNG, JPG, SVG';
  } else {
    dom.uploadLabel.textContent = 'Your Design';
    dom.uploadHint.textContent  = 'PNG, JPG, SVG · Drag onto preview';
  }

  // Color variants
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
      if (state.editor.is3D && state.viewer3d) {
        state.viewer3d.setColor(v.color);
      } else {
        redrawPreview();
      }
    });
    dom.variantsGrid.appendChild(btn);
  });

  // Sliders
  dom.sliderScale.value   = 100;
  dom.sliderOx.value      = 0;
  dom.sliderOy.value      = 0;
  dom.sliderRot.value     = 0;
  dom.sliderOpacity.value = 100;
  updateSliderValues();

  // Reset upload area
  dom.uploadedPreview.classList.remove('has-image');
  dom.uploadedImg.src = '';

  // Reset bg buttons
  document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
  dom.bgWhite.classList.add('active');

  // Show editor
  dom.galleryPage.style.display = 'none';
  dom.editorPage.classList.add('open');

  // 3D or 2D canvas
  if (is3D) {
    dom.previewCanvas.style.display = 'none';
    dom.viewer3dWrap.style.display  = '';
    initViewer3D(mockupId);
    buildFaceGrid();
  } else {
    dom.previewCanvas.style.display = '';
    dom.viewer3dWrap.style.display  = 'none';
    disposeViewer3D();
    dom.previewCanvas.width  = 600;
    dom.previewCanvas.height = 600;
    redrawPreview();
  }
};

const closeEditor = () => {
  state.editor.open = false;
  dom.editorPage.classList.remove('open');
  dom.galleryPage.style.display = '';
  disposeViewer3D();
};

// ════════════════════════════════════════════════════════════
// VIEWER 3D — lifecycle
// ════════════════════════════════════════════════════════════

const initViewer3D = (mockupId) => {
  disposeViewer3D();
  const dims = BOX_3D_DIMS[mockupId] || { w: 1.8, h: 2.5, d: 1.1 };
  state.viewer3d = new Viewer3D(dom.viewer3dWrap, {
    color: state.editor.color,
    dims,
  });

  // Set background to match current bg state
  state.viewer3d.setBackground(state.editor.background);

  // Auto-rotate button sync
  refreshAutoRotateBtn();
};

const disposeViewer3D = () => {
  if (state.viewer3d) {
    state.viewer3d.dispose();
    state.viewer3d = null;
  }
};

// ════════════════════════════════════════════════════════════
// FACE GRID (3D mode)
// ════════════════════════════════════════════════════════════

const buildFaceGrid = () => {
  if (!dom.faceGrid) return;
  dom.faceGrid.innerHTML = '';
  FACE_CONFIG.forEach(fc => {
    const btn = document.createElement('button');
    btn.className = 'face-btn' + (fc.idx === 4 ? ' active' : '');
    btn.dataset.face = fc.idx;
    btn.id = `face-btn-${fc.idx}`;
    btn.innerHTML = `
      <span class="face-btn-label">${fc.icon} ${fc.name}</span>
      <span class="face-dot" id="face-dot-${fc.idx}" style="display:none"></span>
    `;
    btn.title = `Click to select ${fc.name} face, then upload an image`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.face-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.editor.activeFace = fc.idx;
      if (state.viewer3d) state.viewer3d.viewFace(fc.idx);
    });
    dom.faceGrid.appendChild(btn);
  });
};

const refreshFaceDots = () => {
  if (!state.viewer3d) return;
  for (let i = 0; i < 6; i++) {
    const dot = $(`face-dot-${i}`);
    if (dot) dot.style.display = state.viewer3d.getFaceImage(i) ? '' : 'none';
  }
};

// ════════════════════════════════════════════════════════════
// 2D PREVIEW
// ════════════════════════════════════════════════════════════

const getImgOpts = () => ({
  scale:    parseFloat(dom.sliderScale.value) / 100,
  ox:       parseFloat(dom.sliderOx.value) * 2,
  oy:       parseFloat(dom.sliderOy.value) * 2,
  rotation: parseFloat(dom.sliderRot.value),
  opacity:  parseFloat(dom.sliderOpacity.value) / 100,
});

const redrawPreview = () => {
  if (!state.editor.open || state.editor.is3D) return;
  const { mockupId, color, imgEl, background } = state.editor;
  renderMockup(dom.previewCanvas, mockupId, { color, img: imgEl, imgOpts: getImgOpts(), background });
};

const updateSliderValues = () => {
  dom.valScale.textContent   = `${dom.sliderScale.value}%`;
  dom.valOx.textContent      = dom.sliderOx.value;
  dom.valOy.textContent      = dom.sliderOy.value;
  dom.valRot.textContent     = `${dom.sliderRot.value}°`;
  dom.valOpacity.textContent = `${dom.sliderOpacity.value}%`;
};

// ════════════════════════════════════════════════════════════
// AUTO-ROTATE BUTTON SYNC
// ════════════════════════════════════════════════════════════

const refreshAutoRotateBtn = () => {
  const btn = $('btn-auto-rotate');
  if (!btn) return;
  const on = state.viewer3d?.isAutoRotating() ?? true;
  btn.classList.toggle('active', on);
};

// ════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════

const exportImage = () => {
  const res = parseInt(dom.resolutionSel.value);
  const { mockupId, is3D, color, imgEl, background } = state.editor;

  if (is3D && state.viewer3d) {
    state.viewer3d.setBackground(background === '#ffffff' ? '#ffffff' : background);
    const dataURL = state.viewer3d.exportPNG(res);
    const link    = document.createElement('a');
    const mockup  = MOCKUPS_DATA.find(m => m.id === mockupId);
    link.download = `${mockup?.name?.replace(/\s+/g, '-').toLowerCase() || 'mockup'}-3d-${res}px.png`;
    link.href     = dataURL;
    link.click();
    showToast('✓ 3D mockup exported — no watermark!', 'success');
    return;
  }

  // 2D export
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportCanvas.height = res;
  const factor = res / dom.previewCanvas.width;
  const rawOpts = getImgOpts();
  renderMockup(exportCanvas, mockupId, {
    color,
    img:     imgEl,
    imgOpts: { ...rawOpts, ox: rawOpts.ox * factor, oy: rawOpts.oy * factor },
    background,
  });
  const link = document.createElement('a');
  const mockup = MOCKUPS_DATA.find(m => m.id === mockupId);
  link.download = `${mockup?.name?.replace(/\s+/g, '-').toLowerCase() || 'mockup'}-${res}px.png`;
  link.href     = exportCanvas.toDataURL('image/png', 1.0);
  link.click();
  showToast('✓ Image exported successfully!', 'success');
};

// ════════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════════

let toastTimer;
const showToast = (msg, type = '') => {
  dom.toast.textContent = msg;
  dom.toast.className   = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 3000);
};

// ════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ════════════════════════════════════════════════════════════

const handleImageLoad = (imgEl, url) => {
  const { is3D, activeFace } = state.editor;

  if (is3D && state.viewer3d) {
    state.viewer3d.setFaceImage(activeFace, imgEl);
    refreshFaceDots();
    // Show "change" label in upload button
    dom.uploadedImg.src = url;
    dom.uploadedPreview.classList.add('has-image');
    showToast(`✓ Design applied to ${FACE_CONFIG.find(f=>f.idx===activeFace)?.name || 'face'}`, 'success');
  } else {
    state.editor.imgEl = imgEl;
    dom.uploadedImg.src = url;
    dom.uploadedPreview.classList.add('has-image');
    redrawPreview();
  }
};

const initEvents = () => {
  // Search
  dom.searchInput.addEventListener('input', () => {
    state.searchQuery = dom.searchInput.value.trim();
    renderGallery();
  });

  // Filter chips
  const setFilter = mode => {
    state.filterMode = mode;
    [dom.filterAll, dom.filterPopular, dom.filterNew].forEach(b => b.classList.remove('active'));
    $(`filter-${mode}`)?.classList.add('active');
    renderGallery();
  };
  dom.filterAll.addEventListener('click',     () => setFilter('all'));
  dom.filterPopular.addEventListener('click', () => setFilter('popular'));
  dom.filterNew.addEventListener('click',     () => setFilter('new'));

  // Back
  dom.ctrlBack.addEventListener('click', closeEditor);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.editor.open) closeEditor(); });

  // File upload
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

  // Remove uploaded image
  dom.uploadedRemove.addEventListener('click', () => {
    if (state.editor.is3D && state.viewer3d) {
      state.viewer3d.setFaceImage(state.editor.activeFace, null);
      refreshFaceDots();
      // Only hide preview if ALL faces cleared
      if (!state.viewer3d.hasAnyImage()) {
        dom.uploadedPreview.classList.remove('has-image');
        dom.uploadedImg.src = '';
      }
    } else {
      state.editor.imgEl = null;
      dom.uploadedPreview.classList.remove('has-image');
      dom.uploadedImg.src = '';
      redrawPreview();
    }
  });

  // 2D sliders
  [dom.sliderScale, dom.sliderOx, dom.sliderOy, dom.sliderRot, dom.sliderOpacity].forEach(s => {
    s.addEventListener('input', () => { updateSliderValues(); redrawPreview(); });
  });

  // Background
  const bgMap = { 'bg-white': '#ffffff', 'bg-light': '#f5f5f5', 'bg-dark': '#1a1a1a' };
  [dom.bgWhite, dom.bgLight, dom.bgDark].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.editor.background = bgMap[btn.id] || '#ffffff';
      if (state.editor.is3D && state.viewer3d) {
        state.viewer3d.setBackground(state.editor.background);
      } else {
        redrawPreview();
      }
    });
  });

  dom.bgCustom?.addEventListener('click', () => dom.bgColorInput.click());
  dom.bgColorInput?.addEventListener('input', e => {
    document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('active'));
    dom.bgCustom?.classList.add('active');
    state.editor.background = e.target.value;
    if (state.editor.is3D && state.viewer3d) {
      state.viewer3d.setBackground(e.target.value);
    } else {
      redrawPreview();
    }
  });

  // 3D Controls
  $('btn-auto-rotate')?.addEventListener('click', () => {
    if (!state.viewer3d) return;
    state.viewer3d.toggleAutoRotate();
    refreshAutoRotateBtn();
  });
  $('btn-reset-view')?.addEventListener('click', () => {
    if (!state.viewer3d) return;
    state.viewer3d.resetView();
    setTimeout(refreshAutoRotateBtn, 100);
  });

  // Export
  dom.exportBtn.addEventListener('click', exportImage);

  // Drag-drop onto 2D canvas
  dom.previewCanvas.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  dom.previewCanvas.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => handleImageLoad(img, url);
    img.src = url;
  });

  // Drag-drop onto 3D canvas
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
// INIT
// ════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initDom();
  initEvents();
  renderSidebar();
  renderGallery();
  dom.filterAll.classList.add('active');
});
