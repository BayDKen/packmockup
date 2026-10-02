// ─── PackMockup 3D Procedural Packaging Models Engine ────────
// Photorealistic, parametric 3D models with interactive folding
'use strict';

(function(global) {

// ════════════════════════════════════════════════════════════
// HELPER UTILITIES FOR 3D MESH GENERATION
// ════════════════════════════════════════════════════════════

// Create double-sided panel mesh with separate outer (custom design) and inner (cardboard/kraft) materials
function createPanel(w, h, outerMat, innerMat) {
  const group = new THREE.Group();
  
  // Outer face (+Z)
  const outerGeo = new THREE.PlaneGeometry(w, h);
  const outerMesh = new THREE.Mesh(outerGeo, outerMat);
  outerMesh.castShadow = true;
  outerMesh.receiveShadow = true;
  group.add(outerMesh);
  
  // Inner face (-Z, flipped)
  const innerGeo = new THREE.PlaneGeometry(w, h);
  innerGeo.rotateY(Math.PI);
  const innerMesh = new THREE.Mesh(innerGeo, innerMat);
  innerMesh.position.z = -0.001; // slight offset to prevent Z-fighting
  innerMesh.castShadow = true;
  innerMesh.receiveShadow = true;
  group.add(innerMesh);
  
  group.userData = { outerMesh, innerMesh, w, h };
  return group;
}

// Create a pivot group whose rotation axis is at its origin (0,0,0)
function createPivot(x, y, z) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  return pivot;
}

// Helper to smooth interpolation
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const lerp = (a, b, t) => a + (b - a) * t;

// ════════════════════════════════════════════════════════════
// 1. TUCK END BOX (With full interactive 0-100% folding)
// ════════════════════════════════════════════════════════════

function createTuckBox(dims = { w: 1.8, h: 2.6, d: 1.1 }, mats = {}) {
  const root = new THREE.Group();
  const W = dims.w || 1.8;
  const H = dims.h || 2.6;
  const D = dims.d || 1.1;
  const flapH = Math.min(D * 0.45, 0.45);
  const dustW = Math.min(D * 0.7, 0.6);
  const dustH = Math.min(W * 0.28, 0.4);

  // Materials
  const outerMat = mats.main || new THREE.MeshPhysicalMaterial({ color: 0xf5f5f5, roughness: 0.85 });
  const innerMat = mats.inner || new THREE.MeshStandardMaterial({ color: 0xe6decb, roughness: 0.95 }); // kraft interior
  const faceMats = mats.faces || {};

  // Face materials helper
  const getMat = (faceName) => faceMats[faceName] || outerMat;

  // Root anchor is the FRONT panel, centered at Y=0, Z=0
  const frontPanel = createPanel(W, H, getMat('front'), innerMat);
  frontPanel.userData.outerMesh.position.set(0, 0, 0);
  root.add(frontPanel);

  // ── LEFT SIDE (hinges at Left edge of Front: x = -W/2)
  const pivotLeft = createPivot(-W / 2, 0, 0);
  const leftPanel = createPanel(D, H, getMat('left'), innerMat);
  leftPanel.position.set(-D / 2, 0, 0);
  pivotLeft.add(leftPanel);
  root.add(pivotLeft);

  // Left Top Dust Flap
  const pivotLeftTopDust = createPivot(-D / 2, H / 2, 0);
  const leftTopDust = createPanel(dustW, dustH, getMat('dust'), innerMat);
  leftTopDust.position.set(0, dustH / 2, 0);
  pivotLeftTopDust.add(leftTopDust);
  pivotLeft.add(pivotLeftTopDust);

  // Left Bottom Dust Flap
  const pivotLeftBotDust = createPivot(-D / 2, -H / 2, 0);
  const leftBotDust = createPanel(dustW, dustH, getMat('dust'), innerMat);
  leftBotDust.position.set(0, -dustH / 2, 0);
  pivotLeftBotDust.add(leftBotDust);
  pivotLeft.add(pivotLeftBotDust);

  // ── BACK PANEL (hinges at Left edge of Left side: x = -D)
  const pivotBack = createPivot(-D, 0, 0);
  const backPanel = createPanel(W, H, getMat('back'), innerMat);
  backPanel.position.set(-W / 2, 0, 0);
  pivotBack.add(backPanel);
  pivotLeft.add(pivotBack);

  // Glue Flap (hinges at Left edge of Back panel)
  const glueW = Math.min(0.3, D * 0.35);
  const pivotGlue = createPivot(-W, 0, 0);
  const gluePanel = createPanel(glueW, H * 0.96, innerMat, innerMat);
  gluePanel.position.set(-glueW / 2, 0, 0);
  pivotGlue.add(gluePanel);
  pivotBack.add(pivotGlue);

  // ── RIGHT SIDE (hinges at Right edge of Front: x = +W/2)
  const pivotRight = createPivot(W / 2, 0, 0);
  const rightPanel = createPanel(D, H, getMat('right'), innerMat);
  rightPanel.position.set(D / 2, 0, 0);
  pivotRight.add(rightPanel);
  root.add(pivotRight);

  // Right Top Dust Flap
  const pivotRightTopDust = createPivot(D / 2, H / 2, 0);
  const rightTopDust = createPanel(dustW, dustH, getMat('dust'), innerMat);
  rightTopDust.position.set(0, dustH / 2, 0);
  pivotRightTopDust.add(rightTopDust);
  pivotRight.add(pivotRightTopDust);

  // Right Bottom Dust Flap
  const pivotRightBotDust = createPivot(D / 2, -H / 2, 0);
  const rightBotDust = createPanel(dustW, dustH, getMat('dust'), innerMat);
  rightBotDust.position.set(0, -dustH / 2, 0);
  pivotRightBotDust.add(rightBotDust);
  pivotRight.add(pivotRightBotDust);

  // ── TOP LID (hinges at Top edge of Front panel: y = +H/2)
  const pivotTop = createPivot(0, H / 2, 0);
  const topPanel = createPanel(W, D, getMat('top'), innerMat);
  topPanel.position.set(0, D / 2, 0);
  pivotTop.add(topPanel);
  root.add(pivotTop);

  // Top Tuck Flap (hinges at far edge of Top Lid: y = +D)
  const pivotTopTuck = createPivot(0, D, 0);
  const topTuck = createPanel(W * 0.95, flapH, getMat('tuck'), innerMat);
  topTuck.position.set(0, flapH / 2, 0);
  pivotTopTuck.add(topTuck);
  pivotTop.add(pivotTopTuck);

  // ── BOTTOM LID (hinges at Bottom edge of Front panel: y = -H/2)
  const pivotBot = createPivot(0, -H / 2, 0);
  const botPanel = createPanel(W, D, getMat('bottom'), innerMat);
  botPanel.position.set(0, -D / 2, 0);
  pivotBot.add(botPanel);
  root.add(pivotBot);

  // Bottom Tuck Flap (hinges at far edge of Bottom Lid: y = -D)
  const pivotBotTuck = createPivot(0, -D, 0);
  const botTuck = createPanel(W * 0.95, flapH, getMat('tuck'), innerMat);
  botTuck.position.set(0, -flapH / 2, 0);
  pivotBotTuck.add(botTuck);
  pivotBot.add(pivotBotTuck);

  // Align whole box to sit nicely on the ground when folded
  root.position.y = 0;

  // Folding Controller function
  const setFold = (t) => {
    t = clamp(t, 0, 1);
    const rad90 = Math.PI / 2;

    // Side panels fold 90 deg backward
    pivotLeft.rotation.y = rad90 * t;
    pivotBack.rotation.y = rad90 * t;
    pivotGlue.rotation.y = rad90 * t;
    pivotRight.rotation.y = -rad90 * t;

    // Dust flaps fold inward first
    const dustT = clamp(t * 1.5, 0, 1);
    pivotLeftTopDust.rotation.x = -rad90 * dustT;
    pivotLeftBotDust.rotation.x = rad90 * dustT;
    pivotRightTopDust.rotation.x = -rad90 * dustT;
    pivotRightBotDust.rotation.x = rad90 * dustT;

    // Top & Bottom lids fold over
    const lidT = clamp((t - 0.2) * 1.35, 0, 1);
    pivotTop.rotation.x = -rad90 * lidT;
    pivotBot.rotation.x = rad90 * lidT;

    // Tuck flaps fold down into the box
    const tuckT = clamp((t - 0.5) * 2.0, 0, 1);
    pivotTopTuck.rotation.x = -rad90 * tuckT;
    pivotBotTuck.rotation.x = rad90 * tuckT;

    // Adjust global position so base stays planted
    root.position.z = lerp(0, -D / 2, t);
  };

  setFold(1.0); // Folded by default

  return {
    root,
    mats: { outerMat, innerMat, faceMats },
    panels: { frontPanel, backPanel, leftPanel, rightPanel, topPanel, botPanel },
    setFold,
    type: 'tuck-box'
  };
}

// ════════════════════════════════════════════════════════════
// 2. MAILER BOX (E-commerce shipping box with folding roll-over)
// ════════════════════════════════════════════════════════════

function createMailerBox(dims = { w: 2.3, h: 1.5, d: 1.6 }, mats = {}) {
  const root = new THREE.Group();
  const W = dims.w || 2.3; // Width
  const D = dims.d || 1.6; // Depth
  const H = dims.h || 1.5; // Wall height

  const outerMat = mats.main || new THREE.MeshPhysicalMaterial({ color: 0xf0ede6, roughness: 0.85 });
  const innerMat = mats.inner || new THREE.MeshStandardMaterial({ color: 0xc8a97c, roughness: 0.95 }); // Kraft inner
  const faceMats = mats.faces || {};
  const getMat = f => faceMats[f] || outerMat;

  // Base is the bottom floor (flat on XZ)
  const basePivot = createPivot(0, 0, 0);
  const basePanel = createPanel(W, D, getMat('bottom'), innerMat);
  basePanel.rotation.x = -Math.PI / 2;
  basePivot.add(basePanel);
  root.add(basePivot);

  // ── Back Wall (hinges at back edge of base: z = -D/2)
  const pivotBack = createPivot(0, 0, -D / 2);
  const backPanel = createPanel(W, H, getMat('back'), innerMat);
  backPanel.position.set(0, H / 2, 0);
  pivotBack.add(backPanel);
  root.add(pivotBack);

  // ── Top Lid (hinges at top of back wall: y = H)
  const pivotLid = createPivot(0, H, 0);
  const lidPanel = createPanel(W, D, getMat('top'), innerMat);
  lidPanel.position.set(0, D / 2, 0);
  pivotLid.add(lidPanel);
  pivotBack.add(pivotLid);

  // Lid Front Flap (hinges at far edge of lid)
  const flapH = H * 0.92;
  const pivotLidFlap = createPivot(0, D, 0);
  const lidFlap = createPanel(W * 0.98, flapH, getMat('front'), innerMat);
  lidFlap.position.set(0, flapH / 2, 0);
  pivotLidFlap.add(lidFlap);
  pivotLid.add(pivotLidFlap);

  // Lid Side Locking Flaps (Left & Right)
  const sideFlapW = H * 0.7;
  const pivotLidLeft = createPivot(-W / 2, D / 2, 0);
  const lidLeftFlap = createPanel(sideFlapW, D * 0.85, getMat('left'), innerMat);
  lidLeftFlap.position.set(-sideFlapW / 2, 0, 0);
  pivotLidLeft.add(lidLeftFlap);
  pivotLid.add(pivotLidLeft);

  const pivotLidRight = createPivot(W / 2, D / 2, 0);
  const lidRightFlap = createPanel(sideFlapW, D * 0.85, getMat('right'), innerMat);
  lidRightFlap.position.set(sideFlapW / 2, 0, 0);
  pivotLidRight.add(lidRightFlap);
  pivotLid.add(pivotLidRight);

  // ── Front Wall (hinges at front edge of base: z = +D/2)
  const pivotFront = createPivot(0, 0, D / 2);
  const frontPanel = createPanel(W, H, innerMat, innerMat);
  frontPanel.position.set(0, H / 2, 0);
  pivotFront.add(frontPanel);
  root.add(pivotFront);

  // ── Left Side Wall (hinges at left edge of base: x = -W/2)
  const pivotLeft = createPivot(-W / 2, 0, 0);
  const leftPanel = createPanel(H, D, getMat('left'), innerMat);
  leftPanel.rotation.y = Math.PI / 2;
  leftPanel.position.set(0, H / 2, 0);
  pivotLeft.add(leftPanel);
  root.add(pivotLeft);

  // ── Right Side Wall (hinges at right edge of base: x = +W/2)
  const pivotRight = createPivot(W / 2, 0, 0);
  const rightPanel = createPanel(H, D, getMat('right'), innerMat);
  rightPanel.rotation.y = -Math.PI / 2;
  rightPanel.position.set(0, H / 2, 0);
  pivotRight.add(rightPanel);
  root.add(pivotRight);

  const setFold = (t) => {
    t = clamp(t, 0, 1);
    const rad90 = Math.PI / 2;

    // Walls fold up
    pivotBack.rotation.x = rad90 * t;
    pivotFront.rotation.x = -rad90 * t;
    pivotLeft.rotation.z = -rad90 * t;
    pivotRight.rotation.z = rad90 * t;

    // Top Lid folds forward over box
    const lidT = clamp((t - 0.25) * 1.4, 0, 1);
    pivotLid.rotation.x = rad90 * lidT;

    // Lid front flap tucks down
    const flapT = clamp((t - 0.5) * 2.0, 0, 1);
    pivotLidFlap.rotation.x = rad90 * flapT;
    pivotLidLeft.rotation.y = -rad90 * flapT;
    pivotLidRight.rotation.y = rad90 * flapT;
  };

  setFold(1.0);

  return {
    root,
    mats: { outerMat, innerMat, faceMats },
    panels: { basePanel, backPanel, lidPanel, lidFlap, frontPanel, leftPanel, rightPanel },
    setFold,
    type: 'mailer-box'
  };
}

// ════════════════════════════════════════════════════════════
// 3. SQUARE GIFT BOX (Base with matching removable/hinged lid)
// ════════════════════════════════════════════════════════════

function createSquareBox(dims = { w: 2.0, h: 2.0, d: 2.0 }, mats = {}) {
  const box = createTuckBox({ w: dims.w, h: dims.h, d: dims.d }, mats);
  box.type = 'square-box';
  return box;
}

// ════════════════════════════════════════════════════════════
// 4. BEVERAGE CAN (High-detail Lathed Aluminum Can)
// ════════════════════════════════════════════════════════════

function createBeverageCan(dims = { radius: 0.8, height: 2.8 }, mats = {}) {
  const root = new THREE.Group();
  const R = dims.radius || 0.8;
  const H = dims.height || 2.8;

  // Aluminum Metallic Material
  const aluMat = mats.metal || new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    metalness: 0.95,
    roughness: 0.18,
  });

  // Label Artwork Material (Default glossy white/printed)
  const labelMat = mats.main || new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.2,
    roughness: 0.25,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1
  });

  // ── Main Cylinder Body (Label Area)
  const bodyH = H * 0.78;
  const bodyGeo = new THREE.CylinderGeometry(R, R, bodyH, 48, 1, true);
  const bodyMesh = new THREE.Mesh(bodyGeo, labelMat);
  bodyMesh.position.y = H * 0.05;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  root.add(bodyMesh);

  // ── Tapered Shoulder (Top neck)
  const neckH = H * 0.10;
  const neckTopR = R * 0.82;
  const neckGeo = new THREE.CylinderGeometry(neckTopR, R, neckH, 48, 1, true);
  const neckMesh = new THREE.Mesh(neckGeo, aluMat);
  neckMesh.position.y = bodyMesh.position.y + bodyH / 2 + neckH / 2;
  neckMesh.castShadow = true;
  root.add(neckMesh);

  // ── Top Rim (Rolled aluminum lip)
  const rimTorus = new THREE.TorusGeometry(neckTopR, 0.035, 16, 48);
  rimTorus.rotateX(Math.PI / 2);
  const rimMesh = new THREE.Mesh(rimTorus, aluMat);
  rimMesh.position.y = neckMesh.position.y + neckH / 2;
  root.add(rimMesh);

  // ── Recessed Top Lid Surface
  const lidGeo = new THREE.CylinderGeometry(neckTopR * 0.98, neckTopR * 0.98, 0.02, 48);
  const lidMesh = new THREE.Mesh(lidGeo, aluMat);
  lidMesh.position.y = rimMesh.position.y - 0.02;
  root.add(lidMesh);

  // ── Pull Tab
  const tabGroup = new THREE.Group();
  const tabShape = new THREE.Shape();
  tabShape.moveTo(-0.15, -0.3);
  tabShape.lineTo(0.15, -0.3);
  tabShape.quadraticCurveTo(0.2, 0, 0.12, 0.25);
  tabShape.quadraticCurveTo(0, 0.35, -0.12, 0.25);
  tabShape.quadraticCurveTo(-0.2, 0, -0.15, -0.3);

  // Tab hole
  const hole = new THREE.Path();
  hole.absarc(0, 0.05, 0.08, 0, Math.PI * 2, true);
  tabShape.holes.push(hole);

  const extrudeSettings = { depth: 0.015, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.006, bevelThickness: 0.006 };
  const tabGeo = new THREE.ExtrudeGeometry(tabShape, extrudeSettings);
  tabGeo.rotateX(-Math.PI / 2);
  const tabMesh = new THREE.Mesh(tabGeo, aluMat);
  tabMesh.position.set(0, lidMesh.position.y + 0.015, -0.05);
  tabMesh.scale.set(0.85, 0.85, 0.85);
  tabGroup.add(tabMesh);

  // Rivet
  const rivetGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.025, 16);
  const rivetMesh = new THREE.Mesh(rivetGeo, aluMat);
  rivetMesh.position.set(0, lidMesh.position.y + 0.02, -0.08);
  tabGroup.add(rivetMesh);
  root.add(tabGroup);

  // ── Bottom Taper & Inset Dome
  const botTaperH = H * 0.08;
  const botBaseR = R * 0.78;
  const botTaperGeo = new THREE.CylinderGeometry(R, botBaseR, botTaperH, 48, 1, true);
  const botTaperMesh = new THREE.Mesh(botTaperGeo, aluMat);
  botTaperMesh.position.y = bodyMesh.position.y - bodyH / 2 - botTaperH / 2;
  root.add(botTaperMesh);

  // Bottom Rim & Concave floor
  const botFloorGeo = new THREE.CylinderGeometry(botBaseR, botBaseR, 0.02, 48);
  const botFloorMesh = new THREE.Mesh(botFloorGeo, aluMat);
  botFloorMesh.position.y = botTaperMesh.position.y - botTaperH / 2;
  botFloorMesh.receiveShadow = true;
  root.add(botFloorMesh);

  return {
    root,
    mats: { labelMat, aluMat },
    parts: { bodyMesh, tabGroup },
    setFold: () => {},
    type: 'soda-can'
  };
}

