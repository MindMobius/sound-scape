import "@fontsource-variable/noto-serif-sc/wght.css";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Compass,
  createIcons,
  House,
  Library,
  Maximize2,
  Pause,
  Play,
  Plus,
  Shuffle,
  Timer,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide";
import rainAudioUrl from "./media/rain-cabin.mp3?url";
import waterAudioUrl from "./media/open-water.wav?url";
import rainHero from "../../assets/scenes/rain-cabin/rain-cabin-hero-web-v1.jpg?url";
import rainCover from "../../assets/scenes/rain-cabin/rain-cabin-cover-web-v1.jpg?url";
import coastalHero from "../../assets/scenes/coastal-night/coastal-night-hero-web-v1.jpg?url";
import coastalCover from "../../assets/scenes/coastal-night/coastal-night-cover-web-v1.jpg?url";
import { createEqualPowerCrossfader } from "./audio/crossfader.js";
import {
  deleteStoredAudioLayer,
  listStoredAudioLayers,
  loadPreferences,
  putStoredAudioLayer,
  savePreferences,
} from "./audio/storage.js";
import { createFocusMotion } from "./motion/focus-motion.js";
import { createNavigationMotion } from "./motion/navigation-motion.js";
import { createPlayerMotion } from "./motion/player-motion.js";
import { createMotionRuntime } from "./motion/runtime.js";
import { createSceneMotion } from "./motion/scene-motion.js";
import { MembraneField } from "./visual-field.js";

const makeBaseLayer = (id, name, detail) => ({
  id: `${id}-base`,
  name,
  detail,
  level: 100,
  muted: false,
  source: "base",
});

const scenes = [
  {
    id: "rain-cabin",
    name: "雨夜木屋",
    description: "雷雨夜里，点燃篝火的木屋。",
    category: "interior",
    saved: true,
    recent: true,
    theme: "light",
    hero: rainHero,
    cover: rainCover,
    audio: rainAudioUrl,
    elements: ["屋檐雨", "远雷", "木屋回响"],
    layers: [makeBaseLayer("rain-cabin", "雨声实录", "内置声音 · 实时调音")],
    palette: ["#aebbc7", "#c4b7ae", "#78877d", "#d36b54", "#8a8e90", "#bcc5ce", "#d3ccc2"],
  },
  {
    id: "coastal-night",
    name: "深夜海岸",
    description: "深夜海岸上，潮声持续靠近又缓缓退去。",
    category: "nature",
    saved: true,
    recent: true,
    theme: "dark",
    hero: coastalHero,
    cover: coastalCover,
    audio: waterAudioUrl,
    elements: ["近岸潮水", "远浪", "礁石回响"],
    layers: [makeBaseLayer("coastal-night", "海浪实录", "内置声音 · 实时调音")],
    palette: ["#6b8290", "#7f7a70", "#4c6664", "#a95f4f", "#59656d", "#879197", "#706d65"],
  },
];

const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
const validViews = new Set(["home", "explore", "create", "library"]);
const randomPrompts = [
  "雷雨夜里，点燃篝火的木屋。",
  "深夜海岸上，潮声持续靠近又缓缓退去。",
  "雨停前的玻璃温室，水珠沿着窗面缓慢滑落。",
  "夜里的礁石海湾，浪声从远处一层层靠近。",
];
const jobStages = [
  { until: 25, label: "理解场景" },
  { until: 55, label: "选择声音母版" },
  { until: 82, label: "调整轻重与层次" },
  { until: 101, label: "完成本地编排" },
];
const dom = {
  shell: document.querySelector("#app-shell"),
  workspace: document.querySelector("#workspace"),
  views: [...document.querySelectorAll(".app-view")],
  viewLinks: [...document.querySelectorAll("[data-view-link]")],
  homeGreeting: document.querySelector("#home-view-title"),
  homeGreetingNote: document.querySelector("#home-greeting-note"),
  homeGuideCover: document.querySelector("#home-guide-cover"),
  homeGuideScene: document.querySelector(".home-guide-scene"),
  globalPlayer: document.querySelector("#global-player"),
  playerExpandedContent: document.querySelector("#player-expanded-content"),
  playerExpandedScroll: document.querySelector("#player-expanded-scroll"),
  playerAtmosphereImage: document.querySelector("#player-atmosphere-image"),
  playerCollapseButton: document.querySelector("#player-collapse-button"),
  playerHeroArtwork: document.querySelector(".player-hero-artwork"),
  playerCover: document.querySelector("#player-cover"),
  playerTitle: document.querySelector("#player-title"),
  playerState: document.querySelector("#player-state"),
  playerIdentityButton: document.querySelector("#player-identity-button"),
  playerHeroCover: document.querySelector("#player-hero-cover"),
  playerHeroState: document.querySelector("#player-hero-state"),
  playerExpandedState: document.querySelector("#player-expanded-state"),
  playerExpandedTitle: document.querySelector("#player-expanded-title"),
  playerExpandedDescription: document.querySelector("#player-expanded-description"),
  playerExpandedElements: document.querySelector("#player-expanded-elements"),
  playerExpandedCopy: document.querySelector(".player-expanded-copy"),
  playerFeeling: document.querySelector(".player-feeling"),
  feelingSummary: document.querySelector("#feeling-summary"),
  playerScrollCue: document.querySelector(".player-scroll-cue"),
  soundDetailsButton: document.querySelector("#sound-details-button"),
  detailsPanel: document.querySelector("#sound-details-panel"),
  sleepTimerButton: document.querySelector("#sleep-timer-button"),
  sleepTimerLabel: document.querySelector("#sleep-timer-label"),
  sleepTimerMenu: document.querySelector("#sleep-timer-menu"),
  sleepTimerOptions: [...document.querySelectorAll("[data-sleep-minutes]")],
  volumeButton: document.querySelector("#volume-button"),
  volumeLabel: document.querySelector("#volume-label"),
  volumePopover: document.querySelector("#volume-popover"),
  volumePopoverValue: document.querySelector("#volume-popover-value"),
  playButtons: [
    document.querySelector("#player-play-button"),
    document.querySelector("#focus-play-button"),
  ].filter(Boolean),
  volumeInputs: [document.querySelector("#volume"), ...document.querySelectorAll("[data-volume]")],
  intensityInputs: [...document.querySelectorAll("[data-intensity]")],
  richnessInputs: [...document.querySelectorAll("[data-richness]")],
  exploreGrid: document.querySelector("#explore-grid"),
  libraryGrid: document.querySelector("#library-grid"),
  libraryCount: document.querySelector("#library-count"),
  primaryNav: document.querySelector(".primary-nav"),
  mobileNav: document.querySelector(".mobile-nav"),
  featuredImage: document.querySelector("#featured-image"),
  featuredElements: document.querySelector("#featured-elements"),
  featuredTitle: document.querySelector("#featured-title"),
  featuredDescription: document.querySelector("#featured-description"),
  featuredPlay: document.querySelector("#featured-play"),
  createForm: document.querySelector("#create-form"),
  prompt: document.querySelector("#scene-prompt"),
  promptCount: document.querySelector("#prompt-count"),
  promptHint: document.querySelector("#prompt-hint"),
  composeButton: document.querySelector("#compose-button"),
  taskToast: document.querySelector("#task-toast"),
  taskPhase: document.querySelector("#task-phase"),
  taskPercent: document.querySelector("#task-percent"),
  readyCover: document.querySelector("#ready-cover"),
  readyTitle: document.querySelector("#ready-title"),
  dismissReady: document.querySelector("#dismiss-ready"),
  switchScene: document.querySelector("#switch-scene"),
  toast: document.querySelector("#toast"),
  layerList: document.querySelector("#layer-list"),
  audioUpload: document.querySelector("#audio-upload"),
  addAudioButton: document.querySelector("#add-audio-button"),
  browseAudioButton: document.querySelector("#browse-audio-button"),
  focusMode: document.querySelector("#focus-mode"),
  focusVisual: document.querySelector("#focus-visual"),
  focusStatic: document.querySelector("#focus-static"),
  focusHeader: document.querySelector(".focus-header"),
  focusCopy: document.querySelector(".focus-copy"),
  focusPlayer: document.querySelector(".focus-player"),
  focusButton: document.querySelector("#focus-button"),
  focusClose: document.querySelector("#focus-close"),
  focusTitle: document.querySelector("#focus-title"),
  focusDescription: document.querySelector("#focus-description"),
  focusState: document.querySelector("#focus-state"),
  canvas: document.querySelector("#membrane-field"),
  renderStatus: document.querySelector("#render-status"),
  contentInertTargets: [
    document.querySelector(".side-rail"),
    document.querySelector(".mobile-header"),
    document.querySelector(".workspace"),
    document.querySelector(".mobile-nav"),
  ].filter(Boolean),
};

