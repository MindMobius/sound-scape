import "@fontsource-variable/noto-serif-sc/wght.css";
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  ChevronDown,
  CloudRain,
  Compass,
  createIcons,
  Eye,
  EyeOff,
  Flame,
  House,
  Library,
  Maximize2,
  Pause,
  Play,
  Plus,
  Radio,
  Settings,
  Shuffle,
  Timer,
  Upload,
  Volume2,
  X,
} from "lucide";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import rainAudioUrl from "./media/rain-cabin.mp3?url";
import waterAudioUrl from "./media/open-water.wav?url";
import rainHero from "../../assets/scenes/rain-cabin/rain-cabin-hero-v1.png?url";
import rainCover from "../../assets/scenes/rain-cabin/rain-cabin-cover-v1.png?url";
import forestHero from "../../assets/scenes/forest-dawn/forest-dawn-hero-v1.png?url";
import forestCover from "../../assets/scenes/forest-dawn/forest-dawn-cover-v1.png?url";
import coastalHero from "../../assets/scenes/coastal-night/coastal-night-hero-v1.png?url";
import coastalCover from "../../assets/scenes/coastal-night/coastal-night-cover-v1.png?url";
import trainHero from "../../assets/scenes/night-train/night-train-hero-v1.png?url";
import trainCover from "../../assets/scenes/night-train/night-train-cover-v1.png?url";
import libraryHero from "../../assets/scenes/quiet-library/quiet-library-hero-v1.png?url";
import libraryCover from "../../assets/scenes/quiet-library/quiet-library-cover-v1.png?url";
import courtyardHero from "../../assets/scenes/summer-courtyard/summer-courtyard-hero-v1.png?url";
import courtyardCover from "../../assets/scenes/summer-courtyard/summer-courtyard-cover-v1.png?url";
import { MembraneField } from "./visual-field.js";

gsap.registerPlugin(Flip, ScrollTrigger);

const makeLayers = (...names) => names.map((name, index) => ({
  id: `${name}-${index}`,
  name,
  detail: `${["近处", "远处", "中景", "空间"][index % 4]} · 预设待接入`,
  level: [72, 44, 61, 36][index % 4],
  muted: false,
  audio: null,
}));

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
    layers: makeLayers("屋檐雨", "远雷", "松木火", "夜风"),
    palette: ["#aebbc7", "#c4b7ae", "#78877d", "#d36b54", "#8a8e90", "#bcc5ce", "#d3ccc2"],
  },
  {
    id: "forest-dawn",
    name: "林间初醒",
    description: "清晨薄雾里的林间小路，远处有溪水和几声鸟鸣。",
    category: "nature",
    saved: true,
    recent: true,
    theme: "light",
    hero: forestHero,
    cover: forestCover,
    audio: waterAudioUrl,
    layers: makeLayers("浅溪", "湿叶", "晨风", "疏鸟"),
    palette: ["#b4c0ca", "#d0c7bd", "#788c7d", "#d9a58b", "#9aa79d", "#c8d0d4", "#b6c5b8"],
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
    layers: makeLayers("近岸潮水", "远浪", "海风", "礁石回响"),
    palette: ["#6b8290", "#7f7a70", "#4c6664", "#a95f4f", "#59656d", "#879197", "#706d65"],
  },
  {
    id: "night-train",
    name: "夜行列车",
    description: "夜行列车穿过安静而连续的远方。",
    category: "journey",
    saved: false,
    recent: true,
    theme: "dark",
    hero: trainHero,
    cover: trainCover,
    audio: waterAudioUrl,
    layers: makeLayers("车轮节律", "车厢低鸣", "轨道接缝", "窗外风压"),
    palette: ["#647888", "#716d66", "#4d6062", "#a75e4f", "#53616a", "#7d878d", "#696965"],
  },
  {
    id: "quiet-library",
    name: "安静图书馆",
    description: "午后的旧图书馆，纸页与木地板都很轻。",
    category: "interior",
    saved: true,
    recent: false,
    theme: "light",
    hero: libraryHero,
    cover: libraryCover,
    audio: rainAudioUrl,
    layers: makeLayers("翻页", "远处脚步", "木地板", "窗缝微风"),
    palette: ["#b7c0c7", "#cbbcaf", "#9aa298", "#d87860", "#8b8e90", "#d0c8bd", "#aaa99f"],
  },
  {
    id: "summer-courtyard",
    name: "夏日庭院",
    description: "盛夏午后的小院，风把树影吹得很慢。",
    category: "interior",
    saved: true,
    recent: false,
    theme: "light",
    hero: courtyardHero,
    cover: courtyardCover,
    audio: waterAudioUrl,
    layers: makeLayers("树叶", "远蝉", "旧风扇", "偶尔风铃"),
    palette: ["#b9c2c6", "#cbb9ad", "#879687", "#d77a5e", "#9ca29a", "#d0c7bc", "#b3bdaa"],
  },
];

