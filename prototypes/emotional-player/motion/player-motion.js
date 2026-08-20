import { gsap } from "gsap";
import { MOTION } from "./tokens.js";

const CLOSED_Y = 100;

export function createPlayerMotion({
  elements,
  isReducedMotion,
  onTransitionStart,
  onOpened,
  onClosed,
}) {
  let activeTween = null;

  function setInitialState(expanded) {
    stopActiveTween();
    gsap.set(elements.content, {
      autoAlpha: expanded ? 1 : 0,
      yPercent: expanded ? 0 : CLOSED_Y,
    });
    clearTransientHints();
  }

  function open() {
    stopActiveTween();
    onTransitionStart(true);
    if (isReducedMotion()) {
      applyOpenState();
      onOpened();
      return;
    }

    setTransientHints();
    gsap.set(elements.content, { autoAlpha: 1 });
    activeTween = gsap.to(elements.content, {
      yPercent: 0,
      duration: MOTION.duration.player,
      ease: "power4.out",
      overwrite: "auto",
      onComplete: () => {
        activeTween = null;
        clearTransientHints();
        onOpened();
      },
    });
  }

  function close() {
    stopActiveTween();
    onTransitionStart(true);
    if (isReducedMotion()) {
      applyClosedState();
      onClosed();
      return;
    }

    setTransientHints();
    activeTween = gsap.to(elements.content, {
      yPercent: CLOSED_Y,
      duration: MOTION.duration.player * 0.84,
      ease: "power3.inOut",
      overwrite: "auto",
      onComplete: () => {
        activeTween = null;
        applyClosedState();
        clearTransientHints();
        onClosed();
      },
    });
  }

  function settle(expanded) {
    stopActiveTween();
    if (expanded) {
      applyOpenState();
      onOpened();
    } else {
      applyClosedState();
      onClosed();
    }
    clearTransientHints();
  }

  function applyOpenState() {
    gsap.set(elements.content, { autoAlpha: 1, yPercent: 0 });
  }

  function applyClosedState() {
    gsap.set(elements.content, { autoAlpha: 0, yPercent: CLOSED_Y });
  }

  function setTransientHints() {
    gsap.set(elements.content, { willChange: "transform" });
  }

  function clearTransientHints() {
    gsap.set(elements.content, { clearProps: "will-change" });
  }

  function stopActiveTween() {
    activeTween?.kill();
    activeTween = null;
  }

  function destroy() {
    stopActiveTween();
    gsap.set(elements.content, { clearProps: "opacity,transform,visibility,will-change" });
  }

  return { close, destroy, open, setInitialState, settle };
}
