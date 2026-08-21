import "@fontsource-variable/noto-serif-sc/wght.css";
import {
  AudioLines,
  Blend,
  ChevronDown,
  CloudRain,
  createIcons,
  Database,
  Ellipsis,
  Headphones,
  House,
  Laptop,
  Library,
  Maximize2,
  Moon,
  Pause,
  Play,
  Plus,
  Radio,
  Settings,
  Shuffle,
  Smartphone,
  Speaker,
  Sun,
  Timer,
  Trash2,
  Tv,
  Upload,
  Volume2,
  VolumeX,
  Waves,
  X,
} from "lucide";
import rainAudioUrl from "./media/rain-cabin.mp3?url";
import waterAudioUrl from "./media/open-water.wav?url";
import rainHero from "../../../assets/scenes/rain-cabin/rain-cabin-hero-web-v1.jpg?url";
import rainCover from "../../../assets/scenes/rain-cabin/rain-cabin-cover-web-v1.jpg?url";
import coastalHero from "../../../assets/scenes/coastal-night/coastal-night-hero-web-v1.jpg?url";
import coastalCover from "../../../assets/scenes/coastal-night/coastal-night-cover-web-v1.jpg?url";
import forestCover from "../../../assets/scenes/forest-dawn/forest-dawn-cover-web-v1.jpg?url";
import trainCover from "../../../assets/scenes/night-train/night-train-cover-web-v1.jpg?url";
import libraryCover from "../../../assets/scenes/quiet-library/quiet-library-cover-web-v1.jpg?url";
import courtyardCover from "../../../assets/scenes/summer-courtyard/summer-courtyard-cover-web-v1.jpg?url";
import { createEqualPowerCrossfader, SOUND_PROFILES } from "./audio/crossfader.js";
import {
  clearStoredAudioLayers,
  deleteStoredAudioLayer,
  getStoredAudioStats,
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
import { MembraneField } from "./visual/membrane-field.js";

const makeBaseLayer = (id, name, detail, catalogId) => ({
  id: `${id}-base`,
  name,
  detail,
  catalogId,
  level: 100,
  muted: false,
  source: "base",
  profile: "natural",
});

const scenes = [
  {
    id: "rain-cabin",
    name: "雨夜木屋",
    description: "雷雨夜里，点燃篝火的木屋。",
    theme: "light",
    hero: rainHero,
    cover: rainCover,
    audio: rainAudioUrl,
    elements: ["屋檐雨", "远雷", "木屋回响"],
    layers: [makeBaseLayer("rain-cabin", "雨声实录", "内置声音 · 实时调音", "rain-recording")],
    palette: ["#aebbc7", "#c4b7ae", "#78877d", "#d36b54", "#8a8e90", "#bcc5ce", "#d3ccc2"],
  },
  {
    id: "coastal-night",
    name: "深夜海岸",
    description: "深夜海岸上，潮声持续靠近又缓缓退去。",
    theme: "dark",
    hero: coastalHero,
    cover: coastalCover,
    audio: waterAudioUrl,
    elements: ["近岸潮水", "远浪", "礁石回响"],
    layers: [makeBaseLayer("coastal-night", "海浪实录", "内置声音 · 实时调音", "water-recording")],
    palette: ["#6b8290", "#7f7a70", "#4c6664", "#a95f4f", "#59656d", "#879197", "#706d65"],
  },
];

const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
const templates = [
  {
    id: "forest-dawn",
    name: "林间初醒",
    prompt: "清晨薄雾里的林间小路，远处有溪水、湿叶滴水和几声疏鸟。",
    elements: ["林间风", "湿叶滴水", "远处溪流"],
    cover: forestCover,
  },
  {
    id: "night-train",
    name: "夜行列车",
    prompt: "夜行列车穿过安静而连续的远方，车轮节律与窗外风压缓慢交替。",
    elements: ["车轮节律", "车厢低鸣", "窗外风压"],
    cover: trainCover,
  },
  {
    id: "quiet-library",
    name: "闭馆后的图书馆",
    prompt: "闭馆后的旧图书馆，只剩纸页余响、木构轻响和远处空调。",
    elements: ["纸页余响", "木构轻响", "室内雨声"],
    cover: libraryCover,
  },
  {
    id: "summer-courtyard",
    name: "夏夜庭院",
    prompt: "夏夜庭院里，风穿过树叶，夜虫与远处生活声疏疏交织。",
    elements: ["夜虫", "树影风声", "偶发水滴"],
    cover: courtyardCover,
  },
];
const sourceCatalog = {
  environment: [
    { id: "rain-recording", name: "雨夜实录", detail: "真实录音 · 连续环境", icon: "cloud-rain", audio: rainAudioUrl, profile: "natural" },
    { id: "water-recording", name: "近岸潮水", detail: "真实录音 · 连续环境", icon: "waves", audio: waterAudioUrl, profile: "natural" },
  ],
  event: [
    { id: "event-near", name: "偶尔靠近", detail: "添加一段会被放在近处的音频", icon: "audio-lines", upload: true, profile: "natural" },
    { id: "event-far", name: "远处回应", detail: "添加一段带空间距离的音频", icon: "audio-lines", upload: true, profile: "spatial" },
  ],
  media: [
    { id: "media-radio", name: "老式收音机", detail: "窄频、单声道与轻微底噪", icon: "radio", upload: true, profile: "radio" },
    { id: "media-television", name: "雪花电视", detail: "颗粒底噪与突出的中频", icon: "tv", upload: true, profile: "television" },
    { id: "media-speaker", name: "单声道喇叭", detail: "集中声像与轻微压缩", icon: "speaker", upload: true, profile: "speaker" },
    { id: "media-tube", name: "胆机音箱", detail: "柔和低频与偶次染色", icon: "speaker", upload: true, profile: "tube" },
    { id: "media-hifi", name: "Hi-Fi 音响", detail: "更开阔的声场与细节", icon: "speaker", upload: true, profile: "hifi" },
    { id: "media-spatial", name: "耳机空间", detail: "双声道空间化与远近", icon: "headphones", upload: true, profile: "spatial" },
  ],
};
const publicViews = new Set(["explore"]);
const labViews = new Set(["create", "library", "settings"]);
const randomPrompts = [
  "雷雨夜里，点燃篝火的木屋。",
  "深夜海岸上，潮声持续靠近又缓缓退去。",
  "雨停前的玻璃温室，水珠沿着窗面缓慢滑落。",
  "夜里的礁石海湾，浪声从远处一层层靠近。",
  ...templates.map((template) => template.prompt),
];
const jobStages = [
  { until: 25, label: "理解场景" },
  { until: 55, label: "选择声音母版" },
  { until: 82, label: "调整轻重与层次" },
  { until: 101, label: "完成本地编排" },
];
const FOCUS_CHROME_IDLE_MS = 2400;
const dom = {
  shell: document.querySelector("#app-shell"),
  workspace: document.querySelector("#workspace"),
  views: [...document.querySelectorAll(".app-view")],
  viewLinks: [...document.querySelectorAll("[data-view-link]")],
  clientLinks: [...document.querySelectorAll("[data-client-link]")],
  clientSection: document.querySelector("#client"),
  downloadVisualImage: document.querySelector("#download-visual-image"),
  globalPlayer: document.querySelector("#global-player"),
  playerControlRail: document.querySelector(".player-control-rail"),
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
  playerExpandedState: document.querySelector("#player-expanded-state"),
  playerExpandedTitle: document.querySelector("#player-expanded-title"),
  playerExpandedDescription: document.querySelector("#player-expanded-description"),
  playerExpandedElements: document.querySelector("#player-expanded-elements"),
  playerExpandedCopy: document.querySelector(".player-expanded-copy"),
  playerFeeling: document.querySelector(".player-feeling"),
  feelingSummary: document.querySelector("#feeling-summary"),
  detailsPanel: document.querySelector("#sound-details-panel"),
  sleepTimerButton: document.querySelector("#sleep-timer-button"),
  sleepTimerLabel: document.querySelector("#sleep-timer-label"),
  sleepTimerMenu: document.querySelector("#sleep-timer-menu"),
  sleepTimerOptions: [...document.querySelectorAll("[data-sleep-minutes]")],
  volumeButton: document.querySelector("#volume-button"),
  volumeLabel: document.querySelector("#volume-label"),
  volumePopover: document.querySelector("#volume-popover"),
  volumePopoverValue: document.querySelector("#volume-popover-value"),
  playButtons: [document.querySelector("#player-play-button")],
  volumeInputs: [document.querySelector("#volume"), ...document.querySelectorAll("[data-volume]")],
  intensityInputs: [...document.querySelectorAll("[data-intensity]")],
  richnessInputs: [...document.querySelectorAll("[data-richness]")],
  movementInputs: [...document.querySelectorAll("[data-movement]")],
  distanceInputs: [...document.querySelectorAll("[data-distance]")],
  orchestrationSummary: document.querySelector("#orchestration-summary"),
  exploreGrid: document.querySelector("#explore-grid"),
  libraryGrid: document.querySelector("#library-grid"),
  templateList: document.querySelector("#template-list"),
  primaryNav: document.querySelector(".primary-nav"),
  mobilePublicNav: document.querySelector(".mobile-public-nav"),
  mobileNav: document.querySelector(".mobile-nav"),
  mobileMoreButton: document.querySelector("#mobile-more-button"),
  mobileMoreMenu: document.querySelector("#mobile-more-menu"),
  featuredImage: document.querySelector("#featured-image"),
  featuredScene: document.querySelector("#featured-scene"),
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
  sourceList: document.querySelector("#source-list"),
  sourceTabs: [...document.querySelectorAll("[data-source-category]")],
  audioUpload: document.querySelector("#audio-upload"),
  browseAudioButton: document.querySelector("#browse-audio-button"),
  characterSelect: document.querySelector("#character-select"),
  characterDescription: document.querySelector("#character-description"),
  focusMode: document.querySelector("#focus-mode"),
  focusVisual: document.querySelector("#focus-visual"),
  focusStatic: document.querySelector("#focus-static"),
  focusHeader: document.querySelector(".focus-header"),
  focusButton: document.querySelector("#focus-button"),
  focusTitle: document.querySelector("#focus-title"),
  focusDescription: document.querySelector("#focus-description"),
  focusState: document.querySelector("#focus-state"),
  canvas: document.querySelector("#membrane-field"),
  renderStatus: document.querySelector("#render-status"),
  themeOptions: [...document.querySelectorAll("[data-theme-mode]")],
  autoPlaySetting: document.querySelector("#auto-play-setting"),
  rememberMixSetting: document.querySelector("#remember-mix-setting"),
  storageSummary: document.querySelector("#storage-summary"),
  storageDetail: document.querySelector("#storage-detail"),
  clearStorageButton: document.querySelector("#clear-storage-button"),
  contentInertTargets: [
    document.querySelector(".side-rail"),
    document.querySelector(".mobile-header"),
    document.querySelector(".workspace"),
    document.querySelector(".mobile-nav"),
  ].filter(Boolean),
};

const motionRuntime = createMotionRuntime();

const initialSearch = new URLSearchParams(window.location.search);
const initialRequest = initialSearch.get("view");
const initialClientTarget = initialRequest === "download" || window.location.hash === "#client";
const labMode = initialSearch.get("lab") === "1";
const validViews = new Set([...publicViews, ...(labMode ? labViews : [])]);
dom.shell.dataset.labMode = String(labMode);
const storedPreferences = loadPreferences();
scenes.forEach((scene) => {
  const storedMix = storedPreferences.sceneMixes?.[scene.id];
  const baseLayer = scene.layers[0];
  if (!storedMix || !baseLayer) return;
  baseLayer.level = clampNumber(storedMix.level, 0, 100, baseLayer.level);
  baseLayer.muted = Boolean(storedMix.muted);
});
restoreBuiltInAssignments(storedPreferences.sceneLayers);

const storedCharacter = storedPreferences.character === "warm"
  ? "tube"
  : storedPreferences.character === "distant"
    ? "spatial"
    : storedPreferences.character;

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
  movement: clampNumber(storedPreferences.movement, 0, 1, Number(dom.movementInputs[0].value) / 100),
  distance: clampNumber(storedPreferences.distance, 0, 1, Number(dom.distanceInputs[0].value) / 100),
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
  character: SOUND_PROFILES[storedCharacter]
    ? storedCharacter
    : "natural",
  themeMode: ["scene", "light", "dark"].includes(storedPreferences.themeMode)
    ? storedPreferences.themeMode
    : "scene",
  autoPlayOnSelect: storedPreferences.autoPlayOnSelect !== false,
  rememberMix: storedPreferences.rememberMix !== false,
  sourceCategory: "environment",
  pendingUpload: null,
  mobileMoreOpen: false,
  clearStorageArmed: false,
  clearStorageTimer: 0,
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
  distance: state.distance,
  intensity: state.intensity,
  movement: state.movement,
  richness: state.richness,
});
scenes.forEach((scene) => scene.layers.filter((layer) => layer.source !== "base").forEach(registerLayerWithAudioEngine));

