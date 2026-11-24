# 3D print renders

Makes the product pictures in `app/public/prints/` (and the "being printed" video) from a small three.js scene. Each print is built from simple shapes in `scene.js` (`builders`).

1. `npm i three@0.170.0` in this folder, then serve it: `python3 -m http.server 8765`
2. Pictures: `node shoot.js bracket comb stand controller grill keycap plate collection` (writes `out-<name>.png`, 1200×900, transparent)
3. Video: `node vid.js` (writes `frames/`), then encode with ffmpeg to `printing.mp4` / `printing.webm` (640×480, 24 fps)
4. Convert the PNGs to 800×600 `.webp` and copy them into `app/public/prints/`.

Needs Playwright with Chromium (SwiftShader WebGL works headless).