const sceneById = new Map(scenes.map((scene) => [scene.id, scene]));
const validViews = new Set(["home", "explore", "create", "library"]);
const randomPrompts = [
  "雷雨夜里，点燃篝火的木屋。",
  "清晨薄雾里的林间小路，远处有溪水和几声鸟鸣。",
  "深夜海岸上，潮声持续靠近又缓缓退去。",
  "夜行列车穿过安静而连续的远方。",
  "午后的旧图书馆，纸页与木地板都很轻。",
  "盛夏午后的小院，风把树影吹得很慢。",
];
const sourceSets = {
  环境: [
    { name: "窗边细雨", icon: "cloud-rain" },
    { name: "壁炉余火", icon: "flame" },
    { name: "林间风", icon: "audio-lines" },
  ],
  事件: [
    { name: "远雷", icon: "cloud-rain" },
    { name: "木门轻响", icon: "audio-lines" },
    { name: "偶尔脚步", icon: "audio-lines" },
  ],
  媒介: [
    { name: "老式收音机", icon: "radio" },
    { name: "雪花电视", icon: "radio" },
    { name: "胆机唱机", icon: "radio" },
  ],
};
const jobStages = [
  { until: 25, label: "预演 · 理解场景" },
  { until: 55, label: "预演 · 选择声音" },
  { until: 82, label: "预演 · 组织远近" },
  { until: 101, label: "预演 · 调整变化" },
];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
  featuredImage: document.querySelector("#featured-image"),
  featuredElements: document.querySelector("#featured-elements"),
  featuredTitle: document.querySelector("#featured-title"),
  featuredDescription: document.querySelector("#featured-description"),
  featuredPlay: document.querySelector("#featured-play"),
  createForm: document.querySelector("#create-form"),
  prompt: document.querySelector("#scene-prompt"),
  promptCount: document.querySelector("#prompt-count"),
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
  sourceList: document.querySelector(".source-list"),
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

const initialRequest = new URLSearchParams(window.location.search).get("view");
const state = {
  activeView: getInitialView(),
  playerExpanded: ["player", "listening", "advanced"].includes(initialRequest),
  sleepMenuOpen: false,
  volumePopoverOpen: false,
  sleepTimerMinutes: 0,
  sleepTimerId: 0,
  sleepTimerEndsAt: 0,
  sleepTimerTickerId: 0,
  currentScene: sceneById.get("rain-cabin"),
  featuredScene: sceneById.get("coastal-night"),
  pendingScene: null,
  generatedReady: null,
  playing: false,
  volume: Number(dom.volumeInputs[0].value) / 100,
  intensity: Number(dom.intensityInputs[0].value) / 100,
  richness: Number(dom.richnessInputs[0].value) / 100,
  activeAudio: 0,
  crossfadeProgress: null,
  hasPlayed: false,
  jobState: "idle",
  jobProgress: 0,
  jobTimer: 0,
  playingAtJobStart: false,
  switching: false,
  playerTransitioning: false,
  focusOpen: false,
  fieldStarted: false,
  lastFocused: null,
  character: "自然",
  exploreFilter: "all",
  libraryFilter: "all",
};

const audioTracks = [new Audio(), new Audio()];
audioTracks.forEach((audio, index) => {
  audio.id = `audio-track-${index}`;
  audio.loop = true;
  audio.preload = "auto";
  audio.crossOrigin = "anonymous";
  audio.hidden = true;
  audio.setAttribute("aria-hidden", "true");
  document.body.append(audio);
});
audioTracks[0].src = state.currentScene.audio;
audioTracks[0].volume = state.volume;
audioTracks[1].volume = 0;

const field = new MembraneField({
  canvas: dom.canvas,
  surface: dom.focusVisual,
  status: dom.renderStatus,
});

let playerTransition = null;
let focusTransition = null;
let playerScrollMotion = null;
let artworkFlight = null;

function boot() {
  preloadScenes();
  renderHomeGreeting();
  renderCurrentScene();
  renderFeaturedScene();
  renderCollections();
  renderSourceList("环境");
  setActiveView(state.activeView, false);
  syncPlayerStructure();
  installInteractions();
  installAmbientInteractions();
  syncControls();
  syncPlaybackState();
  syncStateMarkers();
  renderIcons();
  exposeDebugApi();
  if (state.playerExpanded) window.requestAnimationFrame(initPlayerScrollMotion);
}

