// ─── PackMockup Photorealistic 3D Packaging Studio Viewer (Three.js) ───
// Supports 13 Packaging Models, PBR Finishes, Fold Animation, GLTF & 4K Export
'use strict';

class Viewer3D {
  constructor(container, options = {}) {
    this.container   = container;
    this.modelType   = options.modelType || 'tuck-box';
    this.dims        = options.dims || null;
    this.baseColor   = options.color || '#f5f5f5';
    this.finish      = options.finish || 'matte';
    this.foldProgress = options.foldProgress !== undefined ? options.foldProgress : 1.0;

    this._scene     = null;
    this._camera    = null;
    this._renderer  = null;
    this._controls  = null;
    this._modelObj  = null; // returned by Pack3DModels.createPackageModel
    this._animId    = null;
    this._resizeOb  = null;

    // Studio Environment & Materials
    this._envTexture = null;
    this._paperBumpMap = null;
    this._materials  = {};
    this._faceImages = {}; // key: faceName/idx -> HTMLCanvasElement / HTMLImageElement

    // Folding animation state
    this._foldAnim = null;

    this._init();
  }

  /* ─────────────────────────────────────────── INITIALIZATION ──── */

  _init() {
    const cw = this.container.clientWidth  || 500;
    const ch = this.container.clientHeight || 500;

    /* 1. Scene */
    this._scene = new THREE.Scene();

    /* 2. Camera */
    this._camera = new THREE.PerspectiveCamera(36, cw / ch, 0.1, 100);
    this._camera.position.set(2.2, 1.5, 4.4);

    /* 3. WebGL Renderer with High-End Color & Shadows */
    this._renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance'
    });
    this._renderer.setSize(cw, ch);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.outputEncoding = THREE.sRGBEncoding;
    this._renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this._renderer.toneMappingExposure = 1.15;

    const canvasEl = this._renderer.domElement;
    canvasEl.style.cssText = 'border-radius:16px;display:block;width:100%;height:100%;outline:none;';
    this.container.appendChild(canvasEl);

    /* 4. Procedural Studio Environment & Reflections */
    this._setupStudioEnvironment();

    /* 5. Studio Three-Point Lighting Setup */
    this._setupStudioLighting();

    /* 6. Soft Contact Shadow Plane */
    this._setupShadowFloor();

    /* 7. Build Model */
    this._loadCurrentModel();

    /* 8. OrbitControls */
    this._controls = new THREE.OrbitControls(this._camera, canvasEl);
    Object.assign(this._controls, {
      enableDamping: true,
      dampingFactor: 0.06,
      rotateSpeed: 0.7,
      minDistance: 1.5,
      maxDistance: 14.0,
      autoRotate: false,
      autoRotateSpeed: 2.0,
      target: new THREE.Vector3(0, 0, 0)
    });
    this._controls.update();

    canvasEl.addEventListener('pointerdown', () => {
      this._controls.autoRotate = false;
    });

    /* 9. Render Loop */
    this._loop();

    /* 10. Responsive Resizing */
    this._resizeOb = new ResizeObserver(() => this._onResize());
    this._resizeOb.observe(this.container);
  }

  /* ─────────────────────────────────────────── STUDIO LIGHTING & ENV ──── */

  _setupStudioEnvironment() {
    try {
      const pmrem = new THREE.PMREMGenerator(this._renderer);
      pmrem.compileEquirectangularShader();

      // Create a 1024x512 procedural studio map (soft overhead panels, side rim reflectors)
      const cv = document.createElement('canvas');
      cv.width = 1024;
      cv.height = 512;
      const ctx = cv.getContext('2d');

      // Studio background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 512);
      bgGrad.addColorStop(0, '#2d3139');
      bgGrad.addColorStop(0.5, '#1e2126');
      bgGrad.addColorStop(1, '#0e1013');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1024, 512);

      // Overhead large softbox (pure white high key)
      const topGrad = ctx.createRadialGradient(512, 100, 10, 512, 100, 320);
      topGrad.addColorStop(0, '#ffffff');
      topGrad.addColorStop(0.5, '#cbd5e1');
      topGrad.addColorStop(1, 'rgba(30,33,38,0)');
      ctx.fillStyle = topGrad;
      ctx.beginPath();
      ctx.arc(512, 100, 320, 0, Math.PI * 2);
      ctx.fill();

      // Left fill light strip
      const leftGrad = ctx.createLinearGradient(80, 0, 220, 0);
      leftGrad.addColorStop(0, 'rgba(255,255,255,0)');
      leftGrad.addColorStop(0.5, 'rgba(240,245,255,0.7)');
      leftGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = leftGrad;
      ctx.fillRect(80, 140, 140, 280);

      // Right warm kicker strip
      const rightGrad = ctx.createLinearGradient(800, 0, 940, 0);
      rightGrad.addColorStop(0, 'rgba(255,255,255,0)');
      rightGrad.addColorStop(0.5, 'rgba(255,250,240,0.6)');
      rightGrad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rightGrad;
      ctx.fillRect(800, 140, 140, 280);

      const tex = new THREE.CanvasTexture(cv);
      this._envTexture = pmrem.fromEquirectangular(tex).texture;
      this._scene.environment = this._envTexture;
      tex.dispose();
      pmrem.dispose();
    } catch (e) {
      console.warn('Procedural envMap not generated:', e);
    }
  }

  _setupStudioLighting() {
    // Ambient light
    const amb = new THREE.AmbientLight(0xffffff, 1.4);
    this._scene.add(amb);

    // Key Light (Crisp directional light with soft 2048 shadow map)
    const key = new THREE.DirectionalLight(0xfffbf5, 2.4);
    key.position.set(5.5, 8.0, 6.0);
    key.castShadow = true;
    key.shadow.mapSize.width = 2048;
    key.shadow.mapSize.height = 2048;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.bias = -0.0008;
    key.shadow.radius = 2.5; // soft shadow blur
    this._scene.add(key);

    // Fill Light (Cool, diffuse)
    const fill = new THREE.DirectionalLight(0xe8f0fe, 1.2);
    fill.position.set(-5.5, 3.5, -4.0);
    this._scene.add(fill);

    // Rim / Edge Light (Separation from background)
    const rim = new THREE.DirectionalLight(0xffffff, 0.9);
    rim.position.set(0, -4.0, 5.0);
    this._scene.add(rim);
  }

  _setupShadowFloor() {
    const floorGeo = new THREE.PlaneGeometry(35, 35);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.22, transparent: true });
    this._shadowFloor = new THREE.Mesh(floorGeo, floorMat);
    this._shadowFloor.rotation.x = -Math.PI / 2;
    this._shadowFloor.position.y = -1.5;
    this._shadowFloor.receiveShadow = true;
    this._scene.add(this._shadowFloor);
  }

  /* ─────────────────────────────────────────── PROCEDURAL BUMP MAP ──── */

  _getPaperBumpMap() {
    if (this._paperBumpMap) return this._paperBumpMap;
    const size = 512;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const imgData = ctx.createImageData(size, size);

    // Subtle natural fiber noise
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 45 + (Math.random() - 0.5) * 20;
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    this._paperBumpMap = tex;
    return tex;
  }

  /* ─────────────────────────────────────────── MATERIAL FINISHES ──── */

  _createMaterial(finishType = this.finish, colorHex = this.baseColor) {
    const bump = this._getPaperBumpMap();
    let mat;

    switch (finishType) {
      case 'glossy':
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(colorHex),
          roughness: 0.12,
          metalness: 0.05,
          clearcoat: 1.0,
          clearcoatRoughness: 0.08,
          envMapIntensity: 1.3
        });
        break;

      case 'kraft':
        mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorHex === '#f5f5f5' ? '#c8a97c' : colorHex),
          roughness: 0.95,
          metalness: 0.0,
          bumpMap: bump,
          bumpScale: 0.005,
          envMapIntensity: 0.4
        });
        break;

      case 'gold-foil':
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#d4af37'),
          roughness: 0.18,
          metalness: 0.92,
          clearcoat: 0.4,
          clearcoatRoughness: 0.1,
          envMapIntensity: 2.0
        });
        break;

      case 'silver-foil':
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#e0e4e8'),
          roughness: 0.15,
          metalness: 0.98,
          clearcoat: 0.5,
          envMapIntensity: 2.2
        });
        break;

      case 'rose-gold':
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color('#b5767a'),
          roughness: 0.18,
          metalness: 0.94,
          clearcoat: 0.4,
          envMapIntensity: 2.0
        });
        break;

      case 'soft-touch':
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(colorHex),
          roughness: 0.75,
          metalness: 0.0,
          sheen: 1.0,
          sheenRoughness: 0.4,
          sheenColor: new THREE.Color(0xffffff),
          bumpMap: bump,
          bumpScale: 0.002
        });
        break;

      case 'frosted-glass':
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(colorHex),
          roughness: 0.25,
          transmission: 0.65,
          thickness: 0.6,
          ior: 1.45,
          clearcoat: 0.9
        });
        break;

      case 'matte':
      default:
        mat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(colorHex),
          roughness: 0.85,
          metalness: 0.0,
          bumpMap: bump,
          bumpScale: 0.002,
          envMapIntensity: 0.6
        });
        break;
    }

    return mat;
  }

  /* ─────────────────────────────────────────── MODEL LOADING ──── */

  _loadCurrentModel() {
    if (this._modelObj && this._modelObj.root) {
      this._scene.remove(this._modelObj.root);
    }

    const mats = {
      main: this._createMaterial(this.finish, this.baseColor),
      inner: new THREE.MeshStandardMaterial({
        color: this.finish === 'kraft' ? 0xb08f64 : 0xe4dcce,
        roughness: 0.95
      }),
      faces: {}
    };

    // Reapply existing face images if any
    Object.keys(this._faceImages).forEach(faceKey => {
      const img = this._faceImages[faceKey];
      if (img) {
        const fMat = this._createMaterial(this.finish, this.baseColor);
        fMat.map = this._makeTexture(img);
        fMat.needsUpdate = true;
        mats.faces[faceKey] = fMat;
      }
    });

    if (window.Pack3DModels) {
      this._modelObj = window.Pack3DModels.createPackageModel(this.modelType, this.dims, mats);
      this._scene.add(this._modelObj.root);

      // Adjust shadow floor height based on model bounding box
      const box = new THREE.Box3().setFromObject(this._modelObj.root);
      const minY = box.min.y;
      if (this._shadowFloor) {
        this._shadowFloor.position.y = isFinite(minY) ? minY - 0.01 : -1.5;
      }

      // Apply initial fold
      if (typeof this._modelObj.setFold === 'function') {
        this._modelObj.setFold(this.foldProgress);
      }
    }
  }

  /* ─────────────────────────────────────────── TEXTURE HANDLING ──── */

  _makeTexture(source) {
    const tex = new THREE.CanvasTexture(source);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = Math.min(this._renderer.capabilities.getMaxAnisotropy(), 8);
    tex.generateMipmaps = true;
    return tex;
  }

  /**
   * Apply texture to a face or label body
   * @param {string|number} faceId - 'front', 'back', 'top', 0, 1, etc.
   * @param {HTMLImageElement|HTMLCanvasElement|null} imgOrCanvas
   */
  setFaceImage(faceId, imgOrCanvas) {
    const key = String(faceId);
    this._faceImages[key] = imgOrCanvas;

    // If model has direct panel access
    if (this._modelObj) {
      const faceNameMap = {
        '0': 'right', '1': 'left', '2': 'top', '3': 'bottom', '4': 'front', '5': 'back'
      };
      const name = faceNameMap[key] || key;

      // Check panels
      if (this._modelObj.panels) {
        const panelKey = `${name}Panel`;
        const panel = this._modelObj.panels[panelKey] || this._modelObj.panels[name];
        if (panel && panel.userData && panel.userData.outerMesh) {
          const mesh = panel.userData.outerMesh;
          if (imgOrCanvas) {
            mesh.material = this._createMaterial(this.finish, '#ffffff');
            mesh.material.map = this._makeTexture(imgOrCanvas);
          } else {
            mesh.material = this._createMaterial(this.finish, this.baseColor);
          }
          mesh.material.needsUpdate = true;
          return;
        }
      }

      // Check cylindrical parts (soda-can, paper-cup, cosmetic-jar, spray-bottle, pouch)
      if (this._modelObj.parts) {
        const targetPart = this._modelObj.parts.bodyMesh || this._modelObj.parts.cupMesh || this._modelObj.parts.jarMesh || this._modelObj.parts.pouchMesh;
        if (targetPart) {
          if (imgOrCanvas) {
            targetPart.material = this._createMaterial(this.finish, '#ffffff');
            targetPart.material.map = this._makeTexture(imgOrCanvas);
          } else {
            targetPart.material = this._createMaterial(this.finish, this.baseColor);
          }
          targetPart.material.needsUpdate = true;
          return;
        }
      }
    }

    // Fallback: reload model with updated mats
    this._loadCurrentModel();
  }

  getFaceImage(faceId) {
    return this._faceImages[String(faceId)] || null;
  }

  hasAnyImage() {
    return Object.values(this._faceImages).some(Boolean);
  }

  clearAllImages() {
    this._faceImages = {};
    this._loadCurrentModel();
  }

  /* ─────────────────────────────────────────── PUBLIC API ──── */

  setModelType(modelType, dims = null) {
    this.modelType = modelType;
    if (dims) this.dims = dims;
    this._loadCurrentModel();
  }

  setColor(hex) {
    this.baseColor = hex;
    this._loadCurrentModel();
  }

  setFinish(finishName) {
    this.finish = finishName;
    this._loadCurrentModel();
  }

  setDims(dims) {
    this.dims = dims;
    this._loadCurrentModel();
  }

  /* ── Interactive Folding ── */

  setFoldProgress(progress) {
    this.foldProgress = Math.max(0, Math.min(1, progress));
    if (this._modelObj && typeof this._modelObj.setFold === 'function') {
      this._modelObj.setFold(this.foldProgress);
    }
  }

  getFoldProgress() {
    return this.foldProgress;
  }

  animateFold(target = (this.foldProgress > 0.5 ? 0.0 : 1.0), durationMs = 900, onUpdate = null) {
    if (this._foldAnim) cancelAnimationFrame(this._foldAnim);
    const start = this.foldProgress;
    const diff = target - start;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const p = Math.min(elapsed / durationMs, 1.0);
      // Smooth cubic in-out ease
      const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const current = start + diff * ease;
      this.setFoldProgress(current);

      if (typeof onUpdate === 'function') onUpdate(current);

      if (p < 1.0) {
        this._foldAnim = requestAnimationFrame(step);
      } else {
        this._foldAnim = null;
      }
    };

    this._foldAnim = requestAnimationFrame(step);
  }

  /* ── Camera Presets ── */

  setCameraPreset(presetName = 'hero') {
    const presets = {
      hero:      [2.2, 1.5, 4.4],
      front:     [0.0, 0.0, 4.8],
      side:      [4.8, 0.2, 0.0],
      top:       [0.0, 5.2, 0.1],
      isometric: [3.4, 3.4, 3.4],
      unfolded:  [0.0, 6.2, 0.01]
    };
    const target = presets[presetName] || presets.hero;
    this._animCamera(target, 600);
  }

  _animCamera(targetPos, ms = 600) {
    const s = this._camera.position.clone();
    const e = new THREE.Vector3(...targetPos);
    const t0 = performance.now();
    const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const step = (now) => {
      const p = Math.min((now - t0) / ms, 1);
      this._camera.position.lerpVectors(s, e, ease(p));
      this._camera.lookAt(0, 0, 0);
      this._controls.target.set(0, 0, 0);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  toggleAutoRotate() {
    this._controls.autoRotate = !this._controls.autoRotate;
    return this._controls.autoRotate;
  }

  isAutoRotating() {
    return this._controls.autoRotate;
  }

  resetView() {
    this.setCameraPreset('hero');
  }

  setBackground(color) {
    if (color === 'transparent') {
      this._renderer.setClearColor(0x000000, 0);
    } else {
      this._renderer.setClearColor(new THREE.Color(color), 1);
    }
  }

  /* ── High-Res PNG Export ── */

  exportPNG(resolution = 3000, transparent = false) {
    const origW = this.container.clientWidth;
    const origH = this.container.clientHeight;
    const origClearColor = this._renderer.getClearColor(new THREE.Color());
    const origClearAlpha = this._renderer.getClearAlpha();

    if (transparent) {
      this._renderer.setClearColor(0x000000, 0);
    }

    this._renderer.setSize(resolution, resolution);
    this._camera.aspect = 1;
    this._camera.updateProjectionMatrix();
    this._renderer.render(this._scene, this._camera);

    const dataUrl = this._renderer.domElement.toDataURL('image/png', 1.0);

    // Restore
    this._renderer.setClearColor(origClearColor, origClearAlpha);
    this._renderer.setSize(origW, origH);
    this._camera.aspect = origW / origH;
    this._camera.updateProjectionMatrix();

    return dataUrl;
  }

  /* ── 3D Model GLTF / GLB Export ── */

  exportGLTF(filename = `packmockup-${this.modelType}.glb`) {
    if (!THREE.GLTFExporter) {
      console.error('THREE.GLTFExporter is not loaded');
      return;
    }

    const exporter = new THREE.GLTFExporter();
    const exportRoot = this._modelObj ? this._modelObj.root : this._scene;

    exporter.parse(
      exportRoot,
      (gltf) => {
        let blob;
        if (gltf instanceof ArrayBuffer) {
          blob = new Blob([gltf], { type: 'application/octet-stream' });
        } else {
          const str = JSON.stringify(gltf, null, 2);
          blob = new Blob([str], { type: 'application/json' });
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      },
      { binary: true, embedImages: true }
    );
  }

  /* ─────────────────────────────────────────── LIFECYCLE ──── */

  _loop() {
    this._animId = requestAnimationFrame(() => this._loop());
    this._controls.update();
    this._renderer.render(this._scene, this._camera);
  }

  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w < 1 || h < 1) return;
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(w, h);
  }

  dispose() {
    cancelAnimationFrame(this._animId);
    if (this._foldAnim) cancelAnimationFrame(this._foldAnim);
    this._resizeOb?.disconnect();
    this._renderer.dispose();
    this._controls.dispose();
    this._renderer.domElement.parentNode?.removeChild(this._renderer.domElement);
  }
}

window.Viewer3D = Viewer3D;
