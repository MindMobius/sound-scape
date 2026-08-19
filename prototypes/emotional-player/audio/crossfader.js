const AudioContextClass = window.AudioContext || window.webkitAudioContext;

export function createEqualPowerCrossfader(tracks, { volume = 1, duration = 1.3 } = {}) {
  let context = null;
  let masterGain = null;
  let mixBus = null;
  let toneFilter = null;
  let bodyFilter = null;
  let detailFilter = null;
  let detailGain = null;
  let spaceDelay = null;
  let spaceFeedback = null;
  let spaceGain = null;
  let compressor = null;
  let trackGains = [];
  let activeIndex = 0;
  let masterVolume = clamp(volume);
  let baseLevel = 1;
  let baseMuted = false;
  let intensity = 0.52;
  let richness = 0.68;
  let character = "natural";
  let transitionToken = 0;

  function ensureGraph() {
    if (!AudioContextClass || context) return Boolean(context);
    try {
      context = new AudioContextClass();
      mixBus = context.createGain();
      toneFilter = context.createBiquadFilter();
      bodyFilter = context.createBiquadFilter();
      detailFilter = context.createBiquadFilter();
      detailGain = context.createGain();
      spaceDelay = context.createDelay(0.5);
      spaceFeedback = context.createGain();
      spaceGain = context.createGain();
      compressor = context.createDynamicsCompressor();
      masterGain = context.createGain();

      toneFilter.type = "lowpass";
      toneFilter.Q.value = 0.35;
      bodyFilter.type = "lowshelf";
      bodyFilter.frequency.value = 260;
      detailFilter.type = "highpass";
      detailFilter.frequency.value = 1800;
      compressor.threshold.value = -14;
      compressor.knee.value = 18;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.015;
      compressor.release.value = 0.3;

      mixBus.connect(toneFilter).connect(bodyFilter).connect(compressor);
      mixBus.connect(detailFilter).connect(detailGain).connect(compressor);
      mixBus.connect(spaceDelay);
      spaceDelay.connect(spaceGain).connect(compressor);
      spaceDelay.connect(spaceFeedback).connect(spaceDelay);
      compressor.connect(masterGain).connect(context.destination);
      trackGains = tracks.map((track, index) => {
        const source = context.createMediaElementSource(track);
        const gain = context.createGain();
        gain.gain.value = index === activeIndex ? 1 : 0;
        source.connect(gain).connect(mixBus);
        track.volume = 1;
        return gain;
      });
      applySoundscape(false);
      return true;
    } catch (error) {
      console.warn("Web Audio crossfade is unavailable; using media-element fallback", error);
      context = null;
      masterGain = null;
      mixBus = null;
      toneFilter = null;
      bodyFilter = null;
      detailFilter = null;
      detailGain = null;
      spaceDelay = null;
      spaceFeedback = null;
      spaceGain = null;
      compressor = null;
      trackGains = [];
      applyFallbackVolumes();
      return false;
    }
  }

  async function resume() {
    if (!ensureGraph()) return false;
    if (context.state === "suspended") await context.resume();
    return context.state === "running";
  }

  async function play() {
    await resume();
    await tracks[activeIndex].play();
  }

  function pauseAll() {
    transitionToken += 1;
    tracks.forEach((track) => track.pause());
    settleGains();
  }

  function setVolume(value) {
    masterVolume = clamp(value);
    applySoundscape();
  }

  function setSoundscape(next = {}) {
    if (next.intensity !== undefined) intensity = clamp(next.intensity);
    if (next.richness !== undefined) richness = clamp(next.richness);
    if (next.baseLevel !== undefined) baseLevel = clamp(next.baseLevel);
    if (next.baseMuted !== undefined) baseMuted = Boolean(next.baseMuted);
    if (next.character !== undefined) character = next.character;
    applySoundscape();
  }

  async function crossfadeTo(nextIndex) {
    if (nextIndex === activeIndex) return activeIndex;
    const token = ++transitionToken;
    const currentIndex = activeIndex;
    const nextTrack = tracks[nextIndex];
    await resume();
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
  }

  function applySoundscape(smooth = true) {
    if (!context || !masterGain) {
      applyFallbackVolumes();
      return;
    }

    const profile = CHARACTER_PROFILES[character] ?? CHARACTER_PROFILES.natural;
    const now = context.currentTime;
    const smoothing = smooth ? 0.055 : 0.001;
    const cutoff = (1900 + Math.pow(intensity, 0.72) * 10400) * profile.tone;
    const detail = (0.015 + Math.pow(richness, 1.2) * 0.17) * profile.detail;
    const space = 0.008 + richness * 0.075 + profile.space;

    setTarget(toneFilter.frequency, Math.max(900, Math.min(16000, cutoff)), now, smoothing);
    setTarget(bodyFilter.gain, profile.body, now, smoothing);
    setTarget(detailFilter.frequency, 2600 - richness * 1200, now, smoothing);
    setTarget(detailGain.gain, detail, now, smoothing);
    setTarget(spaceDelay.delayTime, 0.075 + richness * 0.105, now, smoothing);
    setTarget(spaceFeedback.gain, 0.035 + richness * 0.09, now, smoothing);
    setTarget(spaceGain.gain, Math.min(0.24, space), now, smoothing);
    setTarget(masterGain.gain, getOutputLevel() * profile.output, now, smooth ? 0.025 : 0.001);
  }

  function getOutputLevel() {
    if (baseMuted) return 0;
    return clamp(masterVolume * baseLevel * (0.76 + intensity * 0.24));
  }

  function getFallbackOutputLevel() {
    const profile = CHARACTER_PROFILES[character] ?? CHARACTER_PROFILES.natural;
    return clamp(getOutputLevel() * profile.output);
  }

  function snapshot() {
    return {
      activeIndex,
      baseLevel,
      baseMuted,
      character,
      contextState: context?.state ?? "uninitialized",
      intensity,
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
    crossfadeTo,
    pauseAll,
    play,
    setSoundscape,
    setVolume,
    snapshot,
    switchImmediately,
  };
}

const CHARACTER_PROFILES = {
  natural: { body: 0, detail: 1, output: 1, space: 0, tone: 1 },
  warm: { body: 3.5, detail: 0.72, output: 0.96, space: 0.012, tone: 0.68 },
  distant: { body: -1.5, detail: 0.42, output: 0.84, space: 0.095, tone: 0.36 },
};

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
