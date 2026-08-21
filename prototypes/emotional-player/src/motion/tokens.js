export const MOTION = Object.freeze({
  duration: Object.freeze({
    feedback: 0.14,
    route: 0.18,
    popover: 0.2,
    player: 0.56,
    focus: 0.68,
    scene: 0.52,
  }),
  ease: Object.freeze({
    enter: "expo.out",
    move: "power3.inOut",
    exit: "power3.in",
    direct: "power2.out",
  }),
});

export const MOTION_QUERIES = Object.freeze({
  desktop: "(min-width: 821px)",
  mobile: "(max-width: 820px)",
  finePointer: "(hover: hover) and (pointer: fine)",
  reduceMotion: "(prefers-reduced-motion: reduce)",
});
