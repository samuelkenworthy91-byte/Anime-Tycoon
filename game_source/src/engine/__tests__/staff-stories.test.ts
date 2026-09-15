import {describe,it,expect} from "vitest";
import {initialRun,migrateRun} from "../state";
import type {Staff} from "../data";
import {expansionOf,advanceExpansionDay,expansionBusyReason} from "../studioExpansion";
import {resolveStaffStory,advanceStaffStories,type StaffStory} from "../staffStories";
const staff=(id:string,level=1):Staff=>({id,name:id,role:"writer",level,story:50,art:20,sound:20,salary:500,cost:5000,portrait:0,stamina:100,morale:60});
const base=()=>({...initialRun("Stories","producer"),cash:100000,staff:[staff("senior",5),staff("junior")],week:0,day:0});
const offered=(kind:StaffStory["kind"]="recognition"):StaffStory=>({id:"story",source:"promise",kind,staffIds:kind==="mentorship"?["senior","junior"]:["senior"],openedDay:0,expiresDay:28,status:"offered",title:"Opportunity",text:"Test",progress:0});
describe("staff story chains",()=>{
 it("charges a choice once and preserves it on save/load",()=>{let r=base();r={...r,expansion:{...expansionOf(r),stories:[offered()]}};const next=resolveStaffStory(r,"story","celebrate")!;expect(next.cash).toBe(94000);expect(resolveStaffStory(next,"story","celebrate")).toBeNull();expect(expansionOf(migrateRun(next)).stories![0].decision).toBe("celebrate");});
 it("follows a showcase with an eligible mentorship offer",()=>{let r=base();r={...r,expansion:{...expansionOf(r),stories:[{...offered(),status:"resolved",decision:"celebrate",nextDay:14}]},day:14};const next=advanceStaffStories(r);expect(expansionOf(next).stories!.slice(-1)[0]?.kind).toBe("mentorship");});
 it("requires eight reserved working days and cannot double tick",()=>{let r=base();r={...r,expansion:{...expansionOf(r),stories:[offered("mentorship")]}};r=resolveStaffStory(r,"story","mentor")!;expect(expansionBusyReason(r,"senior",0)).toBe("Paid mentorship");for(let day=0;day<28;day++){r=advanceExpansionDay({...r,day});expect(advanceStaffStories(r)).toBe(r);}expect(expansionOf(r).stories![0].status).toBe("resolved");expect(r.bonds["junior~senior"]).toBe(8);});
 it("archives a departed participant without substituting another employee",()=>{const r=base(),next=advanceStaffStories({...r,staff:[],expansion:{...expansionOf(r),stories:[offered("mentorship")]}});expect(expansionOf(next).stories![0].status).toBe("expired");});
 it("does not erase a broken promise during trust repair",()=>{let r=base();r={...r,expansion:{...expansionOf(r),stories:[offered("rebuild")]}};const next=resolveStaffStory(r,"story","repair")!;expect(expansionOf(next).leave.senior).toBe(7);expect(next.cash).toBe(94000);});
});