// ════════════════════════════════════════════════════════════
// 5. PAPER CUP (Coffee Cup with Rolled Rim, Lid & Sleeve)
// ════════════════════════════════════════════════════════════

function createPaperCup(dims = { topR: 1.0, botR: 0.72, height: 2.6 }, mats = {}) {
  const root = new THREE.Group();
  const tr = dims.topR || 1.0;
  const br = dims.botR || 0.72;
  const H = dims.height || 2.6;

  const cupMat = mats.main || new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.85 });
  const innerMat = mats.inner || new THREE.MeshStandardMaterial({ color: 0xf5eedd, roughness: 0.9 });
  const sleeveMat = mats.sleeve || new THREE.MeshStandardMaterial({ color: 0xc49a6c, roughness: 0.95 }); // Kraft sleeve
  const lidMat = mats.lid || new THREE.MeshPhysicalMaterial({ color: 0x1f1f1f, roughness: 0.4, clearcoat: 0.3 }); // Dark plastic lid

  // ── Cup Body (Truncated cone)
  const cupGeo = new THREE.CylinderGeometry(tr, br, H, 48, 1, true);
  const cupMesh = new THREE.Mesh(cupGeo, cupMat);
  cupMesh.castShadow = true;
  cupMesh.receiveShadow = true;
  root.add(cupMesh);

  // ── Cup Bottom Inset Base
  const baseGeo = new THREE.CircleGeometry(br * 0.98, 48);
  baseGeo.rotateX(Math.PI / 2);
  const baseMesh = new THREE.Mesh(baseGeo, innerMat);
  baseMesh.position.y = -H / 2 + 0.15;
  root.add(baseMesh);

  // ── Rolled Rim (Torus at top)
  const rimGeo = new THREE.TorusGeometry(tr, 0.045, 16, 48);
  rimGeo.rotateX(Math.PI / 2);
  const rimMesh = new THREE.Mesh(rimGeo, cupMat);
  rimMesh.position.y = H / 2;
  root.add(rimMesh);

  // ── Removable Kraft Sleeve Band
  const slH = H * 0.42;
  const slTopR = lerp(br, tr, 0.68) * 1.015;
  const slBotR = lerp(br, tr, 0.28) * 1.015;
  const sleeveGeo = new THREE.CylinderGeometry(slTopR, slBotR, slH, 48, 1, true);
  const sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
  sleeveMesh.position.y = -0.1;
  sleeveMesh.castShadow = true;
  root.add(sleeveMesh);

  // ── Plastic Sipping Lid
  const lidGroup = new THREE.Group();
  const lidLipGeo = new THREE.CylinderGeometry(tr * 1.05, tr * 1.05, 0.15, 48, 1, true);
  const lidLipMesh = new THREE.Mesh(lidLipGeo, lidMat);
  lidGroup.add(lidLipMesh);

  const lidCapGeo = new THREE.CylinderGeometry(tr * 0.96, tr * 1.04, 0.12, 48);
  lidCapGeo.translate(0, 0.1, 0);
  const lidCapMesh = new THREE.Mesh(lidCapGeo, lidMat);
  lidGroup.add(lidCapMesh);

  // Raised sip mouth
  const sipGeo = new THREE.BoxGeometry(0.35, 0.08, 0.22);
  const sipMesh = new THREE.Mesh(sipGeo, lidMat);
  sipMesh.position.set(0, 0.20, tr * 0.65);
  lidGroup.add(sipMesh);

  lidGroup.position.y = H / 2 + 0.02;
  root.add(lidGroup);

  return {
    root,
    mats: { cupMat, innerMat, sleeveMat, lidMat },
    parts: { cupMesh, sleeveMesh, lidGroup },
    setFold: () => {},
    type: 'paper-cup'
  };
}

