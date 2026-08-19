const SVG_NS = "http://www.w3.org/2000/svg";

const variants = {
  A: {
    label: "A · 自由声场",
    title: "声场裁片",
    description: "自由叠层，用于观察透明材料的混色关系。",
    index: "FIELD / 01",
    background: "#f6f4ef",
    blend: "multiply",
  },
  B: {
    label: "B · 材料图谱",
    title: "材料图谱",
    description: "并置单片与复合样本，校准微孔、边缘和阴影。",
    index: "ATLAS / 02",
    background: "#f3f1ec",
    blend: "multiply",
  },
  C: {
    label: "C · 暗场徽记",
    title: "暗场徽记",
    description: "高密度收拢，验证图标与深色界面中的识别力。",
    index: "EMBLEM / 03",
    background: "#151a1c",
    blend: "screen",
  },
};

const palette = [
  { base: "#a8bac8", edge: "#556d7d", light: "#f0f5f6" },
  { base: "#929e90", edge: "#536157", light: "#eef1eb" },
  { base: "#dc715b", edge: "#9a4738", light: "#ffe2d8" },
  { base: "#c9c2b7", edge: "#817c72", light: "#faf7ef" },
  { base: "#74818e", edge: "#414f5c", light: "#e6edf0" },
  { base: "#b6a3a0", edge: "#705c59", light: "#f4e8e5" },
  { base: "#8d989b", edge: "#4d5b5f", light: "#e8eeee" },
];

const elements = {
  root: document.querySelector(".prototype"),
  svg: document.querySelector("#composition"),
  seed: document.querySelector("#seed"),
  count: document.querySelector("#count"),
  opacity: document.querySelector("#opacity"),
  overlap: document.querySelector("#overlap"),
  pores: document.querySelector("#pores"),
  shadow: document.querySelector("#shadow"),
  annotations: document.querySelector("#annotations"),
  title: document.querySelector("#variant-title"),
  description: document.querySelector("#variant-description"),
  variantLabel: document.querySelector("#variant-label"),
  stageIndex: document.querySelector("#stage-index"),
  stageSeed: document.querySelector("#stage-seed"),
  toast: document.querySelector("#toast"),
};

const outputBindings = [
  [elements.count, document.querySelector("#count-value"), (value) => value],
  [elements.opacity, document.querySelector("#opacity-value"), (value) => `${value}%`],
  [elements.overlap, document.querySelector("#overlap-value"), (value) => `${value}%`],
  [elements.pores, document.querySelector("#pores-value"), (value) => `${value}%`],
  [elements.shadow, document.querySelector("#shadow-value"), (value) => `${value}%`],
];

let currentVariant = getVariantFromUrl();
let toastTimer = 0;
let dragState = null;