const motionRuntime = createMotionRuntime();

const initialRequest = new URLSearchParams(window.location.search).get("view");
const storedPreferences = loadPreferences();
scenes.forEach((scene) => {
  const storedMix = storedPreferences.sceneMixes?.[scene.id];
  const baseLayer = scene.layers[0];
  if (!storedMix || !baseLayer) return;
  baseLayer.level = clampNumber(storedMix.level, 0, 100, baseLayer.level);
  baseLayer.muted = Boolean(storedMix.muted);
});

const state = {
  activeView: getInitialView(),
  playerExpanded: ["player", "listening", "advanced"].includes(initialRequest),
  sleepMenuOpen: false,
  volumePopoverOpen: false,
  sleepTimerMinutes: 0,
  sleepTimerId: 0,
  sleepTimerEndsAt: 0,
  sleepTimerTickerId: 0,
  currentScene: sceneById.get(storedPreferences.sceneId) ?? sceneById.get("rain-cabin"),
  featuredScene: sceneById.get("coastal-night"),
  pendingScene: null,
  generatedReady: null,
  playing: false,
  volume: clampNumber(storedPreferences.volume, 0, 1, Number(dom.volumeInputs[0].value) / 100),
  intensity: clampNumber(storedPreferences.intensity, 0, 1, Number(dom.intensityInputs[0].value) / 100),
  richness: clampNumber(storedPreferences.richness, 0, 1, Number(dom.richnessInputs[0].value) / 100),
  activeAudio: 0,
  hasPlayed: false,
  jobState: "idle",
  jobProgress: 0,
  jobTimer: 0,
  playingAtJobStart: false,
  switching: false,
  playerTransitioning: false,
  focusOpen: false,
  focusTransitioning: false,
  fieldStarted: false,
  lastFocused: null,
  character: ["natural", "warm", "distant"].includes(storedPreferences.character)
    ? storedPreferences.character
    : "natural",
  exploreFilter: "all",
  libraryFilter: "all",
};

const audioTracks = [new Audio(), new Audio()];
audioTracks.forEach((audio, index) => {
  audio.id = `audio-track-${index}`;
  audio.loop = true;
  audio.preload = index === 0 ? "auto" : "none";
  audio.crossOrigin = "anonymous";
  audio.hidden = true;
  audio.setAttribute("aria-hidden", "true");
  document.body.append(audio);
});
audioTracks[0].src = state.currentScene.audio;
audioTracks[0].volume = state.volume;
audioTracks[1].volume = 0;

const audioCrossfader = createEqualPowerCrossfader(audioTracks, {
  volume: state.volume,
  duration: 1.3,
});
audioCrossfader.setVolume(state.volume);
audioCrossfader.setSoundscape({
  baseLevel: getBaseLayer().level / 100,
  baseMuted: getBaseLayer().muted,
  character: state.character,
  intensity: state.intensity,
  richness: state.richness,
});

const field = new MembraneField({
  canvas: dom.canvas,
  surface: dom.focusVisual,
  status: dom.renderStatus,
});

const navigationMotion = createNavigationMotion({
  containers: [dom.primaryNav, dom.mobileNav],
  isReducedMotion: motionRuntime.isReduced,
});
const sceneMotion = createSceneMotion({ isReducedMotion: motionRuntime.isReduced });

let restoreFocusAfterCollapse = false;
let queuedSceneSwitch = null;
let fieldStartPromise = null;

const playerMotion = createPlayerMotion({
  elements: {
    atmosphere: dom.playerAtmosphereImage,
    collapseButton: dom.playerCollapseButton,
    content: dom.playerExpandedContent,
    copy: dom.playerExpandedCopy,
    description: dom.playerExpandedDescription,
    detailsPanel: dom.detailsPanel,
    elementList: dom.playerExpandedElements,
    feeling: dom.playerFeeling,
    hero: dom.playerHeroArtwork,
    heroCover: dom.playerHeroCover,
    scrollContainer: dom.playerExpandedScroll,
    scrollCue: dom.playerScrollCue,
    title: dom.playerExpandedTitle,
  },
  isReducedMotion: motionRuntime.isReduced,
  getArtworkSource: () => dom.playerCover,
  onTransitionStart: (active) => {
    if (state.playerTransitioning === active) return;
    state.playerTransitioning = active;
    syncPlayerStructure();
  },
  onOpened: finishPlayerOpen,
  onClosed: finishPlayerClose,
});

const focusMotion = createFocusMotion({
  elements: {
    mode: dom.focusMode,
    static: dom.focusStatic,
    header: dom.focusHeader,
    copy: dom.focusCopy,
    player: dom.focusPlayer,
  },
  isReducedMotion: motionRuntime.isReduced,
  getOriginClip: getArtworkClipPath,
  onOpened: finishFocusOpen,
  onClosed: finishFocusClose,
});

async function boot() {
  await restoreStoredAudioLayers();
  if (typeof storedPreferences.prompt === "string") dom.prompt.value = storedPreferences.prompt;
  updatePromptCount();
  renderHomeGreeting();
  renderCurrentScene();
  renderFeaturedScene();
  renderCollections();
  setActiveView(state.activeView, false);
  syncPlayerStructure();
  playerMotion.setInitialState(state.playerExpanded);
  installInteractions();
  syncControls();
  syncPlaybackState();
  syncStateMarkers();
  renderIcons();
  exposeDebugApi();
  motionRuntime.subscribe(({ reduceMotion }) => {
    field.setReducedMotion(reduceMotion);
    if (state.playerTransitioning) playerMotion.settle(state.playerExpanded);
    if (state.focusTransitioning) focusMotion.settle(state.focusOpen);
  });
}

function getInitialView() {
  if (validViews.has(initialRequest)) return initialRequest;
  if (validViews.has(storedPreferences.activeView)) return storedPreferences.activeView;
  return "home";
}

