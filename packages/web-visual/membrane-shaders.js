export const vertexShader = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;

  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

export const backgroundShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uVariant;
  uniform float uMotion;
  uniform float uEnergy;
  uniform vec2 uPointer;
  uniform vec2 uResolution;

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

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 octave = mat2(1.62, 1.18, -1.18, 1.62);
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise21(p);
      p = octave * p + 7.13;
      amplitude *= 0.48;
    }
    return value;
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
    float t = uTime * uMotion;
    float paper = fbm(p * vec2(2.1, 4.4) + vec2(t * 0.013, -t * 0.009));
    float strata = fbm(vec2(p.x * 0.72 - t * 0.008, p.y * 7.2 + paper * 0.54));
    float pointerLean = (uPointer.x - 0.5) * 0.18 + (uPointer.y - 0.5) * 0.08;
    float plane = smoothstep(-0.82, 0.96, dot(p, normalize(vec2(-0.31, 0.95))) + pointerLean);
    vec3 color;

    if (uVariant < 0.5) {
      vec3 paperCool = vec3(0.91, 0.922, 0.928);
      vec3 paperWarm = vec3(0.968, 0.95, 0.934);
      color = mix(paperCool, paperWarm, plane * 0.58 + 0.24);
      color += (paper - 0.52) * vec3(0.012, 0.01, 0.008);
      color -= (strata - 0.5) * vec3(0.004, 0.003, 0.002);
    } else if (uVariant < 1.5) {
      vec3 charcoal = vec3(0.018, 0.027, 0.029);
      vec3 deepGreen = vec3(0.035, 0.076, 0.069);
      vec3 ember = vec3(0.19, 0.075, 0.038);
      color = mix(charcoal, deepGreen, smoothstep(0.16, 0.9, strata) * 0.58);
      color += ember * smoothstep(0.68, 0.94, plane + paper * 0.13) * (0.28 + uEnergy * 0.16);
      color += (paper - 0.5) * vec3(0.014, 0.018, 0.016);
    } else {
      vec3 silver = vec3(0.91, 0.918, 0.91);
      vec3 celadon = vec3(0.87, 0.91, 0.88);
      vec3 mauve = vec3(0.94, 0.88, 0.89);
      color = mix(silver, celadon, smoothstep(0.2, 0.86, strata) * 0.2);
      color = mix(color, mauve, smoothstep(0.58, 1.06, -p.x + p.y * 0.32) * 0.14);
      color += (paper - 0.5) * vec3(0.012, 0.01, 0.009);
    }

    float distantFlash = pow(max(0.0, sin(uTime * 0.27 - 1.1)), 34.0) * (uVariant > 0.5 && uVariant < 1.5 ? 0.025 + uEnergy * 0.02 : 0.006);
    color += distantFlash * vec3(0.74, 0.83, 0.92);
    gl_FragColor = vec4(max(color, 0.0), 1.0);
  }