function getVariantFromUrl() {
  const requested = new URLSearchParams(window.location.search).get("variant")?.toUpperCase();
  return variants[requested] ? requested : "A";
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) element.setAttribute(key, String(value));
  });
  return element;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function hashSeed(value) {
  const text = String(value || "0");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBetween(random, min, max) {
  return lerp(min, max, random());
}

function config() {
  return {
    seed: elements.seed.value.trim() || "0",
    count: Number(elements.count.value),
    opacity: Number(elements.opacity.value) / 100,
    overlap: Number(elements.overlap.value) / 100,
    pores: Number(elements.pores.value) / 100,
    shadow: Number(elements.shadow.value) / 100,
    annotations: elements.annotations.checked,
  };
}

function organicPath(rx, ry, random, notchBias = 1) {
  const pointCount = 52;
  const notchIndex = Math.floor(randomBetween(random, 1, pointCount - 1));
  const phase = randomBetween(random, 0, Math.PI * 2);
  const points = [];

  for (let index = 0; index < pointCount; index += 1) {
    const angle = -Math.PI / 2 + (index / pointCount) * Math.PI * 2;
    const circularDistance = Math.min(
      Math.abs(index - notchIndex),
      pointCount - Math.abs(index - notchIndex),
    );
    let radial = 1 + randomBetween(random, -0.02, 0.02);
    if (circularDistance === 0) radial *= lerp(0.88, 0.78, notchBias);
    if (circularDistance === 1) radial *= lerp(0.96, 0.9, notchBias);
    if (circularDistance === 2) radial *= 1.01;

    const harmonicX = Math.sin(angle * 2 + phase) * rx * 0.045;
    const harmonicY = Math.cos(angle * 3 - phase) * ry * 0.035;
    points.push({
      x: Math.cos(angle) * rx * radial + harmonicX,
      y: Math.sin(angle) * ry * radial + harmonicY,
    });
  }

  const tension = 0.92;
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let index = 0; index < pointCount; index += 1) {
    const p0 = points[(index - 1 + pointCount) % pointCount];
    const p1 = points[index];
    const p2 = points[(index + 1) % pointCount];
    const p3 = points[(index + 2) % pointCount];
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension;
    path += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return `${path} Z`;
}

function addPaperTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 180;
  canvas.height = 180;
  const context = canvas.getContext("2d");
  const random = mulberry32(91742);

  context.clearRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < 1050; index += 1) {
    const alpha = randomBetween(random, 0.012, 0.045);
    const size = randomBetween(random, 0.35, 1.1);
    context.fillStyle = random() > 0.42
      ? `rgba(45,48,44,${alpha})`
      : `rgba(255,255,255,${alpha * 1.8})`;
    context.fillRect(random() * 180, random() * 180, size, size);
  }
  document.documentElement.style.setProperty("--paper-texture", `url(${canvas.toDataURL("image/png")})`);
}

function addGlobalDefinitions(defs, settings, variant) {
  const shadow = svgElement("filter", {
    id: "contact-shadow",
    x: "-35%",
    y: "-35%",
    width: "170%",
    height: "180%",
    "color-interpolation-filters": "sRGB",
  });
  shadow.append(
    svgElement("feDropShadow", {
      dx: 0,
      dy: lerp(1.5, 11, settings.shadow),
      stdDeviation: lerp(1.2, 9, settings.shadow),
      "flood-color": variant === "C" ? "#000000" : "#403b36",
      "flood-opacity": variant === "C" ? lerp(0.08, 0.34, settings.shadow) : lerp(0.05, 0.27, settings.shadow),
    }),
  );
  defs.append(shadow);

  const glow = svgElement("filter", {
    id: "rim-glow",
    x: "-30%",
    y: "-30%",
    width: "160%",
    height: "160%",
    "color-interpolation-filters": "sRGB",
  });
  glow.append(
    svgElement("feGaussianBlur", { stdDeviation: 4.2, result: "blur" }),
    svgElement("feFlood", { "flood-color": "#eaf4f5", "flood-opacity": 0.2, result: "color" }),
    svgElement("feComposite", { in: "color", in2: "blur", operator: "in", result: "halo" }),
    svgElement("feMerge"),
  );
  const merge = glow.lastElementChild;
  merge.append(svgElement("feMergeNode", { in: "halo" }), svgElement("feMergeNode", { in: "SourceGraphic" }));
  defs.append(glow);
}