function installInteractions() {
  dom.viewLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      setActiveView(link.dataset.viewLink);
    });
  });

  dom.playButtons.forEach((button) => button.addEventListener("click", togglePlayback));
  dom.volumeInputs.forEach((input) => input.addEventListener("input", () => updateVolume(input.value)));
  dom.intensityInputs.forEach((input) => input.addEventListener("input", () => updateFeeling("intensity", input.value)));
  dom.richnessInputs.forEach((input) => input.addEventListener("input", () => updateFeeling("richness", input.value)));

  dom.playerIdentityButton.addEventListener("click", () => {
    if (state.playerExpanded) collapsePlayer();
    else expandPlayer();
  });
  dom.playerCollapseButton.addEventListener("click", () => collapsePlayer({ restoreFocus: true }));
  dom.sleepTimerButton.addEventListener("click", () => toggleSleepTimerMenu());
  dom.volumeButton.addEventListener("click", () => toggleVolumePopover());
  dom.sleepTimerOptions.forEach((button) => {
    button.addEventListener("click", () => setSleepTimer(Number(button.dataset.sleepMinutes)));
  });
  dom.soundDetailsButton.addEventListener("click", scrollToSoundDetails);
  dom.focusButton.addEventListener("click", openFocusMode);
  dom.focusButton.addEventListener("pointerenter", prepareFocusField, { passive: true });
  dom.focusButton.addEventListener("focus", prepareFocusField);
  dom.focusClose.addEventListener("click", closeFocusMode);
  dom.featuredPlay.addEventListener("click", () => switchToScene(state.featuredScene, { autoPlay: true }));

  document.querySelectorAll("[data-shuffle]").forEach((button) => {
    button.addEventListener("click", () => {
      const candidates = scenes.filter((scene) => scene.id !== state.currentScene.id);
      const nextScene = candidates[Math.floor(Math.random() * candidates.length)];
      switchToScene(nextScene, { autoPlay: true });
    });
  });

  [dom.exploreGrid, dom.libraryGrid, document.querySelector(".recent-jobs")].filter(Boolean).forEach((container) => {
    container.addEventListener("click", handleSceneSelection);
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.exploreFilter = button.dataset.filter;
      updateTabSelection(button, "[data-filter]");
      renderExploreGrid();
    });
  });

  document.querySelectorAll("[data-library-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.libraryFilter = button.dataset.libraryFilter;
      updateTabSelection(button, "[data-library-filter]");
      renderLibraryGrid();
    });
  });

  dom.createForm.addEventListener("submit", (event) => {
    event.preventDefault();
    startGeneration(dom.prompt.value.trim());
  });
  dom.prompt.addEventListener("input", () => {
    updatePromptCount();
    persistPreferences();
  });
  document.querySelector("#random-prompt-button").addEventListener("click", setRandomPrompt);
  document.querySelectorAll("[data-starter]").forEach((button) => {
    button.addEventListener("click", () => setPrompt(button.dataset.starter));
  });
  dom.dismissReady.addEventListener("click", dismissReadyScene);
  dom.switchScene.addEventListener("click", () => {
    if (state.pendingScene) switchToScene(state.pendingScene, { autoPlay: true, generated: true });
  });

  document.querySelectorAll("[data-toast]").forEach((button) => {
    button.addEventListener("click", () => showToast(button.dataset.toast));
  });

  document.querySelector("#character-options").addEventListener("click", (event) => {
    const button = event.target.closest("[data-character]");
    if (!button) return;
    setCharacter(button.dataset.character, button);
  });

  dom.layerList.addEventListener("input", handleLayerInput);
  dom.layerList.addEventListener("click", handleLayerToggle);
  [dom.addAudioButton, dom.browseAudioButton].forEach((button) => button.addEventListener("click", () => dom.audioUpload.click()));
  dom.audioUpload.addEventListener("change", () => handleAudioUpload());

  document.addEventListener("click", (event) => {
    if (state.sleepMenuOpen
      && !dom.sleepTimerMenu.contains(event.target)
      && !dom.sleepTimerButton.contains(event.target)) {
      toggleSleepTimerMenu(false, false);
    }
    if (state.volumePopoverOpen
      && !dom.volumePopover.contains(event.target)
      && !dom.volumeButton.contains(event.target)) {
      toggleVolumePopover(false, false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (state.focusOpen) closeFocusMode();
    else if (state.volumePopoverOpen) toggleVolumePopover(false);
    else if (state.sleepMenuOpen) toggleSleepTimerMenu(false);
    else if (state.playerExpanded) collapsePlayer({ restoreFocus: true });
  });
}

function setActiveView(viewName, animate = true) {
  if (!validViews.has(viewName)) return;
  state.activeView = viewName;
  dom.shell.dataset.view = viewName;

  dom.views.forEach((view) => {
    const active = view.dataset.view === viewName;
    view.hidden = !active;
    view.classList.toggle("is-active", active);
  });

  dom.viewLinks.forEach((link) => {
    const isPrimaryNavigation = Boolean(link.closest(".primary-nav, .mobile-nav"));
    const active = isPrimaryNavigation && link.dataset.viewLink === viewName;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  navigationMotion.select(viewName, animate);
  dom.workspace.scrollTo({ top: 0, behavior: "auto" });
  const url = new URL(window.location.href);
  url.searchParams.set("view", viewName);
  window.history.replaceState(null, "", url);
  const activeView = dom.views.find((view) => view.dataset.view === viewName);
  navigationMotion.enterView(activeView, animate);
  persistPreferences();
}

function expandPlayer() {
  if (state.focusOpen || state.focusTransitioning) return;
  if (state.playerExpanded && !state.playerTransitioning) return;
  closeControlPopovers(false);
  state.playerExpanded = true;
  state.playerTransitioning = true;
  restoreFocusAfterCollapse = false;
  dom.playerExpandedScroll.scrollTop = 0;
  syncPlayerStructure();
  playerMotion.open();
}

function collapsePlayer({ restoreFocus = false } = {}) {
  if (state.focusOpen || state.focusTransitioning) return;
  if (!state.playerExpanded && !state.playerTransitioning) return;
  closeControlPopovers(false);
  state.playerExpanded = false;
  state.playerTransitioning = true;
  restoreFocusAfterCollapse ||= restoreFocus;
  syncPlayerStructure();
  playerMotion.close();
}

function finishPlayerOpen() {
  state.playerTransitioning = false;
  syncPlayerStructure();
}

function finishPlayerClose() {
  state.playerTransitioning = false;
  dom.playerExpandedScroll.scrollTop = 0;
  syncPlayerStructure();
  if (restoreFocusAfterCollapse) dom.playerIdentityButton.focus({ preventScroll: true });
  restoreFocusAfterCollapse = false;
}

function scrollToSoundDetails() {
  window.requestAnimationFrame(() => {
    dom.detailsPanel.scrollIntoView({ behavior: motionRuntime.isReduced() ? "auto" : "smooth", block: "start" });
  });
}

function syncPlayerStructure() {
  const structurallyExpanded = state.playerExpanded || state.playerTransitioning;
  const playerState = structurallyExpanded ? "expanded" : "collapsed";
  dom.shell.dataset.playerState = playerState;
  dom.globalPlayer.setAttribute("aria-label", state.playerExpanded ? `${state.currentScene.name}播放器` : "持续播放控制");
  dom.playerExpandedContent.setAttribute("aria-hidden", String(!state.playerExpanded));
  dom.playerExpandedContent.inert = !state.playerExpanded;
  dom.playerIdentityButton.setAttribute("aria-label", state.playerExpanded
    ? `收起播放器，当前是${state.currentScene.name}`
    : `展开播放器，当前是${state.currentScene.name}`);
  dom.playerCollapseButton.setAttribute("aria-label", `收起${state.currentScene.name}播放器`);
  syncBackgroundInert();
  syncStateMarkers();
}

function toggleSleepTimerMenu(force, restoreFocus = true) {
  const open = typeof force === "boolean" ? force : !state.sleepMenuOpen;
  if (open === state.sleepMenuOpen) return;
  if (open && state.volumePopoverOpen) toggleVolumePopover(false, false);
  state.sleepMenuOpen = open;
  setPopoverVisibility(dom.sleepTimerMenu, open, () => state.sleepMenuOpen);
  dom.sleepTimerMenu.setAttribute("aria-hidden", String(!open));
  dom.sleepTimerMenu.inert = !open;
  dom.sleepTimerButton.setAttribute("aria-expanded", String(open));
  if (open) dom.sleepTimerOptions.find((button) => button.classList.contains("is-selected"))?.focus({ preventScroll: true });
  else if (restoreFocus) dom.sleepTimerButton.focus({ preventScroll: true });
  syncStateMarkers();
}

function toggleVolumePopover(force, restoreFocus = true) {
  const open = typeof force === "boolean" ? force : !state.volumePopoverOpen;
  if (open === state.volumePopoverOpen) return;
  if (open && state.sleepMenuOpen) toggleSleepTimerMenu(false, false);
  state.volumePopoverOpen = open;
  setPopoverVisibility(dom.volumePopover, open, () => state.volumePopoverOpen);
  dom.volumePopover.setAttribute("aria-hidden", String(!open));
  dom.volumePopover.inert = !open;
  dom.volumeButton.setAttribute("aria-expanded", String(open));
  if (open) dom.volumeInputs[0].focus({ preventScroll: true });
  else if (restoreFocus) dom.volumeButton.focus({ preventScroll: true });
  syncStateMarkers();
}

function closeControlPopovers(restoreFocus = false) {
  if (state.sleepMenuOpen) toggleSleepTimerMenu(false, restoreFocus);
  if (state.volumePopoverOpen) toggleVolumePopover(false, restoreFocus);
}

function setPopoverVisibility(element, open, isStillOpen) {
  if (open) {
    element.hidden = false;
    window.requestAnimationFrame(() => {
      if (isStillOpen()) element.classList.add("is-open");
    });
    return;
  }

  element.classList.remove("is-open");
  window.setTimeout(() => {
    if (!isStillOpen()) element.hidden = true;
  }, motionRuntime.isReduced() ? 0 : 180);
}

function setSleepTimer(minutes) {
  window.clearTimeout(state.sleepTimerId);
  window.clearInterval(state.sleepTimerTickerId);
  state.sleepTimerId = 0;
  state.sleepTimerTickerId = 0;
  state.sleepTimerMinutes = minutes;
  state.sleepTimerEndsAt = minutes ? Date.now() + minutes * 60 * 1000 : 0;
  syncSleepTimerUI();
  if (minutes) {
    state.sleepTimerTickerId = window.setInterval(syncSleepTimerUI, 1000);
    state.sleepTimerId = window.setTimeout(() => {
      window.clearInterval(state.sleepTimerTickerId);
      state.sleepTimerMinutes = 0;
      state.sleepTimerId = 0;
      state.sleepTimerEndsAt = 0;
      state.sleepTimerTickerId = 0;
      syncSleepTimerUI();
      pausePlayback();
      showToast("睡眠定时结束，声景已暂停");
      syncStateMarkers();
    }, minutes * 60 * 1000);
    showToast(`将在 ${minutes} 分钟后暂停`);
  } else {
    showToast("已取消睡眠定时");
  }
  toggleSleepTimerMenu(false);
}

function syncSleepTimerUI() {
  const minutes = state.sleepTimerMinutes;
  const remainingSeconds = state.sleepTimerEndsAt
    ? Math.max(0, Math.ceil((state.sleepTimerEndsAt - Date.now()) / 1000))
    : 0;
  const remainingMinutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const countdown = `${remainingMinutes}:${String(seconds).padStart(2, "0")}`;
  const status = minutes && remainingSeconds ? `剩余 ${countdown}` : "未启动";
  dom.sleepTimerLabel.textContent = status;
  dom.sleepTimerLabel.dataset.mobileLabel = minutes && remainingSeconds ? countdown : "未启动";
  dom.sleepTimerButton.title = minutes && remainingSeconds ? `剩余 ${countdown} 后暂停` : "设置睡眠倒计时";
  dom.sleepTimerButton.setAttribute("aria-label", minutes && remainingSeconds
    ? `倒计时，剩余 ${remainingMinutes} 分 ${seconds} 秒`
    : "倒计时，未启动");
  dom.sleepTimerOptions.forEach((button) => {
    const selected = Number(button.dataset.sleepMinutes) === minutes;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-checked", String(selected));
  });
}

function syncBackgroundInert() {
  const contentBlocked = state.playerExpanded
    || state.playerTransitioning
    || state.focusOpen
    || state.focusTransitioning;
  dom.contentInertTargets.forEach((target) => { target.inert = contentBlocked; });
  dom.globalPlayer.inert = state.focusOpen || state.focusTransitioning;
}

function handleSceneSelection(event) {
  const button = event.target.closest("[data-scene]");
  if (!button) return;
  const scene = sceneById.get(button.dataset.scene);
  if (scene) switchToScene(scene, { autoPlay: true });
}

async function togglePlayback() {
  if (state.switching) return;
  if (state.playing) {
    pausePlayback();
    return;
  }
  await startPlayback();
}

function pausePlayback() {
  if (!state.playing) return;
  pauseAllAudio();
  state.playing = false;
  syncPlaybackState();
}

async function startPlayback() {
  try {
    await audioCrossfader.play();
    playUploadedLayers(state.currentScene);
    state.hasPlayed = true;
    state.playing = true;
    syncPlaybackState();
  } catch (error) {
    console.error("Unable to start audio playback", error);
    showToast("播放没有开始，请再试一次");
  }
}

function pauseAllAudio() {
  audioCrossfader.pauseAll();
  scenes.forEach((scene) => scene.layers.forEach((layer) => layer.audio?.pause()));
}

function playUploadedLayers(scene) {
  scene.layers.forEach((layer) => {
    if (!layer.audio || layer.muted) return;
    layer.audio.volume = state.volume * (layer.level / 100) * 0.55;
    layer.audio.play().catch(() => undefined);
  });
}

function syncPlaybackState() {
  const label = state.playing ? "正在播放" : state.hasPlayed ? "已暂停" : "尚未播放";
  const artworkLabel = state.playing ? "自然演化中" : state.hasPlayed ? "已经暂停" : "准备播放";
  dom.shell.dataset.playing = String(state.playing);
  dom.playerState.textContent = label;
  dom.playerExpandedState.textContent = label;
  dom.playerHeroState.textContent = artworkLabel;
  dom.focusState.textContent = artworkLabel;
  dom.playerIdentityButton.setAttribute("aria-label", state.playerExpanded
    ? `收起播放器，${state.currentScene.name}，${label}`
    : `展开播放器，${state.currentScene.name}，${label}`);
  field.setPlaying(state.playing);

  dom.playButtons.forEach((button) => {
    button.setAttribute("aria-label", state.playing ? "暂停" : "播放");
    button.title = state.playing ? "暂停" : "播放";
    const text = state.playing ? "暂停" : "播放";
    button.innerHTML = button.hasAttribute("data-labeled-play")
      ? `<i data-lucide="${state.playing ? "pause" : "play"}" aria-hidden="true"></i><span class="rail-control-value" data-mobile-label="${text}">${text}</span>`
      : `<i data-lucide="${state.playing ? "pause" : "play"}" aria-hidden="true"></i>`;
  });
  renderIcons();
  syncStateMarkers();
}

function updateVolume(value) {
  const normalized = Math.max(0, Math.min(100, Number(value)));
  state.volume = normalized / 100;
  dom.volumeInputs.forEach((input) => {
    if (document.activeElement !== input) input.value = String(normalized);
  });
  const volumeText = `${Math.round(normalized)}%`;
  dom.volumeLabel.textContent = volumeText;
  dom.volumeLabel.dataset.mobileLabel = volumeText;
  dom.volumePopoverValue.textContent = volumeText;
  dom.volumePopover.style.setProperty("--volume-level", `${normalized}%`);
  dom.volumeButton.setAttribute("aria-label", `总音量，${volumeText}`);
  audioCrossfader.setVolume(state.volume);
  state.currentScene.layers.forEach((layer) => {
    if (layer.audio) layer.audio.volume = layer.muted ? 0 : state.volume * (layer.level / 100) * 0.55;
  });
  persistPreferences();
}

function updateFeeling(kind, value) {
  const normalized = Math.max(0, Math.min(100, Number(value)));
  state[kind] = normalized / 100;
  const inputs = kind === "intensity" ? dom.intensityInputs : dom.richnessInputs;
  inputs.forEach((input) => {
    if (document.activeElement !== input) input.value = String(normalized);
    input.setAttribute("aria-valuetext", kind === "intensity"
      ? describeIntensity(state.intensity)
      : describeRichness(state.richness));
  });
  field.setControls({ [kind]: state[kind] });
  audioCrossfader.setSoundscape({ [kind]: state[kind] });
  dom.feelingSummary.textContent = `${describeIntensity(state.intensity)} · ${describeRichness(state.richness)}，声音正在实时变化。`;
  syncStateMarkers();
  persistPreferences();
}

function syncControls() {
  updateVolume(state.volume * 100);
  updateFeeling("intensity", state.intensity * 100);
  updateFeeling("richness", state.richness * 100);
  syncCharacterSelection();
  syncSleepTimerUI();
}

function setCharacter(character, sourceButton) {
  if (!["natural", "warm", "distant"].includes(character)) return;
  state.character = character;
  if (sourceButton) updateTabSelection(sourceButton, "[data-character]", "aria-checked");
  else syncCharacterSelection();
  audioCrossfader.setSoundscape({ character });
  syncStateMarkers();
  persistPreferences();
  const label = document.querySelector(`[data-character="${character}"]`)?.dataset.characterLabel ?? "自然";
  showToast(`播放质感已变为「${label}」`);
}

function syncCharacterSelection() {
  document.querySelectorAll("[data-character]").forEach((button) => {
    const selected = button.dataset.character === state.character;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-checked", String(selected));
  });
  audioCrossfader.setSoundscape({ character: state.character });
}

function syncAudioProfile() {
  const baseLayer = getBaseLayer();
  audioCrossfader.setSoundscape({
    baseLevel: baseLayer.level / 100,
    baseMuted: baseLayer.muted,
    character: state.character,
    intensity: state.intensity,
    richness: state.richness,
  });
  syncStateMarkers();
}

function getBaseLayer(scene = state.currentScene) {
  return scene.layers.find((layer) => layer.source === "base") ?? scene.layers[0];
}

function describeIntensity(value) {
  if (value < 0.2) return "很轻";
  if (value < 0.42) return "偏轻";
  if (value < 0.64) return "均衡";
  if (value < 0.84) return "偏重";
  return "浓重";
}

function describeRichness(value) {
  if (value < 0.2) return "极简";
  if (value < 0.42) return "稀疏";
  if (value < 0.64) return "均衡";
  if (value < 0.84) return "丰富";
  return "繁密";
}

function persistPreferences() {
  const sceneMixes = Object.fromEntries(scenes.map((scene) => {
    const layer = getBaseLayer(scene);
    return [scene.id, { level: layer.level, muted: layer.muted }];
  }));
  savePreferences({
    activeView: state.activeView,
    character: state.character,
    intensity: state.intensity,
    prompt: dom.prompt.value,
    richness: state.richness,
    sceneId: state.currentScene.id,
    sceneMixes,
    volume: state.volume,
  });
}

async function switchToScene(nextScene, options = {}) {
  const { autoPlay = false, openPlayer = false, generated = false } = options;
  if (state.switching) {
    queuedSceneSwitch = { nextScene, options };
    return;
  }
  if (nextScene.id === state.currentScene.id) {
    if (generated) dismissReadyScene();
    if (autoPlay && !state.playing) await startPlayback();
    if (openPlayer) expandPlayer();
    return;
  }

  state.switching = true;
  syncStateMarkers();
  const outgoingScene = state.currentScene;
  const artworkTargets = [dom.playerCover, dom.playerHeroCover];
  const copyTargets = [dom.playerTitle, dom.playerExpandedTitle, dom.playerExpandedDescription];
  preloadImage(nextScene.cover);
  preloadImage(nextScene.hero);

  try {
    stopUploadedLayers(outgoingScene);
    const visualTransition = sceneMotion.swap({
      artworkTargets,
      copyTargets,
      atmosphere: dom.playerAtmosphereImage,
      update: () => {
        state.currentScene = nextScene;
        state.hasPlayed = state.playing;
        renderCurrentScene();
        renderCollections();
      },
    });
    const audioTransition = crossfadeAudio(nextScene.audio);
    const fieldTransition = state.fieldStarted && field.ready
      ? field.setScene(nextScene)
      : Promise.resolve();

    if (state.playing) playUploadedLayers(nextScene);
    if (generated && state.generatedReady?.id === nextScene.id) dismissReadyScene(true);
    if (openPlayer) expandPlayer();
    if (autoPlay && !state.playing) await startPlayback();
    await Promise.all([visualTransition, audioTransition, fieldTransition]);
  } finally {
    state.switching = false;
    syncStateMarkers();
    const queued = queuedSceneSwitch;
    queuedSceneSwitch = null;
    if (queued && queued.nextScene.id !== state.currentScene.id) {
      queueMicrotask(() => switchToScene(queued.nextScene, queued.options));
    }
  }
}

async function crossfadeAudio(nextUrl) {
  const currentAudio = audioTracks[state.activeAudio];
  if (currentAudio.src === new URL(nextUrl, window.location.href).href) return;
  const nextIndex = state.activeAudio === 0 ? 1 : 0;
  const nextAudio = audioTracks[nextIndex];
  nextAudio.pause();
  nextAudio.preload = "auto";
  nextAudio.src = nextUrl;
  nextAudio.currentTime = 0;

  if (!state.playing) {
    state.activeAudio = audioCrossfader.switchImmediately(nextIndex);
    return;
  }

  try {
    state.activeAudio = await audioCrossfader.crossfadeTo(nextIndex);
  } catch (error) {
    console.error("Unable to start the next soundscape audio", error);
    showToast("声音切换没有完成，请再试一次");
  }
}

function renderHomeGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) {
    dom.homeGreeting.textContent = "夜深了";
    dom.homeGreetingNote.textContent = "让声音陪你慢下来。";
  } else if (hour < 11) {
    dom.homeGreeting.textContent = "早上好";
    dom.homeGreetingNote.textContent = "从一处安静的声音开始。";
  } else if (hour < 18) {
    dom.homeGreeting.textContent = "下午好";
    dom.homeGreetingNote.textContent = "给手边的片刻留一点声音。";
  } else {
    dom.homeGreeting.textContent = "晚上好";
    dom.homeGreetingNote.textContent = "给现在留一点声音。";
  }
}

function renderCurrentScene() {
  const scene = state.currentScene;
  document.documentElement.dataset.theme = scene.theme;
  document.documentElement.style.setProperty("--scene-tone", scene.palette[0]);
  document.documentElement.style.setProperty("--scene-earth", scene.palette[1]);
  document.querySelector('meta[name="theme-color"]').content = scene.theme === "dark" ? "#141918" : "#f4f6f3";
  dom.playerCover.src = scene.cover;
  dom.playerTitle.textContent = scene.name;
  dom.playerHeroCover.src = scene.cover;
  dom.playerAtmosphereImage.src = scene.hero;
  dom.playerExpandedTitle.textContent = scene.name;
  dom.playerExpandedDescription.textContent = scene.description;
  dom.focusTitle.textContent = scene.name;
  dom.focusDescription.textContent = scene.description;
  dom.focusMode.dataset.focusTheme = scene.theme;
  setSurfaceImage(dom.focusStatic, scene.hero);
  dom.playerExpandedElements.replaceChildren(...scene.elements.map((name) => {
    const span = document.createElement("span");
    span.textContent = name;
    return span;
  }));
  dom.playerIdentityButton.setAttribute("aria-label", state.playerExpanded
    ? `收起播放器，当前是${scene.name}`
    : `展开播放器，当前是${scene.name}`);
  syncAudioProfile();
  renderLayerList();
  persistPreferences();
}

function renderFeaturedScene() {
  const scene = state.featuredScene;
  dom.homeGuideCover.src = scene.cover;
  dom.featuredImage.src = scene.hero;
  dom.featuredTitle.textContent = scene.name;
  dom.featuredDescription.textContent = scene.description;
  dom.featuredElements.textContent = scene.elements.join(" · ");
}

function renderCollections() {
  renderExploreGrid();
  renderLibraryGrid();
}

function renderExploreGrid() {
  const filtered = state.exploreFilter === "all" ? scenes : scenes.filter((scene) => scene.category === state.exploreFilter);
  dom.exploreGrid.replaceChildren(...filtered.map(createSceneCard));
}

function renderLibraryGrid() {
  const filtered = scenes.filter((scene) => {
    if (state.libraryFilter === "saved") return scene.saved;
    if (state.libraryFilter === "recent") return scene.recent;
    return true;
  });
  dom.libraryGrid.replaceChildren(...filtered.map(createSceneCard));
  dom.libraryCount.textContent = `${filtered.length} 个声景`;
}

function createSceneCard(scene) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "scene-card";
  button.dataset.scene = scene.id;
  button.classList.toggle("is-current", scene.id === state.currentScene.id);
  if (scene.id === state.currentScene.id) button.setAttribute("aria-current", "true");
  button.setAttribute("aria-label", `${scene.name}${scene.id === state.currentScene.id ? "，当前声景" : ""}，${scene.description}`);
  button.innerHTML = `<span class="scene-card-media"><img src="${scene.cover}" alt="" loading="lazy" decoding="async"></span><strong>${scene.name}</strong><small>${scene.elements.join(" · ")}</small>`;
  return button;
}

