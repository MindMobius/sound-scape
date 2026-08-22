import { Geometry, Mesh, Program, Renderer, RenderTarget, Texture } from "ogl";
import { createIcons, Pause, Play, Volume2 } from "lucide";
import {
  backgroundShader,
  membraneShader,
  presentShader,
  vertexShader,
} from "@soundscape/web-visual/membrane-shaders";

import atlasUrl from "../../assets/ui/runtime/membrane-thickness-atlas-v2.png?url";
import fallbackUrl from "../../assets/brand/backgrounds/hero-background-light-right-v1.png?url";

const VARIANT_NAMES = ["A", "B", "C"];
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const LAYOUTS = {
  A: [
    layer(0, [0.76, 0.46], [0.72, 0.66], -0.1, "#aebccc", 0.58, 0.9, 0.007, 0.18, 0.42),
    layer(3, [0.88, 0.72], [0.58, 0.56], 0.16, "#aeb7a7", 0.55, 0.88, 0.006, 0.16, 0.56),
    layer(1, [0.9, 0.55], [0.63, 0.6], 0.08, "#cfbeb1", 0.56, 0.88, 0.006, 0.15, 0.7),
    layer(4, [0.85, 0.51], [0.59, 0.57], -0.17, "#8f9294", 0.48, 0.92, 0.007, 0.17, 0.84),
    layer(2, [0.72, 0.68], [0.62, 0.58], 0.06, "#df745c", 0.56, 0.96, 0.008, 0.2, 0.98),
    layer(5, [0.88, 0.5], [0.56, 0.47], -0.04, "#b9c4d0", 0.3, 0.62, 0.007, 0.2, 1.1),
    layer(6, [0.6, 0.42], [0.53, 0.45], 0.3, "#c9c3b9", 0.28, 0.66, 0.007, 0.18, 1.2),
    layer(7, [0.82, 0.73], [0.48, 0.4], -0.16, "#a9afa7", 0.26, 0.68, 0.006, 0.16, 1.28),
  ],
  B: [
    layer(0, [0.84, 0.46], [0.72, 0.66], -0.1, "#5f8b84", 0.58, 1.12, 0.008, 0.22, 0.42),
    layer(3, [0.88, 0.72], [0.58, 0.56], 0.16, "#b87562", 0.55, 1.08, 0.008, 0.2, 0.56),
    layer(6, [0.8, 0.55], [0.63, 0.6], 0.08, "#aa8d61", 0.52, 1.04, 0.007, 0.19, 0.72),
    layer(2, [0.85, 0.51], [0.59, 0.57], -0.17, "#7d798f", 0.52, 1.1, 0.008, 0.2, 0.86),
    layer(1, [0.86, 0.68], [0.62, 0.58], 0.06, "#69979a", 0.54, 1.05, 0.008, 0.2, 1.0),
    layer(4, [0.84, 0.39], [0.5, 0.47], -0.05, "#b87965", 0.4, 0.98, 0.007, 0.17, 1.12),
    layer(5, [0.55, 0.55], [0.48, 0.42], -0.32, "#889471", 0.27, 0.86, 0.008, 0.16, 1.22),
    layer(7, [0.88, 0.42], [0.43, 0.38], 0.18, "#b69567", 0.24, 0.96, 0.007, 0.15, 1.3),
  ],
  C: [
    layer(0, [0.76, 0.46], [0.78, 0.7], -0.1, "#b1bdcb", 0.55, 0.88, 0.007, 0.19, 0.4),
    layer(3, [0.88, 0.72], [0.64, 0.6], 0.16, "#d7c8bd", 0.52, 0.84, 0.006, 0.17, 0.55),
    layer(1, [0.9, 0.55], [0.68, 0.64], 0.08, "#afb5aa", 0.5, 0.86, 0.006, 0.16, 0.7),
    layer(2, [0.85, 0.51], [0.64, 0.6], -0.17, "#e07a62", 0.56, 0.94, 0.008, 0.2, 0.84),
    layer(4, [0.72, 0.68], [0.67, 0.62], 0.06, "#8e9191", 0.48, 0.9, 0.007, 0.18, 0.98),
    layer(5, [0.84, 0.39], [0.54, 0.5], -0.05, "#bcc5d1", 0.36, 0.78, 0.006, 0.15, 1.1),
    layer(6, [0.76, 0.31], [0.62, 0.48], -0.18, "#c8c4bb", 0.26, 0.68, 0.007, 0.16, 1.2),
    layer(7, [0.56, 0.75], [0.56, 0.43], 0.12, "#aeb4ac", 0.24, 0.7, 0.006, 0.15, 1.28),
  ],
};

