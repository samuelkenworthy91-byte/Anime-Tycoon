import { describe, expect, it } from "vitest";
import { WORKER_LOOKS, WORKER_LOOK_GENDERS, workerLookNameGender, type Staff } from "../data";
import { ensureCareer } from "../careers";
import data from "../generated/internationalNames.json";

const fileId = (sprite: string) => Number(sprite.match(/sprite-worker-(\d+)/)?.[1] ?? -1);

describe("worker sprite gender naming", () => {
  it("uses the visually reviewed gender judgement for every shipped worker look", () => {
    const expected: Record<number, "male" | "female" | "neutral"> = {
      1:"male",2:"female",3:"male",4:"female",5:"male",
      7:"female",8:"male",9:"female",10:"male",11:"female",
      12:"neutral",13:"male",14:"male",15:"female",16:"female",
      17:"female",18:"male",19:"female",20:"female",21:"male",
      22:"female",23:"male",24:"female",25:"male",26:"female",
      27:"male",28:"neutral",29:"neutral",30:"male",31:"female",
      32:"male",33:"male",34:"female",35:"female",36:"female",
      37:"male",38:"female",39:"male",40:"female",41:"male",42:"female",
      43:"female",44:"female",45:"female",46:"female",47:"female",
      48:"male",49:"male",50:"male",51:"male",52:"male",
    };
    expect(WORKER_LOOK_GENDERS).toHaveLength(WORKER_LOOKS.length);
    WORKER_LOOKS.forEach((look, index) => {
      expect(workerLookNameGender(index)).toBe(expected[fileId(look.sprite)]);
    });
  });

  it("reserves neutral names for the genuinely ambiguous sprites", () => {
    const ambiguousFiles = [12, 28, 29];
    for (const id of ambiguousFiles) {
      const index = WORKER_LOOKS.findIndex((look) => fileId(look.sprite) === id);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(workerLookNameGender(index)).toBe("neutral");
    }
  });

  it("migrates an old mismatched worker name to the sprite judgement once", () => {
    const maleLook = WORKER_LOOKS.findIndex((look) => fileId(look.sprite) === 1);
    const old: Staff = {
      id: "s42_legacy_visual_name",
      name: "Sara Smith",
      role: "writer",
      story: 30,
      art: 20,
      sound: 15,
      level: 1,
      salary: 500,
      cost: 5000,
      stamina: 100,
      portrait: 0,
      look: maleLook,
    };
    const migrated = ensureCareer(old, 0);
    expect(migrated.gender).toBe("male");
    expect(migrated.nameGenderVersion).toBe(2);
    expect(migrated.name).not.toBe(old.name);
    const first = migrated.name.slice(0, migrated.name.lastIndexOf(" "));
    expect(data.countries.some((country) => country.male.includes(first))).toBe(true);
    expect(ensureCareer(migrated, 1).name).toBe(migrated.name);
  });

  it("keeps Dante and Avril authored rather than replacing them with generated names", () => {
    const danteLook = WORKER_LOOKS.findIndex((look) => fileId(look.sprite) === 32);
    const avrilLook = WORKER_LOOKS.findIndex((look) => fileId(look.sprite) === 35);
    const base = {
      role: "writer" as const, story: 40, art: 20, sound: 20, level: 1,
      salary: 500, cost: 5000, stamina: 100, portrait: 0,
    };
    expect(ensureCareer({ ...base, id:"d", name:"Dante", look:danteLook }, 0).name).toBe("Dante");
    expect(ensureCareer({ ...base, id:"a", name:"Avril", look:avrilLook }, 0).name).toBe("Avril");
  });
});
