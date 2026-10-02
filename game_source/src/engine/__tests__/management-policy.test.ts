import { describe, expect, it } from "vitest";
import { actionCentreItems, managementPolicyOf, setManagementPolicy, shouldAutoDelegateProject, shouldPauseForRoutineCompletions } from "../management";
import { makeProject } from "../projects";
import { initialRun } from "../state";
import type { Draft } from "../data";

const draft=(scope:"standard"|"prestige"="standard",budget:"standard"|"blockbuster"="standard"):Draft=>({
  title:"Policy Test",medium:"tv",budget,scope,slot:"midnight",animeType:"shonen",genres:["sports"],audience:"teens",
  protag:"kai",secondary:"rival",pet:"cat",villain:"warlord",arcs:["hook","finale"],sliders:[50,50,50],season:1,
});

describe("mature studio management",()=>{
  it("migrates the old executive-delegation flag into a policy",()=>{
    const run={...initialRun("Policy House","steady"),executiveDelegation:true,managementPolicy:undefined};
    expect(managementPolicyOf(run).projectMode).toBe("routine-auto");
  });

  it("can protect prestige and blockbuster flagships while auto-managing routine work",()=>{
    const run=setManagementPolicy(initialRun("Policy House","steady"),{projectMode:"auto-except-prestige"});
    expect(shouldAutoDelegateProject(run,makeProject(draft(),10))).toBe(true);
    expect(shouldAutoDelegateProject(run,makeProject(draft("prestige"),10))).toBe(false);
    expect(shouldAutoDelegateProject(run,makeProject(draft("standard","blockbuster"),10))).toBe(false);
  });

  it("lets exception-only alerts stop routine completions pausing the clock",()=>{
    const run=setManagementPolicy(initialRun("Policy House","steady"),{alertMode:"exceptions"});
    expect(shouldPauseForRoutineCompletions(run)).toBe(false);
  });

  it("surfaces contextual actions instead of forcing menu hunting",()=>{
    const base=initialRun("Policy House","steady");
    const project={...makeProject(draft(),10),stage:"ready" as const};
    const run={...base,week:9*48,projects:[project],cash:-50_000};
    const items=actionCentreItems(run);
    expect(items[0].target).toBe("projects");
    expect(items.some((item)=>item.target==="contracts")).toBe(true);
    expect(items.some((item)=>item.target==="management")).toBe(true);
  });
});