// ════════════════════════════════════════════════════════════
// 6. COSMETIC JAR (Glass/Acrylic Jar Body + Screw Cap Lid)
// ════════════════════════════════════════════════════════════

function createCosmeticJar(dims = { radius: 1.1, height: 1.4 }, mats = {}) {
  const root = new THREE.Group();
  const R = dims.radius || 1.1;
  const H = dims.height || 1.4;

  const jarMat = mats.main || new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.1,
    transmission: 0.45,
    thickness: 0.5,
    ior: 1.5,
    clearcoat: 1.0
  });

  const lidMat = mats.lid || new THREE.MeshPhysicalMaterial({
    color: 0xd4af37, // Gold lid default
    metalness: 0.85,
    roughness: 0.25,
    clearcoat: 0.6
  });

  // ── Jar Body (Cylinder with bevel base)
  const bodyH = H * 0.65;
  const jarGeo = new THREE.CylinderGeometry(R, R * 0.96, bodyH, 48);
  const jarMesh = new THREE.Mesh(jarGeo, jarMat);
  jarMesh.position.y = bodyH / 2;
  jarMesh.castShadow = true;
  jarMesh.receiveShadow = true;
  root.add(jarMesh);

  // Neck ring
  const neckGeo = new THREE.CylinderGeometry(R * 0.88, R * 0.88, 0.16, 48);
  const neckMesh = new THREE.Mesh(neckGeo, jarMat);
  neckMesh.position.y = bodyH + 0.08;
  root.add(neckMesh);

  // ── Lid
  const lidH = H * 0.38;
  const lidGeo = new THREE.CylinderGeometry(R * 1.02, R * 1.02, lidH, 48);
  const lidMesh = new THREE.Mesh(lidGeo, lidMat);
  lidMesh.position.y = bodyH + lidH / 2 + 0.06;
  lidMesh.castShadow = true;
  root.add(lidMesh);

  return {
    root,
    mats: { jarMat, lidMat },
    parts: { jarMesh, lidMesh },
    setFold: () => {},
    type: 'cosmetic-jar'
  };
}

