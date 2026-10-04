import { describe, expect, it } from 'vitest';
import { ARCS, ARC_COMBOS, GENRES, TARGETED_RESEARCH_IDS, arcCombosFor, rewardedArcCombosFor } from '../data';
import { arcClashesFor } from '../creativeDiscovery';
import { createNewGamePlusRun } from '../newGamePlus';
import { IP_HIDDEN_ARC_SEEDS } from '../ipHiddenArcs';
import { targetedPool, completeTargetedStudy, targetedCost, syncTargetedMastery } from '../targetedResearch';
import { initialRun, researchBlockReason, researchProjectCost, applyResearchCompletion, advanceWeeks, startResearchProject, arcLockReason, migrateRun } from '../state';
import { AUCTION_IPS, initIPMarket, commissionRightsAuction, commissionedAuctionBlock, tickIPMarket, auctionsInYear } from '../ip';
import { initRivalWorld } from '../rivals';

const allRights=()=>{
 const r=initialRun('Story Lab','steady');r.genresUnlocked=GENRES.map(g=>g.id);r.rd=100000;
 for(const ip of AUCTION_IPS)r.ipMarket.owned[ip.id]={ipId:ip.id,acquiredWeek:0,expiresWeek:1200,purchasePrice:1,royaltyRate:.1,ownershipShare:0,sequelRights:true,merchRights:true,internationalRights:true,adaptations:0,bestScore:0,discoveredArcs:[]};
 return r;
};
describe('complete-length stories and bounded research',()=>{
 it('has 619 distinct recipes, no new arcs, and 24 full-length families',()=>{
  expect(ARCS).toHaveLength(297);expect(ARC_COMBOS).toHaveLength(619);
  expect(new Set(ARC_COMBOS.map(c=>(c.ordered?'o':'u')+(c.ordered?c.arcs:[...c.arcs].sort()).join('|'))).size).toBe(619);
  for(const n of [4,5,6])expect(ARC_COMBOS.filter(c=>c.id.startsWith('exp_family_')&&c.arcs.length===n)).toHaveLength(24);
  for(const c of ARC_COMBOS)expect(c.arcs.every(id=>ARCS.some(a=>a.id===id))).toBe(true);
  expect(ARC_COMBOS.filter(c=>c.id.startsWith('exp_')&&arcClashesFor(c.arcs).length).map(c=>c.id)).toEqual([]);
  for(const i of Array.from({length:12},(_,n)=>n+12))expect(ARC_COMBOS.find(c=>c.id===`exp_family_${i}_4`)!.arcs.some(a=>a.startsWith('ip_arc_'))).toBe(true);
  expect(ARCS.filter(a=>!ARC_COMBOS.some(c=>c.arcs.includes(a.id)))).toHaveLength(0);
 });
 it('gives every IP at least three recipes and preserves sequential payoffs',()=>{
  for(const seed of IP_HIDDEN_ARC_SEEDS)expect(ARC_COMBOS.filter(c=>c.arcs.includes(seed.id)).length).toBeGreaterThanOrEqual(3);
  const six=ARC_COMBOS.find(c=>c.id==='exp_family_2_6')!;
  expect(arcCombosFor(six.arcs).map(c=>c.id)).toContain(six.id);
  expect(arcCombosFor([...six.arcs].reverse()).map(c=>c.id)).not.toContain(six.id);
  expect(rewardedArcCombosFor(six.arcs).filter(c=>c.family===six.family).map(c=>c.id)).toEqual([six.id]);
 });
 it('masters every one of 30 genres and 435 pairs within 20 studies',()=>{
  expect(TARGETED_RESEARCH_IDS).toHaveLength(465);const failures:string[]=[];
  for(const def of TARGETED_RESEARCH_IDS){let r=allRights();for(let i=0;i<20;i++)r=completeTargetedStudy(r,def.id);const pool=targetedPool(r,def.id);
   if(pool.fits.some(k=>!r.arcGenreKnowledge[k])||pool.combos.some(k=>!r.arcCombos.includes(k))||r.targetedResearchLevels?.[def.id]!==20)failures.push(def.id);
  }expect(failures).toEqual([]);
 },60000);
 it('uses independent compounded prices, blocks pass 21 and respects licences',()=>{
  let r=allRights();const genre='study_genre_fantasy',pair='study_pair_fantasy|slice';let gs=0,ps=0;
  for(let i=0;i<20;i++){gs+=targetedCost(r,genre);ps+=targetedCost(r,pair);r=completeTargetedStudy(completeTargetedStudy(r,genre),pair);}
  expect(gs).toBe(885);expect(ps).toBe(1986);expect(researchBlockReason(r,genre)).toMatch(/^COMPLETE/);expect(researchBlockReason(r,pair)).toMatch(/^COMPLETE/);
  expect(researchBlockReason({...r,genresUnlocked:[],targetedResearchLevels:{}},genre)).toMatch(/License/);
  expect(researchProjectCost({...r,targetedResearchLevels:{}},genre)).toBe(2);
  expect(researchProjectCost({...r,showrunner:'research',targetedResearchLevels:{}},pair)).toBeLessThanOrEqual(4);
 });
 it('requires IP acquisition, then teaches usable blueprints and adds late rights at mastery',()=>{
  let r=initialRun('Rights Lab','steady');r.genresUnlocked=GENRES.map(g=>g.id);const id='study_genre_romance';
  expect(targetedPool(r,id).arcs).not.toContain('ip_arc_026');for(let i=0;i<20;i++)r=completeTargetedStudy(r,id);
  r={...r,ipMarket:{...r.ipMarket,owned:{...allRights().ipMarket.owned}}};r=syncTargetedMastery(r);
  expect(r.targetedResearchLevels?.[id]).toBe(20);expect(r.arcUnlocked).toContain('ip_arc_026');expect(r.ipMarket.studioArcs).toContain('ip_arc_026');
  expect(arcLockReason(ARCS.find(a=>a.id==='ip_arc_026')!,r)).toBeNull();expect(r.arcCombos).toContain('exp_ip_arc_026_resolution');
 });
 it('persists weekly paid completion and migration without losing existing notebooks',()=>{
  let r=allRights();r.week=0;r.day=0;const id='study_genre_romance';r=startResearchProject(r,id,32)!;
  r=advanceWeeks(r,8);expect(r.targetedResearchLevels?.[id]).toBe(1);expect(r.genreKnowledge.romance).toBeGreaterThan(0);
  const saved=migrateRun(JSON.parse(JSON.stringify(r)));
  const ng=createNewGamePlusRun(saved,'New Lab','steady');expect(ng.targetedResearchLevels?.[id]).toBe(1);expect(ng.research).toContain(id);expect(saved.targetedResearchLevels?.[id]).toBe(1);expect(saved.arcCombos).toEqual(expect.arrayContaining(r.arcCombos));
  expect(applyResearchCompletion(saved,id,'Romance').targetedResearchLevels?.[id]).toBe(2);
 });
});
describe('three yearly IP auctions, one commissioned',()=>{
 it('allows three automatic rooms and prevents a fourth until the next year',()=>{
  let market=initIPMarket(0,()=>0);let world=initRivalWorld();
  for(let week=0;week<48;week++){const out=tickIPMarket(market,{week,cash:1e9,fans:0,awards:0,bestScore:0,showsMade:0},world,()=>0);market={...out.market,pendingPromptId:null};world=out.world;}
  expect(auctionsInYear(market,0)).toBe(3);expect(market.nextAuctionWeek).toBeGreaterThanOrEqual(48);
 });
 it('counts a player commission toward the cap and keeps later random opportunities',()=>{
  const r={...allRights(),cash:1e9,week:0,ipMarket:initIPMarket(0,()=>0)};
  const first=commissionRightsAuction(r,()=>0)!;expect(first).toBeTruthy();expect(first.market.nextAuctionWeek).toBeLessThan(48);
  const next={...r,ipMarket:{...first.market,pendingPromptId:null,auctions:first.market.auctions.map(a=>({...a,resolved:true}))}};
  expect(commissionedAuctionBlock(next)).toMatch(/already commissioned/);
  const full={...next,ipMarket:{...next.ipMarket,lastCommissionedAuctionYear:-1,auctions:[0,1,2].map(i=>({...first.auction,id:`test_${i}`,opensWeek:i*8,resolved:true}))}};
  expect(commissionedAuctionBlock(full)).toMatch(/Three rights auctions/);
  expect(commissionedAuctionBlock({...full,week:48})).toBeNull();
 });
});