`;

export const membraneShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uPrevious;
  uniform sampler2D uAtlas;
  uniform float uTime;
  uniform float uVariant;
  uniform float uRotation;
  uniform float uDensity;
  uniform float uOpacity;
  uniform float uRefraction;
  uniform float uShadow;
  uniform float uSeed;
  uniform float uReveal;
  uniform vec2 uCenter;
  uniform vec2 uScale;
  uniform vec2 uCell;
  uniform vec2 uPointer;
  uniform vec2 uResolution;
  uniform vec2 uAtlasResolution;
  uniform vec3 uTint;
  uniform vec3 uAbsorption;

  varying vec2 vUv;

  mat2 rotate2d(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
  }

  float gateLocal(vec2 p) {
    vec2 lower = step(vec2(0.0), p);
    vec2 upper = step(p, vec2(1.0));
    return lower.x * lower.y * upper.x * upper.y;
  }

  vec2 atlasUv(vec2 local) {
    return vec2(
      (uCell.x + local.x) * 0.25,
      ((1.0 - uCell.y) + local.y) * 0.5
    );
  }

  float thicknessAt(vec2 local) {
    float gate = gateLocal(local);
    vec3 sampleColor = texture2D(uAtlas, atlasUv(clamp(local, 0.0, 1.0))).rgb;
    float luminance = dot(sampleColor, vec3(0.2126, 0.7152, 0.0722));
    return luminance * gate;
  }

  float hash21(vec2 p) {
    p = fract(p * vec2(443.8975, 441.423));
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }

  void main() {
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 screenDelta = (vUv - uCenter) * vec2(aspect, 1.0);
    vec2 local = rotate2d(-uRotation) * screenDelta / max(uScale, vec2(0.0001)) + 0.5;
    float rawThickness = thicknessAt(local);
    float presence = smoothstep(0.035, 0.095, rawThickness);
    float thickness = smoothstep(0.025, 0.78, rawThickness);

    vec2 localTexel = vec2(4.0 / uAtlasResolution.x, 2.0 / uAtlasResolution.y) * 2.2;
    float thicknessL = thicknessAt(local - vec2(localTexel.x, 0.0));
    float thicknessR = thicknessAt(local + vec2(localTexel.x, 0.0));
    float thicknessB = thicknessAt(local - vec2(0.0, localTexel.y));
    float thicknessT = thicknessAt(local + vec2(0.0, localTexel.y));
    vec2 gradient = vec2(thicknessR - thicknessL, thicknessT - thicknessB);
    float localAverage = (thicknessL + thicknessR + thicknessB + thicknessT) * 0.25;
    float materialDetail = clamp((rawThickness - localAverage) * 8.0, -0.032, 0.032);

    vec3 untouched = texture2D(uPrevious, vUv).rgb;
    float breathing = sin(uTime * 0.19 + uSeed * 4.7) * 0.5 + 0.5;
    vec2 microBend = vec2(
      sin(local.y * 9.0 + uTime * 0.12 + uSeed),
      cos(local.x * 8.0 - uTime * 0.1 + uSeed * 1.7)
    ) * 0.00018 * presence;
    vec2 refractionOffset = gradient * uRefraction * (0.58 + thickness * 0.76) * vec2(1.0 / aspect, 1.0);
    vec2 refractedUv = clamp(vUv + refractionOffset + microBend, vec2(0.002), vec2(0.998));
    vec3 behind = texture2D(uPrevious, refractedUv).rgb;

    vec2 shadowOffset = vec2(-0.01, 0.014) * (0.78 + uShadow * 0.26);
    vec2 shadowSample = local + shadowOffset;
    float shadowThickness = (
      thicknessAt(shadowSample) +
      thicknessAt(shadowSample + vec2(localTexel.x * 4.0, 0.0)) +
      thicknessAt(shadowSample - vec2(localTexel.x * 4.0, 0.0)) +
      thicknessAt(shadowSample + vec2(0.0, localTexel.y * 4.0)) +
      thicknessAt(shadowSample - vec2(0.0, localTexel.y * 4.0))
    ) * 0.2;
    float shadowBody = smoothstep(0.018, 0.3, shadowThickness);
    float castShadow = shadowBody * (1.0 - presence) * uShadow;
    vec3 shadowed = untouched * (1.0 - castShadow * (uVariant > 0.5 && uVariant < 1.5 ? 0.14 : 0.075));

    vec3 sigma = max(uAbsorption, vec3(0.025));
    vec3 transmission = exp(-sigma * thickness * uDensity);
    vec2 lightVector = normalize((uPointer - vUv) * vec2(aspect, 1.0) + vec2(0.21, 0.37));
    vec3 normal = normalize(vec3(-gradient * 4.0, 0.46 + 0.04 * breathing));
    vec3 lightDirection = normalize(vec3(lightVector, 0.62));
    float diffuse = 0.5 + 0.5 * dot(normal, lightDirection);
    float specular = pow(max(dot(normal, lightDirection), 0.0), 20.0);
    float edge = smoothstep(0.03, 0.25, length(gradient)) * presence * smoothstep(0.055, 0.12, rawThickness) * (1.0 - smoothstep(0.7, 0.92, rawThickness));

    vec3 film = behind * transmission;
    float darkField = step(0.5, uVariant) * (1.0 - step(1.5, uVariant));
    film += uTint * (1.0 - transmission) * mix(0.33 + diffuse * 0.3, 0.7 + diffuse * 0.38, darkField);
    film += uTint * thickness * 0.075 * darkField;
    film += mix(vec3(0.98), uTint, 0.2) * specular * (0.015 + edge * 0.04);
    film += vec3(0.98, 0.985, 0.975) * edge * (0.02 + diffuse * 0.05);
    film += materialDetail * presence * 0.72;

    float reveal = smoothstep(0.0, 1.0, uReveal);
    float coverage = presence * uOpacity * reveal;
    vec3 composited = mix(shadowed, film, coverage);
    gl_FragColor = vec4(max(composited, 0.0), 1.0);
  }
`;

export const presentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uScene;
  uniform float uTime;
  uniform float uVariant;
  uniform vec2 uResolution;

  varying vec2 vUv;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec3 color = texture2D(uScene, vUv).rgb;
    if (uVariant > 0.5 && uVariant < 1.5) {
      color = vec3(1.0) - exp(-color * 1.18);
      color = pow(max(color, 0.0), vec3(0.96));
      color = (color - 0.5) * 1.025 + 0.5;
    } else {
      color = pow(clamp(color, 0.0, 1.0), vec3(0.985));
      color = (color - 0.5) * 1.012 + 0.5;
    }

    float edgeDistance = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
    float edgeTone = smoothstep(0.0, 0.24, edgeDistance);
    color *= mix(0.992, 1.0, edgeTone);

    float grain = hash21(vUv * uResolution + floor(uTime * 12.0)) - 0.5;
    color += grain * (uVariant > 0.5 && uVariant < 1.5 ? 0.006 : 0.0025);
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;