function getInitialView() {
  if (validViews.has(initialRequest)) return initialRequest;
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
  dom.prompt.addEventListener("input", updatePromptCount);
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
    state.character = button.dataset.character;
    updateTabSelection(button, "[data-character]", "aria-checked");
    showToast(`已选择「${state.character}」播放质感`);
  });

  dom.layerList.addEventListener("input", handleLayerInput);
  dom.layerList.addEventListener("click", handleLayerToggle);
  dom.sourceList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-add-layer]");
    if (button) addLayer(button.dataset.addLayer);
  });
  document.querySelectorAll(".source-tabs button").forEach((button) => {
    button.addEventListener("click", () => {
      updateTabSelection(button, ".source-tabs button");
      renderSourceList(button.textContent.trim());
    });
  });
  [dom.addAudioButton, dom.browseAudioButton].forEach((button) => button.addEventListener("click", () => dom.audioUpload.click()));
  dom.audioUpload.addEventListener("change", handleAudioUpload);

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

function installAmbientInteractions() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || prefersReducedMotion) return;
  const pairs = [
    { surface: dom.homeGuideScene, image: dom.homeGuideCover, scale: 1.045 },
    { surface: dom.playerHeroArtwork, image: dom.playerHeroCover, scale: 1.022 },
  ];

  pairs.forEach(({ surface, image, scale }) => {
    if (!surface || !image) return;
    surface.addEventListener("pointerenter", () => {
      gsap.to(image, { scale, duration: 0.62, ease: "expo.out", overwrite: "auto" });
    });
    surface.addEventListener("pointerleave", () => {
      gsap.to(image, { scale: 1, duration: 0.52, ease: "expo.out", overwrite: "auto", clearProps: "transform" });
    });
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

  dom.workspace.scrollTo({ top: 0, behavior: "instant" });
  const url = new URL(window.location.href);
  url.searchParams.set("view", viewName);
  window.history.replaceState(null, "", url);
  const activeView = dom.views.find((view) => view.dataset.view === viewName);
  if (animate && !prefersReducedMotion) {
    gsap.fromTo(activeView, { opacity: 0.76, y: 7 }, {
      opacity: 1,
      y: 0,
      duration: 0.26,
      ease: "expo.out",
      clearProps: "opacity,transform",
    });
  }
}

function expandPlayer() {
  if (state.playerExpanded || state.focusOpen || state.playerTransitioning) return;
  closeControlPopovers(false);
  state.playerExpanded = true;
  state.playerTransitioning = true;
  syncPlayerStructure();
  dom.playerExpandedScroll.scrollTop = 0;

  if (prefersReducedMotion) {
    state.playerTransitioning = false;
    initPlayerScrollMotion();
    syncStateMarkers();
    return;
  }

  playerTransition?.kill();
  stopArtworkFlight();
  gsap.set(dom.playerExpandedContent, {
    clipPath: "inset(100% 0 0 0 round 0px)",
    opacity: 1,
    visibility: "visible",
  });
  gsap.set(dom.playerCollapseButton, { opacity: 0, y: -8 });
  animateArtworkFlight(dom.playerCover, dom.playerHeroCover, 0.72);

  const copyTargets = [
    dom.playerExpandedCopy.querySelector(".player-status-line"),
    dom.playerExpandedTitle,
    dom.playerExpandedDescription,
    dom.playerExpandedElements,
    dom.playerFeeling,
  ];

  playerTransition = gsap.timeline({
    defaults: { overwrite: "auto" },
    onComplete: () => {
      state.playerTransitioning = false;
      playerTransition = null;
      initPlayerScrollMotion();
      syncStateMarkers();
    },
  });
  playerTransition
    .to(dom.playerExpandedContent, {
      clipPath: "inset(0% 0 0 0 round 0px)",
      duration: 0.64,
      ease: "expo.inOut",
    }, 0)
    .fromTo(dom.playerAtmosphereImage,
      { opacity: 0, scale: 1.08 },
      { opacity: 0.16, scale: 1.025, duration: 0.86, ease: "expo.out" }, 0.08)
    .fromTo(dom.playerHeroArtwork,
      { opacity: 0.22, y: 34, scale: 0.965, filter: "blur(5px)" },
      { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", duration: 0.72, ease: "expo.out" }, 0.12)
    .fromTo(copyTargets,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.045, ease: "expo.out" }, 0.24)
    .fromTo(dom.playerScrollCue,
      { opacity: 0, y: -7 },
      { opacity: 1, y: 0, duration: 0.38, ease: "power3.out" }, 0.44)
    .to(dom.playerCollapseButton, { opacity: 1, y: 0, duration: 0.3, ease: "expo.out" }, 0.32);
}

function collapsePlayer({ restoreFocus = false } = {}) {
  if (!state.playerExpanded || state.focusOpen || state.playerTransitioning) return;
  closeControlPopovers(false);
  state.playerTransitioning = true;
  syncStateMarkers();
  destroyPlayerScrollMotion(false);

  const finish = () => {
    state.playerExpanded = false;
    state.playerTransitioning = false;
    syncPlayerStructure();
    dom.playerExpandedScroll.scrollTop = 0;
    resetPlayerMotionStyles();
    if (restoreFocus) dom.playerIdentityButton.focus({ preventScroll: true });
  };

  if (prefersReducedMotion) {
    finish();
    return;
  }

  playerTransition?.kill();
  stopArtworkFlight();
  const heroVisible = dom.playerHeroArtwork.getBoundingClientRect().bottom > 0
    && dom.playerHeroArtwork.getBoundingClientRect().top < window.innerHeight;
  if (heroVisible) animateArtworkFlight(dom.playerHeroCover, dom.playerCover, 0.48);

  playerTransition = gsap.timeline({
    defaults: { overwrite: "auto" },
    onComplete: () => {
      playerTransition = null;
      finish();
    },
  });
  playerTransition
    .to([
      dom.playerExpandedCopy,
      dom.playerScrollCue,
      dom.playerCollapseButton,
    ], { opacity: 0, y: 8, duration: 0.18, ease: "power2.out" }, 0)
    .to(dom.playerHeroArtwork, {
      opacity: heroVisible ? 0.2 : 0,
      y: 18,
      scale: 0.98,
      filter: "blur(3px)",
      duration: 0.28,
      ease: "power2.in",
    }, 0)
    .to(dom.playerAtmosphereImage, { opacity: 0, scale: 1.06, duration: 0.28, ease: "power2.in" }, 0)
    .to(dom.playerExpandedContent, {
      clipPath: "inset(100% 0 0 0 round 0px)",
      duration: 0.44,
      ease: "power3.inOut",
    }, 0.04);
}

function scrollToSoundDetails() {
  window.requestAnimationFrame(() => {
    dom.detailsPanel.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  });
}

function syncPlayerStructure() {
  const playerState = state.playerExpanded ? "expanded" : "collapsed";
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

function animateArtworkFlight(source, target, duration) {
  if (prefersReducedMotion || !source || !target) return;
  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  if (!sourceRect.width || !sourceRect.height || !targetRect.width || !targetRect.height) return;

  const clone = document.createElement("img");
  clone.className = "artwork-flight";
  clone.src = state.currentScene.cover;
  clone.alt = "";
  Object.assign(clone.style, {
    position: "fixed",
    top: `${sourceRect.top}px`,
    left: `${sourceRect.left}px`,
    width: `${sourceRect.width}px`,
    height: `${sourceRect.height}px`,
    borderRadius: getComputedStyle(source).borderRadius,
  });
  document.body.append(clone);
  gsap.set(target, { opacity: 0 });

  const finish = () => {
    clone.remove();
    gsap.set(target, { clearProps: "opacity" });
    artworkFlight = null;
  };
  const tween = Flip.fit(clone, target, {
    scale: true,
    simple: true,
    duration,
    ease: "expo.inOut",
    borderRadius: getComputedStyle(target).borderRadius,
    onComplete: finish,
  });
  artworkFlight = { clone, target, tween };
}

function stopArtworkFlight() {
  if (!artworkFlight) return;
  artworkFlight.tween?.kill();
  artworkFlight.clone.remove();
  gsap.set(artworkFlight.target, { clearProps: "opacity" });
  artworkFlight = null;
}

function initPlayerScrollMotion() {
  destroyPlayerScrollMotion();
  if (prefersReducedMotion || !state.playerExpanded) return;

  playerScrollMotion = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: dom.detailsPanel,
      scroller: dom.playerExpandedScroll,
      start: "top 92%",
      end: "top 34%",
      scrub: 0.45,
      invalidateOnRefresh: true,
    },
  });
  playerScrollMotion
    .to(dom.playerHeroArtwork, { y: -30, scale: 0.95, opacity: 0.46 }, 0)
    .to(dom.playerExpandedCopy, { y: -18, opacity: 0.5 }, 0)
    .to(dom.playerAtmosphereImage, { scale: 1.07, opacity: 0.07 }, 0)
    .to(dom.playerScrollCue, { opacity: 0, y: 9 }, 0);
  ScrollTrigger.refresh();
}

