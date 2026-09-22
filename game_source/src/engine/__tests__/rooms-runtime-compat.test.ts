import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { initialRun, migrateRun } from "../state";
import { facilityUpkeep, slotsUsed } from "../facilities";
import { productionCapabilities } from "../spending";

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

describe("Rooms runtime compatibility", () => {
  it("repairs malformed later-career facilities and strategic-spend history", async () => {
    installBrowserStorage();
    const raw: any = initialRun("Rooms Recovery", "steady");
    raw.week = 173;
    raw.facilities = { writers: 99, animation: 2, obsolete_room: 1, recording: -4 };
    raw.strategicSpend = [
      null,
      { id: "bad-no-label", amount: 45000, week: 100 },
      { id: "bad-label", label: null, amount: 20000, week: 101 },
      { id: "bad-amount", label: "Extra Animation Pass", amount: "65000", week: 102 },
      { id: "good", label: "Extra Animation Pass · Prestige", amount: 500000, week: 103 },
    ];

    const run = migrateRun(raw);
    expect(run.facilities.writers).toBe(3);
    expect(run.facilities.animation).toBe(2);
    expect((run.facilities as any).obsolete_room).toBeUndefined();
    expect(run.facilities.recording).toBeUndefined();
    expect(slotsUsed(run.facilities)).toBe(2);
    expect(Number.isFinite(facilityUpkeep(run.facilities))).toBe(true);
    expect(productionCapabilities(run).find((x) => x.id === "animation")?.spend).toBe(500000);

    const { default: FacilitiesPanel } = await import("../../components/Facilities");
    expect(() => renderToStaticMarkup(createElement(FacilitiesPanel, { run, onBuy: () => {} }))).not.toThrow();
  });

  it("does not crash capability history when handed malformed entries before migration", () => {
    const run: any = initialRun("Raw Recovery", "steady");
    run.strategicSpend = [null, {}, { label: undefined, amount: 1000 }, { label: "Writing Room Overhaul", amount: NaN }];
    expect(() => productionCapabilities(run)).not.toThrow();
  });
});