// ════════════════════════════════════════════════════════════
// 7. SPRAY BOTTLE (Bottle Body + Pump Dispenser Nozzle)
// ════════════════════════════════════════════════════════════

function createSprayBottle(dims = { radius: 0.8, height: 3.2 }, mats = {}) {
  const root = new THREE.Group();
  const R = dims.radius || 0.8;
  const H = dims.height || 3.2;

  const bottleMat = mats.main || new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.15,
    clearcoat: 0.9
  });

  const pumpMat = mats.pump || new THREE.MeshStandardMaterial({
    color: 0x222222,
    roughness: 0.4,
    metalness: 0.2
  });

  // ── Bottle Cylindrical Body
  const bodyH = H * 0.62;
  const bodyGeo = new THREE.CylinderGeometry(R, R * 0.95, bodyH, 48);
  const bodyMesh = new THREE.Mesh(bodyGeo, bottleMat);
  bodyMesh.position.y = bodyH / 2;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  root.add(bodyMesh);

  // ── Shoulder Curve
  const shH = H * 0.12;
  const shGeo = new THREE.CylinderGeometry(R * 0.45, R, shH, 48);
  const shMesh = new THREE.Mesh(shGeo, bottleMat);
  shMesh.position.y = bodyH + shH / 2;
  shMesh.castShadow = true;
  root.add(shMesh);

  // ── Neck Collar
  const collarGeo = new THREE.CylinderGeometry(R * 0.48, R * 0.48, 0.18, 48);
  const collarMesh = new THREE.Mesh(collarGeo, pumpMat);
  collarMesh.position.y = bodyH + shH + 0.09;
  root.add(collarMesh);

  // ── Pump Actuator Head
  const pumpGroup = new THREE.Group();
  const stemGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.22, 24);
  const stemMesh = new THREE.Mesh(stemGeo, pumpMat);
  stemMesh.position.y = 0.11;
  pumpGroup.add(stemMesh);

  const headGeo = new THREE.CylinderGeometry(R * 0.42, R * 0.42, 0.35, 32);
  const headMesh = new THREE.Mesh(headGeo, pumpMat);
  headMesh.position.y = 0.35;
  headMesh.castShadow = true;
  pumpGroup.add(headMesh);

  // Spray spout nozzle
  const spoutGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.28, 16);
  spoutGeo.rotateZ(Math.PI / 2);
  const spoutMesh = new THREE.Mesh(spoutGeo, pumpMat);
  spoutMesh.position.set(R * 0.42, 0.4, 0);
  pumpGroup.add(spoutMesh);

  pumpGroup.position.y = collarMesh.position.y + 0.09;
  root.add(pumpGroup);

  return {
    root,
    mats: { bottleMat, pumpMat },
    parts: { bodyMesh, pumpGroup },
    setFold: () => {},
    type: 'spray-bottle'
  };
}