const surface = document.querySelector("#surface");
const canvas = document.querySelector("#membrane-field");
const fallback = document.querySelector("#fallback");
const status = document.querySelector("#render-status");
const playButton = document.querySelector("#play-button");
const volume = document.querySelector("#volume");
const volumeOutput = document.querySelector("#volume-output");
const intensity = document.querySelector("#intensity");
const richness = document.querySelector("#richness");
const variantButtons = [...document.querySelectorAll(".variant-switch [data-variant]")];

const state = {
  variant: readVariant(),
  playing: true,
  volume: Number(volume.value) / 100,
  intensity: Number(intensity.value) / 100,
  richness: Number(richness.value) / 100,
  elapsed: 0,
  transitionStartedAt: performance.now(),
  pointer: [0.64, 0.56],
  pointerTarget: [0.64, 0.56],
};

let renderer;
let gl;
let readTarget;
let writeTarget;
let backgroundMesh;
let membraneMesh;
let presentMesh;
let atlasTexture;
let targetMode = "rgba8";
let renderScale = 1;
let animationFrame = 0;
let previousFrameAt = performance.now();
let visible = !document.hidden;
const frameSamples = [];
let measuredFrames = 0;

applyVariant(state.variant, false);
renderIcons();
boot().catch((error) => {
  console.error("Unable to start the optical membrane field", error);
  showFallback("光场初始化失败");
});

async function boot() {
  try {
    renderer = new Renderer({
      canvas,
      alpha: false,
      antialias: false,
      depth: false,
      dpr: Math.min(window.devicePixelRatio || 1, 1.6),
      powerPreference: "high-performance",
      webgl: 2,
    });
  } catch (error) {
    throw new Error(`WebGL context creation failed: ${error.message}`);
  }

  gl = renderer.gl;
  if (!gl) throw new Error("WebGL is unavailable");

  gl.clearColor(0, 0, 0, 1);
  const geometry = new Geometry(gl, {
    position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
    uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
  });

  atlasTexture = await loadAtlas();
  createPipeline(geometry);
  resize();
  installInteractions();

  surface.classList.add("is-ready");
  status.textContent = "实时光场已就绪";
  document.documentElement.dataset.renderer = `webgl2-${targetMode}`;
  canvas.dataset.layers = "5";
  canvas.dataset.atlas = "membrane-thickness-atlas-v2";
  exposeDebugApi();
  animationFrame = requestAnimationFrame(tick);
}

function createPipeline(geometry) {
  const floatTargets =
    renderer.isWebgl2 && Boolean(renderer.getExtension("EXT_color_buffer_float"));
  targetMode = floatTargets ? "rgba16f" : "rgba8";
  readTarget = createTarget(targetMode);
  writeTarget = createTarget(targetMode);

  if (!framebufferComplete(readTarget) || !framebufferComplete(writeTarget)) {
    targetMode = "rgba8";
    readTarget = createTarget(targetMode);
    writeTarget = createTarget(targetMode);
  }

  backgroundMesh = new Mesh(gl, {
    geometry,
    program: new Program(gl, {
      vertex: vertexShader,
      fragment: backgroundShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uVariant: { value: variantIndex(state.variant) },
        uMotion: { value: REDUCED_MOTION ? 0 : 1 },
        uEnergy: { value: state.intensity },
        uPointer: { value: state.pointer },
        uResolution: { value: [1, 1] },
      },
    }),
  });

  membraneMesh = new Mesh(gl, {
    geometry,
    program: new Program(gl, {
      vertex: vertexShader,
      fragment: membraneShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uPrevious: { value: readTarget.texture },
        uAtlas: { value: atlasTexture },
        uTime: { value: 0 },
        uVariant: { value: variantIndex(state.variant) },
        uRotation: { value: 0 },
        uDensity: { value: 1 },
        uOpacity: { value: 1 },
        uRefraction: { value: 0.016 },
        uShadow: { value: 0.6 },
        uSeed: { value: 0 },
        uReveal: { value: 0 },
        uCenter: { value: [0.5, 0.5] },
        uScale: { value: [0.5, 0.5] },
        uCell: { value: [0, 0] },
        uPointer: { value: state.pointer },
        uResolution: { value: [1, 1] },
        uAtlasResolution: { value: [1536, 1024] },
        uTint: { value: [0.7, 0.7, 0.7] },
        uAbsorption: { value: [0.5, 0.5, 0.5] },
      },
    }),
  });

  presentMesh = new Mesh(gl, {
    geometry,
    program: new Program(gl, {
      vertex: vertexShader,
      fragment: presentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uScene: { value: readTarget.texture },
        uTime: { value: 0 },
        uVariant: { value: variantIndex(state.variant) },
        uResolution: { value: [1, 1] },
      },
    }),
  });
}

