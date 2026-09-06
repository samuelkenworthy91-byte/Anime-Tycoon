/** Reference model for the SPECIFICATION, not wired into the live game. */
export const ROLE_WEIGHTS={Lead:1,Sidekick:.55,Mascot:.30,Villain:.45};
export const DEFAULTS={base:.5,quality:.6,sales:.025};
export function tier(member,genres){
 if(genres.includes(member.hidden_genre)) return 2;
 return genres.includes(member.visible_genre_1)||genres.includes(member.visible_genre_2)?1:0;
}
export function contribution(members,genres,animeType,config=DEFAULTS){
 const byRole=Object.keys(ROLE_WEIGHTS).map(role=>{
  const member=members.find(x=>x.role===role);if(!member)throw Error('Missing '+role);
  const k=tier(member,genres),t=member.anime_type===animeType?1.1:1,w=ROLE_WEIGHTS[role];
  return {id:member.id,role,tier:k,type:t,baseQ:w*config.base*t,genreQ:w*config.quality*k*t,salesAdd:w*config.sales*k*t};
 });
 return {quality:byRole.reduce((a,x)=>a+x.baseQ+x.genreQ,0),genreQuality:byRole.reduce((a,x)=>a+x.genreQ,0),salesMultiplier:1+byRole.reduce((a,x)=>a+x.salesAdd,0),byRole};
}
/** Knowledge-only projection used for UI sorting, search and recommendations. */
export function publicMember(m,known){
 return {id:m.id,name:m.new_name,role:m.role,anime_type:m.anime_type,visible:[m.visible_genre_1,m.visible_genre_2],hidden:known.has(m.id)?m.hidden_genre:null};
}
/** Atomic release reducer prototype: no retroactive discovery, idempotent receipt. */
export function discover(state,{releaseId,released,cancelled,cast,genres,positiveContributors}){
 if(!released||cancelled||state.processed.has(releaseId))return state;
 const known=new Set(state.known),processed=new Set(state.processed);processed.add(releaseId);
 for(const m of cast)if(genres.includes(m.hidden_genre)&&positiveContributors.has(m.id))known.add(m.id);
 return {known,processed};
}