function renderLayerList() {
  dom.layerList.replaceChildren(...state.currentScene.layers.map((layer, index) => {
    const isBase = layer.source === "base";
    const available = isBase || Boolean(layer.audio);
    const row = document.createElement("article");
    row.className = "layer-row";
    row.dataset.layerId = layer.id;
    row.dataset.muted = String(layer.muted);
    row.dataset.available = String(available);
    row.innerHTML = `
      <div class="layer-identity">
        <span class="layer-swatch" aria-hidden="true"></span>
        <span class="layer-name"><strong>${escapeHtml(layer.name)}</strong><small>${escapeHtml(layer.detail)}</small></span>
      </div>
      <input type="range" min="0" max="100" value="${layer.level}" aria-label="${escapeHtml(layer.name)}存在感" aria-valuetext="${layer.level}%" data-layer-level ${available ? "" : "disabled"}>
      <span class="layer-value">${available ? `${layer.level}%` : "不可用"}</span>
      <span class="layer-actions">
        <button class="layer-toggle" type="button" data-layer-toggle aria-pressed="${String(!layer.muted)}" aria-label="${layer.muted ? "开启" : "关闭"}${escapeHtml(layer.name)}" title="${layer.muted ? "开启" : "关闭"}${escapeHtml(layer.name)}" ${available ? "" : "disabled"}>
          <i data-lucide="${layer.muted ? "volume-x" : "volume-2"}" aria-hidden="true"></i>
        </button>
        ${isBase ? "" : `<button class="layer-remove" type="button" data-layer-remove aria-label="移除${escapeHtml(layer.name)}" title="移除${escapeHtml(layer.name)}"><i data-lucide="trash-2" aria-hidden="true"></i></button>`}
      </span>`;
    row.querySelector(".layer-swatch").style.backgroundImage = `url(${JSON.stringify(state.currentScene.cover)})`;
    row.querySelector(".layer-swatch").style.backgroundPosition = `${18 + index * 17}% ${22 + index * 13}%`;
    return row;
  }));
  renderIcons();
}

