import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./mobile-layout.css";
import App from "./App";

/*
 * Office owns the forecast state, but its original panel lives inside the
 * compact HUD. Android WebView treats that HUD as a containing block because
 * of its blur/transform stack, so descendants can be clipped to roughly half
 * the phone even when they use fixed/100vw positioning.
 *
 * Keep React's panel as the state/source of truth, but mirror only its INNER
 * CONTENT directly into document.body. We deliberately do not clone the
 * panel element itself: its Tailwind width/translate classes are exactly what
 * caused the repeated half-screen rendering on-device.
 */
function installForecastOverlayBridge() {
  let overlay: HTMLDivElement | null = null;

  const sync = () => {
    const holder = document.querySelector(".office-hud-forecast") as HTMLElement | null;
    const sourcePanel = holder?.querySelector(":scope > .anim-pop") as HTMLElement | null;
    const sourceBackdrop = holder?.querySelector(":scope > .fixed") as HTMLElement | null;

    if (sourcePanel && !overlay) {
      sourcePanel.style.visibility = "hidden";
      if (sourceBackdrop) sourceBackdrop.style.visibility = "hidden";

      const viewportWidth = Math.max(
        1,
        Math.round(window.visualViewport?.width ?? window.innerWidth ?? document.documentElement.clientWidth)
      );
      const viewportHeight = Math.max(
        1,
        Math.round(window.visualViewport?.height ?? window.innerHeight ?? document.documentElement.clientHeight)
      );
      const viewportLeft = Math.round(window.visualViewport?.offsetLeft ?? 0);
      const viewportTop = Math.round(window.visualViewport?.offsetTop ?? 0);

      overlay = document.createElement("div");
      overlay.className = "forecast-screen";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", "Next week's financial forecast");

      /* Copy only the information inside the old card. No w-72, left-1/2,
         translate or animation classes survive onto the full-screen surface. */
      overlay.innerHTML = sourcePanel.innerHTML;

      /* Use measured pixel dimensions and !important inline declarations so
         the overlay is independent of body/root/HUD percentage calculations. */
      overlay.style.setProperty("position", "fixed", "important");
      overlay.style.setProperty("left", `${viewportLeft}px`, "important");
      overlay.style.setProperty("top", `${viewportTop}px`, "important");
      overlay.style.setProperty("right", "auto", "important");
      overlay.style.setProperty("bottom", "auto", "important");
      overlay.style.setProperty("width", `${viewportWidth}px`, "important");
      overlay.style.setProperty("height", `${viewportHeight}px`, "important");
      overlay.style.setProperty("max-width", "none", "important");
      overlay.style.setProperty("max-height", "none", "important");
      overlay.style.setProperty("box-sizing", "border-box", "important");
      overlay.style.setProperty("margin", "0", "important");
      overlay.style.setProperty(
        "padding",
        "calc(env(safe-area-inset-top, 0px) + 22px) 20px calc(env(safe-area-inset-bottom, 0px) + 54px)",
        "important"
      );
      overlay.style.setProperty("overflow-y", "auto", "important");
      overlay.style.setProperty("overflow-x", "hidden", "important");
      overlay.style.setProperty("background", "#151022", "important");
      overlay.style.setProperty("z-index", "2147483000", "important");
      overlay.style.setProperty("transform", "none", "important");
      overlay.style.setProperty("animation", "none", "important");

      const hint = document.createElement("div");
      hint.className = "forecast-screen-close";
      hint.textContent = "TAP ANYWHERE TO CLOSE";
      overlay.appendChild(hint);

      overlay.addEventListener("click", () => {
        const button = holder?.querySelector(":scope > button") as HTMLButtonElement | null;
        button?.click();
      });

      document.body.appendChild(overlay);
    } else if (!sourcePanel && overlay) {
      overlay.remove();
      overlay = null;
    }
  };

  const observer = new MutationObserver(sync);
  observer.observe(document.body, { childList: true, subtree: true });
  sync();
}

installForecastOverlayBridge();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
