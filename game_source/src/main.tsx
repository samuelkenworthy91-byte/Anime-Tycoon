import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./mobile-layout.css";
import App from "./App";

/*
 * The forecast is rendered by Office inside the compact HUD. Android WebView
 * treats that HUD as a containing block because of its blur/transform stack,
 * so even fixed/100vw descendants can be clipped to roughly half the phone.
 *
 * Rather than moving React-owned DOM nodes (which can break reconciliation),
 * mirror the read-only forecast card into a body-level overlay whenever it is
 * open. The original remains in React's tree but is hidden. Tapping the mirror
 * programmatically clicks the existing forecast button, so React closes the
 * original normally and the mirror disappears on the next mutation.
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

      overlay = document.createElement("div");
      overlay.className = "forecast-screen";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", "Next week's financial forecast");

      const card = sourcePanel.cloneNode(true) as HTMLElement;
      card.classList.add("forecast-screen-card");
      card.removeAttribute("style");
      overlay.appendChild(card);

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
