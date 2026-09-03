import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const office = readFileSync(resolve(here, "../../components/Office.tsx"), "utf8");

describe("office shell regressions", () => {
  it("does not reference the removed skip-week callback", () => {
    expect(office).not.toContain("onSkipWeek={onSkipWeek}");
  });
  it("wires live rush crunch into the Projects board", () => {
    expect(office).toContain("onRushCrunch={onRushCrunch}");
  });
  it("uses the compact five-action management dock", () => {
    expect(office).toContain("grid-cols-5");
    expect(office).toContain('setModal("more")');
  });
});