const field = new MembraneField({
  canvas: dom.canvas,
  surface: dom.focusVisual,
  status: dom.renderStatus,
});

const navigationMotion = createNavigationMotion({
  containers: [dom.primaryNav, dom.mobilePublicNav, dom.mobileNav],
  isReducedMotion: motionRuntime.isReduced,
});
const sceneMotion = createSceneMotion({ isReducedMotion: motionRuntime.isReduced });

let restoreFocusAfterCollapse = false;
let queuedSceneSwitch = null;
let fieldStartPromise = null;
let focusChromeTimer = 0;
let focusChromeVisible = true;
let focusChromeEngaged = false;
let focusChromeKeyboardActive = false;
let focusEntryHintTimer = 0;
let focusEntryHintShown = false;

const playerMotion = createPlayerMotion({
  elements: {
    content: dom.playerExpandedContent,
  },
  isReducedMotion: motionRuntime.isReduced,
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
    header: dom.focusHeader,
    player: dom.playerControlRail,
    control: dom.playerCollapseButton,
  },
  isReducedMotion: motionRuntime.isReduced,
  onOpened: finishFocusOpen,
  onClosed: finishFocusClose,
});

async function boot() {
  await restoreStoredAudioLayers();
  if (typeof storedPreferences.prompt === "string") dom.prompt.value = storedPreferences.prompt;
  updatePromptCount();
  renderCurrentScene();
  renderFeaturedScene();
  renderCollections();
  renderTemplates();
  renderSourceLibrary();
  syncSettings();
  setActiveView(state.activeView, false);
  syncPlayerStructure();
  playerMotion.setInitialState(state.playerExpanded);
  installInteractions();
  syncControls();
  syncPlaybackState();
  syncStateMarkers();
  renderIcons();
  if (state.playerExpanded) window.requestAnimationFrame(revealFocusEntryHint);
  exposeDebugApi();
  if (initialClientTarget) window.requestAnimationFrame(() => openClientSection(false));
  motionRuntime.subscribe(({ reduceMotion }) => {
    field.setReducedMotion(reduceMotion);
    if (state.playerTransitioning) playerMotion.settle(state.playerExpanded);
    if (state.focusTransitioning) focusMotion.settle(state.focusOpen);
  });
}

