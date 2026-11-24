import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const params = new URLSearchParams(location.search);
const W = +(params.get("w") || 1200), H = +(params.get("h") || 900);
const BG = params.get("bg"); // e.g. 0f1621 for opaque video frames

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: !BG, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
if (BG) renderer.setClearColor(new THREE.Color("#" + BG), 1); else renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(4, 7, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.radius = 6;
key.shadow.blurSamples = 20;
key.shadow.bias = -0.0005;
const sc = key.shadow.camera; sc.left = -6; sc.right = 6; sc.top = 6; sc.bottom = -6; sc.near = 0.5; sc.far = 25;
scene.add(key);
const rim = new THREE.DirectionalLight(0x3ecf9a, 1.5);
rim.position.set(-5, 1.6, -6);
scene.add(rim);
const fill = new THREE.DirectionalLight(0xbfd4ff, 0.5);
fill.position.set(-6, 2, 4);
scene.add(fill);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.38 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

/** Matte filament with subtle printed layer lines (by world height). */
function filament(color, { rough = 0.62, lines = 0.07, gloss = false } = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, clearcoat: gloss ? 0.3 : 0.05, clearcoatRoughness: 0.5, sheen: 0.25, sheenRoughness: 0.6, sheenColor: new THREE.Color(color).multiplyScalar(0.5) });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp;")
      .replace("#include <color_fragment>", `#include <color_fragment>
        float ly = fract(vWp.y / ${lines.toFixed(4)});
        float band = smoothstep(0.0, 0.18, ly) * smoothstep(1.0, 0.82, ly);
        diffuseColor.rgb *= mix(0.84, 1.0, band);`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + (1.0 - band) * 0.18, 0.0, 1.0);`);
  };
  return m;
}
const C = { graphite: 0x2b3038, black: 0x1c1f24, white: 0xe9ebe6, green: 0x3ecf9a, greenDeep: 0x23a877 };

function mesh(geo, mat) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; return m; }
function rbox(w, h, d, r = 0.06, seg = 4) { return new RoundedBoxGeometry(w, h, d, seg, r); }
function extrude(shape, depth, bevel = 0.03) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 48 });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}
function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
const circlePath = (x, y, r) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); return p; };

let font = null;
async function getFont() {
  if (!font) font = await new FontLoader().loadAsync("node_modules/three/examples/fonts/helvetiker_bold.typeface.json");
  return font;
}
function text(str, size, depth, mat) {
  const g = new TextGeometry(str, { font, size, depth, curveSegments: 8, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.008, bevelSegments: 2 });
  g.computeBoundingBox(); const b = g.boundingBox;
  g.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, 0);
  return mesh(g, mat);
}

// ─── The prints ──────────────────────────────────────────────────────────────
const builders = {
  bracket() {
    const g = new THREE.Group();
    const body = filament(C.graphite);
    g.add(Object.assign(mesh(rbox(2.2, 0.22, 1.3, 0.08), body), {}));
    g.children[0].position.y = 0.11;
    // threaded post (lathe with a saw-tooth profile)
    const pts = [new THREE.Vector2(0, 0)];
    for (let y = 0; y <= 2.2; y += 0.05) pts.push(new THREE.Vector2(0.2 + (Math.round(y / 0.05) % 2 ? 0.035 : 0), y));
    pts.push(new THREE.Vector2(0, 2.2));
    const post = mesh(new THREE.LatheGeometry(pts, 48), body); post.position.y = 0.22; g.add(post);
    const nut = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.26, 6), filament(C.green)); nut.position.y = 1.05; g.add(nut);
    const cradle = mesh(rbox(1.9, 0.16, 1.0, 0.06), body); cradle.position.y = 2.5; g.add(cradle);
    for (const x of [-0.88, 0.88]) { const lip = mesh(rbox(0.14, 0.34, 1.0, 0.05), body); lip.position.set(x, 2.66, 0); g.add(lip); }
    const pad = mesh(rbox(1.5, 0.06, 0.8, 0.03), filament(C.green, { rough: 0.85 })); pad.position.y = 2.6; g.add(pad);
    // a hint of the graphics card it holds
    const gpu = mesh(rbox(3.4, 0.5, 1.5, 0.06), new THREE.MeshPhysicalMaterial({ color: 0x0d1117, roughness: 0.35, metalness: 0.6, transparent: true, opacity: 0.28 }));
    gpu.position.set(0.5, 2.96, 0); gpu.castShadow = false; if (!window.NO_GPU) g.add(gpu);
    return { g, cam: [5.2, 3.6, 6.2], look: [0.2, 1.5, 0], fov: 30, fit: 1.02 };
  },
  comb() {
    const g = new THREE.Group();
    const n = 8, pitch = 0.36, w = n * pitch + 0.3;
    const shape = roundedRect(w, 0.62, 0.14);
    for (let i = 0; i < n; i++) shape.holes.push(circlePath(-w / 2 + 0.15 + pitch / 2 + i * pitch, 0, 0.13));
    const geo = extrude(shape, 0.16, 0.025);
    const mats = [filament(C.white), filament(C.graphite), filament(C.green)];
    const combs = [];
    [-1.35, 0, 1.35].forEach((z, i) => {
      const c = mesh(geo, mats[i]);
      c.position.set(0, 0.95, z);
      g.add(c); combs.push(c);
    });
    // sleeved cables running through the combs
    const sleeveA = new THREE.MeshPhysicalMaterial({ color: 0x15181d, roughness: 0.75, sheen: 0.6, sheenColor: 0x334, sheenRoughness: 0.5 });
    const sleeveB = new THREE.MeshPhysicalMaterial({ color: 0xdfe3e6, roughness: 0.7, sheen: 0.4, sheenRoughness: 0.5 });
    for (let i = 0; i < n; i++) {
      const cab = mesh(new THREE.CylinderGeometry(0.105, 0.105, 4.6, 24), i % 2 ? sleeveA : sleeveB);
      cab.rotation.x = Math.PI / 2; cab.position.set(-w / 2 + 0.15 + pitch / 2 + i * pitch, 0.95, 0); g.add(cab);
    }
    return { g, cam: [4.6, 3.4, 5.6], look: [0, 0.8, 0], fov: 32 };
  },
  stand() {
    const g = new THREE.Group();
    const body = filament(C.white);
    const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(1.15, 0), new THREE.Vector2(1.2, 0.05), new THREE.Vector2(1.2, 0.13), new THREE.Vector2(1.13, 0.2), new THREE.Vector2(0.35, 0.24), new THREE.Vector2(0, 0.24)];
    g.add(mesh(new THREE.LatheGeometry(pts, 96), body));
    const col = mesh(rbox(0.36, 3.2, 0.36, 0.1), body); col.position.y = 1.8; g.add(col);
    const arc = new THREE.Shape();
    const R = 1.05, r = 0.86, a0 = 0.35, a1 = Math.PI - 0.35;
    arc.absarc(0, 0, R, a0, a1, false); arc.absarc(0, 0, r, a1, a0, true);
    const saddle = mesh(extrude(arc, 0.78, 0.04), body); saddle.position.y = 3.35 - R; g.add(saddle);
    const padShape = new THREE.Shape(); padShape.absarc(0, 0, R + 0.06, 0.75, Math.PI - 0.75, false); padShape.absarc(0, 0, R - 0.01, Math.PI - 0.75, 0.75, true);
    const pad = mesh(extrude(padShape, 0.7, 0.02), filament(C.green, { rough: 0.85 })); pad.position.y = 3.35 - R; g.add(pad);
    g.rotation.y = -0.5;
    return { g, cam: [4.2, 3.2, 6.4], look: [0, 1.75, 0], fov: 34 };
  },
  controller() {
    const g = new THREE.Group();
    const body = filament(C.graphite);
    // holder: base, an angled back rest and a front lip
    const base = mesh(rbox(4.6, 0.24, 1.7, 0.08), body); base.position.y = 0.12; g.add(base);
    const back = mesh(rbox(4.6, 2.0, 0.22, 0.08), body); back.position.set(0, 1.05, -0.55); back.rotation.x = -0.26; g.add(back);
    const lip = mesh(rbox(4.6, 0.34, 0.2, 0.07), filament(C.green)); lip.position.set(0, 0.36, 0.62); g.add(lip);
    const div = mesh(rbox(0.18, 1.1, 1.2, 0.06), body); div.position.set(0, 0.7, -0.02); g.add(div);
    // a gamepad outline, extruded
    const s = new THREE.Shape();
    s.moveTo(-0.55, 0.55);
    s.lineTo(0.55, 0.55);
    s.bezierCurveTo(0.95, 0.58, 1.05, 0.3, 1.1, 0.05);
    s.bezierCurveTo(1.2, -0.35, 1.15, -0.78, 0.88, -0.8);
    s.bezierCurveTo(0.68, -0.82, 0.58, -0.45, 0.42, -0.3);
    s.lineTo(-0.42, -0.3);
    s.bezierCurveTo(-0.58, -0.45, -0.68, -0.82, -0.88, -0.8);
    s.bezierCurveTo(-1.15, -0.78, -1.2, -0.35, -1.1, 0.05);
    s.bezierCurveTo(-1.05, 0.3, -0.95, 0.58, -0.55, 0.55);
    const padGeo = extrude(s, 0.32, 0.08);
    const pads = [
      { x: -1.15, shell: new THREE.MeshPhysicalMaterial({ color: 0xe9ebe6, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35 }) },
      { x: 1.15, shell: new THREE.MeshPhysicalMaterial({ color: 0x15181d, roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.35 }) },
    ];
    const dark = new THREE.MeshStandardMaterial({ color: 0x0b0d10, roughness: 0.7 });
    const accent = new THREE.MeshStandardMaterial({ color: 0x3ecf9a, roughness: 0.4, emissive: 0x0d3a2a });
    for (const p of pads) {
      const c = new THREE.Group();
      c.add(mesh(padGeo, p.shell));
      for (const [x, y] of [[-0.42, 0.1], [0.24, -0.2]]) {
        const st = mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.14, 32), dark); st.rotation.x = Math.PI / 2; st.position.set(x, y, 0.24); c.add(st);
      }
      for (const [x, y] of [[0.62, 0.22], [0.78, 0.08], [0.62, -0.06], [0.46, 0.08]]) {
        const b = mesh(new THREE.SphereGeometry(0.06, 16, 12), accent); b.scale.z = 0.6; b.position.set(x, y, 0.2); c.add(b);
      }
      const dp1 = mesh(rbox(0.26, 0.08, 0.06, 0.02), dark); dp1.position.set(-0.22, -0.2, 0.21); c.add(dp1);
      const dp2 = mesh(rbox(0.08, 0.26, 0.06, 0.02), dark); dp2.position.set(-0.22, -0.2, 0.21); c.add(dp2);
      c.position.set(p.x, 1.25, -0.12); c.rotation.x = -0.26;
      g.add(c);
    }
    g.rotation.y = -0.35;
    return { g, cam: [3.2, 3.0, 6.4], look: [0, 1.0, 0], fov: 30 };
  },
  grill() {
    const g = new THREE.Group();
    const frameShape = roundedRect(3.0, 3.0, 0.32);
    frameShape.holes.push(circlePath(0, 0, 1.36));
    for (const [x, y] of [[-1.18, -1.18], [1.18, -1.18], [-1.18, 1.18], [1.18, 1.18]]) frameShape.holes.push(circlePath(x, y, 0.11));
    const body = filament(C.graphite);
    g.add(mesh(extrude(frameShape, 0.14, 0.02), body));
    for (const r of [1.08, 0.78, 0.48]) {
      const ring = new THREE.Shape(); ring.absarc(0, 0, r + 0.05, 0, Math.PI * 2, false);
      ring.holes.push(circlePath(0, 0, r - 0.05));
      g.add(mesh(extrude(ring, 0.1, 0.015), body));
    }
    for (let i = 0; i < 6; i++) {
      const sp = mesh(rbox(2.75, 0.07, 0.09, 0.02), body); sp.rotation.z = (i * Math.PI) / 6; g.add(sp);
    }
    const hub = new THREE.Shape(); hub.absarc(0, 0, 0.26, 0, Math.PI * 2, false);
    const h = mesh(extrude(hub, 0.14, 0.03), filament(C.green)); g.add(h);
    g.rotation.x = -Math.PI / 2 + 0.0; g.position.y = 0.09;
    const wrap = new THREE.Group(); wrap.add(g);
    // stand it up a little toward the camera on a fan
    const fan = new THREE.Group();
    const fanFrame = mesh(rbox(3.0, 0.9, 3.0, 0.12), new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.6 }));
    fanFrame.position.y = 0.45; fan.add(fanFrame);
    g.position.y = 0.97;
    wrap.add(fan);
    wrap.rotation.y = 0.4;
    return { g: wrap, cam: [3.6, 5.6, 5.2], look: [0, 0.7, 0], fov: 32 };
  },
  async keycap() {
    await getFont();
    const g = new THREE.Group();
    function cap(mat, legend, legendMat) {
      const geo = rbox(1, 0.78, 1, 0.12, 5);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i), t = (y + 0.39) / 0.78;
        const k = 1 - 0.2 * t;
        let x = p.getX(i) * k, z = p.getZ(i) * k;
        let yy = y;
        if (y > 0.3) yy -= 0.05 * Math.max(0, 1 - (x * x + z * z) / 0.2);
        p.setXYZ(i, x, yy, z);
      }
      geo.computeVertexNormals();
      const c = new THREE.Group(); const m = mesh(geo, mat); m.position.y = 0.39; c.add(m);
      if (legend) { const t = text(legend, 0.32, 0.03, legendMat); t.rotation.x = -Math.PI / 2; t.position.set(0, 0.765, 0); c.add(t); }
      return c;
    }
    const gr = filament(C.graphite), wh = filament(C.white), gn = filament(C.green);
    const layout = [["Q", -1.12, -1.1, wh, gr], ["W", 0, -1.1, gn, gr], ["E", 1.12, -1.1, wh, gr], ["A", -1.12, 0, gr, gn], ["S", 0, 0, gr, gn], ["D", 1.12, 0, gr, gn]];
    for (const [l, x, z, m, lm] of layout) { const c = cap(m, l, lm); c.position.set(x + (z ? -0.28 : 0), 0, z); g.add(c); }
    g.rotation.y = -0.35;
    return { g, cam: [3.4, 4.4, 5.2], look: [0, 0.2, -0.3], fov: 32 };
  },
  async collection() {
    window.NO_GPU = true;
    const g = new THREE.Group();
    const a = (await builders.bracket()).g; a.scale.setScalar(0.62); a.position.set(-2.1, 0, -0.6); a.rotation.y = 0.5; g.add(a);
    const b = (await builders.stand()).g; b.scale.setScalar(0.62); b.position.set(2.0, 0, -0.7); b.rotation.y = -0.2; g.add(b);
    const c = (await builders.keycap()).g; c.scale.setScalar(0.62); c.position.set(0.1, 0, 0.9); c.rotation.y = -0.15; g.add(c);
    const d = (await builders.grill()).g; d.scale.setScalar(0.42); d.position.set(-0.4, 0, -1.6); d.rotation.y = 0.2; g.add(d);
    return { g, cam: [1.6, 4.2, 7.0], look: [0, 0.6, 0], fov: 30, fit: 0.7 };
  },
  async plate() {
    await getFont();
    const g = new THREE.Group();
    const plate = new THREE.Group();
    plate.add(mesh(rbox(4.2, 1.25, 0.2, 0.08), filament(C.graphite)));
    const t = text("PLAYER ONE", 0.34, 0.09, filament(C.green));
    t.position.y = 0.08;
    t.position.z = 0.1; plate.add(t);
    const line = mesh(rbox(3.0, 0.05, 0.06, 0.02), filament(C.green)); line.position.set(0, -0.36, 0.11); plate.add(line);
    plate.rotation.x = -0.28; plate.position.y = 0.78;
    g.add(plate);
    const base = mesh(rbox(4.0, 0.2, 0.9, 0.08), filament(C.graphite)); base.position.set(0, 0.1, -0.05); g.add(base);
    g.rotation.y = -0.38;
    return { g, cam: [2.8, 2.6, 6.2], look: [0, 0.65, 0], fov: 32 };
  },
};

const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 100);

window.renderItem = async (name) => {
  const { g, cam, look, fov, fit } = await builders[name]();
  if (fit) window.FIT = fit;
  scene.add(g);
  camera.fov = fov; camera.updateProjectionMatrix();
  const box = new THREE.Box3().setFromObject(g);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const dir = new THREE.Vector3(...cam).sub(new THREE.Vector3(...look)).normalize();
  const dist = (sphere.radius * (window.FIT || 0.8)) / Math.sin(THREE.MathUtils.degToRad(fov / 2));
  camera.position.copy(sphere.center).addScaledVector(dir, dist);
  camera.lookAt(sphere.center);
  renderer.render(scene, camera);
  return renderer.domElement.toDataURL("image/png");
};

// ─── "Something custom": shapes being printed layer by layer ─────────────────
window.setupPrinting = () => {
  const shapes = [
    () => { const gg = new THREE.TorusKnotGeometry(0.85, 0.28, 220, 32, 2, 3); gg.translate(0, 1.4, 0); return gg; },
    () => { // twisted vase
      const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push(new THREE.Vector2(0.55 + 0.5 * Math.sin(t * Math.PI * 1.1) + 0.12 * t, t * 2.6)); }
      const gg = new THREE.LatheGeometry(pts, 144); const p = gg.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i), z = p.getZ(i); const th = Math.atan2(z, x); const k = 1 + 0.09 * Math.cos(6 * th + y * 1.6); p.setXYZ(i, x * k, y, z * k); }
      gg.computeVertexNormals(); return gg;
    },
    () => { const gg = new THREE.IcosahedronGeometry(1.25, 1); gg.translate(0, 1.3, 0); return gg; },
    () => { // gear
      const s = new THREE.Shape(); const teeth = 12;
      for (let i = 0; i <= teeth * 4; i++) { const a = (i / (teeth * 4)) * Math.PI * 2; const r = [1.25, 1.25, 1.0, 1.0][i % 4]; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? s.lineTo(x, y) : s.moveTo(x, y); }
      s.holes.push(circlePath(0, 0, 0.35));
      const gg = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 });
      gg.rotateX(-Math.PI / 2); gg.translate(0, 0.05, 0); gg.computeVertexNormals(); return gg;
    },
  ];
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const solid = filament(C.green, { lines: 0.05 }); solid.clippingPlanes = [plane];
  const inner = new THREE.MeshBasicMaterial({ color: 0x7dffd0, side: THREE.BackSide, clippingPlanes: [plane] });
  const ghost = new THREE.MeshBasicMaterial({ color: 0x3ecf9a, wireframe: true, transparent: true, opacity: 0.16 });
  const bed = mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.08, 96), new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.85, metalness: 0.15 }));
  bed.position.y = -0.04; scene.add(bed);
  const nozzle = new THREE.Group();
  const cone = mesh(new THREE.ConeGeometry(0.16, 0.36, 32), new THREE.MeshStandardMaterial({ color: 0xc9a86a, metalness: 0.9, roughness: 0.3 }));
  cone.rotation.x = Math.PI; cone.position.y = 0.18; nozzle.add(cone);
  const head = mesh(rbox(0.9, 0.6, 0.7, 0.08), new THREE.MeshStandardMaterial({ color: 0x20262f, roughness: 0.5, metalness: 0.4 }));
  head.position.y = 0.66; nozzle.add(head);
  const glow = new THREE.PointLight(0x7dffd0, 1.2, 1.6); glow.position.y = -0.05; nozzle.add(glow);
  scene.add(nozzle);
  const holder = new THREE.Group(); scene.add(holder);
  const meshes = shapes.map((f) => {
    const geo = f(); geo.computeBoundingBox();
    const grp = new THREE.Group();
    const a = mesh(geo, solid); const b = new THREE.Mesh(geo, inner); const c = new THREE.Mesh(geo, ghost);
    grp.add(a, b, c); grp.visible = false; holder.add(grp);
    return { grp, top: geo.boundingBox.max.y, ghost: c };
  });
  camera.fov = 30; camera.position.set(5.0, 4.2, 6.8); camera.lookAt(0, 1.05, 0); camera.updateProjectionMatrix();
  const PER = 3.2; // seconds per shape
  window.printFrame = (t) => {
    const k = Math.floor(t / PER) % meshes.length, u = (t % PER) / PER;
    meshes.forEach((m, i) => (m.grp.visible = i === k));
    const m = meshes[k];
    const grow = Math.min(1, u / 0.72);
    const e = grow < 1 ? grow : 1;
    const h = e * (m.top + 0.02);
    plane.constant = h;
    m.ghost.material.opacity = 0.16 * (1 - Math.max(0, (u - 0.7) / 0.3));
    holder.rotation.y = t * 0.45;
    const a = t * 7.3;
    nozzle.position.set(grow < 1 ? Math.sin(a) * 0.7 : 0, h + 0.02 + (grow < 1 ? 0 : (u - 0.72) * 3), grow < 1 ? Math.cos(a * 0.77) * 0.6 : 0);
    const fade = u > 0.9 ? 1 - (u - 0.9) / 0.1 : 1;
    m.grp.scale.setScalar(0.96 + 0.04 * fade);
    solid.opacity = fade; solid.transparent = fade < 1;
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL("image/jpeg", 0.92);
  };
  window.PER_TOTAL = PER * meshes.length;
};
window.ready = true;
