import { gsap } from "gsap";
import { MOTION } from "./tokens.js";

export function createFocusMotion({ elements, isReducedMotion, onOpened, onClosed }) {
  let timeline = null;
  let chromeVisible = true;

  function build() {
    timeline?.revert();
    timeline = gsap.timeline({ paused: true });
    timeline
      .fromTo(elements.mode,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: MOTION.duration.focus * 0.72,
          ease: "power2.out",
          immediateRender: false,
        }, 0)
      .fromTo(elements.static,
        { scale: 1.018 },
        {
          scale: 1.008,
          duration: MOTION.duration.focus,
          ease: MOTION.ease.enter,
          immediateRender: false,
        }, 0)
      .fromTo(elements.header,
        { autoAlpha: 0, y: -6 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.3,
          ease: MOTION.ease.enter,
          immediateRender: false,
        }, 0.16)
      .fromTo(elements.copy,
        { autoAlpha: 0, y: 8 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.38,
          ease: MOTION.ease.enter,
          immediateRender: false,
        }, 0.14);

    timeline.eventCallback("onComplete", () => {
      clearTransientHints();
      onOpened();
    });
    timeline.eventCallback("onReverseComplete", () => {
      clearTransientHints();
      onClosed();
      resetStyles();
    });
  }

  function open() {
    if (isReducedMotion()) {
      gsap.set(elements.mode, { autoAlpha: 1 });
      gsap.set([elements.header, elements.copy, elements.player, elements.control], { autoAlpha: 1, y: 0 });
      onOpened();
      return;
    }
    if (!timeline || timeline.progress() === 0) build();
    setTransientHints();
    timeline.timeScale(1).play();
  }

  function close() {
    if (isReducedMotion() || !timeline) {
      onClosed();
      resetStyles();
      return;
    }
    setTransientHints();
    timeline.timeScale(1.12).reverse();
  }

  function settle(opened) {
    if (opened) {
      if (!timeline) build();
      timeline.progress(1, true).pause();
      onOpened();
    } else {
      timeline?.progress(0, true).pause();
      onClosed();
      resetStyles();
    }
    clearTransientHints();
  }

  function setChromeVisible(visible, { immediate = false } = {}) {
    if (chromeVisible === visible && !immediate) return;
    chromeVisible = visible;
    const topTargets = [elements.header, elements.control];
    const targets = [...topTargets, elements.player];
    gsap.killTweensOf(targets);
    gsap.set(targets, { pointerEvents: visible ? "auto" : "none" });

    if (immediate || isReducedMotion()) {
      gsap.set(topTargets, { autoAlpha: visible ? 1 : 0, y: visible ? 0 : -6 });
      gsap.set(elements.player, { autoAlpha: visible ? 1 : 0, y: visible ? 0 : 6 });
      return;
    }

    gsap.to(topTargets, {
      autoAlpha: visible ? 1 : 0,
      y: visible ? 0 : -6,
      duration: visible ? 0.26 : 0.3,
      ease: visible ? MOTION.ease.enter : "power2.inOut",
      overwrite: "auto",
    });
    gsap.to(elements.player, {
      autoAlpha: visible ? 1 : 0,
      y: visible ? 0 : 6,
      duration: visible ? 0.28 : 0.32,
      ease: visible ? MOTION.ease.enter : "power2.inOut",
      overwrite: "auto",
    });
  }

  function setTransientHints() {
    gsap.set(elements.mode, { willChange: "opacity" });
    gsap.set(elements.static, { willChange: "transform" });
  }

  function clearTransientHints() {
    gsap.set([elements.mode, elements.static], { clearProps: "will-change" });
  }

  function resetStyles() {
    chromeVisible = true;
    gsap.set(elements.mode, { clearProps: "opacity,visibility,will-change" });
    gsap.set(elements.static, { clearProps: "transform,will-change" });
    gsap.set([elements.header, elements.copy, elements.player, elements.control], {
      clearProps: "opacity,visibility,transform,pointer-events",
    });
  }

  function destroy() {
    gsap.killTweensOf([elements.header, elements.player, elements.control]);
    timeline?.revert();
    timeline = null;
  }

  return { close, destroy, open, setChromeVisible, settle };
}
