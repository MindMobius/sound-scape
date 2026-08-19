const VARIANTS = [
  { id: "A", name: "单帧微动" },
  { id: "B", name: "光流成片" },
];

const surface = document.querySelector("#surface");
const playButton = document.querySelector("#play-button");
const motionVideo = document.querySelector("#motion-video");
const volume = document.querySelector("#volume");
const volumeOutput = document.querySelector("#volume-output");
const previousButton = document.querySelector("#previous-variant");
const nextButton = document.querySelector("#next-variant");
const variantLabel = document.querySelector("#variant-label");

let currentVariant = readVariant();
let playing = true;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

applyVariant(currentVariant, false);
syncPlayback();

previousButton.addEventListener("click", () => cycleVariant(-1));
nextButton.addEventListener("click", () => cycleVariant(1));
playButton.addEventListener("click", togglePlayback);
volume.addEventListener("input", () => {
  volumeOutput.value = volume.value;
  volumeOutput.textContent = volume.value;
});

window.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  cycleVariant(event.key === "ArrowRight" ? 1 : -1);
});
document.addEventListener("visibilitychange", syncPlayback);
reducedMotion.addEventListener("change", syncPlayback);

function cycleVariant(direction) {
  const index = VARIANTS.findIndex((variant) => variant.id === currentVariant);
  const nextIndex = (index + direction + VARIANTS.length) % VARIANTS.length;
  applyVariant(VARIANTS[nextIndex].id);
}

function applyVariant(variantId, updateHistory = true) {
  const variant = VARIANTS.find((item) => item.id === variantId) ?? VARIANTS[0];
  currentVariant = variant.id;
  document.documentElement.dataset.variant = variant.id;
  variantLabel.textContent = `${variant.id} · ${variant.name}`;

  if (updateHistory) {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", variant.id);
    window.history.replaceState({}, "", url);
  }

  syncPlayback();
}

function togglePlayback() {
  playing = !playing;
  surface.classList.toggle("is-paused", !playing);
  playButton.setAttribute("aria-label", playing ? "暂停" : "继续播放");
  playButton.title = playing ? "暂停" : "继续播放";
  syncPlayback();
}

function syncPlayback() {
  const shouldPlay =
    playing &&
    currentVariant === "B" &&
    !reducedMotion.matches &&
    document.visibilityState === "visible";

  if (shouldPlay) {
    motionVideo.play().catch(() => {});
  } else {
    motionVideo.pause();
  }
}

function readVariant() {
  const value = new URLSearchParams(window.location.search).get("variant")?.toUpperCase();
  return VARIANTS.some((variant) => variant.id === value) ? value : "A";
}
