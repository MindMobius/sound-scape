const AudioContextClass = window.AudioContext || window.webkitAudioContext;

export const SOUND_PROFILES = {
  natural: { label: "自然", detail: "保留原始层次" },
  hifi: { label: "Hi-Fi", detail: "开阔而清晰" },
  tube: { label: "胆机", detail: "柔和的偶次染色" },
  radio: { label: "老式收音机", detail: "窄频与轻微底噪" },
  television: { label: "雪花电视", detail: "中频突出与颗粒感" },
  speaker: { label: "单声道喇叭", detail: "集中、略带压缩" },
  spatial: { label: "耳机空间", detail: "拓宽声场与远近" },
};

export function createEqualPowerCrossfader(tracks, { volume = 1, duration = 1.3 } = {}) {
  let context = null;
  let masterGain = null;
  let mixBus = null;
  let baseGainNode = null;
  let highpassFilter = null;
  let toneFilter = null;
  let bodyFilter = null;
  let presenceFilter = null;
  let driveNode = null;
  let widthSplitter = null;
  let widthMerger = null;
  let widthGains = [];
  let motionPanner = null;
  let motionOscillator = null;
  let motionDepth = null;
  let spaceDelay = null;
  let spaceFeedback = null;
  let spaceGain = null;
  let noiseSource = null;
  let noiseFilter = null;
  let noiseGain = null;
  let compressor = null;
  let trackGains = [];
  const layerDefinitions = new Map();
  let activeIndex = 0;
  let masterVolume = clamp(volume);
  let baseLevel = 1;
  let baseMuted = false;
  let intensity = 0.52;
  let richness = 0.68;
  let movement = 0.36;
  let distance = 0.24;
  let character = "natural";
  let playbackActive = false;
  let transitionToken = 0;

  function ensureGraph() {
    if (!AudioContextClass || context) return Boolean(context);
    try {
      context = new AudioContextClass();
      mixBus = context.createGain();
      baseGainNode = context.createGain();
      highpassFilter = context.createBiquadFilter();
      toneFilter = context.createBiquadFilter();
      bodyFilter = context.createBiquadFilter();
      presenceFilter = context.createBiquadFilter();
      driveNode = context.createWaveShaper();
      widthSplitter = context.createChannelSplitter(2);
      widthMerger = context.createChannelMerger(2);
      widthGains = Array.from({ length: 4 }, () => context.createGain());
      motionPanner = context.createStereoPanner?.() ?? context.createGain();
      motionOscillator = context.createOscillator();
      motionDepth = context.createGain();
      spaceDelay = context.createDelay(0.8);
      spaceFeedback = context.createGain();
      spaceGain = context.createGain();
      noiseFilter = context.createBiquadFilter();
      noiseGain = context.createGain();
      compressor = context.createDynamicsCompressor();
      masterGain = context.createGain();

      highpassFilter.type = "highpass";
      highpassFilter.Q.value = 0.48;
      toneFilter.type = "lowpass";
      toneFilter.Q.value = 0.35;
      bodyFilter.type = "lowshelf";
      bodyFilter.frequency.value = 260;
      presenceFilter.type = "peaking";
      presenceFilter.frequency.value = 2350;
      presenceFilter.Q.value = 0.72;
      driveNode.oversample = "2x";
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 4600;
      noiseFilter.Q.value = 0.42;
      compressor.threshold.value = -14;
      compressor.knee.value = 18;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.015;
      compressor.release.value = 0.3;

      mixBus
        .connect(highpassFilter)
        .connect(toneFilter)
        .connect(bodyFilter)
        .connect(presenceFilter)
        .connect(driveNode)
        .connect(widthSplitter);
      baseGainNode.connect(mixBus);
      connectWidthMatrix();
      widthMerger.connect(motionPanner).connect(compressor);
      motionPanner.connect(spaceDelay);
      spaceDelay.connect(spaceGain).connect(compressor);
      spaceDelay.connect(spaceFeedback).connect(spaceDelay);
      compressor.connect(masterGain).connect(context.destination);

      if (motionPanner.pan) {
        motionOscillator.connect(motionDepth).connect(motionPanner.pan);
        motionOscillator.start();
      }

      noiseSource = createNoiseSource(context);
      noiseSource.connect(noiseFilter).connect(noiseGain).connect(compressor);
      noiseSource.start();

      trackGains = tracks.map((track, index) => {
        const source = context.createMediaElementSource(track);
        const gain = context.createGain();
        gain.gain.value = index === activeIndex ? 1 : 0;
        source.connect(gain).connect(baseGainNode);
        track.volume = 1;
        return gain;
      });

      layerDefinitions.forEach((definition) => ensureLayerNodes(definition));
      applySoundscape(false);
      return true;
    } catch (error) {
      console.warn("Web Audio sound processing is unavailable; using media-element fallback", error);
      resetGraph();
      applyFallbackVolumes();
      return false;
    }
  }

  function connectWidthMatrix() {
    const [leftToLeft, rightToLeft, leftToRight, rightToRight] = widthGains;
    widthSplitter.connect(leftToLeft, 0).connect(widthMerger, 0, 0);
    widthSplitter.connect(rightToLeft, 1).connect(widthMerger, 0, 0);
    widthSplitter.connect(leftToRight, 0).connect(widthMerger, 0, 1);
    widthSplitter.connect(rightToRight, 1).connect(widthMerger, 0, 1);
  }

  function resetGraph() {
    context = null;
    masterGain = null;
    mixBus = null;
    baseGainNode = null;
    highpassFilter = null;
    toneFilter = null;
    bodyFilter = null;
    presenceFilter = null;
    driveNode = null;
    widthSplitter = null;
    widthMerger = null;
    widthGains = [];
    motionPanner = null;
    motionOscillator = null;
    motionDepth = null;
    spaceDelay = null;
    spaceFeedback = null;
    spaceGain = null;
    noiseSource = null;
    noiseFilter = null;
    noiseGain = null;
    compressor = null;
    trackGains = [];
    layerDefinitions.forEach((definition) => { definition.nodes = null; });
  }

  async function resume() {
    if (!ensureGraph()) return false;
    if (context.state === "suspended") await context.resume();
    return context.state === "running";
  }

  async function play() {
    await resume();
    playbackActive = true;
    applySoundscape();
    await tracks[activeIndex].play();
  }

  function pauseAll() {
    transitionToken += 1;
    playbackActive = false;
    tracks.forEach((track) => track.pause());
    layerDefinitions.forEach((definition) => definition.audio.pause());
    settleGains();
    applySoundscape();
  }

  function setVolume(value) {
    masterVolume = clamp(value);
    applySoundscape();
  }

  function setSoundscape(next = {}) {
    if (next.intensity !== undefined) intensity = clamp(next.intensity);
    if (next.richness !== undefined) richness = clamp(next.richness);
    if (next.movement !== undefined) movement = clamp(next.movement);
    if (next.distance !== undefined) distance = clamp(next.distance);
    if (next.baseLevel !== undefined) baseLevel = clamp(next.baseLevel);
    if (next.baseMuted !== undefined) baseMuted = Boolean(next.baseMuted);
    if (next.character !== undefined && PROFILE_SETTINGS[next.character]) character = next.character;
    applySoundscape();
  }

  function attachLayer(id, audio, next = {}) {
    const existing = layerDefinitions.get(id);
    if (existing?.audio === audio) {
      setLayer(id, next);
      return;
    }
    if (existing) detachLayer(id);
    const definition = {
      id,
      audio,
      level: clamp(next.level ?? 0.56),
      muted: Boolean(next.muted),
      character: PROFILE_SETTINGS[next.character] ? next.character : "natural",
      nodes: null,
    };
    audio.volume = 1;
    layerDefinitions.set(id, definition);
    if (context) ensureLayerNodes(definition);
    applyLayer(definition, false);
  }

  function setLayer(id, next = {}) {
    const definition = layerDefinitions.get(id);
    if (!definition) return false;
    if (next.level !== undefined) definition.level = clamp(next.level);
    if (next.muted !== undefined) definition.muted = Boolean(next.muted);
    if (next.character !== undefined && PROFILE_SETTINGS[next.character]) definition.character = next.character;
    applyLayer(definition);
    return true;
  }

  function detachLayer(id) {
    const definition = layerDefinitions.get(id);
    if (!definition) return false;
    definition.audio.pause();
    if (definition.nodes) Object.values(definition.nodes).forEach((node) => node?.disconnect?.());
    layerDefinitions.delete(id);
    return true;
  }

  function ensureLayerNodes(definition) {
    if (!context || definition.nodes) return;
    const source = context.createMediaElementSource(definition.audio);
    const gain = context.createGain();
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const presence = context.createBiquadFilter();
    const drive = context.createWaveShaper();
    const panner = context.createStereoPanner?.() ?? context.createGain();
    highpass.type = "highpass";
    lowpass.type = "lowpass";
    presence.type = "peaking";
    presence.frequency.value = 2200;
    presence.Q.value = 0.8;
    drive.oversample = "2x";
    source.connect(gain).connect(highpass).connect(lowpass).connect(presence).connect(drive).connect(panner).connect(mixBus);
    definition.nodes = { source, gain, highpass, lowpass, presence, drive, panner };
    definition.audio.volume = 1;
    applyLayer(definition, false);
  }

  function applyLayer(definition, smooth = true) {
    const profile = PROFILE_SETTINGS[definition.character] ?? PROFILE_SETTINGS.natural;
    if (!context || !definition.nodes) {
      definition.audio.volume = definition.muted
        ? 0
        : clamp(masterVolume * definition.level * 0.72 * profile.output);
      return;
    }
    const now = context.currentTime;
    const smoothing = smooth ? 0.05 : 0.001;
    setTarget(definition.nodes.gain.gain, definition.muted ? 0 : definition.level * 0.72 * profile.output, now, smoothing);
    setTarget(definition.nodes.highpass.frequency, profile.highpass, now, smoothing);
    setTarget(definition.nodes.lowpass.frequency, profile.lowpass, now, smoothing);
    setTarget(definition.nodes.presence.gain, profile.presence, now, smoothing);
    definition.nodes.drive.curve = profile.drive ? makeSaturationCurve(profile.drive) : null;
    if (definition.nodes.panner.pan) setTarget(definition.nodes.panner.pan, profile.pan ?? 0, now, smoothing);
  }

  async function crossfadeTo(nextIndex) {
    if (nextIndex === activeIndex) return activeIndex;
    const token = ++transitionToken;
    const currentIndex = activeIndex;
    const nextTrack = tracks[nextIndex];
    await resume();
    playbackActive = true;
    applySoundscape();
    await nextTrack.play();

    if (context && trackGains.length) {
      const now = context.currentTime;
      const outgoing = trackGains[currentIndex].gain;
      const incoming = trackGains[nextIndex].gain;
      outgoing.cancelScheduledValues(now);
      incoming.cancelScheduledValues(now);
      outgoing.setValueAtTime(outgoing.value, now);
      incoming.setValueAtTime(incoming.value, now);
      outgoing.setValueCurveAtTime(makeCurve("out"), now, duration);
      incoming.setValueCurveAtTime(makeCurve("in"), now, duration);
      await wait(duration * 1000);
    } else {
      await fallbackCrossfade(currentIndex, nextIndex, token);
    }

    if (token !== transitionToken) return activeIndex;
    tracks[currentIndex].pause();
    tracks[currentIndex].currentTime = 0;
    activeIndex = nextIndex;
    settleGains();
    return activeIndex;
  }

  function switchImmediately(nextIndex) {
    transitionToken += 1;
    tracks[activeIndex].pause();
    tracks[activeIndex].currentTime = 0;
    activeIndex = nextIndex;
    settleGains();
    return activeIndex;
  }

  function settleGains() {
    if (context && trackGains.length) {
      const now = context.currentTime;
      trackGains.forEach((gain, index) => {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(index === activeIndex ? 1 : 0, now);
      });
      tracks.forEach((track) => { track.volume = 1; });
    } else {
      applyFallbackVolumes();
    }
  }

  function applyFallbackVolumes() {
    const output = getFallbackOutputLevel();
    tracks.forEach((track, index) => {
      track.volume = index === activeIndex ? output : 0;
    });
    layerDefinitions.forEach((definition) => applyLayer(definition, false));
  }

  function applySoundscape(smooth = true) {
    if (!context || !masterGain) {
      applyFallbackVolumes();
      return;
    }

    const profile = PROFILE_SETTINGS[character] ?? PROFILE_SETTINGS.natural;
    const now = context.currentTime;
    const smoothing = smooth ? 0.055 : 0.001;
    const distanceTone = 1 - distance * 0.46;
    const cutoff = (2600 + Math.pow(intensity, 0.72) * 12600) * profile.tone * distanceTone;
    const highpass = profile.highpass + distance * 170;
    const space = 0.008 + richness * 0.07 + distance * 0.12 + profile.space;
    const width = Math.max(0, Math.min(1.5, profile.width - distance * 0.18));
    const [leftToLeft, rightToLeft, leftToRight, rightToRight] = widthGains;

    setTarget(highpassFilter.frequency, highpass, now, smoothing);
    setTarget(baseGainNode.gain, baseMuted ? 0 : baseLevel, now, smoothing);
    setTarget(toneFilter.frequency, Math.max(850, Math.min(profile.lowpass, cutoff)), now, smoothing);
    setTarget(bodyFilter.gain, profile.body, now, smoothing);
    setTarget(presenceFilter.gain, profile.presence + richness * 0.7, now, smoothing);
    driveNode.curve = profile.drive ? makeSaturationCurve(profile.drive) : null;
    setTarget(leftToLeft.gain, (1 + width) * 0.5, now, smoothing);
    setTarget(rightToLeft.gain, (1 - width) * 0.5, now, smoothing);
    setTarget(leftToRight.gain, (1 - width) * 0.5, now, smoothing);
    setTarget(rightToRight.gain, (1 + width) * 0.5, now, smoothing);
    if (motionPanner.pan) {
      setTarget(motionDepth.gain, 0.01 + movement * 0.13, now, smoothing);
      setTarget(motionOscillator.frequency, 0.032 + movement * 0.12, now, smoothing);
    }
    setTarget(spaceDelay.delayTime, 0.07 + richness * 0.09 + distance * 0.08, now, smoothing);
    setTarget(spaceFeedback.gain, 0.03 + richness * 0.075 + distance * 0.055, now, smoothing);
    setTarget(spaceGain.gain, Math.min(0.3, space), now, smoothing);
    setTarget(noiseGain.gain, playbackActive ? profile.noise : 0, now, smooth ? 0.08 : 0.001);
    setTarget(masterGain.gain, getOutputLevel() * profile.output * (1 - distance * 0.16), now, smooth ? 0.025 : 0.001);
  }

  function getOutputLevel() {
    return clamp(masterVolume * (0.76 + intensity * 0.24));
  }

  function getFallbackOutputLevel() {
    const profile = PROFILE_SETTINGS[character] ?? PROFILE_SETTINGS.natural;
    if (baseMuted) return 0;
    return clamp(getOutputLevel() * baseLevel * profile.output * (1 - distance * 0.16));
  }

  function snapshot() {
    return {
      activeIndex,
      baseLevel,
      baseMuted,
      character,
      contextState: context?.state ?? "uninitialized",
      distance,
      intensity,
      layers: [...layerDefinitions.values()].map(({ id, level, muted, character: layerCharacter }) => ({
        id,
        level,
        muted,
        character: layerCharacter,
      })),
      movement,
      richness,
      volume: masterVolume,
    };
  }

  async function fallbackCrossfade(currentIndex, nextIndex, token) {
    const startedAt = performance.now();
    const output = getFallbackOutputLevel();
    await new Promise((resolve) => {
      const step = (now) => {
        if (token !== transitionToken) {
          resolve();
          return;
        }
        const progress = Math.min(1, (now - startedAt) / (duration * 1000));
        tracks[currentIndex].volume = output * Math.cos(progress * Math.PI * 0.5);
        tracks[nextIndex].volume = output * Math.sin(progress * Math.PI * 0.5);
        if (progress < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  applyFallbackVolumes();

  return {
    activeIndex: () => activeIndex,
    attachLayer,
    crossfadeTo,
    detachLayer,
    pauseAll,
    play,
    setLayer,
    setSoundscape,
    setVolume,
    snapshot,
    switchImmediately,
  };
}

const PROFILE_SETTINGS = {
  natural: { body: 0, drive: 0, highpass: 20, lowpass: 18000, noise: 0, output: 1, presence: 0, space: 0, tone: 1, width: 1 },
  hifi: { body: 1.2, drive: 0.018, highpass: 18, lowpass: 20000, noise: 0, output: 0.97, presence: 1.3, space: 0.006, tone: 1.12, width: 1.12 },
  tube: { body: 2.8, drive: 0.15, highpass: 34, lowpass: 12800, noise: 0.0007, output: 0.93, presence: -0.6, space: 0.016, tone: 0.78, width: 0.88 },
  radio: { body: -2.4, drive: 0.2, highpass: 280, lowpass: 4300, noise: 0.006, output: 0.84, presence: 3.5, space: 0.008, tone: 0.34, width: 0.03 },
  television: { body: -1.4, drive: 0.12, highpass: 170, lowpass: 7200, noise: 0.011, output: 0.86, presence: 2.8, space: 0.012, tone: 0.55, width: 0.12 },
  speaker: { body: 1.1, drive: 0.22, highpass: 105, lowpass: 8200, noise: 0.0015, output: 0.86, presence: 1.6, space: 0.004, tone: 0.62, width: 0.16 },
  spatial: { body: 0.2, drive: 0, highpass: 22, lowpass: 18000, noise: 0, output: 0.94, presence: 0.2, space: 0.1, tone: 1, width: 1.42 },
};

function createNoiseSource(context) {
  const length = Math.max(1, Math.floor(context.sampleRate * 2));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;
  for (let index = 0; index < length; index += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.72 + white * 0.28;
    data[index] = previous;
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

function makeSaturationCurve(amount) {
  const samples = 1024;
  const drive = 1 + amount * 36;
  const normalization = Math.tanh(drive);
  return Float32Array.from({ length: samples }, (_, index) => {
    const value = (index / (samples - 1)) * 2 - 1;
    return Math.tanh(value * drive) / normalization;
  });
}

function makeCurve(direction) {
  const samples = 64;
  return Float32Array.from({ length: samples }, (_, index) => {
    const progress = index / (samples - 1);
    return direction === "in"
      ? Math.sin(progress * Math.PI * 0.5)
      : Math.cos(progress * Math.PI * 0.5);
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value)));
}

function setTarget(parameter, value, now, smoothing) {
  parameter.cancelScheduledValues(now);
  parameter.setTargetAtTime(value, now, smoothing);
}
