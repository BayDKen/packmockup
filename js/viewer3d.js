// ─── PackMockup 3D Box Viewer (Three.js) ─────────────────────
'use strict';

// Three.js BoxGeometry face index convention:
//  0 = +X  (Right)
//  1 = -X  (Left)
//  2 = +Y  (Top)
//  3 = -Y  (Bottom)
//  4 = +Z  (Front — faces viewer at default angle)
//  5 = -Z  (Back)

class Viewer3D {
  constructor(container, options = {}) {
    this.container  = container;
    this.baseColor  = options.color || '#f2f2f2';
    this.boxDims    = options.dims  || { w: 1.8, h: 2.5, d: 1.1 };
    this.activeFace = 4;

    this._scene    = null;
    this._camera   = null;
    this._renderer = null;
    this._controls = null;
    this._boxMesh  = null;
    this._materials = [];
    this._faceImages = Array(6).fill(null); // HTMLImageElement per face
    this._animId   = null;
    this._resizeOb = null;

    this._init();
  }

  /* ─────────────────────────────────────────── private ──── */

  _init() {
    const cw = this.container.clientWidth  || 500;
    const ch = this.container.clientHeight || 500;

    /* Scene */
    this._scene = new THREE.Scene();

    /* Camera */
    this._camera = new THREE.PerspectiveCamera(38, cw / ch, 0.1, 100);
    this._camera.position.set(1.8, 1.2, 4.2);

    /* Renderer */
    this._renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this._renderer.setSize(cw, ch);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._renderer.outputEncoding = THREE.sRGBEncoding;

    const el = this._renderer.domElement;
    el.style.cssText = 'border-radius:20px;display:block;width:100%;height:100%;';
    this.container.appendChild(el);

    /* Lights */
    this._scene.add(new THREE.AmbientLight(0xffffff, 1.8));

    const key = new THREE.DirectionalLight(0xffffff, 2.8);
    key.position.set(5, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { near:0.5, far:50, left:-6, right:6, top:6, bottom:-6 });
    key.shadow.bias = -0.001;
    this._scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 1.0);
    fill.position.set(-4, 2, -4);
    this._scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.5);
    rim.position.set(0, -5, 3);
    this._scene.add(rim);

    /* Ground shadow */
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ opacity: 0.20, transparent: true })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -(this.boxDims.h / 2) - 0.02;
    shadowPlane.receiveShadow = true;
    this._scene.add(shadowPlane);

    /* Box mesh */
    this._buildBox();

    /* OrbitControls */
    this._controls = new THREE.OrbitControls(this._camera, el);
    Object.assign(this._controls, {
      enableDamping: true,
      dampingFactor: 0.07,
      rotateSpeed: 0.65,
      minDistance: 2.0,
      maxDistance: 10.0,
      autoRotate: true,
      autoRotateSpeed: 2.5,
    });
    this._controls.target.set(0, 0, 0);
    this._controls.update();

    /* Stop auto-rotate when user grabs box */
    el.addEventListener('pointerdown', () => {
      this._controls.autoRotate = false;
    });

    /* Render loop */
    this._loop();

    /* Responsive resize */
    this._resizeOb = new ResizeObserver(() => this._onResize());
    this._resizeOb.observe(this.container);
  }

  _buildBox() {
    const { w, h, d } = this.boxDims;
    const geo = new THREE.BoxGeometry(w, h, d);

    this._materials = Array.from({ length: 6 }, (_, i) => this._makeMat(i));
    this._boxMesh = new THREE.Mesh(geo, this._materials);
    this._boxMesh.castShadow = true;
    this._boxMesh.receiveShadow = true;
    this._scene.add(this._boxMesh);

    /* Crisp edge lines */
    const edges = new THREE.EdgesGeometry(geo);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.06 });
    this._boxMesh.add(new THREE.LineSegments(edges, edgeMat));
  }

  _makeMat(faceIdx) {
    const img = this._faceImages[faceIdx];
    
    // Create material with procedural paper-like bumps
    const mat = new THREE.MeshStandardMaterial({
      color: img ? 0xffffff : new THREE.Color(this.baseColor),
      roughness: 0.85,  // Paper is rough, not shiny
      metalness: 0.0,   // Paper is not metallic
      bumpMap: this._getPaperBumpMap(),
      bumpScale: 0.002  // Subtle fiber bumps
    });
    
    if (img) mat.map = this._makeTexture(img);
    return mat;
  }

  // Generate procedural noise canvas for paper texture
  _getPaperBumpMap() {
    if (Viewer3D._bumpMap) return Viewer3D._bumpMap; // Cache it
    
    const size = 512;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    
    for(let i = 0; i < imgData.data.length; i += 4) {
      // Create high-frequency noise for paper fibers
      const noise = (Math.random() * 255 + Math.random() * 255) / 2;
      imgData.data[i] = noise;
      imgData.data[i+1] = noise;
      imgData.data[i+2] = noise;
      imgData.data[i+3] = 255;
    }
    
    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    
    Viewer3D._bumpMap = tex;
    return tex;
  }

  _makeTexture(imgEl) {
    const SIZE = 1024;
    const cv = document.createElement('canvas');
    cv.width = cv.height = SIZE;
    const ctx = cv.getContext('2d');

    ctx.fillStyle = this.baseColor;
    ctx.fillRect(0, 0, SIZE, SIZE);

    const iw = imgEl.naturalWidth  || imgEl.width  || 1;
    const ih = imgEl.naturalHeight || imgEl.height || 1;
    const sc = Math.max(SIZE / iw, SIZE / ih);
    const sw = iw * sc, sh = ih * sc;
    ctx.drawImage(imgEl, (SIZE - sw) / 2, (SIZE - sh) / 2, sw, sh);

    const tex = new THREE.CanvasTexture(cv);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

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

  _animCamera(targetPos, ms = 600) {
    const s = this._camera.position.clone();
    const e = new THREE.Vector3(...targetPos);
    const t0 = performance.now();
    const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    const step = (now) => {
      const p = Math.min((now - t0) / ms, 1);
      this._camera.position.lerpVectors(s, e, ease(p));
      this._camera.lookAt(0, 0, 0);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ─────────────────────────────────────────── public API ── */

  /** Change base color (faces without image) */
  setColor(hex) {
    this.baseColor = hex;
    this._materials.forEach((mat, i) => {
      if (!this._faceImages[i]) {
        mat.color.set(new THREE.Color(hex));
        mat.needsUpdate = true;
      }
    });
  }

  /** Apply image to a face (0–5). Pass null to clear. */
  setFaceImage(faceIdx, imgEl) {
    this._faceImages[faceIdx] = imgEl;
    const mat = this._materials[faceIdx];
    if (imgEl) {
      mat.map?.dispose();
      mat.map = this._makeTexture(imgEl);
      mat.color.set(0xffffff);
    } else {
      mat.map?.dispose();
      mat.map = null;
      mat.color.set(new THREE.Color(this.baseColor));
    }
    mat.needsUpdate = true;
  }

  getFaceImage(faceIdx) { return this._faceImages[faceIdx]; }
  hasAnyImage()          { return this._faceImages.some(Boolean); }

  /** Animate camera to look head-on at a face */
  viewFace(faceIdx) {
    const d = Math.max(this.boxDims.w, this.boxDims.h, this.boxDims.d) * 1.85 + 1.6;
    const pos = [
      [d, 0.3, 0.2],   // 0 right
      [-d, 0.3, 0.2],  // 1 left
      [0.2, d, 0.4],   // 2 top
      [0.2, -d, 0.4],  // 3 bottom
      [0.2, 0.5, d],   // 4 front
      [0.2, 0.5, -d],  // 5 back
    ];
    this._animCamera(pos[faceIdx] || pos[4]);
    this._controls.autoRotate = false;
  }

  /** Reset to default isometric-ish view + auto-rotate */
  resetView() {
    this._animCamera([1.8, 1.2, 4.2], 500);
    this._controls.autoRotate = true;
  }

  /** Toggle auto-rotation. Returns new state (bool). */
  toggleAutoRotate() {
    this._controls.autoRotate = !this._controls.autoRotate;
    return this._controls.autoRotate;
  }

  isAutoRotating() { return this._controls.autoRotate; }

  /** Set canvas background */
  setBackground(color) {
    if (color === 'transparent') {
      this._renderer.setClearColor(0x000000, 0);
    } else {
      this._renderer.setClearColor(new THREE.Color(color), 1);
    }
  }

  /** Export current camera view as PNG data URL */
  exportPNG(resolution = 2000) {
    const origW = this.container.clientWidth;
    const origH = this.container.clientHeight;
    this._renderer.setSize(resolution, resolution);
    this._camera.aspect = 1;
    this._camera.updateProjectionMatrix();
    this._renderer.render(this._scene, this._camera);
    const url = this._renderer.domElement.toDataURL('image/png', 1.0);
    this._renderer.setSize(origW, origH);
    this._camera.aspect = origW / origH;
    this._camera.updateProjectionMatrix();
    return url;
  }

  /** Clean up all Three.js resources */
  dispose() {
    cancelAnimationFrame(this._animId);
    this._resizeOb?.disconnect();
    this._materials.forEach(m => { m.map?.dispose(); m.dispose(); });
    this._renderer.dispose();
    this._controls.dispose();
    this._renderer.domElement.parentNode?.removeChild(this._renderer.domElement);
  }
}
