import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export interface TrustPairSceneOptions {
  /** Respect prefers-reduced-motion: static pose, no loop, no parallax. */
  reducedMotion: boolean;
}

export interface TrustPairSceneHandle {
  dispose: () => void;
}

function roundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  return shape;
}

function makeSlab(low: boolean): THREE.Mesh {
  const shape = roundedRectShape(1.5, 2.6, 0.42);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.28,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.03,
    bevelSegments: low ? 2 : 4,
    curveSegments: low ? 7 : 12,
  });
  geo.translate(0, 0, -0.14);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2a2e39,
    metalness: 0.72,
    roughness: 0.4,
  });
  return new THREE.Mesh(geo, mat);
}

function makeScreen(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(1.1, 1.96);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0a141f,
    emissive: 0x0e2c44,
    emissiveIntensity: 0.5,
    metalness: 0.05,
    roughness: 0.45,
  });
  return new THREE.Mesh(geo, mat);
}

function makeHook(low: boolean): THREE.Mesh {
  // Curved "clasp" piece at the top of each device — two of them interlock.
  const geo = new THREE.TorusGeometry(0.34, 0.05, low ? 6 : 12, low ? 24 : 40, Math.PI * 1.12);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3a4050,
    metalness: 0.85,
    roughness: 0.3,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.22,
  });
  return new THREE.Mesh(geo, mat);
}

function makeBeam(low: boolean): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.02, 0.6, 0.34),
    new THREE.Vector3(0, 0.18, 0.52),
    new THREE.Vector3(1.02, 0.6, 0.34),
  ]);
  const geo = new THREE.TubeGeometry(curve, low ? 12 : 24, 0.018, low ? 5 : 8, false);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Mesh(geo, mat);
}

function makeGlowSprite(): THREE.Sprite {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(125, 211, 252, 0.85)");
    gradient.addColorStop(0.35, "rgba(56, 189, 248, 0.28)");
    gradient.addColorStop(1, "rgba(56, 189, 248, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({
    map: texture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.6, 1.6, 1);
  return sprite;
}

/**
 * The Trust Pair — an original procedural sculpture: two device slabs incline
 * toward each other like two people about to shake hands, bridged by a slowly
 * forming luminous connection with a confirmation node, inside a thin orbital
 * ring.
 */
