import { Geometry, Mesh, Program, Renderer, RenderTarget, Texture } from "ogl";
import atlasUrl from "../../../../assets/experiments/runtime/membrane-thickness-atlas-v2.png?url";
import { membraneShader, presentShader, vertexShader } from "../../../optical-membrane-field/shaders.js";

const backgroundShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uHero;
  uniform float uTime;
  uniform float uMotion;
  uniform float uEnergy;
  uniform float uVariant;
  uniform vec2 uPointer;
  uniform vec2 uResolution;
  uniform vec2 uHeroResolution;

  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  float noise21(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), f.x),
      f.y
    );
  }

  vec2 coverUv(vec2 uv) {
    float viewportAspect = uResolution.x / max(uResolution.y, 1.0);
    float imageAspect = uHeroResolution.x / max(uHeroResolution.y, 1.0);
    vec2 ratio = vec2(
      min(viewportAspect / imageAspect, 1.0),
      min(imageAspect / viewportAspect, 1.0)
    );
    return (uv - 0.5) * ratio + 0.5;
  }

  void main() {
    float t = uTime * uMotion;
    vec2 uv = coverUv(vUv);
    float quietWarp = noise21(vUv * vec2(3.1, 2.4) + vec2(t * 0.011, -t * 0.007)) - 0.5;
    vec2 pointerLean = (uPointer - 0.5) * vec2(0.0035, 0.0025);
    uv = clamp(uv + pointerLean + quietWarp * 0.0008 * (0.5 + uEnergy * 0.5), 0.001, 0.999);

    vec3 color = texture2D(uHero, uv).rgb;
    float paper = noise21(vUv * uResolution / 390.0 + floor(t * 3.0) * 0.013) - 0.5;
    color += paper * (uVariant > 0.5 ? 0.004 : 0.002);
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;

const layerBlueprint = [
  [0, [0.12, 0.14], [0.68, 0.72], -0.12, 0.52, 0.92, 0.007, 0.16, 0.38],
  [3, [0.32, 0.75], [0.58, 0.54], 0.15, 0.43, 0.88, 0.006, 0.15, 0.52],
  [1, [0.38, 0.44], [0.64, 0.58], 0.08, 0.38, 0.86, 0.006, 0.14, 0.66],
  [4, [0.19, 0.58], [0.58, 0.55], -0.17, 0.35, 0.9, 0.007, 0.16, 0.8],
  [2, [0.08, 0.83], [0.58, 0.52], 0.05, 0.32, 0.92, 0.008, 0.18, 0.94],
  [5, [0.46, 0.21], [0.5, 0.45], -0.04, 0.24, 0.66, 0.007, 0.18, 1.08],
  [7, [0.26, 0.33], [0.45, 0.4], 0.19, 0.2, 0.64, 0.006, 0.15, 1.2],
];

export class MembraneField {
  constructor({ canvas, surface, status }) {
    this.canvas = canvas;
    this.surface = surface;
    this.status = status;
    this.playing = false;
    this.active = false;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.intensity = 0.52;
    this.richness = 0.68;
    this.elapsed = 0;
    this.pointer = [0.58, 0.52];
    this.pointerTarget = [0.58, 0.52];
    this.transitionStartedAt = performance.now();
    this.visible = !document.hidden;
    this.previousFrameAt = performance.now();
    this.frameSamples = [];
    this.renderScale = 1;
    this.targetMode = "rgba8";
    this.palette = ["#aebbc7", "#c4b7ae", "#78877d", "#d36b54", "#8a8e90", "#bcc5ce", "#d3ccc2"];
    this.themeIndex = 0;
    this.ready = false;
    this.animationFrame = 0;
  }

  async start(scene) {
    if (this.ready) return { mode: `webgl2-${this.targetMode}` };
    if (this.reducedMotion) {
      document.documentElement.dataset.renderer = "static-reduced-motion";
      this.status.textContent = "静态场域已就绪";
      return { mode: "static" };
    }

    try {
      this.renderer = new Renderer({
        canvas: this.canvas,
        alpha: false,
        antialias: false,
        depth: false,
        dpr: Math.min(window.devicePixelRatio || 1, 1.6),
        powerPreference: "high-performance",
        webgl: 2,
      });
      this.gl = this.renderer.gl;
      if (!this.gl) throw new Error("WebGL is unavailable");

      this.gl.clearColor(0, 0, 0, 1);
      const geometry = new Geometry(this.gl, {
        position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
        uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
      });

      const [atlas, hero] = await Promise.all([this.loadTexture(atlasUrl), this.loadTexture(scene.hero)]);
      this.atlasTexture = atlas.texture;
      this.heroTexture = hero.texture;
      this.heroResolution = hero.resolution;
      this.applySceneStyle(scene);
      this.createPipeline(geometry);
      this.resize();
      this.installInteractions();
      this.ready = true;
      if (!this.reducedMotion) this.surface.classList.add("is-field-ready");
      this.status.textContent = "视觉场域已就绪";
      document.documentElement.dataset.renderer = `webgl2-${this.targetMode}`;
      this.canvas.dataset.atlas = "membrane-thickness-atlas-v2-experimental";
      this.animationFrame = requestAnimationFrame((now) => this.tick(now));
      return { mode: "webgl2" };
    } catch (error) {
      console.error("Unable to start the membrane field", error);
      document.documentElement.dataset.renderer = "static-fallback";
      this.status.textContent = "已切换静态场域";
      return { mode: "static", error };
    }
  }

  createPipeline(geometry) {
    const floatTargets = this.renderer.isWebgl2 && Boolean(this.renderer.getExtension("EXT_color_buffer_float"));
    this.targetMode = floatTargets ? "rgba16f" : "rgba8";
    this.readTarget = this.createTarget(this.targetMode);
    this.writeTarget = this.createTarget(this.targetMode);

    if (!this.framebufferComplete(this.readTarget) || !this.framebufferComplete(this.writeTarget)) {
      this.targetMode = "rgba8";
      this.readTarget = this.createTarget(this.targetMode);
      this.writeTarget = this.createTarget(this.targetMode);
    }

    this.backgroundMesh = new Mesh(this.gl, {
      geometry,
      program: new Program(this.gl, {
        vertex: vertexShader,
        fragment: backgroundShader,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uHero: { value: this.heroTexture },
          uTime: { value: 0 },
          uMotion: { value: 1 },
          uEnergy: { value: this.intensity },
          uVariant: { value: this.themeIndex },
          uPointer: { value: this.pointer },
          uResolution: { value: [1, 1] },
          uHeroResolution: { value: this.heroResolution },
        },
      }),
    });

    this.membraneMesh = new Mesh(this.gl, {
      geometry,
      program: new Program(this.gl, {
        vertex: vertexShader,
        fragment: membraneShader,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uPrevious: { value: this.readTarget.texture },
          uAtlas: { value: this.atlasTexture },
          uTime: { value: 0 },
          uVariant: { value: this.themeIndex },
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
          uPointer: { value: this.pointer },
          uResolution: { value: [1, 1] },
          uAtlasResolution: { value: [1536, 1024] },
          uTint: { value: [0.7, 0.7, 0.7] },
          uAbsorption: { value: [0.5, 0.5, 0.5] },
        },
      }),
    });

    this.presentMesh = new Mesh(this.gl, {
      geometry,
      program: new Program(this.gl, {
        vertex: vertexShader,
        fragment: presentShader,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uScene: { value: this.readTarget.texture },
          uTime: { value: 0 },
          uVariant: { value: this.themeIndex },
          uResolution: { value: [1, 1] },
        },
      }),
    });
  }

  async setScene(scene) {
    this.applySceneStyle(scene);
    if (!this.ready) return;
    const hero = await this.loadTexture(scene.hero);
    this.heroTexture = hero.texture;
    this.heroResolution = hero.resolution;
    this.backgroundMesh.program.uniforms.uHero.value = hero.texture;
    this.backgroundMesh.program.uniforms.uHeroResolution.value = hero.resolution;
    this.transitionStartedAt = performance.now();
  }

  setPlaying(playing) {
    this.playing = Boolean(playing);
  }

  setActive(active) {
    this.active = Boolean(active);
    this.previousFrameAt = performance.now();
  }

  setReducedMotion(reduced) {
    this.reducedMotion = Boolean(reduced);
    this.surface.classList.toggle("is-field-ready", this.ready && !this.reducedMotion);
    if (this.reducedMotion) document.documentElement.dataset.renderer = "static-reduced-motion";
    else if (this.ready) document.documentElement.dataset.renderer = `webgl2-${this.targetMode}`;
    this.previousFrameAt = performance.now();
  }

  setControls({ intensity, richness }) {
    if (Number.isFinite(intensity)) this.intensity = clamp(intensity, 0, 1);
    if (Number.isFinite(richness)) this.richness = clamp(richness, 0, 1);
  }

  applySceneStyle(scene) {
    this.themeIndex = scene.theme === "dark" ? 1 : 0;
    this.palette = scene.palette;
  }

  renderFrame(now) {
    const motion = this.playing ? 1 : 0;
    const targetResolution = [this.readTarget.width, this.readTarget.height];
    const backgroundUniforms = this.backgroundMesh.program.uniforms;
    backgroundUniforms.uTime.value = this.elapsed;
    backgroundUniforms.uMotion.value = motion;
    backgroundUniforms.uEnergy.value = this.intensity;
    backgroundUniforms.uVariant.value = this.themeIndex;
    backgroundUniforms.uPointer.value = this.pointer;
    backgroundUniforms.uResolution.value = targetResolution;
    this.renderer.render({ scene: this.backgroundMesh, target: this.readTarget, clear: true, sort: false, frustumCull: false });

    const activeLayers = 2.4 + this.richness * 4.4;
    const aspect = this.readTarget.width / Math.max(this.readTarget.height, 1);
    const portraitScale = aspect < 0.82 ? Math.max(0.66, aspect / 1.05) : 1;

    layerBlueprint.forEach((blueprint, index) => {
      const visibility = clamp(activeLayers - index, 0, 1);
      if (visibility <= 0.001) return;

      const [cell, centerBase, scaleBase, rotation, opacity, density, refraction, shadow, depth] = blueprint;
      const reveal = easeOutCubic(clamp((now - this.transitionStartedAt - index * 74) / 1120, 0, 1));
      const drift = (0.0014 + depth * 0.0012) * motion * (0.5 + this.richness * 0.28);
      const seed = cell * 1.731 + depth * 2.19;
      const center = [
        centerBase[0] + Math.sin(this.elapsed * (0.04 + depth * 0.014) + seed) * drift + (this.pointer[0] - 0.5) * depth * 0.016,
        centerBase[1] + Math.cos(this.elapsed * (0.035 + depth * 0.012) + seed * 1.3) * drift + (this.pointer[1] - 0.5) * depth * 0.012,
      ];
      const tint = hexToRgb(this.palette[index % this.palette.length]);
      const absorption = tint.map((channel) => (1 - channel) * 1.32 + 0.08);
      const uniforms = this.membraneMesh.program.uniforms;
      uniforms.uPrevious.value = this.readTarget.texture;
      uniforms.uTime.value = this.elapsed;
      uniforms.uVariant.value = this.themeIndex;
      uniforms.uRotation.value = rotation + Math.sin(this.elapsed * 0.075 + seed) * 0.007 * motion;
      uniforms.uDensity.value = density * (0.82 + this.intensity * 0.34);
      uniforms.uOpacity.value = opacity * visibility;
      uniforms.uRefraction.value = refraction * (0.78 + this.intensity * 0.32);
      uniforms.uShadow.value = shadow * (0.76 + this.intensity * 0.24);
      uniforms.uSeed.value = seed;
      uniforms.uReveal.value = reveal;
      uniforms.uCenter.value = center;
      uniforms.uScale.value = [scaleBase[0] * portraitScale, scaleBase[1]];
      uniforms.uCell.value = [cell % 4, cell < 4 ? 0 : 1];
      uniforms.uPointer.value = this.pointer;
      uniforms.uResolution.value = targetResolution;
      uniforms.uTint.value = tint;
      uniforms.uAbsorption.value = absorption;

      this.renderer.render({ scene: this.membraneMesh, target: this.writeTarget, clear: false, sort: false, frustumCull: false });
      [this.readTarget, this.writeTarget] = [this.writeTarget, this.readTarget];
    });

    this.presentMesh.program.uniforms.uScene.value = this.readTarget.texture;
    this.presentMesh.program.uniforms.uTime.value = this.elapsed;
    this.presentMesh.program.uniforms.uVariant.value = this.themeIndex;
    this.presentMesh.program.uniforms.uResolution.value = [this.canvas.width, this.canvas.height];
    this.renderer.render({ scene: this.presentMesh, clear: true, sort: false, frustumCull: false });
  }

  tick(now) {
    this.animationFrame = requestAnimationFrame((nextNow) => this.tick(nextNow));
    const frameTime = Math.min(now - this.previousFrameAt, 80);
    this.previousFrameAt = now;
    if (!this.visible || !this.active || this.reducedMotion) return;

    if (this.playing) this.elapsed += frameTime / 1000;
    const pointerEase = 1 - Math.exp(-(frameTime / 1000) * 5.2);
    this.pointer[0] += (this.pointerTarget[0] - this.pointer[0]) * pointerEase;
    this.pointer[1] += (this.pointerTarget[1] - this.pointer[1]) * pointerEase;
    this.renderFrame(now);
    this.recordFrame(frameTime);
  }

  resize() {
    if (!this.renderer || !this.readTarget || !this.writeTarget) return;
    const width = Math.max(this.surface.clientWidth, 1);
    const height = Math.max(this.surface.clientHeight, 1);
    const pixelCount = width * height * this.renderer.dpr * this.renderer.dpr;
    this.renderScale = pixelCount > 3_200_000 ? 0.72 : pixelCount > 1_800_000 ? 0.82 : 0.92;
    if (width < 720) this.renderScale = Math.max(this.renderScale, 0.92);

    this.renderer.setSize(width, height);
    this.readTarget.setSize(Math.max(1, Math.floor(width * this.renderer.dpr * this.renderScale)), Math.max(1, Math.floor(height * this.renderer.dpr * this.renderScale)));
    this.writeTarget.setSize(this.readTarget.width, this.readTarget.height);
    this.canvas.dataset.renderScale = this.renderScale.toFixed(2);
  }

  installInteractions() {
    window.addEventListener("resize", () => this.resize(), { passive: true });
    this.surface.addEventListener("pointermove", (event) => {
      const bounds = this.surface.getBoundingClientRect();
      this.pointerTarget[0] = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
      this.pointerTarget[1] = clamp(1 - (event.clientY - bounds.top) / bounds.height, 0, 1);
    }, { passive: true });
    this.surface.addEventListener("pointerleave", () => {
      this.pointerTarget = [0.58, 0.52];
    }, { passive: true });
    document.addEventListener("visibilitychange", () => {
      this.visible = !document.hidden;
      this.previousFrameAt = performance.now();
    });
    this.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      cancelAnimationFrame(this.animationFrame);
      this.surface.classList.remove("is-field-ready");
      document.documentElement.dataset.renderer = "static-context-lost";
      this.status.textContent = "已切换静态场域";
    });
    this.canvas.addEventListener("webglcontextrestored", () => window.location.reload());
  }

  async loadTexture(url) {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return {
      texture: new Texture(this.gl, {
        image,
        flipY: true,
        generateMipmaps: false,
        minFilter: this.gl.LINEAR,
        magFilter: this.gl.LINEAR,
        wrapS: this.gl.CLAMP_TO_EDGE,
        wrapT: this.gl.CLAMP_TO_EDGE,
      }),
      resolution: [image.naturalWidth, image.naturalHeight],
    };
  }

  createTarget(mode) {
    const floating = mode === "rgba16f";
    return new RenderTarget(this.gl, {
      width: 4,
      height: 4,
      depth: false,
      minFilter: this.gl.LINEAR,
      magFilter: this.gl.LINEAR,
      type: floating ? this.gl.HALF_FLOAT : this.gl.UNSIGNED_BYTE,
      format: this.gl.RGBA,
      internalFormat: floating ? this.gl.RGBA16F : this.gl.RGBA,
    });
  }

  framebufferComplete(target) {
    this.renderer.bindFramebuffer(target);
    const complete = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE;
    this.renderer.bindFramebuffer();
    return complete;
  }

  recordFrame(frameTime) {
    this.frameSamples.push(frameTime);
    if (this.frameSamples.length > 120) this.frameSamples.shift();
    if (this.frameSamples.length % 30 !== 0) return;
    const average = this.frameSamples.reduce((sum, value) => sum + value, 0) / this.frameSamples.length;
    this.canvas.dataset.averageFrameMs = average.toFixed(2);
    this.canvas.dataset.fps = (1000 / average).toFixed(1);
    this.canvas.dataset.activeLayers = (2.4 + this.richness * 4.4).toFixed(2);
  }

  snapshot() {
    const average = this.frameSamples.length ? this.frameSamples.reduce((sum, value) => sum + value, 0) / this.frameSamples.length : 0;
    return {
      ready: this.ready,
      mode: document.documentElement.dataset.renderer,
      canvas: [this.canvas.width, this.canvas.height],
      playing: this.playing,
      activeLayers: 2.4 + this.richness * 4.4,
      averageFrameMs: Number(average.toFixed(2)),
      active: this.active,
      reducedMotion: this.reducedMotion,
    };
  }
}

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
