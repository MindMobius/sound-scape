import { gsap } from "gsap";
import { MOTION } from "./tokens.js";

export function createFocusMotion({ elements, isReducedMotion, onOpened, onClosed }) {
  let transition = null;
  let chromeVisible = true;

  function open() {
    stopTransition();
    if (isReducedMotion()) {
      gsap.set(elements.mode, { autoAlpha: 1 });
      onOpened();
      return;
    }

    gsap.set(elements.mode, { willChange: "opacity" });
    transition = gsap.fromTo(
      elements.mode,
      { autoAlpha: 0 },
      {
        autoAlpha: 1,
        duration: MOTION.duration.focus * 0.56,
        ease: MOTION.ease.direct,
        immediateRender: false,
        overwrite: "auto",
        onComplete: () => {
          transition = null;
          clearTransitionHint();
          onOpened();
        },
      },
    );
  }

  function close() {
    stopTransition();
    if (isReducedMotion()) {
      onClosed();
      resetStyles();
      return;
    }

    gsap.set(elements.mode, { willChange: "opacity" });
    transition = gsap.to(elements.mode, {
      autoAlpha: 0,
      duration: MOTION.duration.focus * 0.42,
      ease: MOTION.ease.exit,
      overwrite: "auto",
      onComplete: () => {
        transition = null;
        clearTransitionHint();
        onClosed();
        resetStyles();
      },
    });
  }

  function settle(opened) {
    stopTransition();
    gsap.set(elements.mode, { autoAlpha: opened ? 1 : 0 });
    if (opened) onOpened();
    else {
      onClosed();
      resetStyles();
    }
  }

  function setChromeVisible(visible, { immediate = false } = {}) {
    if (chromeVisible === visible && !immediate) return;
    chromeVisible = visible;
    const targets = [elements.header, elements.control, elements.player];
    gsap.killTweensOf(targets);
    gsap.set(targets, { pointerEvents: visible ? "auto" : "none" });

    if (immediate || isReducedMotion()) {
      gsap.set(targets, { autoAlpha: visible ? 1 : 0 });
      return;
    }

    gsap.to(targets, {
      autoAlpha: visible ? 1 : 0,
      duration: visible ? 0.18 : 0.22,
      ease: visible ? MOTION.ease.direct : "power2.inOut",
      overwrite: "auto",
    });
  }

  function stopTransition() {
    transition?.kill();
    transition = null;
  }

  function clearTransitionHint() {
    gsap.set(elements.mode, { clearProps: "will-change" });
  }

  function resetStyles() {
    chromeVisible = true;
    gsap.set(elements.mode, { clearProps: "opacity,visibility,will-change" });
    gsap.set([elements.header, elements.player, elements.control], {
      clearProps: "opacity,visibility,pointer-events",
    });
  }

  function destroy() {
    stopTransition();
    gsap.killTweensOf([elements.header, elements.player, elements.control]);
    resetStyles();
  }

  return { close, destroy, open, setChromeVisible, settle };
}
