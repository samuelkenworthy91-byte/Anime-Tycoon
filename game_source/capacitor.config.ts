import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kirameki.studio",
  appName: "Anime Runner",
  webDir: "dist",
  android: {
    allowMixedContent: true,
  },
};

export default config;
