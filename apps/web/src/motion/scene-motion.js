import { gsap } from "gsap";
import { MOTION } from "./tokens.js";

export function createSceneMotion({ isReducedMotion }) {
  let timeline = null;
  let outgoingLayers = [];

  async function swap({ artworkTargets, copyTargets, atmosphere, update }) {
    stop();
    if (isReducedMotion()) {
      update();
      return;
    }

    outgoingLayers = artworkTargets.filter(isVisiblyRendered).map(createFixedClone).filter(Boolean);
    update();

    gsap.set(artworkTargets, { autoAlpha: 0, scale: 1.018 });
    gsap.set(copyTargets, { autoAlpha: 0.58, y: 5 });
    if (atmosphere) gsap.set(atmosphere, { opacity: 0, scale: 1.045 });

    await new Promise((resolve) => {
      timeline = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          outgoingLayers.forEach((layer) => layer.remove());
          outgoingLayers = [];
          gsap.set([...artworkTargets, ...copyTargets, atmosphere].filter(Boolean), {
            clearProps: "opacity,visibility,transform,will-change",
          });
          timeline = null;
          resolve();
        },
      });
      timeline
        .to(
          outgoingLayers,
          {
            autoAlpha: 0,
            scale: 0.986,
            duration: MOTION.duration.scene,
            ease: MOTION.ease.direct,
          },
          0,
        )
        .to(
          artworkTargets,
          {
            autoAlpha: 1,
            scale: 1,
            duration: MOTION.duration.scene,
            ease: MOTION.ease.enter,
          },
          0.03,
        )
        .to(
          copyTargets,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.025,
            ease: MOTION.ease.enter,
          },
          0.08,
        );
      if (atmosphere) {
        timeline.to(
          atmosphere,
          {
            opacity: 0.13,
            scale: 1.025,
            duration: MOTION.duration.scene + 0.12,
            ease: MOTION.ease.enter,
          },
          0.02,
        );
      }
    });
  }

  function stop() {
    timeline?.kill();
    timeline = null;
    outgoingLayers.forEach((layer) => layer.remove());
    outgoingLayers = [];
  }

  function destroy() {
    stop();
  }

  return { destroy, swap };
}

function isVisiblyRendered(element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return (
    rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none"
  );
}

function createFixedClone(source) {
  const rect = source.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const clone = document.createElement("img");
  clone.className = "scene-transition-layer";
  clone.src = source.currentSrc || source.src;
  clone.alt = "";
  Object.assign(clone.style, {
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    borderRadius: getComputedStyle(source).borderRadius,
  });
  document.body.append(clone);
  return clone;
}