function createMembrane({
  id,
  x,
  y,
  rx,
  ry,
  rotation,
  material,
  random,
  settings,
  variant,
  delay = 0,
  notchBias = 1,
}) {
  const pathData = organicPath(rx, ry, random, notchBias);
  const definitions = elements.svg.querySelector("defs");
  const gradientId = `surface-${id}`;
  const holesId = `holes-${id}`;
  const maskId = `perforated-${id}`;
  const clipId = `clip-${id}`;
  const spacing = lerp(12, 4.2, settings.pores);
  const poreRadius = lerp(0.5, 1.15, settings.pores);

  const gradient = svgElement("linearGradient", {
    id: gradientId,
    x1: "12%",
    y1: "2%",
    x2: "84%",
    y2: "94%",
  });
  gradient.append(
    svgElement("stop", { offset: "0%", "stop-color": material.light, "stop-opacity": 0.92 }),
    svgElement("stop", { offset: "42%", "stop-color": material.base, "stop-opacity": 0.97 }),
    svgElement("stop", { offset: "100%", "stop-color": material.edge, "stop-opacity": 0.82 }),
  );

  const holes = svgElement("pattern", {
    id: holesId,
    width: spacing,
    height: spacing,
    patternUnits: "userSpaceOnUse",
    patternTransform: `rotate(${randomBetween(random, -12, 12).toFixed(2)})`,
  });
  holes.append(
    svgElement("circle", {
      cx: spacing * 0.5,
      cy: spacing * 0.5,
      r: poreRadius,
      fill: "#000000",
    }),
  );

  const mask = svgElement("mask", {
    id: maskId,
    maskUnits: "userSpaceOnUse",
    x: -rx * 1.4,
    y: -ry * 1.5,
    width: rx * 2.8,
    height: ry * 3,
  });
  mask.append(
    svgElement("path", { d: pathData, fill: "#ffffff" }),
    svgElement("path", { d: pathData, fill: `url(#${holesId})`, opacity: clamp(settings.pores * 1.12, 0, 1) }),
  );

  const clip = svgElement("clipPath", { id: clipId });
  clip.append(svgElement("path", { d: pathData }));
  definitions.append(gradient, holes, mask, clip);

  const group = svgElement("g", {
    class: "membrane",
    transform: `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rotation.toFixed(2)})`,
    tabindex: "0",
    role: "img",
    "aria-label": "可拖动的半透明膜片",
    "data-x": x,
    "data-y": y,
    "data-rotation": rotation,
  });
  group.style.mixBlendMode = variants[variant].blend;
  group.style.animationDelay = `${delay}ms`;

  const shadowPath = svgElement("path", {
    d: pathData,
    fill: variant === "C" ? "#000000" : "#514b45",
    "fill-opacity": variant === "C" ? 0.08 : 0.07,
    filter: "url(#contact-shadow)",
    "pointer-events": "none",
  });

  const body = svgElement("path", {
    d: pathData,
    fill: `url(#${gradientId})`,
    "fill-opacity": variant === "C" ? clamp(settings.opacity * 0.56, 0.1, 0.42) : settings.opacity,
    mask: `url(#${maskId})`,
  });

  const milk = svgElement("path", {
    d: pathData,
    fill: variant === "C" ? material.light : "#ffffff",
    "fill-opacity": variant === "C" ? settings.opacity * 0.035 : settings.opacity * 0.12,
    mask: `url(#${maskId})`,
    transform: `translate(${(-rx * 0.018).toFixed(2)} ${(-ry * 0.026).toFixed(2)})`,
    "pointer-events": "none",
  });

  const fibers = svgElement("g", {
    "clip-path": `url(#${clipId})`,
    opacity: variant === "C" ? 0.1 : 0.13,
    "pointer-events": "none",
  });
  const fiberCount = Math.round(lerp(4, 13, settings.pores));
  for (let index = 0; index < fiberCount; index += 1) {
    const startX = randomBetween(random, -rx, rx * 0.6);
    const startY = randomBetween(random, -ry, ry);
    const length = randomBetween(random, rx * 0.12, rx * 0.46);
    fibers.append(
      svgElement("path", {
        d: `M ${startX.toFixed(1)} ${startY.toFixed(1)} q ${(length * 0.48).toFixed(1)} ${randomBetween(random, -8, 8).toFixed(1)} ${length.toFixed(1)} ${randomBetween(random, -5, 5).toFixed(1)}`,
        fill: "none",
        stroke: random() > 0.45 ? "#ffffff" : material.edge,
        "stroke-opacity": randomBetween(random, 0.28, 0.62),
        "stroke-width": randomBetween(random, 0.38, 0.8),
        "stroke-linecap": "round",
      }),
    );
  }

  const darkEdge = svgElement("path", {
    d: pathData,
    fill: "none",
    stroke: material.edge,
    "stroke-opacity": variant === "C" ? 0.74 : 0.62,
    "stroke-width": variant === "C" ? 2.2 : 2,
    "stroke-linejoin": "round",
    "vector-effect": "non-scaling-stroke",
    "pointer-events": "none",
  });

  const lightEdge = svgElement("path", {
    d: pathData,
    fill: "none",
    stroke: variant === "C" ? "#f0f5f4" : material.light,
    "stroke-opacity": variant === "C" ? 0.83 : 0.88,
    "stroke-width": variant === "C" ? 1.1 : 0.9,
    "stroke-linejoin": "round",
    "vector-effect": "non-scaling-stroke",
    filter: variant === "C" ? "url(#rim-glow)" : undefined,
    "pointer-events": "none",
  });

  group.append(shadowPath, body, milk, fibers, darkEdge, lightEdge);
  return group;
}

