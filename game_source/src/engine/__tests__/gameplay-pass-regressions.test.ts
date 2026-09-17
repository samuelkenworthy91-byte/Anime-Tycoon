import { describe, expect, it } from "vitest";
import { createFranchise, franchiseBoost, merchValueOf } from "../franchise";
import { shapeRivalScore } from "../rivals";
import { PETS, PROTAGONISTS, SECONDARY, VILLAINS, type Draft } from "../data";

const draft = (licensedIpId?: string): Draft => ({ title: "Licensed Crown", medium: "tv", budget: "standard", scope: "standard", slot: "prime", animeType: "shonen", genres: ["fantasy", "mecha"], audience: "teens", protag: PROTAGONISTS[0].id, protagName: PROTAGONISTS[0].name, secondary: SECONDARY[0].id, pet: PETS[0].id, villain: VILLAINS[0].id, arcs: ["hook", "finale"], sliders: [50,50,50], season: 1, ...(licensedIpId ? { licensedIpId, licensedArcId: `${licensedIpId}_opening`, licensedCharacters: ["Hero"] } : {}) });

describe("gameplay pass regressions", () => {
  it("persists licensed provenance", () => { const d=draft("ip_test"); const fr=createFranchise(d.title,d,{protag:d.protag,protagName:d.protagName,secondary:d.secondary,secondaryName:"S",pet:d.pet,petName:"P",villain:d.villain,villainName:"V"},{total:32,revenue:1_000_000,fans:20_000,hallOfFame:true},10); expect(fr.licensedIpId).toBe("ip_test"); });
  it("makes 39 a genuinely extreme rival score", () => { expect([shapeRivalScore(30),shapeRivalScore(35),shapeRivalScore(40),shapeRivalScore(45),shapeRivalScore(50),shapeRivalScore(55)]).toEqual([30,33,36,37,38,39]); });
  it("applies the Big Three commercial halo", () => { const d=draft(); d.continuation="season"; d.franchiseKey=d.title; d.season=4; const fr=createFranchise(d.title,d,{protag:d.protag,protagName:d.protagName,secondary:d.secondary,secondaryName:"S",pet:d.pet,petName:"P",villain:d.villain,villainName:"V"},{total:39,revenue:5_000_000,fans:200_000,hallOfFame:true},10); fr.popularity=100; fr.fatigue=0; const normalRevenue=franchiseBoost(fr,d); const normalMerch=merchValueOf(fr); fr.bigThree=true; expect(franchiseBoost(fr,d)).toBeGreaterThan(normalRevenue*1.35); expect(merchValueOf(fr)).toBeGreaterThan(normalMerch*1.5); });
});
