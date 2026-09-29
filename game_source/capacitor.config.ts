import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kirameki.arcballplaytest",
  appName: "Anime Runner Arcball",
  webDir: "dist",
  android: {
    allowMixedContent: true,
    /* shrink the webview below the status bar / navigation bar so the HUD
       (pause button, top bar) is never hidden behind the phone's system UI */
    adjustMarginsForEdgeToEdge: "force",
  },
};

export default config;
