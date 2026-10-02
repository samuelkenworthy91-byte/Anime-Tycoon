import { describe, expect, it } from "vitest";
import { advanceFanProjects, fanProjectCapacity, franchiseFandom, startFanProject } from "../fanProjects";
import { initialRun } from "../state";

describe("fan projects", () => {
  function seeded() {
    const run = initialRun("Fan House", "steady");
    run.cash = 1_000_000;
    run.officeLevel = 2;
    run.franchises = { test: {
      key:"test",baseTitle:"Test Show",genres:["slice"],animeType:"shojo",audience:"teens",cast:[],createdWeek:0,entries:[],
      season:1,totalRevenue:0,lifetimeFans:10_000,bestScore:28,lastScore:28,lastEntryWeek:0,popularity:40,fatigue:15,
      merchValue:100_000,cult:false,merchCooldown:{},alive:true,
    }};
    run.franchiseAudienceProfiles = { test:{core:20,casual:20,online:20,prestige:20,collectors:20,dominant:"core"} };
    return run;
  }

  it("uses side-loop capacity rather than production slots", () => {
    const run=seeded();
    expect(fanProjectCapacity(run)).toBe(2);
    const out=startFanProject(run,"test","fan_art")!;
    expect(out.cash).toBeLessThan(run.cash);
    expect(out.fanProjects?.active).toHaveLength(1);
  });

  it("completion grows targeted fandom and shifts existing audience fit", () => {
    let run=startFanProject(seeded(),"test","fan_art")!;
    run=advanceFanProjects({...run,week:run.fanProjects!.active[0].endsWeek});
    expect(run.fanProjects?.active).toHaveLength(0);
    expect(run.fanProjects?.fandom.test.online).toBeGreaterThan(0);
    expect(run.franchiseAudienceProfiles?.test.online).toBeGreaterThan(20);
    expect(run.fans).toBeGreaterThan(0);
  });
});


describe("fan project approaches", () => {
  function finish(approach:"community"|"publicity"|"prestige"){
    let run=seeded();
    run=startFanProject(run,"test","fan_art",approach)!;
    const end=run.fanProjects!.active[0].endsWeek;
    return advanceFanProjects({...run,week:end});
  }

  it("trades reach against fandom depth instead of adding more project types",()=>{
    const community=finish("community");
    const publicity=finish("publicity");
    expect(publicity.fans).toBeGreaterThan(community.fans);
    expect(franchiseFandom(community,"test").online ?? 0).toBeGreaterThan(franchiseFandom(publicity,"test").online ?? 0);
  });

  it("lets a prestige approach prioritise franchise popularity",()=>{
    const community=finish("community");
    const prestige=finish("prestige");
    expect(prestige.franchises.test.popularity).toBeGreaterThan(community.franchises.test.popularity);
    expect(prestige.fanProjects?.history.at(-1)?.approach).toBe("prestige");
  });
});