function handleLayerInput(event) {
  const input = event.target.closest("[data-layer-level]");
  if (!input) return;
  const row = input.closest("[data-layer-id]");
  const layer = state.currentScene.layers.find((item) => item.id === row.dataset.layerId);
  if (!layer) return;
  layer.level = Number(input.value);
  input.setAttribute("aria-valuetext", `${layer.level}%`);
  row.querySelector(".layer-value").textContent = `${layer.level}%`;
  if (layer.source === "base") {
    syncAudioProfile();
    persistPreferences();
  } else if (layer.audio) {
    layer.audio.volume = layer.muted ? 0 : state.volume * (layer.level / 100) * 0.55;
    persistUploadedLayer(layer);
  }
}

function handleLayerToggle(event) {
  const removeButton = event.target.closest("[data-layer-remove]");
  if (removeButton) {
    const row = removeButton.closest("[data-layer-id]");
    const layer = state.currentScene.layers.find((item) => item.id === row.dataset.layerId);
    if (layer) removeUploadedLayer(layer);
    return;
  }

  const button = event.target.closest("[data-layer-toggle]");
  if (!button) return;
  const row = button.closest("[data-layer-id]");
  const layer = state.currentScene.layers.find((item) => item.id === row.dataset.layerId);
  if (!layer) return;
  layer.muted = !layer.muted;
  if (layer.source === "base") {
    syncAudioProfile();
    persistPreferences();
  } else if (layer.audio) {
    if (layer.muted) layer.audio.pause();
    else if (state.playing) playUploadedLayers(state.currentScene);
    persistUploadedLayer(layer);
  }
  renderLayerList();
}

