<div align="center">
  <img src="https://raw.githubusercontent.com/BayDKen/packmockup/main/css/badge.png" alt="PackMockup Logo" width="80" onError="this.style.display='none'"/>
  <h1>PackMockup 📦</h1>
  <p><strong>A Free, Powerful Web-Based Packaging & Dieline 3D Studio</strong></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Vercel Deploy](https://img.shields.io/badge/Vercel-Deployed-black.svg?logo=vercel)](#deployment)
  
</div>

---

**PackMockup** is a high-performance, entirely browser-based alternative to expensive packaging design tools (like Pacdora). It allows graphic designers, packaging engineers, and e-commerce sellers to generate accurate 2D structural die-cut templates (dielines), simulate real-time 3D folding from flat sheet to finished box, and render photorealistic 3D mockups in WebGL with luxury finishes—**completely free and without watermarks.**

## ✨ Key Features

- 📏 **Parametric Dieline Generator**: Instantly generate structurally sound packaging blueprints. Just input your custom Width, Height, Depth, and Bleed margin in millimeters.
- 🧊 **13 Full Procedural 3D Models**:
  - **Boxes**: *Tuck End Box, Mailer Box, Square Gift Box, Sleeve Wrap Box, Pillow Box, Pyramid Box*
  - **Bottles & Cans**: *Beverage Can (Aluminum), Paper Coffee Cup, Cosmetic Cream Jar, Spray Pump Bottle*
  - **Bags & Pouches**: *Shopping Bag with 3D Cord Handles, Stand-up Pouch (Doypack), Flat Sachet*
- 🎬 **Interactive 3D Folding & Unfolding Engine**: Slide between 0% (completely flat 2D dieline on the table) and 100% (fully folded 3D box) or click **Animate Fold** to watch the package assemble in real time!
- ✨ **Photorealistic PBR Finishes**:
  - *Matte Paper & Kraft Board* (with procedural organic fiber bump maps)
  - *Gloss Coated Paper* (with realistic clearcoat reflections)
  - *Luxury Hot Stamped Foil*: Gold Foil, Silver Chrome Foil, Rose Gold
  - *Tactile Soft-Touch Velvet*
  - *Brushed Aluminum* for cans & *Translucent Frosted Glass* for jars
- 💡 **Studio Lighting & Procedural HDRI**: High dynamic range studio reflection environment map with softbox panels, 3-point lighting (Key, Fill, Rim), soft contact shadows, and 6 camera angle presets (*Hero, Front, Side, Top, Isometric, Flat*).
- 🎨 **Real-Time Texture Slicing & Mapping**: Upload flat dieline artwork or face-by-face designs; the engine slices artwork along crease lines and applies textures with 60 FPS real-time feedback.
- 💾 **Multi-Format Export Studio**:
  - **3D Model (.GLB)**: Download binary GLTF 3D models with embedded textures for Blender, Unity, Cinema4D, or AR viewers.
  - **Ultra 4K PNG**: Up to 4000 × 4000 px transparent or solid studio renders.
  - **SVG Vector**: CAD-accurate cut, fold, and bleed vector dielines for Adobe Illustrator and CorelDRAW.
  - **Printable PDF**: High-quality printable specification sheet for physical mockups.

## 🚀 Live Demo

Deploy and host this project for free using Vercel or any static host:
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FBayDKen%2Fpackmockup)

## 📖 User Guide

### 1. Generating a Dieline & 3D Folding
1. Navigate to the **Dieline** page from the top menu.
2. Select a packaging shape from the **Left Sidebar** (*Tuck Box, Mailer, Sleeve, Pillow, Pyramid, Bag*).
3. Adjust the `W` (Width), `H` (Height), and `D` (Depth) inputs in millimeters.
4. Upload your branding artwork using **Upload Design**.
5. Drag or scale your graphic over the panels in real-time.
6. Use the **3D Fold Progress** slider in the right panel to watch the 2D flat dieline fold into a 3D box!
7. Export your dieline as vector **SVG**, printable **PDF**, 3000px **PNG**, or **Download 3D Model (.GLB)**.

### 2. Customizing in the 3D Studio
1. From the **Mockups** page, click on any packaging type to open the 3D Studio.
2. Use the **Artwork** tab to upload and adjust decals, scale, offset, or rotation.
3. Switch to the **Material** tab to choose between *Matte Paper, Kraft, Glossy, Gold Foil, Silver Foil, Rose Gold,* or *Soft Touch*.
4. Switch to the **Fold** tab to fold or unfold the package interactively.
5. In the **Scene** tab, choose camera angles (*Hero, Front, Top, Iso*) and toggle the auto-rotate turntable.
6. In the **Export** tab, download high-res PNG renders up to 4K or export the `.glb` 3D file.

## 💻 Technical Architecture

Built purely with modern vanilla web standards for zero-dependency speed, instant load times, and universal browser compatibility:

- **Core**: Vanilla JavaScript (ES6+), HTML5 Canvas 2D API, CSS Variables.
- **3D Graphics**: `Three.js` (WebGL, ACES Filmic tone mapping, PCF soft shadows, `MeshPhysicalMaterial`).
- **3D Procedural Models**: Custom mathematical mesh generators (`js/models3d.js`) featuring hierarchical pivot joints for folding animation.
- **2D Parametric Geometry**: Dynamic XML/SVG vector path engine (`js/dieline-engine.js`).
- **3D Export**: Native `THREE.GLTFExporter` for producing binary GLTF/GLB packaging assets.

## 🛠️ Local Development

Running this app locally:

```bash
# Clone the repository
git clone https://github.com/BayDKen/packmockup.git

# Enter directory
cd packmockup

# Run local HTTP server (needed for CORS texture canvas)
# Option A: using Python
python -m http.server 8000

# Option B: using Node.js (npx)
npx serve .
```
Open `http://localhost:8000` in your web browser.

## 📜 License
This project is licensed under the [MIT](LICENSE) License. Free for both personal and commercial use.
