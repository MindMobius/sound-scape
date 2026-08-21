import { gsap } from "gsap";
import { MOTION_QUERIES } from "./tokens.js";

export function createMotionRuntime() {
  const conditions = {
    desktop: false,
    mobile: false,
    finePointer: false,
    reduceMotion: false,
  };
  const listeners = new Set();
  const media = gsap.matchMedia();

  media.add(MOTION_QUERIES, (context) => {
    Object.assign(conditions, context.conditions);
    document.documentElement.dataset.motion = conditions.reduceMotion ? "reduced" : "full";
    listeners.forEach((listener) => listener({ ...conditions }));
  });

  return {
    conditions: () => ({ ...conditions }),
    isReduced: () => conditions.reduceMotion,
    hasFinePointer: () => conditions.finePointer,
    subscribe(listener) {
      listeners.add(listener);
      listener({ ...conditions });
      return () => listeners.delete(listener);
    },
    destroy() {
      listeners.clear();
      media.revert();
    },
  };
}
