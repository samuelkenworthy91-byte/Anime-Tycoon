import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import StudioSlate from "../../components/StudioSlate";
import { initialRun, type RunState } from "../state";

describe("StudioSlate save compatibility", () => {
  it("opens Work without crashing when optional/newer collections are absent", () => {
    const fresh = initialRun("Legacy Work Save", "steady");
    const legacy = {
      ...fresh,
      ipMarket: undefined,
      contractJobs: undefined,
      trainingJobs: undefined,
      researchJobs: undefined,
      slatePlans: undefined,
    } as unknown as RunState;

    expect(() => renderToStaticMarkup(createElement(StudioSlate, {
      run: legacy,
      setRun: () => {},
      onOriginal: () => {},
    }))).not.toThrow();
  });
});
