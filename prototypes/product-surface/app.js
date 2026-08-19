const variants = {
  A: { index: "A / 03", label: "安静聆听" },
  B: { index: "B / 03", label: "暗夜沉浸" },
  C: { index: "C / 03", label: "声音图层" },
};

const root = document.querySelector(".prototype");
const toastElement = document.querySelector("[data-toast-output]");
const variantIndex = document.querySelector("[data-variant-index]");
const variantLabel = document.querySelector("[data-variant-label]");

const state = {
  variant: getVariantFromUrl(),
  playing: true,
  elapsed: 768,
  duration: 2700,
  volume: 72,
  intensity: "heavy",
  complexity: "simple",
  currentScene: "雷雨夜里，点燃篝火的木屋",
  currentDescription: "檐雨由远及近，炉火在木墙之间缓慢起伏",
  generation: {
    mode: "idle",
    progress: 0,
    title: "雨停后的松林，远处传来钟声",
  },
};

let generationTimer = 0;
let toastTimer = 0;

function getVariantFromUrl() {
  const requested = new URLSearchParams(window.location.search).get("variant")?.toUpperCase();
  return variants[requested] ? requested : "A";
}

function setVariant(nextVariant, updateHistory = true) {
  const normalized = variants[nextVariant] ? nextVariant : "A";
  state.variant = normalized;
  root.dataset.variant = normalized;
  variantIndex.textContent = variants[normalized].index;
  variantLabel.textContent = variants[normalized].label;

  if (updateHistory) {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", normalized);
    window.history.replaceState({ variant: normalized }, "", url);
  }
}

function moveVariant(direction) {
  const keys = Object.keys(variants);
  const index = keys.indexOf(state.variant);
  const nextIndex = (index + direction + keys.length) % keys.length;
  setVariant(keys[nextIndex]);
}

function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updatePlayback() {
  root.dataset.playing = String(state.playing);
  document.querySelectorAll("[data-play]").forEach((button) => {
    button.setAttribute("aria-label", state.playing ? "暂停" : "播放");
    button.title = state.playing ? "暂停" : "播放";
    button.querySelector("[data-icon-play]").hidden = state.playing;
    button.querySelector("[data-icon-pause]").hidden = !state.playing;
  });
  document.querySelectorAll("[data-play-status]").forEach((element) => {
    element.textContent = state.playing ? "正在播放" : "已暂停";
  });
}

function updateProgress() {
  document.querySelectorAll("[data-elapsed]").forEach((element) => {
    element.textContent = formatTime(state.elapsed);
  });
  document.querySelectorAll("[data-progress]").forEach((input) => {
    if (document.activeElement !== input) input.value = String(state.elapsed);
  });
}

function updateControl(name, value) {
  state[name] = Number(value);
  document.querySelectorAll(`[data-control="${name}"]`).forEach((input) => {
    if (document.activeElement !== input) input.value = String(value);
  });
  document.querySelectorAll(`[data-output="${name}"]`).forEach((output) => {
    output.textContent = name === "volume" ? `${value}%` : String(value);
  });
}

