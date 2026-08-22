export function preloadImage(url) {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  return image;
}

export function setSurfaceImage(element, url) {
  element.style.backgroundImage = `url(${JSON.stringify(url)})`;
}

export function clampNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, number));
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
