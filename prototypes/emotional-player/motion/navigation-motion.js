import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { MOTION } from "./tokens.js";

gsap.registerPlugin(Flip);

export function createNavigationMotion({ containers, isReducedMotion }) {
  const entries = containers.filter(Boolean).map((container) => {
    const indicator = document.createElement("span");
    indicator.className = "nav-active-indicator";
    indicator.setAttribute("aria-hidden", "true");
    container.querySelector("[data-view-link].is-active")?.append(indicator);
    return { container, indicator };
  });

  function select(viewName, animate = true) {
    entries.forEach(({ container, indicator }) => {
      const destination = container.querySelector(`[data-view-link="${viewName}"]`);
      if (!destination || indicator.parentElement === destination) return;
      const previous = Flip.getState(indicator);
      destination.append(indicator);
      if (!animate || isReducedMotion()) return;
      Flip.from(previous, {
        targets: indicator,
        absolute: true,
        scale: true,
        duration: MOTION.duration.route + 0.06,
        ease: MOTION.ease.enter,
        overwrite: true,
      });
    });
  }

  function enterView(view, animate = true) {
    if (!view || !animate || isReducedMotion()) return;
    gsap.fromTo(view, { autoAlpha: 0.72 }, {
      autoAlpha: 1,
      duration: MOTION.duration.route,
      ease: MOTION.ease.direct,
      overwrite: "auto",
      clearProps: "opacity,visibility",
    });
  }

  return { select, enterView };
}