function addLine(parent, x1, y1, x2, y2, attributes = {}) {
  parent.append(
    svgElement("line", {
      x1,
      y1,
      x2,
      y2,
      stroke: attributes.stroke || "#474c49",
      "stroke-opacity": attributes.opacity ?? 0.43,
      "stroke-width": attributes.width ?? 1,
      "stroke-dasharray": attributes.dash || undefined,
      "vector-effect": "non-scaling-stroke",
    }),
  );
}

function addText(parent, text, x, y, attributes = {}) {
  const node = svgElement("text", {
    x,
    y,
    fill: attributes.fill || "#3f4541",
    "fill-opacity": attributes.opacity ?? 0.68,
    "font-family": attributes.mono ? "Cascadia Mono, Consolas, monospace" : "Noto Sans SC, Microsoft YaHei, sans-serif",
    "font-size": attributes.size || 13,
    "font-weight": attributes.weight || 500,
    "text-anchor": attributes.anchor || "start",
  });
  node.textContent = text;
  parent.append(node);
}

function addCross(parent, x, y, color = "#444a46", opacity = 0.45, size = 10) {
  addLine(parent, x - size, y, x + size, y, { stroke: color, opacity });
  addLine(parent, x, y - size, x, y + size, { stroke: color, opacity });
  parent.append(
    svgElement("circle", {
      cx: x,
      cy: y,
      r: 2.2,
      fill: "none",
      stroke: color,
      "stroke-opacity": opacity,
      "stroke-width": 1,
    }),
  );
}

function addBaseScene(settings, variant) {
  elements.svg.replaceChildren();
  const defs = svgElement("defs");
  elements.svg.append(defs);
  addGlobalDefinitions(defs, settings, variant);
  elements.svg.append(
    svgElement("rect", {
      x: 0,
      y: 0,
      width: 1200,
      height: 760,
      fill: variants[variant].background,
    }),
  );

  const annotations = svgElement("g", {
    id: "scene-annotations",
    opacity: settings.annotations ? 1 : 0,
    "pointer-events": "none",
  });
  const membranes = svgElement("g", { id: "membrane-layer" });
  elements.svg.append(annotations, membranes);
  return { annotations, membranes };
}

