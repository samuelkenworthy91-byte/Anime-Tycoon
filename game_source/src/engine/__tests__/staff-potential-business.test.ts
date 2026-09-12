import { describe, expect, it } from "vitest";
import { initialRun, showSaleOffers, sellReadyProject, franchiseSaleOffer, sellFranchiseRights } from "../state";
import { growthForLevel, potentialForId, potentialOf, gainXp, XP_LEVELS } from "../careers";
import { commissionRightsAuction, commissionedAuctionFee } from "../ip";
import { makeProject, type Project } from "../projects";
import type { Staff } from "../data";

const worker=(id:string,potential:number,role:Staff["role"]="writer"):Staff=>({id,name:id,role,story:50,art:30,sound:30,level:1,salary:100,cost:0,stamina:100,portrait:0,xp:0,potential});

describe("hidden staff potential",()=>{
  it("assigns stable 1..100 potential",()=>{const a=potentialForId("stable-person");expect(a).toBeGreaterThanOrEqual(1);expect(a).toBeLessThanOrEqual(100);expect(potentialForId("stable-person")).toBe(a);});
  it("makes elite growth dramatically larger than low-potential growth",()=>{let low=0,high=0;for(let level=2;level<=60;level++){const l=growthForLevel(worker("low",10),level);const h=growthForLevel(worker("high",98),level);low+=l.story+l.art+l.sound;high+=h.story+h.art+h.sound;}expect(high).toBeGreaterThan(low*4);});
  it("queues an exact durable reveal when XP crosses a level",()=>{const s=worker("queue",88);const out=gainXp(s,XP_LEVELS[1]+1);expect(out.levelsGained).toBe(1);expect(out.staff.pendingLevelUps).toHaveLength(1);expect(out.staff.pendingLevelUps![0].afterLevel).toBe(2);expect(Object.keys(out.staff.pendingLevelUps![0])).not.toContain("potential");expect(potentialOf(out.staff)).toBe(88);});
});

describe("business ownership choices",()=>{
  it("charges a major fee for commissioning an auction",()=>{const r={...initialRun("A","steady"),cash:20_000_000,officeLevel:3,showsMade:20,awards:2,bestScore:34,fans:50_000};const fee=commissionedAuctionFee(r);const out=commissionRightsAuction(r,()=>0.1);expect(fee).toBeGreaterThanOrEqual(4_000_000);expect(out).not.toBeNull();expect(out!.market.pendingPromptId).toBe(out!.auction.id);});
  it("creates deterministic network and rival buyout offers for a ready original",()=>{let r={...initialRun("A","steady"),cash:5_000_000,bestScore:28};const d={title:"Sell Me",medium:"fanweb" as const,budget:"standard" as const,scope:"standard" as const,slot:"web" as const,animeType:"shonen" as const,genres:["slice" as const],audience:"teens" as const,protag:"cv3_protag_001",protagName:"Lead",secondary:"cv3_secondary_001",pet:"cv3_pet_001",villain:"cv3_villain_001",arcs:["hook","quiet","finale"],sliders:[50,50,50] as [number,number,number],season:1};let p=makeProject(d,0);p={...p,stage:"ready",points:{story:120,art:110,sound:100},hype:60,spent:120_000} as Project;r={...r,projects:[p]};const a=showSaleOffers(r,p.id);const b=showSaleOffers(r,p.id);expect(a.length).toBeGreaterThanOrEqual(2);expect(a).toEqual(b);expect(a.some(x=>x.buyerType==="network")).toBe(true);expect(a.some(x=>x.buyerType==="rival")).toBe(true);});
  it("values a successful franchise sale and permanently marks ownership",()=>{const r=initialRun("A","steady");const fr={key:"Hit",baseTitle:"Hit",genres:["slice" as const],animeType:"shonen" as const,audience:"teens" as const,cast:[],createdWeek:0,entries:[{kind:"original" as const,title:"Hit",score:34,revenue:2_000_000,fans:30_000,week:0,hallOfFame:true}],season:1,totalRevenue:2_000_000,lifetimeFans:30_000,bestScore:34,lastScore:34,lastEntryWeek:0,popularity:80,fatigue:10,merchValue:200_000,cult:false,merchCooldown:{},alive:true};const rich={...r,franchises:{Hit:fr}};const offer=franchiseSaleOffer(rich,"Hit");expect(offer).not.toBeNull();const sold=sellFranchiseRights(rich,"Hit");expect(sold!.cash).toBe(rich.cash+offer!.price);expect(sold!.franchises.Hit.soldTo?.name).toBe(offer!.buyerName);});
});