function addUploadedLayer({
  id,
  name,
  audio,
  blob,
  scene = state.currentScene,
  level = 56,
  muted = false,
  persisted = true,
}) {
  const layer = {
    id,
    name,
    detail: persisted ? "本地音频 · 已保存在此浏览器" : "本地音频 · 仅当前会话",
    level,
    muted,
    audio,
    blob,
    sceneId: scene.id,
    source: "upload",
  };
  scene.layers.push(layer);
  if (scene.id === state.currentScene.id) renderCurrentScene();
  renderCollections();
  if (scene.id === state.currentScene.id && state.playing && !muted) playUploadedLayers(scene);
  return layer;
}

async function handleAudioUpload() {
  const file = dom.audioUpload.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("audio/")) {
    showToast("请选择音频文件");
    dom.audioUpload.value = "";
    return;
  }
  if (file.size > 32 * 1024 * 1024) {
    showToast("音频超过 32 MB，请选择更小的文件");
    dom.audioUpload.value = "";
    return;
  }

  const id = window.crypto?.randomUUID?.() ?? `audio-${Date.now()}`;
  const name = file.name.replace(/\.[^.]+$/, "").slice(0, 28) || "本地声音";
  const targetScene = state.currentScene;
  const record = { blob: file, createdAt: Date.now(), id, level: 56, muted: false, name, sceneId: targetScene.id };
  let persisted = true;
  try {
    await putStoredAudioLayer(record);
  } catch {
    persisted = false;
  }

  addUploadedLayer({
    audio: createLayerAudio(URL.createObjectURL(file)),
    blob: file,
    id,
    name,
    persisted,
    scene: targetScene,
  });
  dom.audioUpload.value = "";
  showToast(persisted
    ? `已把「${name}」加入${state.currentScene.name}`
    : `已加入「${name}」，但浏览器未能保存`);
}

