<div align="center">
  <img src="https://raw.githubusercontent.com/BayDKen/packmockup/main/css/badge.png" alt="PackMockup Logo" width="80" onError="this.style.display='none'"/>
  <h1>PackMockup 📦</h1>
  <p><strong>A Free, Powerful Web-Based Packaging & Dieline Generator</strong></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Vercel Deploy](https://img.shields.io/badge/Vercel-Deployed-black.svg?logo=vercel)](#deployment)
  
</div>

---

**PackMockup** is a high-quality, entirely browser-based alternative to expensive packaging design tools (like Pacdora). It allows graphic designers, packaging engineers, and e-commerce sellers to generate accurate 2D structural die-cut templates (dielines) and instantly preview how their designs look folded in a 3D WebGL environment—**completely free and without watermarks.**

## ✨ Key Features

- 📏 **Parametric Dieline Generator**: Instantly generate structurally sound packaging templates. Just input your custom Width, Height, Depth, and Bleed margin.
- ✂️ **6 Diverse Templates**: Supports standard industry packaging: *Tuck End Box, Mailer Box, Sleeve Wrap, Pillow Box, Pyramid Box,* and *Paper Bag*.
- 🎨 **Graphic Overlay & Slicing Engine**: Upload a flat 2D graphic over your dieline. The built-in slicing engine automatically cuts your graphic along the fold lines.
- 🧊 **Instant 3D Fold Preview**: Watch your flat 2D graphics magically fold into an interactive 3D box. Rotate, zoom, and inspect your physical product before printing.
- 💾 **High-Res Export**: 
  - **SVG**: For vector editing in Illustrator/CorelDRAW.
  - **PNG**: 3000px transparent output for presentations.
  - **PDF**: Direct browser printing for rapid prototyping.

## 🚀 Live Demo

You can easily deploy and host this project for free using Vercel. 
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FBayDKen%2Fpackmockup)

## 📖 User Guide

### 1. Generating a Dieline
1. Navigate to the **Dieline** page from the top menu.
2. Select a packaging shape from the **Left Sidebar**.
3. Adjust the `W` (Width), `H` (Height), and `D` (Depth) sliders to match your physical product.
4. The SVG blueprint in the center will automatically redraw in real-time.

### 2. Creating the 3D Mockup
1. Once your dimensions are set, click **Upload Design** to apply your branding image.
2. The image will appear as a layer beneath the red (cut) and blue (fold) dielines.
3. Use the **Design Adjustments** panel to scale and move your graphic until it aligns properly with the panels.
4. Click the purple **⬡ 3D Preview** button. The engine will map your 2D panels onto a WebGL 3D model!

## 💻 Technical Architecture

Built entirely without massive frontend frameworks to keep the app lightning-fast and universally compatible.

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS Variables.
- **2D Rendering Engine**: Custom JavaScript geometric path generator that outputs parametric XML/SVG strings.
- **3D Rendering**: `Three.js` (WebGL) paired with `OrbitControls` for fluid interaction.
- **File Processing**: Native DOM Canvas API for slicing 2D coordinates into multiple mapped UV textures.

## 🛠️ Local Development

Running this app locally is as simple as opening an HTML file:

```bash
# Clone the repository
git clone https://github.com/BayDKen/packmockup.git

# Enter directory
cd packmockup

# Run locally (Requires a simple local server due to CORS for 3D textures)
# Option A: using Python
python -m http.server 8000
# Option B: using Node.js (npx)
npx serve .
```
Navigate to `http://localhost:8000` in your web browser.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](../../issues). If you want to add a new box shape, look at `js/dieline-engine.js` where the SVG geometries are generated.

## 📜 License
This project is [MIT](LICENSE) licensed. Free for personal and commercial use. If this project helped your business, considering starring ⭐️ the repository!