function renderFrame(now) {
  const variantValue = variantIndex(state.variant);
  const motion = REDUCED_MOTION || !state.playing ? 0 : 1;
  const targetResolution = [readTarget.width, readTarget.height];

  backgroundMesh.program.uniforms.uTime.value = state.elapsed;
  backgroundMesh.program.uniforms.uVariant.value = variantValue;
  backgroundMesh.program.uniforms.uMotion.value = motion;
  backgroundMesh.program.uniforms.uEnergy.value = state.intensity;
  backgroundMesh.program.uniforms.uPointer.value = state.pointer;
  backgroundMesh.program.uniforms.uResolution.value = targetResolution;
  renderer.render({
    scene: backgroundMesh,
    target: readTarget,
    clear: true,
    sort: false,
    frustumCull: false,
  });

  const layers = LAYOUTS[state.variant];
  const activeLayers = 3 + state.richness * 2.75;
  const aspect = readTarget.width / Math.max(readTarget.height, 1);
  const mobileScale = aspect < 0.82 ? Math.max(0.62, aspect / 1.12) : 1;

  layers.forEach((item, index) => {
    const layerVisibility = clamp(activeLayers - index, 0, 1);
    if (layerVisibility <= 0.001) return;

    const revealDelay = REDUCED_MOTION ? 0 : index * 78;
    const revealDuration = REDUCED_MOTION ? 1 : 1160;
    const reveal = easeOutCubic(
      clamp((now - state.transitionStartedAt - revealDelay) / revealDuration, 0, 1),
    );
    const drift = item.drift * motion * (0.55 + state.richness * 0.3);
    const parallaxX = (state.pointer[0] - 0.5) * item.depth * 0.024;
    const parallaxY = (state.pointer[1] - 0.5) * item.depth * 0.018;
    const time = state.elapsed;
    const center = [
      item.center[0] + Math.sin(time * item.speed + item.seed) * drift + parallaxX,
      item.center[1] + Math.cos(time * item.speed * 0.77 + item.seed * 1.3) * drift + parallaxY,
    ];
    const settleScale = 0.94 + reveal * 0.06;
    const scale = [item.scale[0] * settleScale * mobileScale, item.scale[1] * settleScale];
    const tint = item.tint;
    const absorption = tint.map((channel) => (1 - channel) * 1.35 + 0.08);
    const uniforms = membraneMesh.program.uniforms;

    uniforms.uPrevious.value = readTarget.texture;
    uniforms.uTime.value = time;
    uniforms.uVariant.value = variantValue;
    uniforms.uRotation.value = item.rotation + Math.sin(time * 0.08 + item.seed) * 0.009 * motion;
    uniforms.uDensity.value = item.density * (0.82 + state.intensity * 0.36);
    uniforms.uOpacity.value = item.opacity * layerVisibility;
    uniforms.uRefraction.value = item.refraction * (0.8 + state.intensity * 0.35);
    uniforms.uShadow.value = item.shadow * (0.75 + state.intensity * 0.25);
    uniforms.uSeed.value = item.seed;
    uniforms.uReveal.value = reveal;
    uniforms.uCenter.value = center;
    uniforms.uScale.value = scale;
    uniforms.uCell.value = [item.cell % 4, item.cell < 4 ? 0 : 1];
    uniforms.uPointer.value = state.pointer;
    uniforms.uResolution.value = targetResolution;
    uniforms.uTint.value = tint;
    uniforms.uAbsorption.value = absorption;

    renderer.render({
      scene: membraneMesh,
      target: writeTarget,
      clear: false,
      sort: false,
      frustumCull: false,
    });
    [readTarget, writeTarget] = [writeTarget, readTarget];
  });

  presentMesh.program.uniforms.uScene.value = readTarget.texture;
  presentMesh.program.uniforms.uTime.value = state.elapsed;
  presentMesh.program.uniforms.uVariant.value = variantValue;
  presentMesh.program.uniforms.uResolution.value = [canvas.width, canvas.height];
  renderer.render({ scene: presentMesh, clear: true, sort: false, frustumCull: false });
}