// ════════════════════════════════════════════════════════════
// 8. STAND-UP POUCH (Doypack with Sealed Edges & Oval Bottom)
// ════════════════════════════════════════════════════════════

function createStandupPouch(dims = { w: 2.2, h: 3.0, d: 1.0 }, mats = {}) {
  const root = new THREE.Group();
  const W = dims.w || 2.2;
  const H = dims.h || 3.0;
  const D = dims.d || 1.0;

  const pouchMat = mats.main || new THREE.MeshPhysicalMaterial({
    color: 0xf5f5f5,
    roughness: 0.4,
    clearcoat: 0.7,
    clearcoatRoughness: 0.25,
    side: THREE.DoubleSide
  });

  // Generate curved organic puffed pouch mesh using parametric curve grid
  const segW = 32;
  const segH = 40;
  const pouchGeo = new THREE.BufferGeometry();
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let j = 0; j <= segH; j++) {
    const v = j / segH;
    const y = (v - 0.5) * H;

    // Puffiness curve along Y (bulges at lower center, flattens at top and side seals)
    const puffY = Math.sin(v * Math.PI) * Math.sin(Math.pow(v, 0.6) * Math.PI);

    for (let i = 0; i <= segW; i++) {
      const u = i / segW;
      const x = (u - 0.5) * W;

      // Puffiness curve along X (flattens to 0 at edges for heat seal seam)
      const puffX = Math.sin(u * Math.PI);

      // Sealed borders thickness
      const isSideSeal = (u < 0.08 || u > 0.92);
      const isTopSeal = (v > 0.88);
      const sealFactor = (isSideSeal || isTopSeal) ? 0.02 : 1.0;

      const z = (puffX * puffY * (D * 0.55) * sealFactor);

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  // Back face of pouch (flipped Z)
  const offset = (segW + 1) * (segH + 1);
  for (let j = 0; j <= segH; j++) {
    const v = j / segH;
    const y = (v - 0.5) * H;
    const puffY = Math.sin(v * Math.PI) * Math.sin(Math.pow(v, 0.6) * Math.PI);

    for (let i = 0; i <= segW; i++) {
      const u = i / segW;
      const x = (u - 0.5) * W;
      const puffX = Math.sin(u * Math.PI);
      const isSideSeal = (u < 0.08 || u > 0.92);
      const isTopSeal = (v > 0.88);
      const sealFactor = (isSideSeal || isTopSeal) ? 0.02 : 1.0;

      const z = -(puffX * puffY * (D * 0.55) * sealFactor);

      positions.push(x, y, z);
      uvs.push(1 - u, v);
    }
  }

  // Construct triangles
  for (let j = 0; j < segH; j++) {
    for (let i = 0; i < segW; i++) {
      const a = j * (segW + 1) + i;
      const b = a + 1;
      const c = (j + 1) * (segW + 1) + i;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);

      // Back face
      const a2 = offset + a;
      const b2 = offset + b;
      const c2 = offset + c;
      const d2 = offset + d;
      indices.push(a2, b2, c2, b2, d2, c2);
    }
  }

  pouchGeo.setIndex(indices);
  pouchGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  pouchGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  pouchGeo.computeVertexNormals();

  const pouchMesh = new THREE.Mesh(pouchGeo, pouchMat);
  pouchMesh.castShadow = true;
  pouchMesh.receiveShadow = true;
  root.add(pouchMesh);

  // ── Oval Gusset Floor (Stand-up bottom)
  const gussetGeo = new THREE.RingGeometry(0, W * 0.38, 32);
  gussetGeo.scale(1, (D * 0.45) / (W * 0.38), 1);
  gussetGeo.rotateX(Math.PI / 2);
  const gussetMesh = new THREE.Mesh(gussetGeo, pouchMat);
  gussetMesh.position.y = -H * 0.48;
  root.add(gussetMesh);

  return {
    root,
    mats: { pouchMat },
    parts: { pouchMesh },
    setFold: () => {},
    type: 'standup-pouch'
  };
}