async function restoreStoredAudioLayers() {
  let records = [];
  try {
    records = await listStoredAudioLayers();
  } catch {
    return;
  }

  records.forEach((record) => {
    const scene = sceneById.get(record.sceneId);
    if (!scene || !(record.blob instanceof Blob)) return;
    const audio = createLayerAudio(URL.createObjectURL(record.blob));
    scene.layers.push({
      audio,
      blob: record.blob,
      detail: "本地音频 · 已保存在此浏览器",
      id: record.id,
      level: clampNumber(record.level, 0, 100, 56),
      muted: Boolean(record.muted),
      name: record.name || "本地声音",
      sceneId: record.sceneId,
      source: "upload",
    });
  });
}

function createLayerAudio(url) {
  const audio = new Audio(url);
  audio.loop = true;
  audio.preload = "metadata";
  return audio;
}

function persistUploadedLayer(layer) {
  if (layer.source !== "upload" || !layer.blob) return;
  putStoredAudioLayer({
    blob: layer.blob,
    createdAt: Date.now(),
    id: layer.id,
    level: layer.level,
    muted: layer.muted,
    name: layer.name,
    sceneId: layer.sceneId ?? state.currentScene.id,
  }).catch(() => undefined);
}

async function removeUploadedLayer(layer) {
  if (layer.source !== "upload") return;
  layer.audio?.pause();
  if (layer.audio?.src.startsWith("blob:")) URL.revokeObjectURL(layer.audio.src);
  state.currentScene.layers = state.currentScene.layers.filter((item) => item.id !== layer.id);
  renderCurrentScene();
  renderCollections();
  try {
    await deleteStoredAudioLayer(layer.id);
    showToast(`已移除「${layer.name}」`);
  } catch {
    showToast(`已从当前声景移除「${layer.name}」`);
  }
}

function stopUploadedLayers(scene) {
  scene.layers.forEach((layer) => {
    if (!layer.audio) return;
    layer.audio.pause();
    layer.audio.currentTime = 0;
  });
}

function startGeneration(prompt) {
  if (!prompt) {
    dom.prompt.focus();
    showToast("先写下你想听见的地方");
    return;
  }
  if (state.jobState === "running") {
    showToast("声景仍在后台编排，当前播放没有中断");
    return;
  }

  window.clearInterval(state.jobTimer);
  state.pendingScene = chooseScene(prompt);
  state.generatedReady = null;
  state.jobState = "running";
  state.jobProgress = 0;
  state.playingAtJobStart = state.playing;
  dom.composeButton.disabled = true;
  dom.taskToast.hidden = false;
  window.requestAnimationFrame(() => { dom.taskToast.dataset.state = "running"; });
  dom.taskToast.setAttribute("aria-hidden", "false");
  dom.taskToast.inert = false;
  updateJobProgress();
  showToast("已在后台开始编排，当前声景继续播放");
  syncStateMarkers();

  const startedAt = performance.now();
  state.jobTimer = window.setInterval(() => {
    state.jobProgress = Math.min(100, ((performance.now() - startedAt) / 5200) * 100);
    updateJobProgress();
    if (state.jobProgress >= 100) completeGeneration();
  }, 100);
}

function updateJobProgress() {
  const stage = jobStages.find((item) => state.jobProgress < item.until) ?? jobStages.at(-1);
  dom.taskPhase.textContent = stage.label;
  dom.taskPercent.textContent = `${Math.round(state.jobProgress)}%`;
  syncStateMarkers();
}

function completeGeneration() {
  window.clearInterval(state.jobTimer);
  state.jobTimer = 0;
  state.jobState = "ready";
  state.jobProgress = 100;
  state.generatedReady = state.pendingScene;
  updatePromptCount();
  dom.taskToast.dataset.state = "ready";
  dom.readyCover.src = state.generatedReady.cover;
  dom.readyTitle.textContent = state.generatedReady.name;
  renderCollections();
  showToast("可听声景已经准备好，由你决定何时切换");
  syncStateMarkers();
}

function dismissReadyScene(switched = false) {
  state.jobState = "idle";
  dom.taskToast.dataset.state = "idle";
  dom.taskToast.setAttribute("aria-hidden", "true");
  dom.taskToast.inert = true;
  window.setTimeout(() => {
    if (state.jobState === "idle") dom.taskToast.hidden = true;
  }, motionRuntime.isReduced() ? 0 : 240);
  if (switched) {
    state.generatedReady = null;
    state.pendingScene = null;
  } else {
    showToast("已留在声景集中，当前播放没有变化");
  }
  syncStateMarkers();
}

function chooseScene(prompt) {
  const normalized = prompt.toLowerCase();
  if (/海|潮|浪|coast|ocean|sea/.test(normalized)) return sceneById.get("coastal-night");
  return sceneById.get("rain-cabin");
}