function renderField(settings, random) {
  const { annotations, membranes } = addBaseScene(settings, "A");
  const offsets = [
    [-0.82, -0.56],
    [0.7, -0.52],
    [-0.52, 0.55],
    [0.73, 0.58],
    [0.02, 0.02],
    [-1.16, 0.34],
    [1.18, -0.03],
  ];
  const spread = lerp(320, 108, settings.overlap);

  const orbit = svgElement("path", {
    d: "M 238 422 C 294 115, 806 84, 1002 278 C 1114 389, 938 661, 623 654 C 353 648, 166 577, 238 422 Z",
    fill: "none",
    stroke: "#3f4541",
    "stroke-opacity": 0.28,
    "stroke-width": 1,
    "stroke-dasharray": "7 8",
    "vector-effect": "non-scaling-stroke",
  });
  annotations.append(orbit);
  [[126, 124], [1076, 132], [140, 644], [1060, 632], [600, 380]].forEach(([x, y]) => addCross(annotations, x, y));
  addLine(annotations, 88, 380, 1112, 380, { opacity: 0.13, dash: "2 10" });
  addLine(annotations, 600, 82, 600, 682, { opacity: 0.13, dash: "2 10" });

  for (let index = 0; index < settings.count; index += 1) {
    const [ox, oy] = offsets[index];
    membranes.append(
      createMembrane({
        id: `field-${index}`,
        x: 600 + ox * spread,
        y: 377 + oy * spread * 0.78,
        rx: randomBetween(random, 205, 278),
        ry: randomBetween(random, 142, 205),
        rotation: randomBetween(random, -32, 30),
        material: palette[index % palette.length],
        random,
        settings,
        variant: "A",
        delay: index * 48,
        notchBias: randomBetween(random, 0.55, 1),
      }),
    );
  }

  addText(annotations, "LAYER FIELD", 126, 161, { mono: true, size: 11, opacity: 0.48 });
  addText(annotations, `${settings.count} MATERIAL PLANES`, 1074, 666, { mono: true, size: 11, opacity: 0.48, anchor: "end" });
}

function renderAtlas(settings, random) {
  const { annotations, membranes } = addBaseScene(settings, "B");

  addLine(annotations, 72, 326, 1128, 326, { opacity: 0.24 });
  [72, 336, 600, 864, 1128].forEach((x) => {
    addLine(annotations, x, 92, x, 306, { opacity: 0.18, dash: "4 8" });
    addCross(annotations, x, 92, "#454a47", 0.38, 8);
  });
  addText(annotations, "SINGLE MATERIAL", 76, 72, { mono: true, size: 11, opacity: 0.5 });
  addText(annotations, "COMPOSITE BEHAVIOUR", 76, 366, { mono: true, size: 11, opacity: 0.5 });

  const specimenX = [204, 468, 732, 996];
  for (let index = 0; index < 4; index += 1) {
    membranes.append(
      createMembrane({
        id: `specimen-${index}`,
        x: specimenX[index],
        y: 204,
        rx: randomBetween(random, 91, 112),
        ry: randomBetween(random, 67, 86),
        rotation: randomBetween(random, -18, 18),
        material: palette[index],
        random,
        settings: { ...settings, opacity: clamp(settings.opacity + 0.12, 0.2, 0.78) },
        variant: "B",
        delay: index * 42,
        notchBias: randomBetween(random, 0.65, 1),
      }),
    );
    addText(annotations, String(index + 1).padStart(2, "0"), specimenX[index], 296, {
      mono: true,
      size: 11,
      opacity: 0.48,
      anchor: "middle",
    });
  }

  const ring = [
    [-0.78, -0.36],
    [0.76, -0.34],
    [-0.46, 0.44],
    [0.52, 0.45],
    [0, 0],
    [-0.93, 0.29],
    [0.96, 0.2],
  ];
  const spread = lerp(200, 58, settings.overlap);
  for (let index = 0; index < settings.count; index += 1) {
    const [ox, oy] = ring[index];
    membranes.append(
      createMembrane({
        id: `atlas-composite-${index}`,
        x: 600 + ox * spread,
        y: 535 + oy * spread * 0.62,
        rx: randomBetween(random, 142, 188),
        ry: randomBetween(random, 98, 134),
        rotation: randomBetween(random, -34, 32),
        material: palette[(index + 2) % palette.length],
        random,
        settings,
        variant: "B",
        delay: 180 + index * 40,
        notchBias: randomBetween(random, 0.5, 1),
      }),
    );
  }

  addCross(annotations, 600, 535, "#454a47", 0.44, 13);
  addLine(annotations, 394, 690, 806, 690, { opacity: 0.34 });
  for (let index = 0; index <= 8; index += 1) {
    addLine(annotations, 394 + index * 51.5, 684, 394 + index * 51.5, 696, { opacity: 0.34 });
  }
}