// ════════════════════════════════════════════════════════════
// 9. FLAT SACHET (Heat-Sealed 4-Edge Pouch)
// ════════════════════════════════════════════════════════════

function createFlatPouch(dims = { w: 1.8, h: 2.4 }, mats = {}) {
  const pouch = createStandupPouch({ w: dims.w, h: dims.h, d: 0.35 }, mats);
  pouch.type = 'flat-pouch';
  return pouch;
}

// ════════════════════════════════════════════════════════════
// 10. SHOPPING BAG (Paper Bag with Gussets & Cord Handles)
// ════════════════════════════════════════════════════════════

function createShoppingBag(dims = { w: 2.4, h: 3.0, d: 1.2 }, mats = {}) {
  const root = new THREE.Group();
  const W = dims.w || 2.4;
  const H = dims.h || 3.0;
  const D = dims.d || 1.2;

  const bagMat = mats.main || new THREE.MeshPhysicalMaterial({ color: 0xf5eedd, roughness: 0.85 }); // Kraft bag default
  const handleMat = mats.handle || new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6 });

  // ── Front & Back Walls
  const frontGeo = new THREE.PlaneGeometry(W, H);
  const frontMesh = new THREE.Mesh(frontGeo, bagMat);
  frontMesh.position.set(0, 0, D / 2);
  frontMesh.castShadow = true;
  root.add(frontMesh);

  const backMesh = new THREE.Mesh(frontGeo, bagMat);
  backMesh.rotation.y = Math.PI;
  backMesh.position.set(0, 0, -D / 2);
  backMesh.castShadow = true;
  root.add(backMesh);

  // ── Creased Side Gussets (Left & Right V-fold)
  function createGusset(xOffset, rotY) {
    const gGroup = new THREE.Group();
    const halfD = D / 2;
    const flapGeo = new THREE.PlaneGeometry(halfD * 1.05, H);

    const f1 = new THREE.Mesh(flapGeo, bagMat);
    f1.rotation.y = Math.PI / 2 + 0.15;
    f1.position.set(0, 0, halfD / 2);
    gGroup.add(f1);

    const f2 = new THREE.Mesh(flapGeo, bagMat);
    f2.rotation.y = Math.PI / 2 - 0.15;
    f2.position.set(0, 0, -halfD / 2);
    gGroup.add(f2);

    gGroup.position.set(xOffset, 0, 0);
    gGroup.rotation.y = rotY;
    return gGroup;
  }

  root.add(createGusset(-W / 2, 0));
  root.add(createGusset(W / 2, Math.PI));

  // ── Bottom Base
  const baseGeo = new THREE.PlaneGeometry(W, D);
  baseGeo.rotateX(Math.PI / 2);
  const baseMesh = new THREE.Mesh(baseGeo, bagMat);
  baseMesh.position.y = -H / 2;
  root.add(baseMesh);

  // ── Braided Rope Handles (Front & Back)
  function createHandle(zOffset) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-W * 0.28, H / 2 - 0.1, zOffset),
      new THREE.Vector3(-W * 0.25, H / 2 + 0.5, zOffset * 1.3),
      new THREE.Vector3(0, H / 2 + 0.95, zOffset * 1.5),
      new THREE.Vector3(W * 0.25, H / 2 + 0.5, zOffset * 1.3),
      new THREE.Vector3(W * 0.28, H / 2 - 0.1, zOffset)
    ]);
    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.045, 12, false);
    const tubeMesh = new THREE.Mesh(tubeGeo, handleMat);
    tubeMesh.castShadow = true;
    return tubeMesh;
  }

  root.add(createHandle(D / 2 + 0.04));
  root.add(createHandle(-D / 2 - 0.04));

  return {
    root,
    mats: { bagMat, handleMat },
    parts: { frontMesh, backMesh },
    setFold: () => {},
    type: 'paper-bag'
  };
}