function tick(now) {
  animationFrame = requestAnimationFrame(tick);
  const frameTime = Math.min(now - previousFrameAt, 80);
  previousFrameAt = now;
  if (!visible) return;

  if (state.playing) state.elapsed += frameTime / 1000;
  const pointerEase = 1 - Math.exp(-(frameTime / 1000) * 5.5);
  state.pointer[0] += (state.pointerTarget[0] - state.pointer[0]) * pointerEase;
  state.pointer[1] += (state.pointerTarget[1] - state.pointer[1]) * pointerEase;
  renderFrame(now);
  recordFrame(frameTime);
}

function resize() {
  if (!renderer || !readTarget || !writeTarget) return;
  const width = Math.max(surface.clientWidth, 1);
  const height = Math.max(surface.clientHeight, 1);
  const pixelCount = width * height * renderer.dpr * renderer.dpr;
  renderScale = pixelCount > 3_200_000 ? 0.72 : pixelCount > 1_800_000 ? 0.82 : 0.92;
  if (width < 720) renderScale = Math.max(renderScale, 0.92);

  renderer.setSize(width, height);
  readTarget.setSize(
    Math.max(1, Math.floor(width * renderer.dpr * renderScale)),
    Math.max(1, Math.floor(height * renderer.dpr * renderScale)),
  );
  writeTarget.setSize(readTarget.width, readTarget.height);
  canvas.dataset.renderScale = renderScale.toFixed(2);
}

function installInteractions() {
  window.addEventListener("resize", resize, { passive: true });
  surface.addEventListener("pointermove", updatePointer, { passive: true });
  surface.addEventListener("pointerleave", resetPointer, { passive: true });
  surface.addEventListener("pointercancel", resetPointer, { passive: true });
  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
    previousFrameAt = performance.now();
  });

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    cancelAnimationFrame(animationFrame);
    showFallback("实时光场已暂停");
  });
  canvas.addEventListener("webglcontextrestored", () => window.location.reload());

  playButton.addEventListener("click", togglePlayback);
  volume.addEventListener("input", () => {
    state.volume = Number(volume.value) / 100;
    volumeOutput.value = volume.value;
    volumeOutput.textContent = volume.value;
  });
  intensity.addEventListener("input", () => {
    state.intensity = Number(intensity.value) / 100;
  });
  richness.addEventListener("input", () => {
    state.richness = Number(richness.value) / 100;
  });

  variantButtons.forEach((button) => {
    button.addEventListener("click", () => applyVariant(button.dataset.variant));
    button.addEventListener("keydown", handleVariantKeys);
  });
}

function applyVariant(nextVariant, updateHistory = true) {
  const normalized = VARIANT_NAMES.includes(nextVariant) ? nextVariant : "A";
  state.variant = normalized;
  state.transitionStartedAt = performance.now();
  document.documentElement.dataset.variant = normalized;
  document.querySelector('meta[name="theme-color"]').content =
    normalized === "B" ? "#0b0e0f" : normalized === "C" ? "#ecece8" : "#f2f0ec";

  variantButtons.forEach((button) => {
    const selected = button.dataset.variant === normalized;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });

  if (updateHistory) {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", normalized);
    window.history.replaceState({}, "", url);
  }
}

function togglePlayback() {
  state.playing = !state.playing;
  surface.classList.toggle("is-paused", !state.playing);
  playButton.setAttribute("aria-label", state.playing ? "暂停" : "继续播放");
  playButton.title = state.playing ? "暂停" : "继续播放";
  playButton.innerHTML = `<i data-lucide="${state.playing ? "pause" : "play"}" aria-hidden="true"></i>`;
  renderIcons();
}

function updatePointer(event) {
  const bounds = surface.getBoundingClientRect();
  state.pointerTarget[0] = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
  state.pointerTarget[1] = clamp(1 - (event.clientY - bounds.top) / bounds.height, 0, 1);
}