function getInitialView() {
  const requestedView = initialRequest === "home" ? "explore" : initialRequest;
  if (validViews.has(requestedView)) return requestedView;
  return "explore";
}

function installInteractions() {
  dom.clientLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openClientSection();
    });
  });

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
  dom.movementInputs.forEach((input) => input.addEventListener("input", () => updateOrchestration("movement", input.value)));
  dom.distanceInputs.forEach((input) => input.addEventListener("input", () => updateOrchestration("distance", input.value)));

  dom.playerIdentityButton.addEventListener("click", () => {
    if (state.focusOpen || state.focusTransitioning) return;
    if (state.playerExpanded) collapsePlayer();
    else expandPlayer();
  });
  dom.playerCollapseButton.addEventListener("click", () => {
    if (state.focusOpen) closeFocusMode();
    else if (!state.focusTransitioning) collapsePlayer({ restoreFocus: true });
  });
  dom.mobileMoreButton.addEventListener("click", () => toggleMobileMoreMenu());
  dom.sleepTimerButton.addEventListener("click", () => toggleSleepTimerMenu());
  dom.volumeButton.addEventListener("click", () => toggleVolumePopover());
  dom.sleepTimerOptions.forEach((button) => {
    button.addEventListener("click", () => setSleepTimer(Number(button.dataset.sleepMinutes)));
  });
  dom.focusButton.addEventListener("click", openFocusMode);
  dom.focusButton.addEventListener("pointerenter", prepareFocusField, { passive: true });
  dom.focusButton.addEventListener("focus", prepareFocusField);
  dom.featuredPlay.addEventListener("click", handleFeaturedSceneAction);
  dom.focusMode.addEventListener("pointermove", handleFocusActivity, { passive: true });
  dom.focusMode.addEventListener("pointerdown", handleFocusActivity, { passive: true });
  document.addEventListener("pointerdown", () => {
    if (state.focusOpen) focusChromeKeyboardActive = false;
  }, { capture: true, passive: true });
  [dom.focusHeader, dom.playerCollapseButton, dom.playerControlRail].forEach((element) => {
    element.addEventListener("pointerenter", () => {
      focusChromeEngaged = true;
      revealFocusChrome();
    }, { passive: true });
    element.addEventListener("pointerleave", () => {
      focusChromeEngaged = false;
      scheduleFocusChromeHide();
    }, { passive: true });
  });

  document.querySelectorAll("[data-shuffle]").forEach((button) => {
    button.addEventListener("click", () => {
      const candidates = scenes.filter((scene) => scene.id !== state.currentScene.id);
      const nextScene = candidates[Math.floor(Math.random() * candidates.length)];
      switchToScene(nextScene, { autoPlay: true });
    });
  });

  [dom.exploreGrid, dom.libraryGrid].filter(Boolean).forEach((container) => {
    container.addEventListener("click", handleSceneSelection);
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
  dom.templateList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-template]");
    if (!button) return;
    const template = templates.find((item) => item.id === button.dataset.template);
    if (!template) return;
    setPrompt(template.prompt, false);
    setActiveView("create");
    dom.prompt.focus({ preventScroll: true });
    dom.prompt.setSelectionRange(template.prompt.length, template.prompt.length);
  });
  dom.dismissReady.addEventListener("click", dismissReadyScene);
  dom.switchScene.addEventListener("click", () => {
    if (state.pendingScene) switchToScene(state.pendingScene, { autoPlay: true, generated: true });
  });

  document.querySelectorAll("[data-toast]").forEach((button) => {
    button.addEventListener("click", () => showToast(button.dataset.toast));
  });

  dom.characterSelect.addEventListener("change", () => setCharacter(dom.characterSelect.value));

  dom.layerList.addEventListener("input", handleLayerInput);
  dom.layerList.addEventListener("click", handleLayerToggle);
  dom.layerList.addEventListener("change", handleLayerProfileChange);
  dom.sourceTabs.forEach((button) => {
    button.addEventListener("click", () => activateSourceCategory(button));
    button.addEventListener("keydown", (event) => handleRovingSelectionKeydown(
      event,
      dom.sourceTabs,
      activateSourceCategory,
    ));
  });
  dom.sourceList.addEventListener("click", handleSourceLibraryClick);
  dom.browseAudioButton.addEventListener("click", () => requestAudioUpload({ category: state.sourceCategory }));
  dom.audioUpload.addEventListener("change", () => handleAudioUpload());
  dom.themeOptions.forEach((button) => {
    button.addEventListener("click", () => setThemeMode(button.dataset.themeMode));
    button.addEventListener("keydown", (event) => handleRovingSelectionKeydown(
      event,
      dom.themeOptions,
      (nextButton) => setThemeMode(nextButton.dataset.themeMode),
    ));
  });
  dom.autoPlaySetting.addEventListener("change", () => {
    state.autoPlayOnSelect = dom.autoPlaySetting.checked;
    syncSceneActions();
    persistPreferences();
  });
  dom.rememberMixSetting.addEventListener("change", () => {
    state.rememberMix = dom.rememberMixSetting.checked;
    persistPreferences();
    showToast(state.rememberMix ? "会保留这次听感" : "下次打开时使用默认听感");
  });
  dom.clearStorageButton.addEventListener("click", handleClearStoredAudio);

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
    if (state.mobileMoreOpen
      && !dom.mobileMoreMenu.contains(event.target)
      && !dom.mobileMoreButton.contains(event.target)) {
      toggleMobileMoreMenu(false, false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (state.focusOpen) {
      focusChromeKeyboardActive = true;
      revealFocusChrome();
    }
    if (event.key !== "Escape") return;
    if (state.focusOpen) closeFocusMode();
    else if (state.volumePopoverOpen) toggleVolumePopover(false);
    else if (state.sleepMenuOpen) toggleSleepTimerMenu(false);
    else if (state.mobileMoreOpen) toggleMobileMoreMenu(false);
    else if (state.playerExpanded) collapsePlayer({ restoreFocus: true });
  });
}

function openClientSection(animate = true) {
  const scroll = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "explore");
    url.hash = "client";
    window.history.replaceState(null, "", url);
    dom.clientSection.scrollIntoView({
      behavior: animate && !motionRuntime.isReduced() ? "smooth" : "auto",
      block: "start",
    });
  };

  if (state.activeView !== "explore") {
    setActiveView("explore");
    window.requestAnimationFrame(scroll);
    return;
  }
  scroll();
}

