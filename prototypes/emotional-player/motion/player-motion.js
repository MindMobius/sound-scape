import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MOTION } from "./tokens.js";

gsap.registerPlugin(Flip, ScrollTrigger);

const OPEN_CLIP = "inset(0% 0 0 0 round 0px)";
const CLOSED_CLIP = "inset(100% 0 0 0 round 0px)";

export function createPlayerMotion({
  elements,
  isReducedMotion,
  getArtworkSource,
  onTransitionStart,
  onOpened,
  onClosed,
}) {
  const copyTargets = [
    elements.copy.querySelector(".player-status-line"),
    elements.title,
    elements.description,
    elements.elementList,
    elements.feeling,
  ].filter(Boolean);

  let scrollTimeline = null;
  let artworkFlight = null;

  const timeline = gsap.timeline({ paused: true });
  timeline
    .fromTo(elements.content,
      { clipPath: CLOSED_CLIP, autoAlpha: 0 },
      {
        clipPath: OPEN_CLIP,
        autoAlpha: 1,
        duration: MOTION.duration.player,
        ease: "expo.inOut",
        easeReverse: "power3.in",
        immediateRender: false,
      }, 0)
    .fromTo(elements.atmosphere,
      { opacity: 0, scale: 1.055 },
      {
        opacity: 0.13,
        scale: 1.025,
        duration: MOTION.duration.player + 0.16,
        ease: MOTION.ease.enter,
        easeReverse: MOTION.ease.exit,
        immediateRender: false,
      }, 0.04)
    .fromTo(elements.hero,
      { opacity: 0.34, y: 24, scale: 0.978 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: MOTION.duration.player,
        ease: MOTION.ease.enter,
        easeReverse: MOTION.ease.exit,
        immediateRender: false,
      }, 0.08)
    .fromTo(copyTargets,
      { opacity: 0, y: 13 },
      {
        opacity: 1,
        y: 0,
        duration: 0.42,
        stagger: 0.032,
        ease: MOTION.ease.enter,
        easeReverse: MOTION.ease.exit,
        immediateRender: false,
      }, 0.16)
    .fromTo(elements.scrollCue,
      { opacity: 0, y: -5 },
      {
        opacity: 1,
        y: 0,
        duration: 0.28,
        ease: MOTION.ease.direct,
        easeReverse: MOTION.ease.exit,
        immediateRender: false,
      }, 0.32)
    .fromTo(elements.collapseButton,
      { opacity: 0, y: -6 },
      {
        opacity: 1,
        y: 0,
        duration: 0.24,
        ease: MOTION.ease.enter,
        easeReverse: MOTION.ease.exit,
        immediateRender: false,
      }, 0.24);

  timeline.eventCallback("onUpdate", () => {
    onTransitionStart(timeline.isActive());
  });
  timeline.eventCallback("onComplete", () => {
    applyOpenState();
    clearTransientHints();
    initScrollMotion();
    onOpened();
  });
  timeline.eventCallback("onReverseComplete", () => {
    applyClosedState();
    clearTransientHints();
    destroyScrollMotion();
    onClosed();
  });

  function setInitialState(expanded) {
    timeline.progress(expanded ? 1 : 0, true).pause();
    if (expanded) {
      applyOpenState();
      initScrollMotion();
    } else {
      applyClosedState();
      clearTransientHints();
    }
  }

  function open() {
    destroyScrollMotion(false);
    if (isReducedMotion()) {
      stopArtworkFlight();
      timeline.progress(1).pause();
      applyOpenState();
      clearTransientHints();
      onOpened();
      return;
    }
    setTransientHints();
    flyArtwork(getArtworkSource(), elements.heroCover, Math.max(0.28, timeline.duration() - timeline.time()));
    timeline.timeScale(1).play();
  }

  function close() {
    destroyScrollMotion(false);
    if (isReducedMotion()) {
      stopArtworkFlight();
      timeline.progress(0).pause();
      applyClosedState();
      clearTransientHints();
      onClosed();
      return;
    }
    setTransientHints();
    flyArtwork(elements.heroCover, getArtworkSource(), Math.max(0.24, timeline.time() * 0.82));
    timeline.timeScale(1.16).reverse();
  }

  function settle(expanded) {
    stopArtworkFlight();
    destroyScrollMotion(false);
    timeline.progress(expanded ? 1 : 0, true).pause();
    clearTransientHints();
    if (expanded) {
      applyOpenState();
      initScrollMotion();
      onOpened();
    } else {
      applyClosedState();
      onClosed();
    }
  }

  function applyOpenState() {
    gsap.set(elements.content, { clipPath: OPEN_CLIP, autoAlpha: 1 });
    gsap.set(elements.atmosphere, { opacity: 0.13, scale: 1.025 });
    gsap.set(elements.hero, { opacity: 1, y: 0, scale: 1 });
    gsap.set(copyTargets, { opacity: 1, y: 0 });
    gsap.set(elements.scrollCue, { opacity: 1, y: 0 });
    gsap.set(elements.collapseButton, { opacity: 1, y: 0 });
  }

  function applyClosedState() {
    gsap.set(elements.content, { clipPath: CLOSED_CLIP, autoAlpha: 0 });
    gsap.set(elements.atmosphere, { opacity: 0, scale: 1.055 });
    gsap.set(elements.hero, { opacity: 0.34, y: 24, scale: 0.978 });
    gsap.set(copyTargets, { opacity: 0, y: 13 });
    gsap.set(elements.scrollCue, { opacity: 0, y: -5 });
    gsap.set(elements.collapseButton, { opacity: 0, y: -6 });
  }

  function flyArtwork(source, target, duration) {
    stopArtworkFlight();
    if (!source || !target || duration <= 0) return;
    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    if (!sourceRect.width || !sourceRect.height || !targetRect.width || !targetRect.height) return;
    if (!isInViewport(sourceRect) || !isInViewport(targetRect)) return;

    const clone = document.createElement("img");
    clone.className = "artwork-flight";
    clone.src = source.currentSrc || source.src;
    clone.alt = "";
    Object.assign(clone.style, {
      position: "fixed",
      top: `${sourceRect.top}px`,
      left: `${sourceRect.left}px`,
      width: `${sourceRect.width}px`,
      height: `${sourceRect.height}px`,
      borderRadius: getComputedStyle(source).borderRadius,
      willChange: "transform, border-radius",
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
      duration: Math.min(duration, MOTION.duration.player + 0.08),
      ease: "expo.inOut",
      easeReverse: "power3.in",
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

  function initScrollMotion() {
    destroyScrollMotion();
    if (isReducedMotion()) return;
    scrollTimeline = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: elements.detailsPanel,
        scroller: elements.scrollContainer,
        start: "top 92%",
        end: "top 34%",
        scrub: 0.12,
        invalidateOnRefresh: true,
      },
    });
    scrollTimeline
      .to(elements.hero, { y: -18, scale: 0.975, opacity: 0.62 }, 0)
      .to(elements.copy, { y: -10, opacity: 0.66 }, 0)
      .to(elements.scrollCue, { opacity: 0, y: 7 }, 0);
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }

  function destroyScrollMotion(clearStyles = true) {
    if (scrollTimeline) {
      scrollTimeline.scrollTrigger?.kill();
      scrollTimeline.kill();
      scrollTimeline = null;
    }
    if (clearStyles) {
      gsap.set([elements.hero, elements.copy, elements.scrollCue], { clearProps: "transform,opacity" });
    }
  }

  function setTransientHints() {
    gsap.set(elements.content, { willChange: "clip-path, opacity" });
    gsap.set([elements.hero, elements.atmosphere], { willChange: "transform, opacity" });
  }

  function clearTransientHints() {
    gsap.set([elements.content, elements.hero, elements.atmosphere], { clearProps: "will-change" });
  }

  function destroy() {
    stopArtworkFlight();
    destroyScrollMotion();
    timeline.revert();
  }

  return {
    close,
    destroy,
    destroyScrollMotion,
    open,
    setInitialState,
    settle,
  };
}

function isInViewport(rect) {
  return rect.bottom > 0
    && rect.right > 0
    && rect.top < window.innerHeight
    && rect.left < window.innerWidth;
}
