import { gsap } from "gsap";
import { MOTION } from "./tokens.js";

const FULL_CLIP = "inset(0px 0px 0px 0px round 0px)";

export function createFocusMotion({ elements, isReducedMotion, getOriginClip, onOpened, onClosed }) {
  let timeline = null;

  function build() {
    timeline?.revert();
    timeline = gsap.timeline({ paused: true });
    timeline
      .fromTo(elements.mode,
        { clipPath: getOriginClip(), autoAlpha: 1 },
        {
          clipPath: FULL_CLIP,
          autoAlpha: 1,
          duration: MOTION.duration.focus,
          ease: "expo.inOut",
          easeReverse: "power3.in",
          immediateRender: false,
        }, 0)
      .fromTo(elements.static,
        { scale: 1.045 },
        {
          scale: 1.008,
          duration: MOTION.duration.focus + 0.18,
          ease: MOTION.ease.enter,
          easeReverse: MOTION.ease.exit,
          immediateRender: false,
        }, 0)
      .fromTo(elements.header,
        { autoAlpha: 0, y: -8 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.34,
          ease: MOTION.ease.enter,
          easeReverse: MOTION.ease.exit,
          immediateRender: false,
        }, 0.28)
      .fromTo(elements.copy,
        { autoAlpha: 0, y: 14 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.44,
          ease: MOTION.ease.enter,
          easeReverse: MOTION.ease.exit,
          immediateRender: false,
        }, 0.24)
      .fromTo(elements.player,
        { autoAlpha: 0, y: 10 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.36,
          ease: MOTION.ease.enter,
          easeReverse: MOTION.ease.exit,
          immediateRender: false,
        }, 0.36);

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
      gsap.set(elements.mode, { autoAlpha: 1, clipPath: FULL_CLIP });
      gsap.set([elements.header, elements.copy, elements.player], { autoAlpha: 1, y: 0 });
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
    timeline.timeScale(1.14).reverse();
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

  function setTransientHints() {
    gsap.set(elements.mode, { willChange: "clip-path, opacity" });
    gsap.set(elements.static, { willChange: "transform" });
  }

  function clearTransientHints() {
    gsap.set([elements.mode, elements.static], { clearProps: "will-change" });
  }

  function resetStyles() {
    gsap.set(elements.mode, { clearProps: "opacity,visibility,clip-path,will-change" });
    gsap.set(elements.static, { clearProps: "transform,will-change" });
    gsap.set([elements.header, elements.copy, elements.player], {
      clearProps: "opacity,visibility,transform",
    });
  }

  function destroy() {
    timeline?.revert();
    timeline = null;
  }

  return { close, destroy, open, settle };
}