// ════════════════════════════════════════════════════════════
// 11. PYRAMID BOX (4-Sided Folding Pyramid)
// ════════════════════════════════════════════════════════════

function createPyramidBox(dims = { baseW: 2.2, height: 2.4 }, mats = {}) {
  const root = new THREE.Group();
  const B = dims.baseW || 2.2;
  const H = dims.height || 2.4;

  const outerMat = mats.main || new THREE.MeshPhysicalMaterial({ color: 0xf5f5f5, roughness: 0.85, side: THREE.DoubleSide });
  const innerMat = mats.inner || new THREE.MeshStandardMaterial({ color: 0xe6decb, roughness: 0.95, side: THREE.DoubleSide });

  // Base
  const basePanel = createPanel(B, B, outerMat, innerMat);
  basePanel.rotation.x = -Math.PI / 2;
  root.add(basePanel);

  // Triangular face slant height
  const slantH = Math.hypot(H, B / 2);
  const triShape = new THREE.Shape();
  triShape.moveTo(-B / 2, 0);
  triShape.lineTo(B / 2, 0);
  triShape.lineTo(0, slantH);
  triShape.closePath();
  const triGeo = new THREE.ShapeGeometry(triShape);

  // 4 Triangular Panels hinged at 4 edges of base
  const pivots = [];
  const edgeAngles = [
    { pos: [0, 0, B / 2], rotY: 0, foldAxis: 'x', dir: -1 },
    { pos: [0, 0, -B / 2], rotY: Math.PI, foldAxis: 'x', dir: -1 },
    { pos: [-B / 2, 0, 0], rotY: Math.PI / 2, foldAxis: 'x', dir: -1 },
    { pos: [B / 2, 0, 0], rotY: -Math.PI / 2, foldAxis: 'x', dir: -1 }
  ];

  edgeAngles.forEach(e => {
    const p = createPivot(...e.pos);
    p.rotation.y = e.rotY;
    const mesh = new THREE.Mesh(triGeo, outerMat);
    mesh.castShadow = true;
    p.add(mesh);
    root.add(p);
    pivots.push(p);
  });

  const foldAngle = Math.atan2(H, B / 2);

  const setFold = (t) => {
    t = clamp(t, 0, 1);
    pivots.forEach(p => {
      p.rotation.x = -(Math.PI / 2 - (Math.PI / 2 - foldAngle) * t);
    });
  };

  setFold(1.0);

  return {
    root,
    mats: { outerMat, innerMat },
    setFold,
    type: 'pyramid-box'
  };
}

// ════════════════════════════════════════════════════════════
// 12. PILLOW BOX (Curved Folding Gift Packaging)
// ════════════════════════════════════════════════════════════