function updatePromptCount() {
  const length = dom.prompt.value.length;
  const ready = Boolean(dom.prompt.value.trim());
  dom.promptCount.textContent = `${length} / 180`;
  dom.composeButton.disabled = !ready || state.jobState === "running";
  dom.promptHint.textContent = ready ? "将在后台编排，不会中断当前播放" : "写下一处场景后即可开始";
}

function setPrompt(prompt, shouldFocus = true) {
  dom.prompt.value = prompt;
  updatePromptCount();
  persistPreferences();
  if (shouldFocus) {
    dom.prompt.focus();
    dom.prompt.setSelectionRange(prompt.length, prompt.length);
  }
}

function setRandomPrompt() {
  const current = dom.prompt.value.trim();
  const options = randomPrompts.filter((prompt) => prompt !== current);
  setPrompt(options[Math.floor(Math.random() * options.length)]);
}

async function prepareFocusField() {
  if (field.ready) return { mode: "ready" };
  if (fieldStartPromise) return fieldStartPromise;
  state.fieldStarted = true;
  field.setControls({ intensity: state.intensity, richness: state.richness });
  field.setPlaying(state.playing);
  fieldStartPromise = field.start(state.currentScene).finally(() => {
    fieldStartPromise = null;
  });
  return fieldStartPromise;
}

async function openFocusMode() {
  if (state.playerTransitioning) return;
  if (state.focusOpen && !state.focusTransitioning) return;
  state.focusOpen = true;
  state.focusTransitioning = true;
  state.lastFocused = document.activeElement;
  dom.focusMode.classList.add("is-open");
  dom.focusMode.removeAttribute("inert");
  dom.focusMode.setAttribute("aria-hidden", "false");
  dom.focusClose.focus({ preventScroll: true });
  field.setActive(true);
  syncBackgroundInert();
  syncStateMarkers();
  const fieldTransition = prepareFocusField();
  focusMotion.open();
  await fieldTransition;
  if (state.focusOpen) {
    field.resize();
    field.setActive(true);
  }
}

function closeFocusMode() {
  if (!state.focusOpen && !state.focusTransitioning) return;
  state.focusOpen = false;
  state.focusTransitioning = true;
  syncBackgroundInert();
  syncStateMarkers();
  focusMotion.close();
}

function finishFocusOpen() {
  state.focusTransitioning = false;
  syncBackgroundInert();
  syncStateMarkers();
}

function finishFocusClose() {
  state.focusOpen = false;
  state.focusTransitioning = false;
  dom.focusMode.classList.remove("is-open");
  dom.focusMode.setAttribute("aria-hidden", "true");
  dom.focusMode.setAttribute("inert", "");
  field.setActive(false);
  syncBackgroundInert();
  state.lastFocused?.focus?.({ preventScroll: true });
  syncStateMarkers();
}

function getArtworkClipPath() {
  const rect = dom.playerHeroArtwork.getBoundingClientRect();
  const top = Math.max(0, rect.top);
  const right = Math.max(0, window.innerWidth - rect.right);
  const bottom = Math.max(0, window.innerHeight - rect.bottom);
  const left = Math.max(0, rect.left);
  return `inset(${top}px ${right}px ${bottom}px ${left}px round 8px)`;
}

function updateTabSelection(activeButton, selector, stateAttribute = "aria-selected") {
  document.querySelectorAll(selector).forEach((button) => {
    const selected = button === activeButton;
    button.classList.toggle("is-selected", selected);
    button.setAttribute(stateAttribute, String(selected));
  });
}

let toastTimer = 0;
function showToast(message) {
  window.clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => dom.toast.classList.remove("is-visible"), 3000);
}

function preloadImage(url) {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  return image;
}

function setSurfaceImage(element, url) {
  element.style.backgroundImage = `url(${JSON.stringify(url)})`;
}

function renderIcons() {
  createIcons({
    attrs: { "aria-hidden": "true" },
    icons: {
      ArrowRight,
      ArrowUpRight,
      ChevronDown,
      ChevronUp,
      Compass,
      House,
      Library,
      Maximize2,
      Pause,
      Play,
      Plus,
      Shuffle,
      Timer,
      Trash2,
      Upload,
      Volume2,
      VolumeX,
      X,
    },
  });
}

function syncStateMarkers() {
  const baseLayer = getBaseLayer();
  dom.shell.dataset.currentScene = state.currentScene.id;
  dom.shell.dataset.pendingScene = state.pendingScene?.id ?? "";
  dom.shell.dataset.generatedReady = state.generatedReady?.id ?? "";
  dom.shell.dataset.jobState = state.jobState;
  dom.shell.dataset.jobProgress = String(Math.round(state.jobProgress));
  dom.shell.dataset.playing = String(state.playing);
  dom.shell.dataset.activeAudio = String(state.activeAudio);
  dom.shell.dataset.switching = String(state.switching);
  dom.shell.dataset.playerTransitioning = String(state.playerTransitioning);
  dom.shell.dataset.focusOpen = String(state.focusOpen);
  dom.shell.dataset.focusTransitioning = String(state.focusTransitioning);
  dom.shell.dataset.playerState = state.playerExpanded || state.playerTransitioning ? "expanded" : "collapsed";
  dom.shell.dataset.sleepMenuOpen = String(state.sleepMenuOpen);
  dom.shell.dataset.volumePopoverOpen = String(state.volumePopoverOpen);
  dom.shell.dataset.sleepTimerMinutes = String(state.sleepTimerMinutes);
  dom.shell.dataset.intensity = state.intensity.toFixed(2);
  dom.shell.dataset.richness = state.richness.toFixed(2);
  dom.shell.dataset.character = state.character;
  dom.shell.dataset.baseLevel = String(baseLayer.level);
  dom.shell.dataset.baseMuted = String(baseLayer.muted);
}

function exposeDebugApi() {
  window.__soundscapeDebug = {
    snapshot: () => ({
      activeView: state.activeView,
      playerExpanded: state.playerExpanded,
      sleepMenuOpen: state.sleepMenuOpen,
      volumePopoverOpen: state.volumePopoverOpen,
      sleepTimerMinutes: state.sleepTimerMinutes,
      currentScene: state.currentScene.id,
      pendingScene: state.pendingScene?.id ?? null,
      generatedReady: state.generatedReady?.id ?? null,
      jobState: state.jobState,
      jobProgress: Math.round(state.jobProgress),
      playing: state.playing,
      playingAtJobStart: state.playingAtJobStart,
      currentAudioPaused: audioTracks[state.activeAudio].paused,
      focusOpen: state.focusOpen,
      focusTransitioning: state.focusTransitioning,
      switching: state.switching,
      playerTransitioning: state.playerTransitioning,
      motion: motionRuntime.conditions(),
      audio: audioCrossfader.snapshot(),
      field: field.snapshot(),
    }),
    setView: setActiveView,
    expandPlayer,
    collapsePlayer,
    scrollToSoundDetails,
    startGeneration: (prompt = "清晨薄雾里的林间小路，远处有溪水和几声鸟鸣") => {
      setPrompt(prompt);
      startGeneration(prompt);
    },
    switchReady: () => {
      if (state.pendingScene) switchToScene(state.pendingScene, { autoPlay: true, generated: true });
    },
    openFocus: openFocusMode,
  };
}

function clampNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, number));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

boot().catch((error) => {
  console.error("Unable to initialize Soundscape", error);
  showToast("声景没有完整载入，请刷新后重试");
});
