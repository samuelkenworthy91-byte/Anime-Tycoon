import { GENRES, type AnimeType, type AudienceId, type GenreId, type MediumId } from "./data";
import type { RivalWorld } from "./rivals";
import { USER_IP_CATALOG } from "./userIpCatalog";
import { IP_HIDDEN_ARC_BY_SLOT } from "./ipHiddenArcs";

export type IPSourceType = "manga" | "light_novel" | "jrpg" | "visual_novel" | "webcomic" | "game" | "film" | "tv" | "novel" | "comic" | "audio_drama" | "tabletop";
export type IPRarity = "cult" | "emerging" | "recognised" | "premium" | "legendary";
export type AuctionType = "open" | "sealed" | "distressed" | "invite";

export interface IPCharacter { role: "protagonist" | "companion" | "antagonist" | "mascot"; name: string; description: string; }
export interface IPArc { id: string; name: string; minAdaptations?: number; requiresSequelRights?: boolean; }
export interface AuctionIP {
  id: string; title: string; sourceType: IPSourceType; description: string; genreTags: GenreId[];
  toneTags: string[]; audience: AudienceId; animeType: AnimeType; fanbase: number; prestige: number;
  merchPotential: number; adaptationDifficulty: number; rightsBaseValue: number; minimumBid: number;
  royaltyRate: number; licenseLength: number; ownershipSharePotential: number;
  sequelRightsAvailable: boolean; merchRightsAvailable: boolean; internationalRightsAvailable: boolean;
  creatorControl: number; audienceVolatility: number; expectationLevel: number; scopeComplexity: number;
  characters: IPCharacter[]; availableArcs: IPArc[]; specialArcUnlock?: string; posterSlot: number; posterAsset: string;
  posterPalette: [string, string, string]; rarity: IPRarity; minimumStudioPrestige: number; specialRules: string[];
}

const rarityValue: Record<IPRarity, number> = { cult: 1, emerging: 2, recognised: 3, premium: 4, legendary: 5 };
const rightsScale: Record<IPRarity, number> = { cult: .12, emerging: .38, recognised: 1.2, premium: 2.5, legendary: 6 };
const arc = (id: string, name: string, extra: Partial<IPArc> = {}): IPArc => ({ id, name, ...extra });
const FIRST = ["Ari","Mira","Ren","Sena","Noa","Kai","Iris","Theo","Nia","Sol","Emi","Rowan","Juno","Vale","Mika","Rin","Tess","Leo","Aya","Pax"];
const LAST = ["Vale","Sorn","Quill","Mori","Venn","Kade","Grey","Bloom","Reed","Aster","Hale","Wren","Cole","Finch","Rose","Mercer","Bell","Ash","Line","Voss"];
const MASCOTS = ["Pip","Mote","Nib","Bit","Chime","Loop","Morrow","Puff","Comma","Beacon"];
const charsFor = (slot:number):IPCharacter[] => {
  const n=(k:number)=>`${FIRST[(slot*3+k*5)%FIRST.length]} ${LAST[(slot*7+k*3)%LAST.length]}`;
  return [
    {role:"protagonist",name:n(0),description:"The property’s central viewpoint."},
    {role:"companion",name:n(1),description:"A defining ally, foil or rival."},
    {role:"antagonist",name:n(2),description:"The principal opposing force."},
    {role:"mascot",name:MASCOTS[slot%MASCOTS.length],description:"A property-specific supporting icon."},
  ];
};
const rarityFor=(slot:number):IPRarity => slot%10===0?"legendary":slot%5===0?"premium":slot%3===0?"recognised":slot%2===0?"emerging":"cult";
const paletteFor=(genres:GenreId[],slot:number):[string,string,string] => {
  const a=GENRES.find(g=>g.id===genres[0])?.color??"#6d5bc3"; const b=GENRES.find(g=>g.id===genres[1])?.color??"#d15c82";
  return [a,b,slot%2?"#f0d58b":"#d8e5f0"];
};

