/**
 * Safe-area insets, and a fallback for the platforms that never report them.
 *
 * iOS Safari fills `env(safe-area-inset-*)` in properly, so on an iPhone the
 * stylesheet can do this whole job on its own. Android's WebView — including
 * the one Capacitor ships — usually reports 0 for every side, even though
 * modern Android draws the app edge-to-edge underneath the status bar and the
 * gesture bar. Nothing in the platform will tell us how tall those bars are,
 * so when the platform reports nothing on something that looks like a phone we
 * fall back to a value that clears a typical one. The pause menu's SCREEN FIT
 * control then lets the player push further if their device needs more.
 */

/** A typical Android status bar, in CSS pixels. Enough for a cutout, not a notch. */
const STATUS_BAR = 28;
/** The gesture/navigation bar along the bottom. */
const NAV_BAR = 20;

/** What the browser itself says about one edge, via a throwaway probe element. */
function measure(side: "top" | "bottom"): number {
  if (typeof document === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.cssText = [
    "position:fixed",
    "left:0",
    "width:0",
    "pointer-events:none",
    "visibility:hidden",
    side === "top" ? "top:0" : "bottom:0",
    `height:env(safe-area-inset-${side},0px)`,
  ].join(";");
  document.body.appendChild(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return h || 0;
}

/** Coarse pointer and a narrow short edge — a phone, not a desktop or a tablet. */
function looksLikePhone(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const shortEdge = Math.min(window.innerWidth, window.innerHeight);
  return coarse && shortEdge > 0 && shortEdge <= 540;
}

export interface SafeInset {
  /** extra top inset to add, in px, because the platform reported nothing */
  top: number;
  /** extra bottom inset to add, in px */
  bottom: number;
  /** what the browser reported for the top, in px */
  reported: number;
}

/**
 * Work out how much the platform is hiding from us and publish it as
 * `--auto-top` / `--auto-bottom`. Cheap enough to re-run on a rotation.
 */
export function applySafeAreaFallback(): SafeInset {
  const empty: SafeInset = { top: 0, bottom: 0, reported: 0 };
  if (typeof document === "undefined") return empty;

  const reportedTop = measure("top");
  const reportedBottom = measure("bottom");

  /* Trust the platform when it actually says something. Overriding a real
     inset would push the interface twice as far down as it needs to go. */
  if (reportedTop >= 8 || reportedBottom >= 8 || !looksLikePhone()) {
    document.documentElement.style.setProperty("--auto-top", "0px");
    document.documentElement.style.setProperty("--auto-bottom", "0px");
    return { top: 0, bottom: 0, reported: reportedTop };
  }

  document.documentElement.style.setProperty("--auto-top", `${STATUS_BAR}px`);
  document.documentElement.style.setProperty("--auto-bottom", `${NAV_BAR}px`);
  return { top: STATUS_BAR, bottom: NAV_BAR, reported: reportedTop };
}