function destroyPlayerScrollMotion(clearStyles = true) {
  if (playerScrollMotion) {
    playerScrollMotion.scrollTrigger?.kill();
    playerScrollMotion.kill();
    playerScrollMotion = null;
  }
  if (clearStyles) {
    gsap.set([
      dom.playerHeroArtwork,
      dom.playerExpandedCopy,
      dom.playerAtmosphereImage,
      dom.playerScrollCue,
    ], { clearProps: "transform,opacity" });
  }
}

function resetPlayerMotionStyles() {
  stopArtworkFlight();
  gsap.set([
    dom.playerExpandedContent,
    dom.playerAtmosphereImage,
    dom.playerHeroArtwork,
    dom.playerExpandedCopy,
    dom.playerScrollCue,
    dom.playerCollapseButton,
  ], { clearProps: "transform,opacity,filter,clip-path,visibility" });
}

function toggleSleepTimerMenu(force, restoreFocus = true) {
  const open = typeof force === "boolean" ? force : !state.sleepMenuOpen;
  if (open === state.sleepMenuOpen) return;
  if (open && state.volumePopoverOpen) toggleVolumePopover(false, false);
  state.sleepMenuOpen = open;
  dom.sleepTimerMenu.classList.toggle("is-open", open);
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
  dom.volumePopover.classList.toggle("is-open", open);
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
  const contentBlocked = state.playerExpanded || state.focusOpen;
  dom.contentInertTargets.forEach((target) => { target.inert = contentBlocked; });
  dom.globalPlayer.inert = state.focusOpen;
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
    await audioTracks[state.activeAudio].play();
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
  audioTracks.forEach((audio) => audio.pause());
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
  const label = state.playing ? "自然演化中" : state.hasPlayed ? "已经暂停" : "轻触播放";
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
  applyAudioVolumes();
  state.currentScene.layers.forEach((layer) => {
    if (layer.audio) layer.audio.volume = layer.muted ? 0 : state.volume * (layer.level / 100) * 0.55;
  });
}