export const AUCTION_IPS: AuctionIP[] = USER_IP_CATALOG.map((raw,index)=>{
  const slot=raw.slot; const rarity=rarityFor(slot); const tier=rarityValue[rarity]; const genres=[...raw.genres] as GenreId[];
  const fanbase=Math.min(98,38+((slot*17)%58)+tier*2); const prestige=Math.min(96,40+((slot*13)%42)+tier*4);
  const merch=Math.min(98,35+((slot*19)%50)+tier*4); const difficulty=Math.min(96,42+((slot*11)%43)+tier*5);
  const rights=Math.round((220_000+fanbase*6_500+prestige*5_500)*rightsScale[rarity]/5000)*5000;
  const id=raw.id; const hidden=IP_HIDDEN_ARC_BY_SLOT[slot];
  return {
    id,title:raw.title,sourceType:raw.sourceType as IPSourceType,
    description:`A sought-after ${String(raw.sourceType).replaceAll("_"," ")} property with a distinctive ${hidden?.name.toLowerCase() ?? "story"} identity.`,
    genreTags:genres,toneTags:[genres[0],genres[1]],audience:(genres.includes("horror")||genres.includes("mystery")?"adults":genres.includes("comedy")||genres.includes("sports")?"family":"teens") as AudienceId,
    animeType:raw.animeType as AnimeType,fanbase,prestige,merchPotential:merch,adaptationDifficulty:difficulty,
    rightsBaseValue:rights,minimumBid:Math.round(rights*.68/5000)*5000,royaltyRate:Math.max(.06,.18-tier*.02),licenseLength:144+slot%3*48,
    ownershipSharePotential:.45+tier*.07,sequelRightsAvailable:true,merchRightsAvailable:true,internationalRightsAvailable:true,
    creatorControl:Math.min(95,24+difficulty*.62),audienceVolatility:Math.min(95,18+difficulty*.58),expectationLevel:Math.round((fanbase+prestige)/2),scopeComplexity:difficulty,
    characters:charsFor(slot),availableArcs:[arc(`${id}_opening`,"Opening Movement"),arc(`${id}_turn`,"Turning Point"),arc(`${id}_legacy`,"Legacy Finale",{minAdaptations:1,requiresSequelRights:true})],
    specialArcUnlock:hidden?.id,posterSlot:slot,posterAsset:raw.posterAsset,posterPalette:paletteFor(genres,slot),rarity,
    minimumStudioPrestige:Math.max(0,(tier-2)*18),specialRules:[`Signature blueprint: ${hidden?.name ?? "Unknown"}.`,`A ${difficulty>=78?"demanding":"flexible"} adaptation with fan expectations to match.`]
  };
});

export interface IPContract { ipId:string; acquiredWeek:number; expiresWeek:number; purchasePrice:number; royaltyRate:number; ownershipShare:number; sequelRights:boolean; merchRights:boolean; internationalRights:boolean; adaptations:number; bestScore:number; discoveredArcs:string[]; /** AUCTION_AWARD_PROVENANCE_V1 */ acquisition?: "auction"; auctionId?: string; ownerStudioId?: string; }
export interface AuctionBid { studioId:"player"|string; amount:number; week:number; }
export interface IPAuction { id:string; ipId:string; type:AuctionType; opensWeek:number; closesWeek:number; currentBid:number; leadingStudioId:string|null; playerMaxBid:number; bids:AuctionBid[]; appraisalLevel:0|1|2|3; resolved:boolean; winnerId:string|null; winningBid:number; playerSkipped?:boolean; }
export interface IPMarketState { nextAuctionWeek:number; auctions:IPAuction[]; owned:Record<string,IPContract>; rivalOwned:Record<string,string>; history:string[]; studioArcs:string[]; legalReputation:number; pendingPromptId:string|null; annualAuctionVersion:1; }

