import { describe, it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import { ARCS, ARC_COMBOS } from "../src/engine/data";
import { ARC_CLASHES } from "../src/engine/creativeDiscovery";

const out={
  arcs: ARCS.map((a:any)=>({
    id:a.id,name:a.name,cost:a.cost,q:a.q,f:a.f,desc:a.desc,
    syn:a.syn??[],synQ:a.synQ??0,synF:a.synF??0,
    anti:a.anti??[],antiQ:a.antiQ??0,antiF:a.antiF??0,
    cast:a.cast??null,castQ:a.castQ??0,
    unlock:a.unlock??null,franchiseOnly:!!a.franchiseOnly
  })),
  combos: ARC_COMBOS.map((c:any)=>({id:c.id,name:c.name,arcs:[...c.arcs],q:c.q,f:c.f,ordered:!!c.ordered})),
  clashes: ARC_CLASHES.map((c:any)=>({id:c.id,name:c.name,arcs:[...c.arcs],q:c.q,f:c.f,ordered:!!c.ordered,adjacent:!!c.adjacent,explanation:c.explanation}))
};
writeFileSync("handbook-arc-data.json",JSON.stringify(out,null,2));
describe("handbook arc export",()=>{it("exports runtime arc graph",()=>{
 expect(out.arcs.length).toBeGreaterThan(80);
 expect(out.combos.length).toBeGreaterThan(20);
 expect(new Set(out.arcs.map((a:any)=>a.id)).size).toBe(out.arcs.length);
});});