function updateFeeling(kind, value) {
  const normalized = Math.max(0, Math.min(100, Number(value)));
  state[kind] = normalized / 100;
  const inputs = kind === "intensity" ? dom.intensityInputs : dom.richnessInputs;
  inputs.forEach((input) => {
    if (document.activeElement !== input) input.value = String(normalized);
  });
  field.setControls({ [kind]: state[kind] });
}

function syncControls() {
  updateVolume(state.volume * 100);
  updateFeeling("intensity", state.intensity * 100);
  updateFeeling("richness", state.richness * 100);
  syncSleepTimerUI();
}

async function switchToScene(nextScene, { autoPlay = false, openPlayer = false, generated = false } = {}) {
  if (state.switching) return;
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

  if (!prefersReducedMotion) {
    await tween([...artworkTargets, ...copyTargets], {
      opacity: 0,
      y: 5,
      scale: 0.99,
      filter: "blur(3px)",
      duration: 0.2,
      ease: "power2.out",
    });
  }
  stopUploadedLayers(outgoingScene);
  const audioTransition = crossfadeAudio(nextScene.audio);
  state.currentScene = nextScene;
  state.hasPlayed = state.playing;
  renderCurrentScene();
  renderCollections();
  const fieldTransition = state.fieldStarted ? field.setScene(nextScene) : Promise.resolve();
  if (state.playing) playUploadedLayers(nextScene);

  if (generated && state.generatedReady?.id === nextScene.id) dismissReadyScene(true);
  if (openPlayer) expandPlayer();
  if (autoPlay && !state.playing) await startPlayback();

  if (!prefersReducedMotion) {
    gsap.timeline({ defaults: { overwrite: "auto" } })
      .fromTo(artworkTargets,
        { opacity: 0, clipPath: "inset(100% 0 0 0 round 6px)", scale: 1.025, filter: "blur(3px)" },
        {
          opacity: 1,
          clipPath: "inset(0% 0 0 0 round 6px)",
          scale: 1,
          filter: "blur(0px)",
          duration: 0.58,
          ease: "expo.out",
          clearProps: "opacity,transform,filter,clip-path",
        }, 0)
      .fromTo(copyTargets,
        { opacity: 0, y: 10, filter: "blur(2px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.46,
          stagger: 0.035,
          ease: "expo.out",
          clearProps: "opacity,transform,filter",
        }, 0.1)
      .fromTo(dom.playerAtmosphereImage,
        { opacity: 0, scale: 1.08 },
        {
          opacity: state.playerExpanded ? 0.16 : 0,
          scale: 1.025,
          duration: 0.72,
          ease: "expo.out",
          clearProps: state.playerExpanded ? "" : "opacity,transform",
        }, 0.06);
  }
  await Promise.all([audioTransition, fieldTransition]);
  state.switching = false;
  syncStateMarkers();
}