export const WEEKS_PER_YEAR=48;
export const AUCTION_YEAR_CHANCE=.68;
const AUCTION_EARLIEST=6, AUCTION_LATEST=42;
export function scheduleNextAuctionWeek(fromWeek:number,rng=Math.random){
  let year=Math.floor(Math.max(0,fromWeek)/WEEKS_PER_YEAR); const startingYear=year; const offset=Math.max(0,fromWeek-year*WEEKS_PER_YEAR);
  for(let attempts=0;attempts<18;attempts++,year++){
    const low=year===startingYear?Math.max(AUCTION_EARLIEST,offset):AUCTION_EARLIEST;
    if(low>AUCTION_LATEST)continue;
    if(rng()<=AUCTION_YEAR_CHANCE)return year*WEEKS_PER_YEAR+low+Math.floor(rng()*(AUCTION_LATEST-low+1));
  }
  return (year+1)*WEEKS_PER_YEAR+24;
}

export function licensedRevenue(gross:number,contract:Pick<IPContract,"royaltyRate"|"ownershipShare">){const royalty=Math.round(gross*contract.royaltyRate);const ownershipRevenue=Math.round((gross-royalty)*contract.ownershipShare);return {royalty,ownershipRevenue,net:Math.max(0,gross-royalty+ownershipRevenue)};}
export const initIPMarket = (week=0,rng=Math.random):IPMarketState => ({nextAuctionWeek:scheduleNextAuctionWeek(week,rng),auctions:[],owned:{},rivalOwned:{},history:[],studioArcs:[],legalReputation:0,pendingPromptId:null,annualAuctionVersion:1});
export function migrateIPMarket(raw:unknown,week:number):IPMarketState {
  const r=(raw&&typeof raw==="object"?raw:{}) as Partial<IPMarketState>;
  const fresh=initIPMarket(week);
  const annual=r.annualAuctionVersion===1;
  const auctions=Array.isArray(r.auctions)?r.auctions:[];
  const rawOwned=(r.owned&&typeof r.owned==="object"?r.owned:{}) as Record<string,IPContract>;
  // Backfill proof only when an old save still contains a resolved player-win
  // auction. Unproven/manual contracts deliberately remain award-ineligible.
  const owned=Object.fromEntries(Object.entries(rawOwned).map(([ipId,contract])=>{
    if(contract.acquisition==="auction"&&contract.ownerStudioId==="player"&&contract.auctionId)return [ipId,contract];
    const proof=[...auctions].reverse().find(a=>a.resolved&&a.winnerId==="player"&&a.ipId===ipId);
    return [ipId,proof?{...contract,acquisition:"auction" as const,auctionId:proof.id,ownerStudioId:"player"}:contract];
  }));
  return {...fresh,...r,nextAuctionWeek:annual&&typeof r.nextAuctionWeek==="number"?r.nextAuctionWeek:fresh.nextAuctionWeek,auctions,owned,rivalOwned:r.rivalOwned&&typeof r.rivalOwned==="object"?r.rivalOwned:{},history:Array.isArray(r.history)?r.history:[],studioArcs:Array.isArray(r.studioArcs)?r.studioArcs:[],pendingPromptId:typeof r.pendingPromptId==="string"?r.pendingPromptId:null,annualAuctionVersion:1};
}
export const ipById=(id:string)=>AUCTION_IPS.find(x=>x.id===id)??null;
export function playerAuctionAwardProof(m:IPMarketState,ipId:string):{ipId:string;auctionId:string;ownerStudioId:"player"}|null {
  const contract=m.owned[ipId];
  if(!contract||contract.acquisition!=="auction"||contract.ownerStudioId!=="player"||!contract.auctionId)return null;
  return {ipId,auctionId:contract.auctionId,ownerStudioId:"player"};
}
export function studioPrestige(run:{fans:number;awards:number;bestScore:number;showsMade:number}) { return Math.min(100,Math.round(run.fans/15000+run.awards*4+run.bestScore+run.showsMade/4)); }
export function generateAuction(run:{week:number;fans:number;awards:number;bestScore:number;showsMade:number;ipMarket:IPMarketState},rng=Math.random):IPAuction|null {
  const prestige=studioPrestige(run); const unavailable=new Set([...Object.keys(run.ipMarket.owned),...Object.keys(run.ipMarket.rivalOwned),...run.ipMarket.auctions.filter(a=>!a.resolved).map(a=>a.ipId)]);
  const eligible=AUCTION_IPS.filter(ip=>!unavailable.has(ip.id)&&ip.minimumStudioPrestige<=prestige+15); if(!eligible.length)return null;
  const band=Math.min(5,1+Math.floor(run.week/96)); const weighted=eligible.filter(ip=>rarityValue[ip.rarity]<=band+1); const pool=weighted.length?weighted:eligible; const ip=pool[Math.floor(rng()*pool.length)];
  const types:AuctionType[]=prestige>=65?["open","sealed","invite","distressed"]:["open","open","sealed","distressed"]; const type=types[Math.floor(rng()*types.length)];
  const min=type==="distressed"?Math.round(ip.minimumBid*.72/5000)*5000:ip.minimumBid; return {id:`auc_${run.week}_${ip.id}`,ipId:ip.id,type,opensWeek:run.week,closesWeek:run.week+1,currentBid:min,leadingStudioId:null,playerMaxBid:0,bids:[],appraisalLevel:0,resolved:false,winnerId:null,winningBid:0,playerSkipped:false};
}
const candidateFor=(ip:AuctionIP,world:RivalWorld,current:number,rng=Math.random)=>{
  const candidates=world.studios.filter(s=>s.status!=="collapsed"&&s.reputation>=ip.minimumStudioPrestige*.7).map(s=>{
    const fit=s.preferred.some(g=>ip.genreTags.includes(g))?18:0; const appetite=(s.reputation+s.tier*12+fit+rng()*18)/120; const ceiling=Math.round(ip.rightsBaseValue*(.72+appetite)/5000)*5000; return {s,ceiling,score:s.reputation+s.tier*8+fit};
  }).filter(x=>x.ceiling>=current).sort((a,b)=>b.score-a.score||b.ceiling-a.ceiling); return candidates[0]??null;
};
const makeContract=(ip:AuctionIP,week:number,price:number,auctionId:string):IPContract=>({ipId:ip.id,acquiredWeek:week,expiresWeek:week+ip.licenseLength,purchasePrice:price,royaltyRate:ip.royaltyRate,ownershipShare:.3,sequelRights:false,merchRights:false,internationalRights:false,adaptations:0,bestScore:0,discoveredArcs:[],acquisition:"auction",auctionId,ownerStudioId:"player"});
const resolveForAI=(m:IPMarketState,a:IPAuction,world:RivalWorld,rng=Math.random)=>{const ip=ipById(a.ipId)!;const c=candidateFor(ip,world,a.currentBid,rng);const resolved={...a,resolved:true,winnerId:c?.s.id??null,winningBid:c?Math.max(a.currentBid,ip.minimumBid):0,leadingStudioId:c?.s.id??null,bids:c?[...a.bids,{studioId:c.s.id,amount:Math.max(a.currentBid,ip.minimumBid),week:a.closesWeek}]:a.bids};return {...m,auctions:m.auctions.map(x=>x.id===a.id?resolved:x),rivalOwned:c?{...m.rivalOwned,[ip.id]:c.s.id}:m.rivalOwned,history:[...m.history,c?`${c.s.name} wins ${ip.title}.`:`${ip.title} leaves the room unsold.`].slice(-100),pendingPromptId:m.pendingPromptId===a.id?null:m.pendingPromptId};};
export function dismissAuctionPrompt(m:IPMarketState,auctionId:string):IPMarketState{return {...m,pendingPromptId:m.pendingPromptId===auctionId?null:m.pendingPromptId};}
export function skipAuctionOpportunity(m:IPMarketState,auctionId:string,world:RivalWorld,rng=Math.random):IPMarketState {const a=m.auctions.find(x=>x.id===auctionId);if(!a||a.resolved)return dismissAuctionPrompt(m,auctionId);const tagged={...m,auctions:m.auctions.map(x=>x.id===auctionId?{...x,playerSkipped:true}:x),pendingPromptId:null};return resolveForAI(tagged,{...a,playerSkipped:true},world,rng);}
export function withdrawAuction(m:IPMarketState,auctionId:string,world:RivalWorld,rng=Math.random):IPMarketState {const a=m.auctions.find(x=>x.id===auctionId);if(!a||a.resolved)return m;return resolveForAI(m,a,world,rng);}
export function bidIncrementOptions(currentBid:number){return [.05,.10,.25,.50].map(p=>Math.max(10_000,Math.round(currentBid*p/5000)*5000));}
export function placeLivePlayerBid(m:IPMarketState,auctionId:string,amount:number,cash:number,week:number,world:RivalWorld,rng=Math.random):{market:IPMarketState;cashDelta:number;notice:string}|null {
  const a=m.auctions.find(x=>x.id===auctionId),ip=a&&ipById(a.ipId); if(!a||!ip||a.resolved||a.playerSkipped||amount<=a.currentBid||amount>cash)return null;
  let next:IPAuction={...a,currentBid:amount,leadingStudioId:"player",playerMaxBid:Math.max(a.playerMaxBid,amount),bids:[...a.bids,{studioId:"player",amount,week}]}; const c=candidateFor(ip,world,amount+10_000,rng);
  if(c){let counter=Math.round(Math.max(amount+10_000,amount*1.06)/5000)*5000;if(counter<=c.ceiling){next={...next,currentBid:counter,leadingStudioId:c.s.id,bids:[...next.bids,{studioId:c.s.id,amount:counter,week}]};return {market:{...m,auctions:m.auctions.map(x=>x.id===a.id?next:x),history:[...m.history,`${c.s.name} counters at £${counter.toLocaleString("en-GB")}.`].slice(-100)},cashDelta:0,notice:`${c.s.name} counters your bid.`};}}
  next={...next,resolved:true,winnerId:"player",winningBid:amount}; return {market:{...m,auctions:m.auctions.map(x=>x.id===a.id?next:x),owned:{...m.owned,[ip.id]:makeContract(ip,week,amount,a.id)},history:[...m.history,`Rights won: ${ip.title} for £${amount.toLocaleString("en-GB")}.`].slice(-100),pendingPromptId:null},cashDelta:-amount,notice:`🏆 Rights won: ${ip.title}.`};
}
export function placePlayerBid(m:IPMarketState,auctionId:string,amount:number,cash:number):IPMarketState|null {const a=m.auctions.find(x=>x.id===auctionId);if(!a||a.resolved||amount<=a.currentBid||amount>cash)return null;return {...m,auctions:m.auctions.map(x=>x.id===auctionId?{...x,currentBid:amount,leadingStudioId:"player",playerMaxBid:amount,bids:[...x.bids,{studioId:"player",amount,week:x.opensWeek}]}:x),history:[...m.history,`Bid placed: £${amount.toLocaleString("en-GB")}`]};}
export function appraiseAuction(m:IPMarketState,auctionId:string):IPMarketState { return {...m,auctions:m.auctions.map(a=>a.id===auctionId?{...a,appraisalLevel:Math.min(3,a.appraisalLevel+1) as 0|1|2|3}:a)}; }
export function tickIPMarket(m:IPMarketState,run:{week:number;cash:number;fans:number;awards:number;bestScore:number;showsMade:number},world:RivalWorld,rng=Math.random):{market:IPMarketState;cashDelta:number;notices:string[];world:RivalWorld} {
  let market={...m,auctions:m.auctions.map(a=>({...a,bids:[...a.bids]})),owned:{...m.owned},rivalOwned:{...m.rivalOwned},history:[...m.history]}; const notices:string[]=[]; let cashDelta=0;
  market.auctions=market.auctions.map(a=>a); for(const a of market.auctions.filter(a=>!a.resolved&&run.week>=a.closesWeek)){
    const ip=ipById(a.ipId)!;
    if(a.leadingStudioId==="player" && run.cash+cashDelta>=a.currentBid){
      const resolved={...a,resolved:true,winnerId:"player",winningBid:a.currentBid};
      market={...market,auctions:market.auctions.map(x=>x.id===a.id?resolved:x),owned:{...market.owned,[ip.id]:makeContract(ip,run.week,a.currentBid,a.id)},pendingPromptId:market.pendingPromptId===a.id?null:market.pendingPromptId,history:[...market.history,`Rights won: ${ip.title} for £${a.currentBid.toLocaleString("en-GB")}.`].slice(-100)};
      cashDelta-=a.currentBid; notices.push(`🏆 Rights won: ${ip.title}.`);
    }else{
      market=resolveForAI(market,a,world,rng); notices.push(`${ip.title} auction closed.`);
    }
  }
  if(run.week>=market.nextAuctionWeek&&!market.auctions.some(a=>!a.resolved)){
    const a=generateAuction({...run,ipMarket:market},rng); const nextYear=(Math.floor(run.week/WEEKS_PER_YEAR)+1)*WEEKS_PER_YEAR; market.nextAuctionWeek=scheduleNextAuctionWeek(nextYear,rng);
    if(a){market.auctions=[...market.auctions.filter(x=>run.week-x.closesWeek<96),a];market.pendingPromptId=a.id;notices.push(`🔨 Rights forecast: ${ipById(a.ipId)?.title} is going to auction.`);}
  }
  market.history=[...market.history,...notices].slice(-100);return {market,cashDelta,notices,world};
}
export function negotiateRights(m:IPMarketState,ipId:string,kind:"sequel"|"merch"|"international"|"royalty"|"ownership",legalTier:number,rng=Math.random):{market:IPMarketState;cost:number;success:boolean}|null {const c=m.owned[ipId],ip=ipById(ipId);if(!c||!ip)return null;const cost=Math.round(ip.rightsBaseValue*(kind==="royalty"?.45:kind==="ownership"?.3:.18)/5000)*5000;const chance=Math.min(.82,.28+legalTier*.14+m.legalReputation*.01-ip.creatorControl*.002);const success=rng()<chance;let next={...c};if(success){if(kind==="sequel")next.sequelRights=true;if(kind==="merch")next.merchRights=true;if(kind==="international")next.internationalRights=true;if(kind==="royalty")next.royaltyRate=Math.max(.02,next.royaltyRate-.04);if(kind==="ownership")next.ownershipShare=Math.min(ip.ownershipSharePotential,next.ownershipShare+.1);}return {market:{...m,owned:{...m.owned,[ipId]:next},legalReputation:Math.min(20,m.legalReputation+(success?1:0)),history:[...m.history,`${ip.title}: ${kind} negotiation ${success?"succeeded":"failed"}.`]},cost,success};}
export const SOURCE_LABEL:Record<IPSourceType,string>={manga:"Manga",light_novel:"Light novel",jrpg:"JRPG",visual_novel:"Visual novel",webcomic:"Webcomic",game:"Game",film:"Film",tv:"TV series",novel:"Novel",comic:"Comic",audio_drama:"Audio drama",tabletop:"Tabletop property"};
export const AUCTION_TYPE_LABEL:Record<AuctionType,string>={open:"Open auction",sealed:"Sealed bid",distressed:"Distressed sale",invite:"Invite-only"};
export const genreLabel=(id:GenreId)=>GENRES.find(g=>g.id===id)?.label??id;
export const preferredMediumForIP=(ip:AuctionIP):MediumId=>ip.sourceType==="film"?"movie":ip.rarity==="legendary"?"movie":ip.sourceType==="webcomic"?"ona":"tv";
