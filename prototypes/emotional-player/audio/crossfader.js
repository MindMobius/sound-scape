const AudioContextClass = window.AudioContext || window.webkitAudioContext;

export function createEqualPowerCrossfader(tracks, { volume = 1, duration = 1.3 } = {}) {
  let context = null;
  let masterGain = null;
  let trackGains = [];
  let activeIndex = 0;
  let masterVolume = clamp(volume);
  let transitionToken = 0;

  function ensureGraph() {
    if (!AudioContextClass || context) return Boolean(context);
    try {
      context = new AudioContextClass();
      masterGain = context.createGain();
      masterGain.gain.value = masterVolume;
      masterGain.connect(context.destination);
      trackGains = tracks.map((track, index) => {
        const source = context.createMediaElementSource(track);
        const gain = context.createGain();
        gain.gain.value = index === activeIndex ? 1 : 0;
        source.connect(gain).connect(masterGain);
        track.volume = 1;
        return gain;
      });
      return true;
    } catch (error) {
      console.warn("Web Audio crossfade is unavailable; using media-element fallback", error);
      context = null;
      masterGain = null;
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
    if (masterGain && context) {
      const now = context.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(masterVolume, now, 0.018);
    } else {
      applyFallbackVolumes();
    }
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
    tracks.forEach((track, index) => {
      track.volume = index === activeIndex ? masterVolume : 0;
    });
  }

  async function fallbackCrossfade(currentIndex, nextIndex, token) {
    const startedAt = performance.now();
    await new Promise((resolve) => {
      const step = (now) => {
        if (token !== transitionToken) {
          resolve();
          return;
        }
        const progress = Math.min(1, (now - startedAt) / (duration * 1000));
        tracks[currentIndex].volume = masterVolume * Math.cos(progress * Math.PI * 0.5);
        tracks[nextIndex].volume = masterVolume * Math.sin(progress * Math.PI * 0.5);
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
    setVolume,
    switchImmediately,
  };
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