function renderEmblem(settings, random) {
  const { annotations, membranes } = addBaseScene(settings, "C");
  const light = "#eef4f3";

  addCross(annotations, 600, 380, light, 0.48, 15);
  [[146, 122], [1054, 122], [146, 638], [1054, 638]].forEach(([x, y]) => addCross(annotations, x, y, light, 0.28, 9));
  const orbit = svgElement("ellipse", {
    cx: 600,
    cy: 380,
    rx: 352,
    ry: 278,
    fill: "none",
    stroke: light,
    "stroke-opacity": 0.16,
    "stroke-width": 1,
    "stroke-dasharray": "6 11",
  });
  annotations.append(orbit);
  addText(annotations, "ACTIVE MATERIAL", 146, 154, { mono: true, size: 11, fill: light, opacity: 0.52 });
  addText(annotations, "SOUND / SPACE", 1054, 650, { mono: true, size: 11, fill: light, opacity: 0.52, anchor: "end" });

  const offsets = [
    [-0.46, -0.5],
    [0.48, -0.46],
    [-0.5, 0.42],
    [0.5, 0.42],
    [0, 0],
    [-0.08, -0.78],
    [0.08, 0.77],
  ];
  const spread = lerp(174, 46, settings.overlap);
  const darkSettings = { ...settings };

  for (let index = 0; index < settings.count; index += 1) {
    const [ox, oy] = offsets[index];
    const materialIndex = index === Math.floor(settings.count / 2) ? 2 : index % palette.length;
    membranes.append(
      createMembrane({
        id: `emblem-${index}`,
        x: 600 + ox * spread,
        y: 380 + oy * spread,
        rx: randomBetween(random, 204, 262),
        ry: randomBetween(random, 150, 205),
        rotation: randomBetween(random, -28, 28),
        material: palette[materialIndex],
        random,
        settings: darkSettings,
        variant: "C",
        delay: index * 52,
        notchBias: randomBetween(random, 0.58, 1),
      }),
    );
  }
}

function render() {
  const settings = config();
  const random = mulberry32(hashSeed(`${settings.seed}-${currentVariant}`));
  elements.root.dataset.variant = currentVariant;
  updateResponsiveSvgFit();
  elements.title.textContent = variants[currentVariant].title;
  elements.description.textContent = variants[currentVariant].description;
  elements.variantLabel.textContent = variants[currentVariant].label;
  elements.stageIndex.textContent = variants[currentVariant].index;
  elements.stageSeed.textContent = `SEED ${settings.seed}`;

  if (currentVariant === "A") renderField(settings, random);
  if (currentVariant === "B") renderAtlas(settings, random);
  if (currentVariant === "C") renderEmblem(settings, random);
}

function updateResponsiveSvgFit() {
  const stage = document.querySelector(".stage");
  const stageRatio = stage.clientHeight > 0 ? stage.clientWidth / stage.clientHeight : 2;
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const viewBox = mobile
    ? "285 0 630 760"
    : stageRatio < 1.08
      ? "100 0 1000 760"
      : "0 0 1200 760";
  elements.svg.setAttribute("viewBox", viewBox);
  elements.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
}

function setVariant(nextVariant) {
  currentVariant = nextVariant;
  const url = new URL(window.location.href);
  url.searchParams.set("variant", currentVariant);
  window.history.replaceState({}, "", url);
  render();
}

function cycleVariant(direction) {
  const keys = Object.keys(variants);
  const index = keys.indexOf(currentVariant);
  setVariant(keys[(index + direction + keys.length) % keys.length]);
}