async function crossfadeAudio(nextUrl) {
  const currentAudio = audioTracks[state.activeAudio];
  if (currentAudio.src === new URL(nextUrl, window.location.href).href) return;
  const nextIndex = state.activeAudio === 0 ? 1 : 0;
  const nextAudio = audioTracks[nextIndex];
  nextAudio.pause();
  nextAudio.src = nextUrl;
  nextAudio.currentTime = 0;
  nextAudio.volume = 0;

  if (!state.playing) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    state.activeAudio = nextIndex;
    nextAudio.volume = state.volume;
    return;
  }

  try {
    await nextAudio.play();
  } catch (error) {
    console.error("Unable to start the next soundscape audio", error);
    return;
  }

  await new Promise((resolve) => {
    const startedAt = performance.now();
    const duration = 1300;
    const step = (now) => {
      state.crossfadeProgress = Math.min(1, (now - startedAt) / duration);
      applyAudioVolumes();
      if (state.crossfadeProgress < 1) requestAnimationFrame(step);
      else {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        state.activeAudio = nextIndex;
        state.crossfadeProgress = null;
        applyAudioVolumes();
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

function applyAudioVolumes() {
  if (state.crossfadeProgress === null) {
    audioTracks.forEach((audio, index) => {
      audio.volume = index === state.activeAudio ? state.volume : 0;
    });
    return;
  }
  const oldIndex = state.activeAudio;
  const nextIndex = oldIndex === 0 ? 1 : 0;
  audioTracks[oldIndex].volume = state.volume * Math.cos(state.crossfadeProgress * Math.PI * 0.5);
  audioTracks[nextIndex].volume = state.volume * Math.sin(state.crossfadeProgress * Math.PI * 0.5);
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
  dom.playerExpandedElements.replaceChildren(...scene.layers.slice(0, 5).map((layer) => {
    const span = document.createElement("span");
    span.textContent = layer.name;
    return span;
  }));
  dom.playerIdentityButton.setAttribute("aria-label", state.playerExpanded
    ? `收起播放器，当前是${scene.name}`
    : `展开播放器，当前是${scene.name}`);
  renderLayerList();
}

function renderFeaturedScene() {
  const scene = state.featuredScene;
  dom.homeGuideCover.src = scene.cover;
  dom.featuredImage.src = scene.hero;
  dom.featuredTitle.textContent = scene.name;
  dom.featuredDescription.textContent = scene.description;
  dom.featuredElements.textContent = scene.layers.slice(0, 3).map((layer) => layer.name).join(" · ");
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
  button.setAttribute("aria-label", `${scene.name}，${scene.description}`);
  button.innerHTML = `<span class="scene-card-media"><img src="${scene.cover}" alt="" loading="eager"></span><strong>${scene.name}</strong><small>${scene.layers.slice(0, 4).map((layer) => layer.name).join(" · ")}</small>`;
  return button;
}

function renderLayerList() {
  dom.layerList.replaceChildren(...state.currentScene.layers.map((layer, index) => {
    const available = Boolean(layer.audio);
    const row = document.createElement("article");
    row.className = "layer-row";
    row.dataset.layerId = layer.id;
    row.dataset.muted = String(layer.muted);
    row.dataset.available = String(available);
    row.innerHTML = `
      <div class="layer-identity">
        <span class="layer-swatch" style="background-image: url(${JSON.stringify(state.currentScene.cover)})" aria-hidden="true"></span>
        <span class="layer-name"><strong>${layer.name}</strong><small>${layer.detail}</small></span>
      </div>
      <input type="range" min="0" max="100" value="${layer.level}" aria-label="${available ? `${layer.name}存在感` : `${layer.name}音频引擎待接入`}" data-layer-level ${available ? "" : "disabled"}>
      <span class="layer-value">${available ? `${layer.level}%` : "待接入"}</span>
      <button class="layer-toggle" type="button" data-layer-toggle aria-pressed="${String(!layer.muted)}" aria-label="${available ? `${layer.muted ? "开启" : "关闭"}${layer.name}` : `${layer.name}音频引擎待接入`}" title="${available ? `${layer.muted ? "开启" : "关闭"}${layer.name}` : "音频引擎待接入"}" ${available ? "" : "disabled"}>
        <i data-lucide="${layer.muted ? "eye-off" : "eye"}" aria-hidden="true"></i>
      </button>`;
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
  row.querySelector(".layer-value").textContent = `${layer.level}%`;
  if (layer.audio) layer.audio.volume = layer.muted ? 0 : state.volume * (layer.level / 100) * 0.55;
}

function handleLayerToggle(event) {
  const button = event.target.closest("[data-layer-toggle]");
  if (!button) return;
  const row = button.closest("[data-layer-id]");
  const layer = state.currentScene.layers.find((item) => item.id === row.dataset.layerId);
  if (!layer) return;
  layer.muted = !layer.muted;
  if (layer.audio) {
    if (layer.muted) layer.audio.pause();
    else if (state.playing) playUploadedLayers(state.currentScene);
  }
  renderLayerList();
}

function addLayer(name, audio = null) {
  if (state.currentScene.layers.some((layer) => layer.name === name)) {
    showToast(`「${name}」已经在当前声景中`);
    return;
  }
  const layer = {
    id: `${name}-${Date.now()}`,
    name,
    detail: audio ? "本地音频 · 当前会话" : "素材预设 · 待接入",
    level: 56,
    muted: false,
    audio,
  };
  state.currentScene.layers.push(layer);
  renderCurrentScene();
  renderCollections();
  if (audio && state.playing) playUploadedLayers(state.currentScene);
  showToast(`已把「${name}」加入${state.currentScene.name}`);
}

function renderSourceList(category) {
  const sources = sourceSets[category] ?? sourceSets.环境;
  dom.sourceList.innerHTML = sources.map((source) => `<button type="button" data-add-layer="${source.name}" aria-label="${source.name}，待接入" title="素材服务待接入" disabled><i data-lucide="${source.icon}" aria-hidden="true"></i><span>${source.name}</span><small>待接入</small></button>`).join("");
  renderIcons();
}

function handleAudioUpload() {
  const file = dom.audioUpload.files?.[0];
  if (!file) return;
  const audio = new Audio(URL.createObjectURL(file));
  audio.loop = true;
  audio.preload = "auto";
  const name = file.name.replace(/\.[^.]+$/, "").slice(0, 28) || "本地声音";
  addLayer(name, audio);
  dom.audioUpload.value = "";
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
    showToast("声景预演仍在后台进行，当前播放没有中断");
    return;
  }

  window.clearInterval(state.jobTimer);
  state.pendingScene = chooseScene(prompt);
  state.generatedReady = null;
  state.jobState = "running";
  state.jobProgress = 0;
  state.playingAtJobStart = state.playing;
  dom.composeButton.disabled = true;
  dom.taskToast.dataset.state = "running";
  dom.taskToast.setAttribute("aria-hidden", "false");
  dom.taskToast.inert = false;
  updateJobProgress();
  showToast("已在后台开始预演，当前声景继续播放");
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
  dom.composeButton.disabled = false;
  dom.taskToast.dataset.state = "ready";
  dom.readyCover.src = state.generatedReady.cover;
  dom.readyTitle.textContent = state.generatedReady.name;
  renderCollections();
  showToast("预演结果已经准备好，由你决定何时切换");
  syncStateMarkers();
}

function dismissReadyScene(switched = false) {
  state.jobState = "idle";
  dom.taskToast.dataset.state = "idle";
  dom.taskToast.setAttribute("aria-hidden", "true");
  dom.taskToast.inert = true;
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
  if (/列车|火车|车厢|train/.test(normalized)) return sceneById.get("night-train");
  if (/图书|书页|阅读|library/.test(normalized)) return sceneById.get("quiet-library");
  if (/庭院|夏日|蝉|courtyard|summer/.test(normalized)) return sceneById.get("summer-courtyard");
  if (/雨|雷|木屋|旅馆|温室|rain|thunder/.test(normalized)) return sceneById.get("rain-cabin");
  return sceneById.get("forest-dawn");
}

function updatePromptCount() {
  dom.promptCount.textContent = `${dom.prompt.value.length} / 180`;
}

function setPrompt(prompt, shouldFocus = true) {
  dom.prompt.value = prompt;
  updatePromptCount();
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

async function openFocusMode() {
  if (state.focusOpen || state.playerTransitioning) return;
  state.focusOpen = true;
  state.lastFocused = document.activeElement;
  dom.focusMode.classList.add("is-open");
  dom.focusMode.removeAttribute("inert");
  dom.focusMode.setAttribute("aria-hidden", "false");
  dom.focusClose.focus({ preventScroll: true });
  syncBackgroundInert();

  let fieldTransition = Promise.resolve();
  if (!state.fieldStarted) {
    state.fieldStarted = true;
    field.setControls({ intensity: state.intensity, richness: state.richness });
    field.setPlaying(state.playing);
    fieldTransition = field.start(state.currentScene);
  } else {
    field.resize();
  }

  if (prefersReducedMotion) {
    dom.focusMode.style.opacity = "1";
  } else {
    focusTransition?.kill();
    const originClip = getArtworkClipPath();
    gsap.set(dom.focusMode, {
      opacity: 1,
      visibility: "visible",
      clipPath: originClip,
    });
    gsap.set([dom.focusHeader, dom.focusCopy, dom.focusPlayer], { opacity: 0 });
    focusTransition = gsap.timeline({
      defaults: { overwrite: "auto" },
      onComplete: () => {
        focusTransition = null;
        gsap.set(dom.focusMode, { clearProps: "clip-path" });
      },
    });
    focusTransition
      .to(dom.focusMode, {
        clipPath: "inset(0px 0px 0px 0px round 0px)",
        duration: 0.76,
        ease: "expo.inOut",
      }, 0)
      .fromTo(dom.focusStatic,
        { scale: 1.08, filter: "blur(4px)" },
        { scale: 1.01, filter: "blur(0px)", duration: 1.05, ease: "expo.out" }, 0)
      .fromTo(dom.focusHeader,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.44, ease: "expo.out" }, 0.38)
      .fromTo(dom.focusCopy,
        { opacity: 0, y: 22, filter: "blur(3px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.62, ease: "expo.out" }, 0.34)
      .fromTo(dom.focusPlayer,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.48, ease: "expo.out" }, 0.48);
  }
  syncStateMarkers();
  await fieldTransition;
}

function closeFocusMode() {
  if (!state.focusOpen) return;
  const finish = () => {
    state.focusOpen = false;
    dom.focusMode.classList.remove("is-open");
    dom.focusMode.setAttribute("aria-hidden", "true");
    dom.focusMode.setAttribute("inert", "");
    dom.focusMode.style.opacity = "";
    gsap.set([
      dom.focusMode,
      dom.focusStatic,
      dom.focusHeader,
      dom.focusCopy,
      dom.focusPlayer,
    ], { clearProps: "transform,opacity,filter,clip-path,visibility" });
    syncBackgroundInert();
    state.lastFocused?.focus?.({ preventScroll: true });
    syncStateMarkers();
  };

  if (prefersReducedMotion) finish();
  else {
    focusTransition?.kill();
    const destinationClip = getArtworkClipPath();
    focusTransition = gsap.timeline({
      defaults: { overwrite: "auto" },
      onComplete: () => {
        focusTransition = null;
        finish();
      },
    });
    focusTransition
      .to([dom.focusHeader, dom.focusCopy, dom.focusPlayer], {
        opacity: 0,
        y: 8,
        duration: 0.2,
        ease: "power2.out",
      }, 0)
      .to(dom.focusMode, {
        clipPath: destinationClip,
        duration: 0.52,
        ease: "power3.inOut",
      }, 0.08)
      .to(dom.focusStatic, { scale: 1.055, duration: 0.52, ease: "power3.inOut" }, 0.08);
  }
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

function preloadScenes() {
  scenes.forEach((scene) => {
    preloadImage(scene.hero);
    preloadImage(scene.cover);
  });
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
      AudioLines,
      ChevronDown,
      CloudRain,
      Compass,
      Eye,
      EyeOff,
      Flame,
      House,
      Library,
      Maximize2,
      Pause,
      Play,
      Plus,
      Radio,
      Settings,
      Shuffle,
      Timer,
      Upload,
      Volume2,
      X,
    },
  });
}

function syncStateMarkers() {
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
  dom.shell.dataset.playerState = state.playerExpanded ? "expanded" : "collapsed";
  dom.shell.dataset.sleepMenuOpen = String(state.sleepMenuOpen);
  dom.shell.dataset.volumePopoverOpen = String(state.volumePopoverOpen);
  dom.shell.dataset.sleepTimerMinutes = String(state.sleepTimerMinutes);
}

function tween(targets, vars) {
  return new Promise((resolve) => gsap.to(targets, { ...vars, onComplete: resolve }));
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
      switching: state.switching,
      playerTransitioning: state.playerTransitioning,
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

boot();