function resetPointer() {
  state.pointerTarget[0] = state.variant === "B" ? 0.7 : 0.64;
  state.pointerTarget[1] = state.variant === "C" ? 0.62 : 0.56;
}

function handleVariantKeys(event) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const current = variantIndex(state.variant);
  const nextIndex =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? 2
        : (current + (event.key === "ArrowRight" ? 1 : -1) + 3) % 3;
  const nextVariant = VARIANT_NAMES[nextIndex];
  applyVariant(nextVariant);
  variantButtons[nextIndex].focus();
}

async function loadAtlas() {
  const image = new Image();
  image.decoding = "async";
  image.src = atlasUrl;
  await image.decode();
  return new Texture(gl, {
    image,
    flipY: true,
    generateMipmaps: false,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
    wrapS: gl.CLAMP_TO_EDGE,
    wrapT: gl.CLAMP_TO_EDGE,
  });
}

function createTarget(mode) {
  const floating = mode === "rgba16f";
  return new RenderTarget(gl, {
    width: 4,
    height: 4,
    depth: false,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
    type: floating ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
    format: gl.RGBA,
    internalFormat: floating ? gl.RGBA16F : gl.RGBA,
  });
}

function framebufferComplete(target) {
  renderer.bindFramebuffer(target);
  const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  renderer.bindFramebuffer();
  return complete;
}

function showFallback(message) {
  status.textContent = message;
  fallback.hidden = false;
  fallback.style.backgroundImage = `url("${fallbackUrl}")`;
  fallback.style.backgroundPosition = "center";
  fallback.style.backgroundSize = "cover";
  surface.classList.remove("is-ready");
}

function renderIcons() {
  createIcons({
    attrs: { "aria-hidden": "true" },
    icons: { Pause, Play, Volume2 },
  });
}

function recordFrame(frameTime) {
  frameSamples.push(frameTime);
  if (frameSamples.length > 120) frameSamples.shift();
  measuredFrames += 1;
  if (measuredFrames % 30 !== 0 || frameSamples.length < 30) return;

  const averageFrameMs = frameSamples.reduce((sum, value) => sum + value, 0) / frameSamples.length;
  const sorted = [...frameSamples].sort((a, b) => a - b);
  canvas.dataset.averageFrameMs = averageFrameMs.toFixed(2);
  canvas.dataset.p95FrameMs = sorted[Math.floor(sorted.length * 0.95)].toFixed(2);
  canvas.dataset.fps = (1000 / averageFrameMs).toFixed(1);
  canvas.dataset.activeLayers = (3 + state.richness * 2.75).toFixed(2);
}

function exposeDebugApi() {
  window.__soundscapeDebug = {
    setVariant: (value) => applyVariant(String(value).toUpperCase()),
    setPointer: (x, y) => {
      state.pointerTarget[0] = clamp(Number(x), 0, 1);
      state.pointerTarget[1] = clamp(Number(y), 0, 1);
    },
    snapshot: () => {
      const averageFrameMs = frameSamples.length
        ? frameSamples.reduce((sum, value) => sum + value, 0) / frameSamples.length
        : 0;
      return {
        ready: surface.classList.contains("is-ready"),
        renderer: renderer.isWebgl2 ? "WebGL2" : "WebGL1",
        targetMode,
        variant: state.variant,
        playing: state.playing,
        activeLayers: 3 + state.richness * 2.75,
        renderScale,
        canvas: [canvas.width, canvas.height],
        averageFrameMs: Number(averageFrameMs.toFixed(2)),
        fps: averageFrameMs ? Number((1000 / averageFrameMs).toFixed(1)) : 0,
        reducedMotion: REDUCED_MOTION,
      };
    },
  };
}

function layer(cell, center, scale, rotation, tint, opacity, density, refraction, shadow, depth) {
  return {
    cell,
    center,
    scale,
    rotation,
    tint: hexToRgb(tint),
    opacity,
    density,
    refraction,
    shadow,
    depth,
    drift: 0.0018 + depth * 0.0014,
    speed: 0.045 + depth * 0.015,
    seed: cell * 1.731 + depth * 2.19,
  };
}

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function readVariant() {
  const value = new URLSearchParams(window.location.search).get("variant")?.toUpperCase();
  return VARIANT_NAMES.includes(value) ? value : "A";
}

function variantIndex(value) {
  return Math.max(0, VARIANT_NAMES.indexOf(value));
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