export function createTrustPairScene(
  container: HTMLElement,
  options: TrustPairSceneOptions,
): TrustPairSceneHandle {
  const reducedMotion = options.reducedMotion;
  const low = container.clientWidth > 0 && container.clientWidth < 680;

  const width = Math.max(container.clientWidth, 1);
  const height = Math.max(container.clientHeight, 1);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  const dprCap = low ? 1.5 : 1.9;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const canvas = renderer.domElement;
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  container.appendChild(canvas);

  const scene = new THREE.Scene();

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  let envMap: THREE.Texture | null = null;
  try {
    envMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;
  } catch {
    envMap = null;
  }

  const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
  camera.position.set(0, 0.4, 7.6);
  camera.lookAt(0, 0.12, 0);

  // Lights
  scene.add(new THREE.HemisphereLight(0xffffff, 0x16181f, 0.6));
  const key = new THREE.DirectionalLight(0xbcd7ff, 1.55);
  key.position.set(3.5, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x38bdf8, 0.9);
  rim.position.set(-4.5, -1.5, -3);
  scene.add(rim);
  const back = new THREE.DirectionalLight(0xffffff, 0.4);
  back.position.set(0, 2.5, -6);
  scene.add(back);

  const root = new THREE.Group();

  // Two devices, each with screen + clasp hook, inclining toward each other.
  const left = new THREE.Group();
  const right = new THREE.Group();

  const leftSlab = makeSlab(low);
  const rightSlab = makeSlab(low);
  left.add(leftSlab);
  right.add(rightSlab);

  const leftScreen = makeScreen();
  leftScreen.position.z = 0.152;
  left.add(leftScreen);
  const rightScreen = makeScreen();
  rightScreen.position.z = 0.152;
  right.add(rightScreen);

  const leftHook = makeHook(low);
  leftHook.position.set(0, 1.34, 0.12);
  leftHook.rotation.z = -1.25;
  leftHook.rotation.y = 0.35;
  left.add(leftHook);
  const rightHook = makeHook(low);
  rightHook.position.set(0, 1.34, 0.12);
  rightHook.rotation.z = 1.25;
  rightHook.rotation.y = -0.35;
  right.add(rightHook);

  left.position.x = -1.62;
  right.position.x = 1.62;
  left.rotation.z = -0.3;
  right.rotation.z = 0.3;
  left.rotation.y = -0.24;
  right.rotation.y = 0.24;
  left.rotation.x = 0.05;
  right.rotation.x = 0.05;

  root.add(left);
  root.add(right);

  // The trust connection: beam + confirmation node + ring.
  const beam = makeBeam(low);
  root.add(beam);

  const nodeGroup = new THREE.Group();
  const nodeGeo = new THREE.IcosahedronGeometry(0.14, 1);
  const nodeMat = new THREE.MeshStandardMaterial({
    color: 0x0a2436,
    emissive: 0x38bdf8,
    emissiveIntensity: 2.4,
    roughness: 0.25,
    metalness: 0.2,
  });
  const node = new THREE.Mesh(nodeGeo, nodeMat);
  nodeGroup.add(node);
  const nodeRingGeo = new THREE.TorusGeometry(0.3, 0.012, low ? 6 : 10, low ? 48 : 64);
  const nodeRingMat = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.55,
  });
  const nodeRing = new THREE.Mesh(nodeRingGeo, nodeRingMat);
  nodeRing.rotation.x = Math.PI / 2.4;
  nodeRing.rotation.y = 0.5;
  nodeGroup.add(nodeRing);
  nodeGroup.position.set(0, 0.36, 0.42);
  root.add(nodeGroup);

  const glow = makeGlowSprite();
  glow.position.copy(nodeGroup.position);
  root.add(glow);

  // Thin orbital ring with a verification satellite.
  const orbitGroup = new THREE.Group();
  const orbitGeo = new THREE.TorusGeometry(2.9, 0.009, low ? 5 : 8, low ? 72 : 128);
  const orbitMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
  });
  const orbit = new THREE.Mesh(orbitGeo, orbitMat);
  orbit.rotation.x = 1.28;
  orbit.rotation.y = -0.18;
  orbitGroup.add(orbit);

  const satelliteGeo = new THREE.SphereGeometry(0.05, low ? 10 : 16, low ? 10 : 16);
  const satelliteMat = new THREE.MeshStandardMaterial({
    color: 0x0a2436,
    emissive: 0x7dd3fc,
    emissiveIntensity: 2.2,
  });
  const satellite = new THREE.Mesh(satelliteGeo, satelliteMat);
  orbitGroup.add(satellite);
  root.add(orbitGroup);

  scene.add(root);

  // --- State ---
  let disposed = false;
  let running = false;
  let raf = 0;
  let time = 0;
  const timer = new THREE.Timer();
  let tpx = 0;
  let tpy = 0;
  const beamMat = beam.material as THREE.MeshBasicMaterial;

  function updateSize() {
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (reducedMotion || !running) renderOnce();
  }

  function renderOnce() {
    if (disposed) return;
    renderer.render(scene, camera);
  }

  function update() {
    const sway = Math.sin(time * 0.2) * 0.13;
    const targetY = sway + tpx * 0.18;
    const targetX = -tpy * 0.08;
    root.rotation.y += (targetY - root.rotation.y) * 0.05;
    root.rotation.x += (targetX - root.rotation.x) * 0.05;

    satellite.position.set(2.9 * Math.cos(time * 0.42), 0, 2.9 * Math.sin(time * 0.42) * 0.62);

    const pulse = Math.sin(time * 0.85 - 1.2);
    beamMat.opacity = 0.55 + 0.3 * pulse;
    node.scale.setScalar(1 + 0.11 * pulse);
    glow.scale.setScalar(1.55 + 0.25 * pulse);
  }

  function frame() {
    if (!running || disposed) return;
    raf = requestAnimationFrame(frame);
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    time += dt;
    update();
    renderer.render(scene, camera);
  }

  function startLoop() {
    if (running || disposed || reducedMotion) return;
    running = true;
    timer.update();
    frame();
  }

  function stopLoop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // Pause while off-screen or the document is hidden.
  const observer = new IntersectionObserver(
    (entries) => {
      const intersecting = entries.some((entry) => entry.isIntersecting);
      if (intersecting) startLoop();
      else stopLoop();
    },
    { threshold: 0.08 },
  );
  observer.observe(container);

  const onVisibility = () => {
    if (document.hidden) stopLoop();
    else if (reducedMotion) renderOnce();
    else startLoop();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const resizeObserver = new ResizeObserver(() => updateSize());
  resizeObserver.observe(container);

  // Subtle pointer parallax (fine pointers only, never under reduced motion).
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const onPointerMove = (event: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    tpx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    tpy = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };
  const onPointerLeave = () => {
    tpx = 0;
    tpy = 0;
  };
  if (finePointer && !reducedMotion) {
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerleave", onPointerLeave);
  }

  const onContextLost = (event: Event) => {
    event.preventDefault();
    stopLoop();
  };
  const onContextRestored = () => {
    if (reducedMotion) renderOnce();
    else startLoop();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  // Kick off.
  if (reducedMotion) {
    renderOnce();
  } else {
    startLoop();
  }

  return {
    dispose() {
      disposed = true;
      stopLoop();
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      if (finePointer && !reducedMotion) {
        container.removeEventListener("pointermove", onPointerMove);
        container.removeEventListener("pointerleave", onPointerLeave);
      }
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);

      root.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.geometry) return;
        mesh.geometry.dispose();
        const material = (mesh as THREE.Mesh).material as
          THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) {
          material.forEach((m) => disposeMaterial(m));
        } else if (material) {
          disposeMaterial(material);
        }
      });

      if (envMap) envMap.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

function disposeMaterial(material: THREE.Material) {
  const withMaps = material as THREE.Material & {
    map?: THREE.Texture | null;
    emissiveMap?: THREE.Texture | null;
  };
  withMaps.map?.dispose?.();
  withMaps.emissiveMap?.dispose?.();
  material.dispose();
}