function svgPointFromEvent(event) {
  const point = elements.svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(elements.svg.getScreenCTM().inverse());
}

function startDrag(event) {
  const membrane = event.target.closest?.(".membrane");
  if (!membrane) return;
  event.preventDefault();
  membrane.parentElement.append(membrane);
  const point = svgPointFromEvent(event);
  dragState = {
    pointerId: event.pointerId,
    membrane,
    offsetX: point.x - Number(membrane.dataset.x),
    offsetY: point.y - Number(membrane.dataset.y),
  };
  membrane.setPointerCapture(event.pointerId);
}

function moveDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  const point = svgPointFromEvent(event);
  const x = point.x - dragState.offsetX;
  const y = point.y - dragState.offsetY;
  const rotation = Number(dragState.membrane.dataset.rotation);
  dragState.membrane.dataset.x = x;
  dragState.membrane.dataset.y = y;
  dragState.membrane.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rotation.toFixed(2)})`);
}

function endDrag(event) {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  if (dragState.membrane.hasPointerCapture(event.pointerId)) {
    dragState.membrane.releasePointerCapture(event.pointerId);
  }
  dragState = null;
}

function notify(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 1800);
}

function serializedSvg() {
  const clone = elements.svg.cloneNode(true);
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("width", "2400");
  clone.setAttribute("height", "1520");
  clone.setAttribute("viewBox", "0 0 1200 760");
  clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
  clone.querySelectorAll(".membrane").forEach((node) => {
    node.removeAttribute("tabindex");
    node.removeAttribute("role");
    node.removeAttribute("aria-label");
    node.style.animation = "none";
    node.style.cursor = "default";
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function exportSvg() {
  downloadBlob(
    new Blob([serializedSvg()], { type: "image/svg+xml;charset=utf-8" }),
    `soundscape-membranes-${currentVariant.toLowerCase()}-${config().seed}.svg`,
  );
  notify("SVG 已导出");
}

function exportPng() {
  const source = serializedSvg();
  const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1520;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(url);
      if (!blob) {
        notify("PNG 导出失败，请重试");
        return;
      }
      downloadBlob(blob, `soundscape-membranes-${currentVariant.toLowerCase()}-${config().seed}.png`);
      notify("PNG 已导出");
    }, "image/png");
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    notify("PNG 导出失败，请重试");
  };
  image.src = url;
}

function randomizeSeed() {
  const next = String(Math.floor(10000 + Math.random() * 89999));
  elements.seed.value = next;
  render();
}

outputBindings.forEach(([input, output, format]) => {
  const update = () => {
    output.value = format(input.value);
    render();
  };
  input.addEventListener("input", update);
});

elements.annotations.addEventListener("change", render);
elements.seed.addEventListener("change", render);
elements.seed.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    elements.seed.blur();
    render();
  }
});
document.querySelector("#regenerate").addEventListener("click", randomizeSeed);
document.querySelector("#export-svg").addEventListener("click", exportSvg);
document.querySelector("#export-png").addEventListener("click", exportPng);
document.querySelector("#previous-variant").addEventListener("click", () => cycleVariant(-1));
document.querySelector("#next-variant").addEventListener("click", () => cycleVariant(1));

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const editing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable;
  if (editing) return;
  if (event.key === "ArrowLeft") cycleVariant(-1);
  if (event.key === "ArrowRight") cycleVariant(1);
});

elements.svg.addEventListener("pointerdown", startDrag);
elements.svg.addEventListener("pointermove", moveDrag);
elements.svg.addEventListener("pointerup", endDrag);
elements.svg.addEventListener("pointercancel", endDrag);
window.addEventListener("resize", updateResponsiveSvgFit);
new ResizeObserver(updateResponsiveSvgFit).observe(document.querySelector(".stage"));

addPaperTexture();
render();
