import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kirameki.studio",
  appName: "Kirameki Studio",
  webDir: "dist",
  android: {
    allowMixedContent: true,
  },
};

export default config;