function updateSetting(name, value) {
  state[name] = value;
  document.querySelectorAll(`[data-setting="${name}"]`).forEach((button) => {
    const selected = button.dataset.value === value;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function syncPrompt(value, source) {
  document.querySelectorAll("[data-prompt]").forEach((textarea) => {
    if (textarea !== source) textarea.value = value;
  });
}

function getGenerationStage(progress) {
  if (progress < 28) return "正在理解场景";
  if (progress < 62) return "正在组织声音层";
  if (progress < 88) return "正在平衡距离与空间";
  return "正在完成自然变化";
}

function renderGeneration() {
  const { mode, progress, title } = state.generation;
  document.querySelectorAll("[data-generation]").forEach((panel) => {
    panel.dataset.mode = mode === "working" ? "working" : mode;
    const meter = panel.querySelector("[data-generation-progress]");
    const percent = panel.querySelector("[data-generation-percent]");
    const status = panel.querySelector("[data-generation-state]");
    const readyTitle = panel.querySelector("[data-ready-title]");
    if (meter) meter.style.transform = `scaleX(${progress / 100})`;
    if (percent) percent.textContent = `${Math.round(progress)}%`;
    if (status) status.textContent = getGenerationStage(progress);
    if (readyTitle) readyTitle.textContent = title;
  });

  document.querySelectorAll("[data-generate]").forEach((button) => {
    button.disabled = mode === "working";
    const label = button.querySelector("[data-generate-label]");
    if (label) label.textContent = mode === "working" ? "正在后台生成" : button.classList.contains("light-button") ? "在后台生成" : "生成声景";
  });
}

function startGeneration(sourceButton) {
  if (state.generation.mode === "working") {
    showToast("新的声景仍在生成，当前播放没有中断");
    return;
  }

  const scope = sourceButton.closest("aside, section") || document;
  const scopedPrompt = scope.querySelector("[data-prompt]");
  const prompt = (scopedPrompt?.value || document.querySelector("[data-prompt]")?.value || "").trim();
  if (!prompt) {
    showToast("先写下一处想听见的世界");
    scopedPrompt?.focus();
    return;
  }

  syncPrompt(prompt, scopedPrompt);
  state.generation = { mode: "working", progress: 0, title: prompt };
  renderGeneration();
  showToast("已在后台开始生成，当前声景继续播放");

  window.clearInterval(generationTimer);
  const startedAt = performance.now();
  generationTimer = window.setInterval(() => {
    const elapsed = performance.now() - startedAt;
    state.generation.progress = Math.min(100, (elapsed / 4600) * 100);
    if (state.generation.progress >= 100) {
      window.clearInterval(generationTimer);
      state.generation.mode = "ready";
      state.generation.progress = 100;
      renderGeneration();
      showToast("新声景已就绪，当前播放仍未中断");
      return;
    }
    renderGeneration();
  }, 100);
}

function switchToReadyScene() {
  if (state.generation.mode !== "ready") return;
  state.currentScene = state.generation.title;
  state.currentDescription = "新的声音关系正在展开，场景会持续自然变化";
  state.elapsed = 0;
  state.playing = true;
  state.generation = { mode: "idle", progress: 0, title: state.currentScene };
  updateSceneCopy();
  updatePlayback();
  updateProgress();
  renderGeneration();
  showToast(`已切换到「${state.currentScene}」`);
}

function updateSceneCopy() {
  document.querySelectorAll(".scene-title").forEach((element) => {
    element.textContent = state.currentScene;
  });
  document.querySelectorAll(".scene-description").forEach((element) => {
    element.textContent = state.currentDescription;
  });
}

function selectSavedScene(button) {
  state.currentScene = button.dataset.scene;
  state.currentDescription = button.dataset.description;
  state.elapsed = 0;
  state.playing = true;
  document.querySelectorAll("[data-scene]").forEach((item) => item.classList.toggle("is-active", item === button));
  updateSceneCopy();
  updatePlayback();
  updateProgress();
  showToast(`已切换到「${state.currentScene}」`);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toastElement.classList.remove("is-visible"), 2600);
}

document.querySelectorAll("[data-play]").forEach((button) => {
  button.addEventListener("click", () => {
    state.playing = !state.playing;
    updatePlayback();
  });
});

document.querySelectorAll("[data-progress]").forEach((input) => {
  input.addEventListener("input", () => {
    state.elapsed = Number(input.value);
    updateProgress();
  });
});

document.querySelectorAll("[data-control]").forEach((input) => {
  input.addEventListener("input", () => updateControl(input.dataset.control, input.value));
});

document.querySelectorAll("[data-setting]").forEach((button) => {
  button.addEventListener("click", () => updateSetting(button.dataset.setting, button.dataset.value));
});

document.querySelectorAll("[data-prompt]").forEach((textarea) => {
  textarea.addEventListener("input", () => syncPrompt(textarea.value, textarea));
});

document.querySelectorAll("[data-generate]").forEach((button) => {
  button.addEventListener("click", () => startGeneration(button));
});

document.querySelectorAll("[data-switch-ready]").forEach((button) => {
  button.addEventListener("click", switchToReadyScene);
});

document.querySelectorAll("[data-go-variant]").forEach((button) => {
  button.addEventListener("click", () => setVariant(button.dataset.goVariant));
});

document.querySelector("[data-previous-variant]").addEventListener("click", () => moveVariant(-1));
document.querySelector("[data-next-variant]").addEventListener("click", () => moveVariant(1));

document.querySelectorAll("[data-scene]").forEach((button) => {
  button.addEventListener("click", () => selectSavedScene(button));
});

document.querySelectorAll("[data-layer-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const active = button.getAttribute("aria-pressed") !== "false";
    button.setAttribute("aria-pressed", String(!active));
    button.textContent = active ? "关闭" : "开启";
    button.closest("[data-layer-row]").dataset.muted = String(active);
  });
});

document.querySelectorAll("[data-focus-prompt]").forEach((button) => {
  button.addEventListener("click", () => document.querySelector(".screen-c [data-prompt]")?.focus());
});

document.querySelectorAll("[data-toast]").forEach((button) => {
  button.addEventListener("click", () => showToast(button.dataset.toast));
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const editing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement;
  if (editing || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === "ArrowLeft") moveVariant(-1);
  if (event.key === "ArrowRight") moveVariant(1);
  if (event.key === " ") {
    event.preventDefault();
    state.playing = !state.playing;
    updatePlayback();
  }
});

window.addEventListener("popstate", () => setVariant(getVariantFromUrl(), false));

window.setInterval(() => {
  if (!state.playing) return;
  state.elapsed = state.elapsed >= state.duration ? 0 : state.elapsed + 1;
  updateProgress();
}, 1000);

setVariant(state.variant, false);
updatePlayback();
updateProgress();
updateControl("volume", state.volume);
updateSetting("intensity", state.intensity);
updateSetting("complexity", state.complexity);
renderGeneration();