function createPillowBox(dims = { w: 2.2, h: 2.8, d: 0.9 }, mats = {}) {
  const root = new THREE.Group();
  const W = dims.w || 2.2;
  const H = dims.h || 2.8;
  const D = dims.d || 0.9;

  const pillowMat = mats.main || new THREE.MeshPhysicalMaterial({ color: 0xf5f5f5, roughness: 0.85, side: THREE.DoubleSide });

  // Pillow box curved surface
  const segW = 32, segH = 32;
  const geo = new THREE.BufferGeometry();
  const pos = [], uvs = [], idx = [];

  for (let j = 0; j <= segH; j++) {
    const v = j / segH;
    const y = (v - 0.5) * H;
    const endCurve = Math.cos((v - 0.5) * Math.PI); // taper towards ends

    for (let i = 0; i <= segW; i++) {
      const u = i / segW;
      const theta = u * Math.PI * 2;
      const x = Math.sin(theta) * (W / 2);
      const z = (Math.cos(theta) >= 0 ? 1 : -1) * Math.pow(Math.abs(Math.cos(theta)), 1.5) * (D / 2) * endCurve;

      pos.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let j = 0; j < segH; j++) {
    for (let i = 0; i < segW; i++) {
      const a = j * (segW + 1) + i;
      const b = a + 1;
      const c = (j + 1) * (segW + 1) + i;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }

  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, pillowMat);
  mesh.castShadow = true;
  root.add(mesh);

  return {
    root,
    mats: { pillowMat },
    setFold: () => {},
    type: 'pillow-box'
  };
}

// ════════════════════════════════════════════════════════════
// 13. SLEEVE BOX (Outer Wrapper + Sliding Inner Tray)
// ════════════════════════════════════════════════════════════

function createSleeveBox(dims = { w: 2.0, h: 1.2, d: 2.4 }, mats = {}) {
  const root = new THREE.Group();
  const W = dims.w || 2.0;
  const H = dims.h || 1.2;
  const D = dims.d || 2.4;

  const outerMat = mats.main || new THREE.MeshPhysicalMaterial({ color: 0xf5f5f5, roughness: 0.85 });
  const innerMat = mats.inner || new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });

  // ── Outer Sleeve (Hollow tube with Top, Bottom, Left, Right)
  const sleeveGroup = new THREE.Group();
  
  // Top & Bottom
  const topPanel = createPanel(W, D, outerMat, outerMat);
  topPanel.position.set(0, H / 2, 0);
  topPanel.rotation.x = Math.PI / 2;
  sleeveGroup.add(topPanel);

  const botPanel = createPanel(W, D, outerMat, outerMat);
  botPanel.position.set(0, -H / 2, 0);
  botPanel.rotation.x = -Math.PI / 2;
  sleeveGroup.add(botPanel);

  // Left & Right
  const leftPanel = createPanel(H, D, outerMat, outerMat);
  leftPanel.position.set(-W / 2, 0, 0);
  leftPanel.rotation.y = Math.PI / 2;
  sleeveGroup.add(leftPanel);

  const rightPanel = createPanel(H, D, outerMat, outerMat);
  rightPanel.position.set(W / 2, 0, 0);
  rightPanel.rotation.y = -Math.PI / 2;
  sleeveGroup.add(rightPanel);

  root.add(sleeveGroup);

  // ── Sliding Inner Tray (5-sided box)
  const trayGroup = new THREE.Group();
  const tW = W * 0.96;
  const tH = H * 0.94;
  const tD = D * 0.98;

  const trayBase = createPanel(tW, tD, innerMat, innerMat);
  trayBase.rotation.x = -Math.PI / 2;
  trayBase.position.y = -tH / 2 + 0.01;
  trayGroup.add(trayBase);

  // Tray Front & Back walls
  const trayFront = createPanel(tW, tH, innerMat, innerMat);
  trayFront.position.set(0, 0, tD / 2);
  trayGroup.add(trayFront);

  const trayBack = createPanel(tW, tH, innerMat, innerMat);
  trayBack.position.set(0, 0, -tD / 2);
  trayBack.rotation.y = Math.PI;
  trayGroup.add(trayBack);

  // Tray Sides
  const trayLeft = createPanel(tH, tD, innerMat, innerMat);
  trayLeft.position.set(-tW / 2, 0, 0);
  trayLeft.rotation.y = Math.PI / 2;
  trayGroup.add(trayLeft);

  const trayRight = createPanel(tH, tD, innerMat, innerMat);
  trayRight.position.set(tW / 2, 0, 0);
  trayRight.rotation.y = -Math.PI / 2;
  trayGroup.add(trayRight);

  root.add(trayGroup);

  // Slider function: slide inner tray in/out
  const setFold = (t) => {
    t = clamp(t, 0, 1);
    trayGroup.position.z = lerp(D * 0.6, 0, t);
  };

  setFold(1.0);

  return {
    root,
    mats: { outerMat, innerMat },
    parts: { sleeveGroup, trayGroup },
    setFold,
    type: 'sleeve-box'
  };
}

// ════════════════════════════════════════════════════════════
// MASTER FACTORY REGISTRY
// ════════════════════════════════════════════════════════════

const BUILDERS = {
  'tuck-box':      createTuckBox,
  'mailer-box':    createMailerBox,
  'square-box':    createSquareBox,
  'soda-can':      createBeverageCan,
  'paper-cup':     createPaperCup,
  'cosmetic-jar':  createCosmeticJar,
  'spray-bottle':  createSprayBottle,
  'standup-pouch': createStandupPouch,
  'flat-pouch':    createFlatPouch,
  'shopping-bag':  createShoppingBag,
  'sleeve-box':    createSleeveBox,
  'pillow-box':    createPillowBox,
  'pyramid-box':   createPyramidBox
};

function createPackageModel(modelId, dims, mats) {
  const builder = BUILDERS[modelId] || BUILDERS['tuck-box'];
  return builder(dims, mats);
}

global.Pack3DModels = {
  createPackageModel,
  BUILDERS
};

})(window);
