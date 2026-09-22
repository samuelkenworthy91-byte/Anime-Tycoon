import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import StudioSlate from "../../components/StudioSlate";
import { initialRun, type RunState } from "../state";

function installBrowserStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, String(value)); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
    },
  });
}

describe("Work / StudioSlate runtime compatibility", () => {
  it("opens Slate without crashing when optional/newer collections are absent", () => {
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

  it("renders the complete Work panel without undefined prop references", async () => {
    installBrowserStorage();
    const { default: ProjectsPanel } = await import("../../components/Projects");
    const run = initialRun("Work Runtime", "steady");
    expect(() => renderToStaticMarkup(createElement(ProjectsPanel, {
      run,
      setRun: () => {},
      onAssign: () => {},
      onMilestone: () => {},
      onShip: () => {},
      onNewShow: () => {},
      onDelegate: () => {},
      onTakeOver: () => {},
      onResume: () => {},
      onScrap: () => {},
      onContinueSeason: () => {},
      onLicensed: () => {},
      onIntervention: () => {},
      onAppointPromise: () => {},
      onAppointLead: () => {},
    }))).not.toThrow();
  });
});
