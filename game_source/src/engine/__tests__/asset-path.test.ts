import { describe, expect, it } from "vitest";
import { assetPath } from "../../utils/assetPath";

describe("assetPath", () => {
  it("strips site-root slashes from local public assets", () => {
    expect(assetPath("/auction-ip/poster_001.webp")).toBe("auction-ip/poster_001.webp");
    expect(assetPath("awards/stage-bg.webp")).toBe("awards/stage-bg.webp");
  });

  it("preserves external and embedded URLs", () => {
    expect(assetPath("https://example.com/a.webp")).toBe("https://example.com/a.webp");
    expect(assetPath("data:image/png;base64,abc")).toBe("data:image/png;base64,abc");
    expect(assetPath("blob:https://example.com/id")).toBe("blob:https://example.com/id");
  });
});
