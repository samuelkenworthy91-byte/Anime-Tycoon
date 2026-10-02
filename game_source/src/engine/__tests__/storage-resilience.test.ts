import { beforeEach, describe, expect, it } from "vitest";
import {
  SAVE_VERSION,
  exportSlot,
  importSlot,
  loadSlot,
  saveRecoveryCount,
  saveSlotDetailed,
  type SaveData,
} from "../storage";

class MemoryStorage {
  private data = new Map<string,string>();
  get length(){ return this.data.size; }
  clear(){ this.data.clear(); }
  getItem(key:string){ return this.data.get(key) ?? null; }
  key(index:number){ return [...this.data.keys()][index] ?? null; }
  removeItem(key:string){ this.data.delete(key); }
  setItem(key:string,value:string){ this.data.set(key,String(value)); }
}

const sample = (week:number): SaveData => ({
  run: { studio:"Recovery House", week, projects:[], notices:[] },
  meta: { studio:"Recovery House", showrunner:"steady" },
  clock: { day:0, phase:0, acc:0, dayCount:0 },
  summary: { studio:"Recovery House", week, cash:123456, fans:7890, shows:week, officeLevel:1 },
});

describe("resilient storage", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis,"localStorage",{value:new MemoryStorage(),configurable:true});
  });

  it("rotates two valid recovery snapshots behind every slot", () => {
    expect(saveSlotDetailed("auto",sample(1)).ok).toBe(true);
    expect(saveSlotDetailed("auto",sample(2)).ok).toBe(true);
    expect(saveSlotDetailed("auto",sample(3)).ok).toBe(true);
    expect(loadSlot("auto")?.summary.week).toBe(3);
    expect(saveRecoveryCount("auto")).toBe(2);
  });

  it("falls back to the newest recovery when the primary is corrupt", () => {
    saveSlotDetailed("1",sample(7));
    saveSlotDetailed("1",sample(8));
    localStorage.setItem(`kirameki.save.v${SAVE_VERSION}.1`,"{not-json");
    const recovered=loadSlot("1");
    expect(recovered?.summary.week).toBe(7);
    expect(recovered?.recoveredFrom).toBe("backup1");
  });

  it("exports and imports a portable manual career", () => {
    saveSlotDetailed("1",sample(12));
    const raw=exportSlot("1");
    expect(raw).toContain("Recovery House");
    expect(importSlot("2",raw!)).toEqual({ok:true});
    expect(loadSlot("2")?.summary.week).toBe(12);
  });

  it("accepts a structurally valid migratable v5 envelope for state migration", () => {
    const old={...sample(4),v:5,savedAt:100};
    localStorage.setItem("kirameki.save.v5.3",JSON.stringify(old));
    const loaded=loadSlot("3");
    expect(loaded?.v).toBe(5);
    expect(loaded?.recoveredFrom).toBe("legacy-version");
  });
});