function setActiveView(viewName, animate = true) {
  if (!validViews.has(viewName)) return;
  if (state.mobileMoreOpen) toggleMobileMoreMenu(false, false);
  state.activeView = viewName;
  dom.shell.dataset.view = viewName;

  dom.views.forEach((view) => {
    const active = view.dataset.view === viewName;
    view.hidden = !active;
    view.classList.toggle("is-active", active);
  });

  dom.viewLinks.forEach((link) => {
    const isPrimaryNavigation = Boolean(link.closest(".primary-nav, .secondary-nav, .mobile-public-nav, .mobile-nav"));
    const active = isPrimaryNavigation && link.dataset.viewLink === viewName;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  navigationMotion.select(viewName, animate);
  dom.workspace.scrollTo({ top: 0, behavior: "auto" });
  const url = new URL(window.location.href);
  url.searchParams.set("view", viewName);
  url.hash = "";
  window.history.replaceState(null, "", url);
  const activeView = dom.views.find((view) => view.dataset.view === viewName);
  navigationMotion.enterView(activeView, animate);
  if (viewName === "settings") refreshStorageStats();
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
  revealFocusEntryHint();
}

function finishPlayerClose() {
  state.playerTransitioning = false;
  dom.playerExpandedScroll.scrollTop = 0;
  clearFocusEntryHint();
  syncPlayerStructure();
  if (restoreFocusAfterCollapse) dom.playerIdentityButton.focus({ preventScroll: true });
  restoreFocusAfterCollapse = false;
}

function revealFocusEntryHint() {
  if (focusEntryHintShown || !state.playerExpanded || state.focusOpen) return;
  focusEntryHintShown = true;
  window.clearTimeout(focusEntryHintTimer);
  dom.focusButton.classList.add("is-hint-visible");
  focusEntryHintTimer = window.setTimeout(clearFocusEntryHint, 2800);
}

function clearFocusEntryHint() {
  window.clearTimeout(focusEntryHintTimer);
  focusEntryHintTimer = 0;
  dom.focusButton.classList.remove("is-hint-visible");
}

function syncPlayerStructure() {
  const structurallyExpanded = state.playerExpanded || state.playerTransitioning;
  const playerState = structurallyExpanded ? "expanded" : "collapsed";
  dom.shell.dataset.playerState = playerState;
  dom.globalPlayer.setAttribute("aria-label", state.playerExpanded ? `${state.currentScene.name}播放器` : "持续播放控制");
  syncPlayerIdentityLabel();
  syncPlayerExitControl();
  syncBackgroundInert();
  syncStateMarkers();
}

function syncPlayerExitControl() {
  const returningFromFocus = state.focusOpen || state.focusTransitioning;
  const hidden = !state.playerExpanded && !state.playerTransitioning;
  const label = returningFromFocus ? "返回播放器" : `收起${state.currentScene.name}播放器`;
  dom.playerCollapseButton.setAttribute("aria-label", label);
  dom.playerCollapseButton.setAttribute("aria-hidden", String(hidden));
  dom.playerCollapseButton.inert = hidden;
  dom.playerCollapseButton.title = returningFromFocus ? "返回播放器" : "收起播放器";
}

function syncExpandedAccessibility() {
  const hidden = !state.playerExpanded || state.focusOpen || state.focusTransitioning;
  dom.playerExpandedContent.setAttribute("aria-hidden", String(hidden));
  dom.playerExpandedContent.inert = hidden;
}

function syncPlayerRailAccessibility() {
  const simplified = state.focusOpen || state.focusTransitioning;
  if (simplified) dom.playerIdentityButton.setAttribute("aria-hidden", "true");
  else dom.playerIdentityButton.removeAttribute("aria-hidden");
  dom.playerIdentityButton.inert = simplified;
}

function syncPlayerIdentityLabel(playbackLabel = dom.playerState.textContent) {
  const sceneLabel = playbackLabel ? `${state.currentScene.name}，${playbackLabel}` : state.currentScene.name;
  if (state.focusOpen || state.focusTransitioning) {
    dom.playerIdentityButton.setAttribute("aria-label", `返回播放器，${sceneLabel}`);
    return;
  }
  dom.playerIdentityButton.setAttribute("aria-label", state.playerExpanded
    ? `收起播放器，${sceneLabel}`
    : `展开播放器，${sceneLabel}`);
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

function toggleMobileMoreMenu(force, restoreFocus = true) {
  const open = typeof force === "boolean" ? force : !state.mobileMoreOpen;
  if (open === state.mobileMoreOpen) return;
  state.mobileMoreOpen = open;
  setPopoverVisibility(dom.mobileMoreMenu, open, () => state.mobileMoreOpen);
  dom.mobileMoreMenu.setAttribute("aria-hidden", String(!open));
  dom.mobileMoreMenu.inert = !open;
  dom.mobileMoreButton.setAttribute("aria-expanded", String(open));
  if (open) dom.mobileMoreMenu.querySelector("button")?.focus({ preventScroll: true });
  else if (restoreFocus) dom.mobileMoreButton.focus({ preventScroll: true });
  syncStateMarkers();
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
  syncExpandedAccessibility();
  syncPlayerRailAccessibility();
}

function handleSceneSelection(event) {
  const button = event.target.closest("[data-scene]");
  if (!button) return;
  const scene = sceneById.get(button.dataset.scene);
  if (!scene) return;
  if (scene.id === state.currentScene.id) {
    if (state.playing) expandPlayer();
    else startPlayback();
    return;
  }
  switchToScene(scene, { autoPlay: state.autoPlayOnSelect });
}

function handleFeaturedSceneAction() {
  const scene = state.featuredScene;
  if (scene.id === state.currentScene.id) {
    if (state.playing) expandPlayer();
    else startPlayback();
    return;
  }
  switchToScene(scene, { autoPlay: true });
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
    const message = error?.name === "NotAllowedError"
      ? "浏览器阻止了自动播放，请再次点击播放"
      : error?.name === "NotSupportedError"
        ? "这段声音暂时无法播放，请切换另一处声景"
        : "播放没有开始，请检查系统音量或切换声景后重试";
    showToast(message);
  }
}

function pauseAllAudio() {
  audioCrossfader.pauseAll();
  scenes.forEach((scene) => scene.layers.forEach((layer) => layer.audio?.pause()));
}

function playUploadedLayers(scene) {
  scene.layers.forEach((layer) => {
    if (!layer.audio || layer.muted) return;
    audioCrossfader.setLayer(layer.id, {
      character: layer.profile ?? "natural",
      level: layer.level / 100,
      muted: layer.muted,
    });
    layer.audio.play().catch(() => undefined);
  });
}

function syncPlaybackState() {
  const label = state.playing ? "正在播放" : state.hasPlayed ? "已暂停" : "尚未播放";
  const artworkLabel = state.playing ? "自然演化中" : state.hasPlayed ? "已经暂停" : "准备播放";
  dom.shell.dataset.playing = String(state.playing);
  dom.shell.dataset.hasPlayed = String(state.hasPlayed);
  dom.playerState.textContent = label;
  dom.playerExpandedState.textContent = label;
  dom.focusState.textContent = artworkLabel;
  syncPlaybackNarrative();
  syncSceneActions();
  syncPlayerIdentityLabel(label);
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
  syncFocusChromePlayback();
  syncStateMarkers();
}

function syncPlaybackNarrative() {
  const feeling = `${describeIntensity(state.intensity)} · ${describeRichness(state.richness)}`;
  const orchestration = `${describeMovement(state.movement)} · ${describeDistance(state.distance)}`;
  if (state.playing) {
    dom.feelingSummary.textContent = `${feeling}，声音正在实时变化。`;
    dom.orchestrationSummary.textContent = `${orchestration}，声音正在持续变化。`;
    return;
  }
  if (state.hasPlayed) {
    dom.feelingSummary.textContent = `${feeling}，已暂停，当前听感已保留。`;
    dom.orchestrationSummary.textContent = `${orchestration}，已暂停，当前走势已保留。`;
    return;
  }
  dom.feelingSummary.textContent = `${feeling}，开始后会持续自然变化。`;
  dom.orchestrationSummary.textContent = `${orchestration}，开始后会持续自然变化。`;
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
    if (layer.audio) audioCrossfader.setLayer(layer.id, { level: layer.level / 100, muted: layer.muted });
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
  syncPlaybackNarrative();
  syncStateMarkers();
  persistPreferences();
}

function updateOrchestration(kind, value) {
  const normalized = Math.max(0, Math.min(100, Number(value)));
  state[kind] = normalized / 100;
  const inputs = kind === "movement" ? dom.movementInputs : dom.distanceInputs;
  inputs.forEach((input) => {
    if (document.activeElement !== input) input.value = String(normalized);
    input.setAttribute("aria-valuetext", kind === "movement"
      ? describeMovement(state.movement)
      : describeDistance(state.distance));
  });
  audioCrossfader.setSoundscape({ [kind]: state[kind] });
  syncPlaybackNarrative();
  syncStateMarkers();
  persistPreferences();
}

function syncControls() {
  updateVolume(state.volume * 100);
  updateFeeling("intensity", state.intensity * 100);
  updateFeeling("richness", state.richness * 100);
  updateOrchestration("movement", state.movement * 100);
  updateOrchestration("distance", state.distance * 100);
  syncCharacterSelection();
  syncSleepTimerUI();
}

function setCharacter(character) {
  if (!SOUND_PROFILES[character]) return;
  state.character = character;
  syncCharacterSelection();
  audioCrossfader.setSoundscape({ character });
  syncStateMarkers();
  persistPreferences();
  showToast(`播放质感已变为「${SOUND_PROFILES[character].label}」`);
}

function syncCharacterSelection() {
  const profile = SOUND_PROFILES[state.character] ?? SOUND_PROFILES.natural;
  dom.characterSelect.value = state.character;
  dom.characterDescription.textContent = profile.detail;
  audioCrossfader.setSoundscape({ character: state.character });
}

function syncAudioProfile() {
  const baseLayer = getBaseLayer();
  audioCrossfader.setSoundscape({
    baseLevel: baseLayer.level / 100,
    baseMuted: baseLayer.muted,
    character: state.character,
    distance: state.distance,
    intensity: state.intensity,
    movement: state.movement,
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

function describeMovement(value) {
  if (value < 0.2) return "近乎平稳";
  if (value < 0.44) return "轻微起伏";
  if (value < 0.7) return "自然流动";
  if (value < 0.88) return "明显起伏";
  return "持续涌动";
}

function describeDistance(value) {
  if (value < 0.18) return "很贴近";
  if (value < 0.42) return "稍近";
  if (value < 0.68) return "居中";
  if (value < 0.86) return "较远";
  return "远处";
}

function persistPreferences() {
  const sceneMixes = Object.fromEntries(scenes.map((scene) => {
    const layer = getBaseLayer(scene);
    return [scene.id, { level: layer.level, muted: layer.muted }];
  }));
  const sceneLayers = scenes.flatMap((scene) => scene.layers
    .filter((layer) => layer.source === "builtin")
    .map((layer) => ({
      catalogId: layer.catalogId,
      id: layer.id,
      level: layer.level,
      muted: layer.muted,
      profile: layer.profile,
      sceneId: scene.id,
    })));
  const preferences = {
    activeView: state.activeView,
    autoPlayOnSelect: state.autoPlayOnSelect,
    prompt: dom.prompt.value,
    rememberMix: state.rememberMix,
    sceneId: state.currentScene.id,
    sceneLayers,
    themeMode: state.themeMode,
    volume: state.volume,
  };
  if (state.rememberMix) {
    Object.assign(preferences, {
      character: state.character,
      distance: state.distance,
      intensity: state.intensity,
      movement: state.movement,
      richness: state.richness,
      sceneMixes,
    });
  }
  savePreferences(preferences);
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
    if (!autoPlay && !state.playing) showToast(`已选择「${nextScene.name}」，点击播放开始聆听`);
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
    state.activeAudio = audioCrossfader.switchImmediately(nextIndex);
    state.playing = false;
    syncPlaybackState();
    showToast("声音切换没有完成，已暂停。请再次点击播放");
  }
}

function renderCurrentScene() {
  const scene = state.currentScene;
  document.documentElement.style.setProperty("--scene-tone", scene.palette[0]);
  document.documentElement.style.setProperty("--scene-earth", scene.palette[1]);
  applyTheme();
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
  const visibleElements = [...new Set([...scene.elements, ...scene.layers.slice(1).map((layer) => layer.name)])].slice(0, 6);
  dom.playerExpandedElements.replaceChildren(...visibleElements.map((name) => {
    const span = document.createElement("span");
    span.textContent = name;
    return span;
  }));
  syncPlayerIdentityLabel();
  syncAudioProfile();
  renderLayerList();
  renderSourceLibrary();
  persistPreferences();
}

function renderFeaturedScene() {
  const scene = state.featuredScene;
  dom.downloadVisualImage.src = rainHero;
  dom.featuredImage.src = scene.hero;
  dom.featuredTitle.textContent = scene.name;
  dom.featuredDescription.textContent = scene.description;
  dom.featuredElements.textContent = scene.elements.join(" · ");
  syncSceneActions();
}

function renderCollections() {
  renderExploreGrid();
  renderLibraryGrid();
  syncSceneActions();
  renderIcons();
}

function renderTemplates() {
  dom.templateList.replaceChildren(...templates.map((template) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.template = template.id;
    button.setAttribute("aria-label", `以${template.name}作为描述模板`);
    button.innerHTML = `
      <img src="${template.cover}" alt="" loading="lazy" decoding="async">
      <span><strong>${template.name}</strong><small>${template.elements.join(" · ")}</small></span>`;
    return button;
  }));
  renderIcons();
}

function renderExploreGrid() {
  const otherScenes = scenes.filter((scene) => scene.id !== state.featuredScene.id);
  dom.exploreGrid.classList.toggle("scene-grid--single", otherScenes.length === 1);
  dom.exploreGrid.replaceChildren(...otherScenes.map(createSceneCard));
}

function renderLibraryGrid() {
  dom.libraryGrid.replaceChildren(...scenes.map(createSceneCard));
}

function createSceneCard(scene, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = ["scene-card", extraClass].filter(Boolean).join(" ");
  button.dataset.scene = scene.id;
  button.innerHTML = `
    <span class="scene-card-media"><img src="${scene.cover}" alt="" loading="lazy" decoding="async"></span>
    <span class="scene-card-copy">
      <span class="scene-card-heading">
        <strong>${escapeHtml(scene.name)}</strong>
        <span class="scene-card-action" aria-hidden="true">
          <i class="scene-card-action-icon scene-card-action-icon--play" data-lucide="play"></i>
          <i class="scene-card-action-icon scene-card-action-icon--live" data-lucide="audio-lines"></i>
          <span data-scene-action>开始聆听</span>
        </span>
      </span>
      <small>${escapeHtml(scene.elements.join(" · "))}</small>
      <span class="scene-card-description">${escapeHtml(scene.description)}</span>
    </span>`;
  syncSceneCardState(button, scene);
  return button;
}

function syncSceneActions() {
  const featuredIsCurrent = state.featuredScene.id === state.currentScene.id;
  const featuredIsPlaying = featuredIsCurrent && state.playing;
  dom.featuredScene.classList.toggle("is-current", featuredIsCurrent);
  dom.featuredPlay.classList.toggle("is-playing", featuredIsPlaying);
  dom.featuredPlay.querySelector("span:last-child").textContent = featuredIsPlaying
    ? "打开播放器"
    : featuredIsCurrent && state.hasPlayed
      ? "继续聆听"
      : "开始聆听";
  dom.featuredPlay.setAttribute("aria-label", featuredIsPlaying
    ? `${state.featuredScene.name}正在聆听，打开播放器`
    : `${featuredIsCurrent && state.hasPlayed ? "继续" : "开始"}聆听${state.featuredScene.name}`);
  if (featuredIsCurrent) dom.featuredPlay.setAttribute("aria-current", "true");
  else dom.featuredPlay.removeAttribute("aria-current");

  document.querySelectorAll("[data-scene]").forEach((button) => {
    const scene = sceneById.get(button.dataset.scene);
    if (scene) syncSceneCardState(button, scene);
  });
}

function syncSceneCardState(button, scene) {
  const isCurrent = scene.id === state.currentScene.id;
  const isPlaying = isCurrent && state.playing;
  let action = state.autoPlayOnSelect ? "开始聆听" : "选择声景";
  let ariaAction = state.autoPlayOnSelect ? `切换并播放${scene.name}` : `选择${scene.name}`;
  if (isCurrent) {
    action = isPlaying ? "正在聆听" : state.hasPlayed ? "继续聆听" : "开始聆听";
    ariaAction = isPlaying ? `${scene.name}正在聆听，打开播放器` : `${state.hasPlayed ? "继续" : "开始"}聆听${scene.name}`;
  }
  button.classList.toggle("is-current", isCurrent);
  button.classList.toggle("is-playing", isPlaying);
  button.querySelector("[data-scene-action]").textContent = action;
  button.setAttribute("aria-label", `${ariaAction}。${scene.description}`);
  if (isCurrent) button.setAttribute("aria-current", "true");
  else button.removeAttribute("aria-current");
}

function restoreBuiltInAssignments(assignments) {
  if (!Array.isArray(assignments)) return;
  assignments.forEach((assignment) => {
    const scene = sceneById.get(assignment.sceneId);
    const source = sourceCatalog.environment.find((item) => item.id === assignment.catalogId);
    if (!scene || !source) return;
    if (scene.layers.some((layer) => layer.catalogId === source.id)) return;
    scene.layers.push({
      audio: createLayerAudio(source.audio),
      catalogId: source.id,
      detail: source.detail,
      id: assignment.id || `${scene.id}:builtin:${source.id}`,
      level: clampNumber(assignment.level, 0, 100, 52),
      muted: Boolean(assignment.muted),
      name: source.name,
      profile: SOUND_PROFILES[assignment.profile] ? assignment.profile : source.profile,
      sceneId: scene.id,
      source: "builtin",
    });
  });
}

function addBuiltInLayer(catalogId) {
  const source = sourceCatalog.environment.find((item) => item.id === catalogId);
  if (!source) return;
  const existing = state.currentScene.layers.find((layer) => layer.catalogId === catalogId);
  if (existing) {
    showToast(`「${source.name}」已经在当前声景中`);
    return;
  }
  const layer = {
    audio: createLayerAudio(source.audio),
    catalogId: source.id,
    detail: source.detail,
    id: `${state.currentScene.id}:builtin:${source.id}`,
    level: 52,
    muted: false,
    name: source.name,
    profile: source.profile,
    sceneId: state.currentScene.id,
    source: "builtin",
  };
  state.currentScene.layers.push(layer);
  registerLayerWithAudioEngine(layer);
  if (state.playing) layer.audio.play().catch(() => undefined);
  renderCurrentScene();
  renderCollections();
  showToast(`已把「${source.name}」加入${state.currentScene.name}`);
}

function renderSourceLibrary() {
  if (!dom.sourceList) return;
  dom.sourceTabs.forEach((button) => {
    const selected = button.dataset.sourceCategory === state.sourceCategory;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    if (selected) dom.sourceList.setAttribute("aria-labelledby", button.id);
  });

  if (state.sourceCategory === "mine") {
    const uploaded = state.currentScene.layers.filter((layer) => layer.source === "upload");
    if (!uploaded.length) {
      dom.sourceList.innerHTML = `<div class="source-empty"><strong>这里还没有声音</strong><small>选择一段本地音频，它会留在这个浏览器中。</small></div>`;
      return;
    }
    dom.sourceList.innerHTML = uploaded.map((layer) => `
      <button type="button" data-layer-locate="${escapeHtml(layer.id)}">
        <i data-lucide="upload" aria-hidden="true"></i>
        <span><strong>${escapeHtml(layer.name)}</strong><small>${escapeHtml(SOUND_PROFILES[layer.profile]?.label ?? "自然")} · 已加入当前声景</small></span>
        <b>${layer.level}%</b>
      </button>`).join("");
    renderIcons();
    return;
  }

  const sources = sourceCatalog[state.sourceCategory] ?? sourceCatalog.environment;
  dom.sourceList.innerHTML = sources.map((source) => {
    if (state.sourceCategory === "environment") {
      const layer = state.currentScene.layers.find((item) => item.catalogId === source.id);
      const isBase = layer?.source === "base";
      return `
        <button type="button" ${isBase ? "disabled" : ""} ${layer && !isBase ? `data-remove-catalog="${source.id}"` : `data-add-catalog="${source.id}"`}>
          <i data-lucide="${source.icon}" aria-hidden="true"></i>
          <span><strong>${escapeHtml(source.name)}</strong><small>${escapeHtml(source.detail)}</small></span>
          <b>${isBase ? "底层" : layer ? "移除" : "加入"}</b>
        </button>`;
    }
    return `
      <button type="button" data-source-upload="${source.id}">
        <i data-lucide="${source.icon}" aria-hidden="true"></i>
        <span><strong>${escapeHtml(source.name)}</strong><small>${escapeHtml(source.detail)}</small></span>
        <b>选择音频</b>
      </button>`;
  }).join("");
  renderIcons();
}

function activateSourceCategory(button) {
  if (!button || !dom.sourceTabs.includes(button)) return;
  state.sourceCategory = button.dataset.sourceCategory;
  renderSourceLibrary();
}

function handleSourceLibraryClick(event) {
  const addButton = event.target.closest("[data-add-catalog]");
  if (addButton) {
    addBuiltInLayer(addButton.dataset.addCatalog);
    return;
  }
  const removeButton = event.target.closest("[data-remove-catalog]");
  if (removeButton) {
    const layer = state.currentScene.layers.find((item) => item.catalogId === removeButton.dataset.removeCatalog);
    if (layer) removeAdditionalLayer(layer);
    return;
  }
  const uploadButton = event.target.closest("[data-source-upload]");
  if (uploadButton) {
    const source = Object.values(sourceCatalog).flat().find((item) => item.id === uploadButton.dataset.sourceUpload);
    if (source) requestAudioUpload({ category: state.sourceCategory, profile: source.profile, name: source.name });
    return;
  }
  const locateButton = event.target.closest("[data-layer-locate]");
  if (locateButton) {
    const row = dom.layerList.querySelector(`[data-layer-id="${CSS.escape(locateButton.dataset.layerLocate)}"]`);
    row?.scrollIntoView({ behavior: motionRuntime.isReduced() ? "auto" : "smooth", block: "center" });
    row?.querySelector("input")?.focus({ preventScroll: true });
  }
}

function setThemeMode(themeMode) {
  if (!["scene", "light", "dark"].includes(themeMode)) return;
  state.themeMode = themeMode;
  applyTheme();
  syncSettings();
  persistPreferences();
  const label = themeMode === "scene" ? "跟随声景" : themeMode === "light" ? "浅色" : "深色";
  showToast(`外观已设为「${label}」`);
}

function applyTheme() {
  const theme = state.themeMode === "scene" ? state.currentScene.theme : state.themeMode;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#141918" : "#f4f6f3";
}

function syncSettings() {
  dom.themeOptions.forEach((button) => {
    const selected = button.dataset.themeMode === state.themeMode;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-checked", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  dom.autoPlaySetting.checked = state.autoPlayOnSelect;
  dom.rememberMixSetting.checked = state.rememberMix;
  refreshStorageStats();
}

async function refreshStorageStats() {
  try {
    const stats = await getStoredAudioStats();
    dom.storageSummary.textContent = stats.count ? `${stats.count} 个声音 · ${formatBytes(stats.bytes)}` : "还没有本地声音";
    dom.storageDetail.textContent = stats.count ? "只保存在当前浏览器，可随时清空" : "从播放器下方的素材库添加";
    dom.clearStorageButton.hidden = stats.count === 0;
  } catch {
    dom.storageSummary.textContent = "无法读取本地存储";
    dom.storageDetail.textContent = "浏览器可能已限制 IndexedDB";
    dom.clearStorageButton.hidden = true;
  }
}

async function handleClearStoredAudio() {
  if (!state.clearStorageArmed) {
    state.clearStorageArmed = true;
    dom.clearStorageButton.dataset.armed = "true";
    dom.clearStorageButton.textContent = "再次点击清空";
    window.clearTimeout(state.clearStorageTimer);
    state.clearStorageTimer = window.setTimeout(resetClearStorageButton, 4000);
    return;
  }

  window.clearTimeout(state.clearStorageTimer);
  state.clearStorageTimer = 0;
  scenes.forEach((scene) => {
    scene.layers.filter((layer) => layer.source === "upload").forEach((layer) => {
      layer.audio?.pause();
      audioCrossfader.detachLayer(layer.id);
      if (layer.audio?.src.startsWith("blob:")) URL.revokeObjectURL(layer.audio.src);
    });
    scene.layers = scene.layers.filter((layer) => layer.source !== "upload");
  });
  try {
    await clearStoredAudioLayers();
    showToast("本地声音已清空，内置声景没有变化");
  } catch {
    showToast("本地声音没有清空，请稍后再试");
  }
  resetClearStorageButton();
  renderCurrentScene();
  renderCollections();
  refreshStorageStats();
}

function resetClearStorageButton() {
  state.clearStorageArmed = false;
  dom.clearStorageButton.dataset.armed = "false";
  dom.clearStorageButton.textContent = "清空本地声音";
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderLayerList() {
  dom.layerList.replaceChildren(...state.currentScene.layers.map((layer, index) => {
    const isBase = layer.source === "base";
    const available = isBase || Boolean(layer.audio);
    const profile = SOUND_PROFILES[layer.profile ?? "natural"] ?? SOUND_PROFILES.natural;
    const row = document.createElement("article");
    row.className = "layer-row";
    row.dataset.layerId = layer.id;
    row.dataset.muted = String(layer.muted);
    row.dataset.available = String(available);
    row.dataset.source = layer.source;
    row.innerHTML = `
      <div class="layer-identity">
        <span class="layer-swatch" aria-hidden="true"></span>
        <span class="layer-name"><strong>${escapeHtml(layer.name)}</strong><small>${escapeHtml(layer.detail)}</small></span>
      </div>
      <input type="range" min="0" max="100" value="${layer.level}" aria-label="${escapeHtml(layer.name)}存在感" aria-valuetext="${layer.level}%" data-layer-level ${available ? "" : "disabled"}>
      ${isBase
        ? `<span class="layer-profile-label">跟随整体听感</span>`
        : `<label class="layer-profile"><span class="sr-only">${escapeHtml(layer.name)}播放质感</span><select data-layer-profile aria-label="${escapeHtml(layer.name)}播放质感">${Object.entries(SOUND_PROFILES).map(([id, item]) => `<option value="${id}" ${id === (layer.profile ?? "natural") ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select><small>${escapeHtml(profile.detail)}</small></label>`}
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
    audioCrossfader.setLayer(layer.id, { level: layer.level / 100, muted: layer.muted });
    persistLayerState(layer);
  }
}

function handleLayerProfileChange(event) {
  const select = event.target.closest("[data-layer-profile]");
  if (!select) return;
  const row = select.closest("[data-layer-id]");
  const layer = state.currentScene.layers.find((item) => item.id === row.dataset.layerId);
  if (!layer || !SOUND_PROFILES[select.value]) return;
  layer.profile = select.value;
  audioCrossfader.setLayer(layer.id, { character: layer.profile });
  persistLayerState(layer);
  renderLayerList();
  renderSourceLibrary();
  showToast(`「${layer.name}」现在通过${SOUND_PROFILES[layer.profile].label}播放`);
}

function handleLayerToggle(event) {
  const removeButton = event.target.closest("[data-layer-remove]");
  if (removeButton) {
    const row = removeButton.closest("[data-layer-id]");
    const layer = state.currentScene.layers.find((item) => item.id === row.dataset.layerId);
    if (layer) removeAdditionalLayer(layer);
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
    audioCrossfader.setLayer(layer.id, { muted: layer.muted });
    persistLayerState(layer);
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
  profile = "natural",
  category = "mine",
  createdAt = Date.now(),
  persisted = true,
}) {
  const profileLabel = SOUND_PROFILES[profile]?.label ?? SOUND_PROFILES.natural.label;
  const layer = {
    id,
    name,
    detail: persisted ? `${profileLabel} · 保存在此浏览器` : `${profileLabel} · 仅当前会话`,
    level,
    muted,
    audio,
    blob,
    category,
    createdAt,
    profile,
    sceneId: scene.id,
    source: "upload",
  };
  scene.layers.push(layer);
  registerLayerWithAudioEngine(layer);
  if (scene.id === state.currentScene.id) renderCurrentScene();
  renderCollections();
  if (scene.id === state.currentScene.id && state.playing && !muted) playUploadedLayers(scene);
  return layer;
}

function requestAudioUpload({ category = "mine", profile = "natural", name = "" } = {}) {
  state.pendingUpload = { category, profile, name };
  dom.audioUpload.click();
}

async function handleAudioUpload() {
  const file = dom.audioUpload.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("audio/")) {
    showToast("请选择音频文件");
    dom.audioUpload.value = "";
    state.pendingUpload = null;
    return;
  }
  if (file.size > 32 * 1024 * 1024) {
    showToast("音频超过 32 MB，请选择更小的文件");
    dom.audioUpload.value = "";
    state.pendingUpload = null;
    return;
  }

  const id = window.crypto?.randomUUID?.() ?? `audio-${Date.now()}`;
  const uploadRequest = state.pendingUpload ?? { category: "mine", profile: "natural", name: "" };
  const originalName = file.name.replace(/\.[^.]+$/, "").slice(0, 28) || "本地声音";
  const name = uploadRequest.name ? `${uploadRequest.name} · ${originalName}`.slice(0, 36) : originalName;
  const targetScene = state.currentScene;
  const createdAt = Date.now();
  const record = {
    blob: file,
    category: uploadRequest.category,
    createdAt,
    id,
    level: 56,
    muted: false,
    name,
    profile: uploadRequest.profile,
    sceneId: targetScene.id,
  };
  let persisted = true;
  try {
    await putStoredAudioLayer(record);
  } catch {
    persisted = false;
  }

  addUploadedLayer({
    audio: createLayerAudio(URL.createObjectURL(file)),
    blob: file,
    category: uploadRequest.category,
    createdAt,
    id,
    name,
    profile: uploadRequest.profile,
    persisted,
    scene: targetScene,
  });
  dom.audioUpload.value = "";
  state.pendingUpload = null;
  refreshStorageStats();
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
    const profile = SOUND_PROFILES[record.profile] ? record.profile : "natural";
    const layer = {
      audio,
      blob: record.blob,
      category: record.category ?? "mine",
      createdAt: record.createdAt ?? Date.now(),
      detail: `${SOUND_PROFILES[profile].label} · 保存在此浏览器`,
      id: record.id,
      level: clampNumber(record.level, 0, 100, 56),
      muted: Boolean(record.muted),
      name: record.name || "本地声音",
      profile,
      sceneId: record.sceneId,
      source: "upload",
    };
    scene.layers.push(layer);
    registerLayerWithAudioEngine(layer);
  });
}

function createLayerAudio(url) {
  const audio = new Audio(url);
  audio.loop = true;
  audio.preload = "metadata";
  return audio;
}

function registerLayerWithAudioEngine(layer) {
  if (!layer.audio) return;
  audioCrossfader.attachLayer(layer.id, layer.audio, {
    character: layer.profile ?? "natural",
    level: layer.level / 100,
    muted: layer.muted,
  });
}

function persistLayerState(layer) {
  if (layer.source === "upload") persistUploadedLayer(layer);
  else persistPreferences();
}

function persistUploadedLayer(layer) {
  if (layer.source !== "upload" || !layer.blob) return;
  putStoredAudioLayer({
    blob: layer.blob,
    category: layer.category ?? "mine",
    createdAt: layer.createdAt ?? Date.now(),
    id: layer.id,
    level: layer.level,
    muted: layer.muted,
    name: layer.name,
    profile: layer.profile ?? "natural",
    sceneId: layer.sceneId ?? state.currentScene.id,
  }).catch(() => undefined);
}

async function removeAdditionalLayer(layer) {
  if (layer.source === "base") return;
  layer.audio?.pause();
  audioCrossfader.detachLayer(layer.id);
  if (layer.audio?.src.startsWith("blob:")) URL.revokeObjectURL(layer.audio.src);
  state.currentScene.layers = state.currentScene.layers.filter((item) => item.id !== layer.id);
  renderCurrentScene();
  renderCollections();
  if (layer.source === "upload") {
    try {
      await deleteStoredAudioLayer(layer.id);
      showToast(`已移除「${layer.name}」`);
    } catch {
      showToast(`已从当前声景移除「${layer.name}」`);
    }
  } else {
    persistPreferences();
    showToast(`已从当前声景移除「${layer.name}」`);
  }
  refreshStorageStats();
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
  clearFocusEntryHint();
  closeControlPopovers(false);
  dom.focusMode.classList.add("is-open");
  dom.focusMode.removeAttribute("inert");
  dom.focusMode.setAttribute("aria-hidden", "false");
  resetFocusChrome({ immediate: true });
  dom.focusMode.focus({ preventScroll: true });
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
  closeControlPopovers(false);
  resetFocusChrome({ immediate: true });
  syncBackgroundInert();
  syncStateMarkers();
  focusMotion.close();
}

function finishFocusOpen() {
  state.focusTransitioning = false;
  scheduleFocusChromeHide();
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
  resetFocusChrome({ immediate: true });
  syncBackgroundInert();
  state.lastFocused?.focus?.({ preventScroll: true });
  syncPlayerIdentityLabel();
  syncStateMarkers();
}

function handleFocusActivity() {
  if (!state.focusOpen) return;
  revealFocusChrome();
}

function revealFocusChrome({ immediate = false } = {}) {
  window.clearTimeout(focusChromeTimer);
  focusChromeTimer = 0;
  if (!state.focusOpen && !state.focusTransitioning) return;
  if (!focusChromeVisible || immediate) {
    focusChromeVisible = true;
    focusMotion.setChromeVisible(true, { immediate });
  }
  scheduleFocusChromeHide();
}

function scheduleFocusChromeHide() {
  window.clearTimeout(focusChromeTimer);
  focusChromeTimer = 0;
  if (!state.focusOpen || state.focusTransitioning || !state.playing || focusChromeEngaged) return;
  focusChromeTimer = window.setTimeout(() => {
    const focusedElement = document.activeElement;
    const focusedInChrome = focusChromeKeyboardActive
      && (dom.focusHeader.contains(focusedElement) || dom.playerControlRail.contains(focusedElement));
    if (!state.focusOpen || !state.playing) return;
    if (focusChromeEngaged || focusedInChrome) {
      scheduleFocusChromeHide();
      return;
    }
    focusChromeVisible = false;
    focusMotion.setChromeVisible(false);
  }, FOCUS_CHROME_IDLE_MS);
}

function syncFocusChromePlayback() {
  if (!state.focusOpen) return;
  if (state.playing) {
    revealFocusChrome();
    return;
  }
  window.clearTimeout(focusChromeTimer);
  focusChromeTimer = 0;
  if (!focusChromeVisible) {
    focusChromeVisible = true;
    focusMotion.setChromeVisible(true);
  }
}

function resetFocusChrome({ immediate = false } = {}) {
  window.clearTimeout(focusChromeTimer);
  focusChromeTimer = 0;
  focusChromeVisible = true;
  focusChromeEngaged = false;
  focusChromeKeyboardActive = false;
  focusMotion.setChromeVisible(true, { immediate });
}

function handleRovingSelectionKeydown(event, options, activate) {
  const horizontalKeys = ["ArrowLeft", "ArrowRight"];
  if (![...horizontalKeys, "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const currentIndex = Math.max(0, options.indexOf(event.currentTarget));
  let nextIndex = currentIndex;
  if (["ArrowRight", "ArrowDown"].includes(event.key)) nextIndex = (currentIndex + 1) % options.length;
  if (["ArrowLeft", "ArrowUp"].includes(event.key)) nextIndex = (currentIndex - 1 + options.length) % options.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = options.length - 1;
  const nextButton = options[nextIndex];
  activate(nextButton);
  nextButton.focus({ preventScroll: true });
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
      AudioLines,
      Blend,
      ChevronDown,
      CloudRain,
      Database,
      Ellipsis,
      Headphones,
      House,
      Laptop,
      Library,
      Maximize2,
      Moon,
      Pause,
      Play,
      Plus,
      Radio,
      Settings,
      Shuffle,
      Smartphone,
      Speaker,
      Sun,
      Timer,
      Trash2,
      Tv,
      Upload,
      Volume2,
      VolumeX,
      Waves,
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
  dom.shell.dataset.movement = state.movement.toFixed(2);
  dom.shell.dataset.distance = state.distance.toFixed(2);
  dom.shell.dataset.character = state.character;
  dom.shell.dataset.themeMode = state.themeMode;
  dom.shell.dataset.sourceCategory = state.sourceCategory;
  dom.shell.dataset.mobileMoreOpen = String(state.mobileMoreOpen);
  dom.shell.dataset.baseLevel = String(baseLayer.level);
  dom.shell.dataset.baseMuted = String(baseLayer.muted);
  syncPlayerExitControl();
}

function exposeDebugApi() {
  window.__soundscapeDebug = {
    snapshot: () => ({
      activeView: state.activeView,
      playerExpanded: state.playerExpanded,
      sleepMenuOpen: state.sleepMenuOpen,
      volumePopoverOpen: state.volumePopoverOpen,
      sleepTimerMinutes: state.sleepTimerMinutes,
      themeMode: state.themeMode,
      autoPlayOnSelect: state.autoPlayOnSelect,
      rememberMix: state.rememberMix,
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
