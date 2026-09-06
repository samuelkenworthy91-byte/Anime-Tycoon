#!/usr/bin/env python3
"""Build canonical deliverables; no third-party dependencies. Run from any cwd."""
import csv, json, re, hashlib
from pathlib import Path
from collections import Counter,defaultdict
from itertools import combinations
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'evidence/source_cast.json'
LABELS=dict(zip('mecha isekai slice horror romance sports cyber fantasy idol mystery comedy cooking military supernatural space magical survival pirate martial mythology nordic'.split(),['Mecha','Isekai','Slice of Life','Horror','Romance','Sports','Cyberpunk','Fantasy','Idol','Mystery','Comedy','Cooking','Military','Supernatural','Space','Magical','Survival','Pirate','Martial Arts','Mythology','Nordic']))
GENRES=list(LABELS)
ROLES=['Lead','Sidekick','Mascot','Villain']; TYPES=['SHONEN','SHOJO']; ROLE_IDS=dict(zip(ROLES,['protag','secondary','pet','villain']))
OLD_ROLE={v:k for k,v in ROLE_IDS.items()}
old=json.loads(SOURCE.read_text()); oldby={r['id']:r for r in old}
FIELDS='id old_name new_name role anime_type gender age_band species cultural_basis archetype personality visible_genre_1 visible_genre_2 hidden_genre affinity_logic hidden_affinity_logic visual_summary antagonist_or_mascot_logic status notes'.split()
def csvwrite(name,fields,rows):
 with (ROOT/name).open('w',encoding='utf-8-sig',newline='') as f:
  w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rows)
def table(headers,rows):
 return '| '+' | '.join(map(str,headers))+' |\n|'+'|'.join(['---']*len(headers))+'|\n'+''.join('| '+' | '.join(str(x).replace('|',' / ').replace('\n',' ') for x in row)+' |\n' for row in rows)+'\n'
def save(name,s): (ROOT/name).write_text(s,encoding='utf-8')
MODES={
'mecha':'mechanical timing, technical trust and responsibility for large machines',
'isekai':'adjustment to unfamiliar rules, displaced identity and new social contracts',
'slice':'ordinary routines, small obligations and unspoken everyday feelings',
'horror':'held tension, vulnerable reactions and the unsettling disruption of familiar behaviour',
'romance':'trust, boundaries, attention and emotional rivalry; animal companions mirror human bonds rather than enter romances',
'sports':'training, teamwork, competitive stakes and readable physical timing',
'cyber':'constructed identity, control of information and the human cost of technology',
'fantasy':'grounded behaviour inside an invented world with consistent rules',
'idol':'public image, rehearsal discipline, performance rhythm and audience relationships',
'mystery':'observation, withheld information and the interpretation of behaviour',
'comedy':'timing, contrast, misunderstanding and revealing character through mistakes',
'cooking':'care, sensory attention, exact procedure and conflicts over standards or resources',
'military':'command, procedure, operational trust and conflicts over responsibility',
'supernatural':'a credible relationship with an unexplained presence in otherwise personal life',
'space':'isolation, habitat dependence, distance from home and trust in a small crew',
'magical':'repeatable spell-like choreography, transformation and the responsibilities of unusual ability',
'survival':'resource limits, environmental pressure, endurance and community decisions',
'pirate':'crew loyalty, contested access, seafaring motion and adventurous social codes',
'martial':'controlled movement, disciplined repetition, rivalry and learning from a partner',
'mythology':'inherited stories, legendary responsibility and the relationship between ordinary people and grand narratives',
'nordic':'northern communities, hospitality, winter obligations, clan politics and saga-scale memory without requiring gods'}
REDESIGN=set('daichi rin niko mako zuri yuki nana hana ash s_mika s_kanna s_maki s_bolt s_reina s_yuna s_ryo s_lulu s_kiki s_tobi n_saku hikari v_kurogane v_volt v_carnage v_ash v_gravemark v_onikage v_blackout v_grandfinale v_tempest v_reaper v_paradox v_warden v_inquisitor v_collector v_nightshade v_mirage v_puppeteer v_kairos v_plague v_falsetto v_nocturne v_venom v_obsidian v_sinister v_frostbite v_dread v_rosethorn'.split())
rows=[]
for line in (ROOT/'tools/roster_seed.txt').read_text().splitlines():
 if line.startswith('@'): role,typ,gender=line[1:].split('|')
 elif line and not line.startswith('#'):
  a=line.split('|'); assert len(a) in (12,13),(a[0],len(a))
  id,name,culture,age,species,arch,personality,visual,g1,g2,h,hl=a[:12]
  o=oldby.get(id); changes=[]
  if not o: status='newly added'
  elif OLD_ROLE[o['role']]!=role: status='role-adjusted';changes.append(f"Role: {OLD_ROLE[o['role']]} → {role}; stable ID retained, including its legacy prefix.")
  elif id in REDESIGN: status='visually redesigned'
  elif o['name']!=name:status='renamed'
  else:status='existing'
  if o and o['name']!=name:changes.append('Display-name change; do not rename save keys or historical billing.')
  if id in REDESIGN:changes.append('V2 visual concept replaces the old archetype/portrait brief; no new art exists yet.')
  if role=='Mascot' or species not in ('human','humanlike fantasy person'):
   changes.append(f"Gender ledger: {gender}; use the specified natural species/body presentation, not human gender stereotypes. The cell is not an Anime Type restriction.")
  if role=='Mascot': logic=f"{arch}: {personality} A distinct companion presence with species-appropriate movement; never a reduced-size human costume."
  elif role=='Villain':logic=a[12]
  else:logic='Not an antagonist or mascot; functions as '+arch.lower()+'.'
  affinity=f"{arch}: {personality} {LABELS[g1]} uses {MODES[g1]}; {LABELS[g2]} uses {MODES[g2]}. Hidden {LABELS[h]}: {hl}"
  rows.append(dict(zip(FIELDS,[id,o['name'] if o else '',name,role,typ,gender,age,species,culture,arch,personality,g1,g2,h,affinity,hl,visual,logic,status,' '.join(changes)])))
csvwrite('CAST_V2_MASTER.csv',FIELDS,rows)
save('CAST_V2_MASTER.json',json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
mig=[]
for o in old:
 r=next(r for r in rows if r['id']==o['id'])
 mig.append(dict(zip(['old_id','old_display_name','new_display_name','old_role','new_role','new_anime_type','new_visible_affinity_1','new_visible_affinity_2','new_hidden_affinity','id_preserved','notes'],[o['id'],o['name'],r['new_name'],o['role'],ROLE_IDS[r['role']],r['anime_type'],r['visible_genre_1'],r['visible_genre_2'],r['hidden_genre'],'yes',r['notes']])))
csvwrite('CAST_V2_MIGRATION_MAP.csv',list(mig[0]),mig)
intro='''# Cast V2 canonical roster

Canonical design specification, 4 September 2026. Source: `samuelkenworthy91-byte/Anime-Tycoon`, `feature/kairosoft-production-pass`, commit `63e072d310670b6cb19dbef77d2d13526f7d5317` (10:21:52 UTC). Branch audit and original registered cast are retained under `evidence/`. This package specifies a future implementation; the running game has not been changed.

192 characters: 48 per role, 24 of each Anime Type per role, 12 male/12 female ledger cells per Role × Type. All 186 source IDs are preserved. No art was generated. New age, cultural and presentation details are deliberate V2 design decisions, not claims recovered from absent source biography. Existing source affinities include the effective `CAST_AFF_EXTRA` merge.

**Reading the roster.** Genres below describe casting range, not a requirement that every character's home setting literally contains all three genres. A grounded actor archetype can transfer to a different production through its behaviour and performance skills. SHONEN emphasises momentum/challenge; SHOJO emphasises relationships/identity. Neither restricts gender, audience or species. Mascot and non-human gender values are internal balancing cells; use natural species presentation in art. No eyelashes, pink/blue coding, sexualisation or humanoid anatomy should be added to communicate that cell.

The first two affinities are public. The third is a fixed author-only secret; player-facing descriptions must omit this document's affinity rationale, hidden-transfer rationale and internal balancing notes. Art briefs use only the visual summary, species, age, personality and visible context. Do not add props, symbols, costume or background motifs to illustrate the hidden affinity. Revealed affinities can inform later production-specific art, but never the undiscovered base portrait.

## Additions and role adjustments

'''
intro+=table(['New ID','Character','Role','Gap addressed'],[
['s_amina','Amina El-Khatib','Sidekick','Survival/Mythology and accountable military support; Sudanese-British expedition archivist'],
['s_pranav','Pranav Rao','Sidekick','Mythology/Cooking with hidden Mecha; South Asian male Shojo specialist'],
['s_linh','Linh Trần','Sidekick','Pirate/Military with hidden Magical; Vietnamese maritime mediator'],
['p_silt','Silt','Mascot','Survival/Pirate with hidden Magical; pangolin rather than another cat'],
['p_brine','Brine','Mascot','Pirate/Space with hidden Cyberpunk; aquatic colour-communicating cuttlefish'],
['v_einar','Einar Dahl','Villain','Nordic/Cooking with hidden Idol; grounded male Shojo family-business antagonist']])
intro+=table(['ID','Old role','New role','Reason'],[[m['old_id'],OLD_ROLE[m['old_role']],OLD_ROLE[m['new_role']], {'taro':'Guild cook becomes ensemble confidant.','fumi':'Artist works best as an observant ensemble member.','yuzuki':'Lantern guide supports other characters journeys.','tsubasa':'Flight engineer has a clear supporting function.','aya':'Rose Thorn becomes a grounded romantic/social foil.','sen':'Scarred veteran supplies a principled opposing view.','s_haruto':'Existing Streetwise Cat becomes a species-appropriate mascot.','s_koko':'Existing Mystic Cat becomes a species-appropriate mascot.','s_chika':'Existing Pastry Dragon becomes a small sapient companion.'}[m['old_id']]] for m in mig if m['old_role']!=m['new_role']])
intro+='Source arithmetic: 54/44/43/45 → move four Leads to Sidekick and two to Villain → move three existing non-human Sidekicks to Mascot → add three Sidekicks, two Mascots and one Villain → 48/48/48/48. No human is converted into an animal to satisfy a quota.\n\n'
for role in ROLES:
 for typ in TYPES:
  intro+=f'## {role} — {typ}\n\n'
  for r in rows:
   if r['role']!=role or r['anime_type']!=typ:continue
   intro+=f"### {r['new_name']} (`{r['id']}`)\n\n"
   intro+=f"**Old name:** {r['old_name'] or 'New addition'} · **Status:** {r['status']} · **Role/Type:** {role} / {typ}\n\n"
   intro+=f"**Gender/presentation:** {r['gender']}"+(' (balance ledger only; natural species presentation)' if role=='Mascot' or r['species'] not in ('human','humanlike fantasy person') else '')+f" · **Age:** {r['age_band']} · **Species:** {r['species']}\n\n"
   intro+=f"**Design basis:** {r['cultural_basis']} · **Archetype:** {r['archetype']}\n\n{r['personality']}\n\n"
   intro+=f"**Visible:** {LABELS[r['visible_genre_1']]} / {LABELS[r['visible_genre_2']]} · **Hidden (author-only):** {LABELS[r['hidden_genre']]}\n\n"
   intro+=f"**Affinity rationale:** {r['affinity_logic']}\n\n**Surprising but believable:** {r['hidden_affinity_logic']}\n\n**Visual concept:** {r['visual_summary']}\n\n"
   intro+=f"**Role logic:** {r['antagonist_or_mascot_logic']}\n\n**Migration/presentation notes:** {r['notes'] or 'Stable existing identity; three-affinity V2 specification replaces the old affinity array.'}\n\n"
save('CAST_V2_MASTER.md',intro)
# Genre economics preserve the economy's scale while moving specialities later.
GD=[
('mecha','Bot',[60,72,48],[.22,.54,.24],32,'MID','Piloted or autonomous large machines; engineering, embodiment and responsibility.'),
('isekai','Sparkles',[66,58,45],[.38,.38,.24],26,'MID','Displacement into another world; adaptation, changed social rules and identity.'),
('slice','Coffee',[30,36,55],[.45,.25,.30],0,'START','Everyday work, school, home and community; small stakes can carry deep meaning.'),
('horror','Ghost',[66,40,72],[.32,.30,.38],30,'MID','Fear, dread, uncanny humans, monsters, isolation and threatened safety.'),
('romance','Heart',[26,46,56],[.46,.24,.30],14,'EARLY','Attraction, boundaries, intimacy and romantic conflict across genders.'),
('sports','Trophy',[72,75,55],[.26,.50,.24],18,'EARLY','Athletic training, teams, competition and sporting achievement; includes motorsport formerly Racing.'),
('cyber','Cpu',[58,66,76],[.30,.36,.34],50,'LATE','Networked power, artificial identity, augmentation and corporate technology.'),
('fantasy','Sword',[60,60,50],[.36,.40,.24],0,'START','Invented worlds with extraordinary rules, cultures or creatures; not synonymous with every myth.'),
('idol','Mic2',[55,56,82],[.24,.32,.44],38,'MID-LATE','Performance, rehearsal, fandom, manufactured image and entertainment-industry relationships.'),
('mystery','Eye',[72,40,50],[.50,.24,.26],40,'MID-LATE','Investigation, evidence and revelation; noir remains an aesthetic within this and other genres.'),
('comedy','Laugh',[58,55,50],[.36,.34,.30],12,'EARLY','Timing, absurdity, social observation and character-driven humour.'),
('cooking','ChefHat',[48,66,58],[.30,.40,.30],22,'EARLY-MID','Food craft, hospitality, kitchens, culinary rivalry and the communities around meals.'),
('military','Crosshair',[64,72,44],[.26,.50,.24],30,'MID','Command, service, strategy, logistics and armed institutions; not all action is military.'),
('supernatural','Wand2',[62,52,58],[.36,.30,.34],24,'EARLY-MID','Spirits and unexplained forces interacting with lived reality; need not be frightening.'),
('space','Rocket',[60,74,66],[.26,.44,.30],48,'LATE','Space travel, orbital habitats, alien societies and the scale and isolation of the cosmos.'),
('magical','Sparkles',[34,58,78],[.34,.30,.36],20,'EARLY','Spellcraft, transformations and magical ability; all genders and species, not only magical girls.'),
('survival','Tent',[66,56,62],[.40,.32,.28],36,'MID-LATE','Wilderness, apocalypse, disaster, hostile environments, expeditions, isolation, resource scarcity and survival communities.'),
('pirate','Ship',[62,68,54],[.36,.40,.24],28,'MID','Seafaring adventure, treasure, outlaw crews, privateers, naval conflict, exploration and swashbuckling; airship variants still require a piracy-based world.'),
('martial','Hand',[62,78,48],[.30,.46,.24],18,'EARLY','Hand-to-hand combat, fighting disciplines, dojos, tournament combat, martial schools, masters, students and combat philosophy.'),
('mythology','Landmark',[68,60,64],[.44,.32,.24],44,'LATE','Gods, demigods, divine monsters, legendary heroes and world religious/mythic traditions adapted as grand narrative; never restricted to Norse material.'),
('nordic','MountainSnow',[58,58,48],[.44,.34,.22],54,'LATE','Scandinavian/Norse-inspired worlds, sagas, Viking-era aesthetics, northern clans, longships, runes, fjords, shield societies and folklore; grounded politics qualify without gods.')]
genredata=[dict(id=id,label=LABELS[id],icon=icon,ideal=ideal,ratio=ratio,rd=rd,tier=tier,description=desc) for id,icon,ideal,ratio,rd,tier,desc in GD]
save('GENRE_V2_DATA.json',json.dumps(genredata,ensure_ascii=False,indent=2)+'\n')
source=(ROOT.parents[1]/'src/engine/data.ts').read_text()
normal={};secret={}
for const,out in [('COMBO',normal),('SECRET_COMBOS',secret)]:
 block=source.split(f'export const {const}:')[1].split('\n};')[0]
 for a,b,v in re.findall(r'\[pair\("(.*?)", "(.*?)"\)\]: ([\d.]+)',block):
  if a in GENRES and b in GENRES:out['|'.join(sorted([a,b]))]=float(v)
def pairset(target,a,b,value):target['|'.join(sorted([a,b]))]=value
for a,b,v in [('martial','sports',1.25),('mythology','fantasy',1.22),('nordic','mythology',1.20),('pirate','fantasy',1.20),('pirate','isekai',1.18),('survival','horror',1.22),('survival','military',1.18),('magical','mythology',1.18),('supernatural','mythology',1.20),('nordic','survival',1.18),('nordic','fantasy',1.15)]:pairset(normal,a,b,v)
for a,b,v in [('idol','military',1.18),('slice','survival',1.18),('pirate','mecha',1.16),('nordic','cyber',1.14),('cooking','space',1.12)]:pairset(secret,a,b,v)
for k in secret:normal.pop(k,None)
combos=[]
for a,b in combinations(GENRES,2):
 k='|'.join(sorted([a,b])); hidden=k in secret;v=secret.get(k,normal.get(k,1.0))
 combos.append(dict(genre_1=a,genre_2=b,key=k,first_release_multiplier=1.0 if hidden else v,learned_multiplier=v,discovery_class='experimental' if hidden else ('neutral' if v==1 else 'strong' if v>=1.2 else 'supportive' if v>1 else 'risky')))
csvwrite('GENRE_V2_COMBOS.csv',list(combos[0]),combos)
save('GENRE_V2_COMBOS.json',json.dumps(combos,indent=2)+'\n')
# Programmatic accounting used by the coverage report.
def gs(r):return [r['visible_genre_1'],r['visible_genre_2'],r['hidden_genre']]
counts=Counter(g for r in rows for g in gs(r));visible=Counter(g for r in rows for g in gs(r)[:2]);hidden=Counter(r['hidden_genre'] for r in rows)
pairrows=[]
for a,b in combinations(GENRES,2):
 cover=[r for r in rows if a in gs(r) and b in gs(r)]
 pairrows.append(dict(genre_1=a,genre_2=b,total=len(cover),visible_pair=sum(set(gs(r)[:2])=={a,b} for r in cover),**{role:sum(r['role']==role for r in cover) for role in ROLES},ids=';'.join(r['id'] for r in cover)))
csvwrite('CAST_V2_PAIR_COVERAGE.csv',list(pairrows[0]),pairrows)
assert len(rows)==192 and len({r['id'] for r in rows})==192
assert set(oldby)<=set(r['id'] for r in rows)
assert all(Counter(r['role'] for r in rows)[k]==48 for k in ROLES)
assert all(sum(r['role']==role and r['anime_type']==typ and r['gender']==sex for r in rows)==12 for role in ROLES for typ in TYPES for sex in ['male','female'])
assert all(len(set(gs(r)))==3 and set(gs(r))<=set(GENRES) for r in rows)
assert len(pairrows)==210 and all(p['total']>0 for p in pairrows)
assert all(sum(g in gs(r) for r in rows if r['role']==role and r['anime_type']==typ)>=2 for role in ROLES for typ in TYPES for g in GENRES)
assert all(any(g in gs(r)[:2] for r in rows if r['role']==role and r['anime_type']==typ) for role in ROLES for typ in TYPES for g in GENRES)
report='# Cast V2 coverage and validation\n\nGenerated from the canonical CSV source. Source roster: 186 registered characters including merged extra affinities. V2: 192. IDs preserved: 186/186. Additions: 6. Deleted IDs: 0.\n\n'
report+='## Role, Type and gender ledger\n\n'+table(['Role','Total','SHONEN','SHOJO'],[[role,48,24,24] for role in ROLES])
report+=table(['Role','Type','Male','Female','Total'],[[role,typ,12,12,24] for role in ROLES for typ in TYPES])
report+='Non-human and mascot male/female cells are internal balancing values, not requirements for human sex characteristics. Age bands, species and natural presentation remain authoritative.\n\n'
report+='## Visible, hidden and complete genre totals\n\n'+table(['Genre','Visible 1','Visible 2','All visible','Hidden','Complete'],[[LABELS[g],sum(r['visible_genre_1']==g for r in rows),sum(r['visible_genre_2']==g for r in rows),visible[g],hidden[g],counts[g]] for g in GENRES])
report+='Totals: 384 visible slots + 192 hidden slots = 576 complete affinity slots. Because affinities are distinct, genre totals count characters, not repeated tags.\n\n'
report+='## Complete affinities by role\n\n'+table(['Genre']+ROLES,[[LABELS[g]]+[sum(g in gs(r) for r in rows if r['role']==role) for role in ROLES] for g in GENRES])
report+='## Complete affinities by Anime Type\n\n'+table(['Genre']+TYPES,[[LABELS[g]]+[sum(g in gs(r) for r in rows if r['anime_type']==typ) for typ in TYPES] for g in GENRES])
report+='## Practical coverage in every Role × Type\n\nCells show **visible / complete**. Every cell has at least one publicly identifiable option and at least two complete-affinity options. This is stronger than merely placing each genre somewhere in a group.\n\n'
report+=table(['Genre']+[r+' '+t for r in ROLES for t in TYPES],[[LABELS[g]]+[f"{sum(g in gs(x)[:2] for x in rows if x['role']==r and x['anime_type']==t)}/{sum(g in gs(x) for x in rows if x['role']==r and x['anime_type']==t)}" for r in ROLES for t in TYPES] for g in GENRES])
report+='## All 210 unordered genre pairs\n\nA pair is covered only when one character has **both** genres within that character’s three affinities. A two-person ensemble covering one genre each is not counted as dual coverage. Pairs involving the hidden slot remain discoverable; they are not publicly advertised. The CSV includes every witness ID.\n\n'
report+=table(['Genre pair','Complete','Visible pair','Lead','Sidekick','Mascot','Villain'],[[LABELS[p['genre_1']]+' + '+LABELS[p['genre_2']],p['total'],p['visible_pair']]+[p[r] for r in ROLES] for p in pairrows])
weak=[p for p in pairrows if p['total']==1];heavy=[p for p in pairrows if p['total']>=7]
report+=f'## Missing, weak and concentrated pairings\n\nMissing: **0/210**. Single-witness pairs: **{len(weak)}**; they meet the target but have limited casting alternatives. Concentrated means seven or more witnesses (mean {576/210:.2f}). These are monitoring categories, not additional affinities or bonuses.\n\n'
report+=table(['Single-witness pairing','Character ID'],[[LABELS[p['genre_1']]+' + '+LABELS[p['genre_2']],p['ids']] for p in weak])
report+=table(['Concentrated pairing','Witnesses'],[[LABELS[p['genre_1']]+' + '+LABELS[p['genre_2']],p['total']] for p in heavy])
# Species/culture reporting describes authored design bases, never inferred personal ethnicity.
human=lambda r:r['species'] in ('human','humanlike fantasy person')
report+='## Human and non-human distribution\n\n'+table(['Role','Human/humanlike','Non-human'],[[role,sum(human(r) for r in rows if r['role']==role),sum(not human(r) for r in rows if r['role']==role)] for role in ROLES])
report+='## Mascot species/types\n\n'+table(['Species/type','Count'],sorted(Counter(r['species'] for r in rows if r['role']=='Mascot').items()))
report+='## Antagonist archetypes\n\n'+table(['ID','Antagonist','Species','Conflict'],[[r['id'],r['archetype'],r['species'],r['antagonist_or_mascot_logic']] for r in rows if r['role']=='Villain'])
# Multi-label, transparent cultural basis grouping.
CULTURES={
'Japanese':r'Japanese', 'Korean':r'Korean', 'Chinese':r'Chinese', 'South Asian':r'Indian|Pakistani|Bangladeshi|Himalayan',
'Southeast Asian':r'Vietnamese|Filipino|Malaysian|Singaporean|Thai',
'African / African diaspora':r'African|Nigerian|Ghanaian|Senegalese|Ethiopian|Kenyan|Sudanese|Zimbabwean|Tanzanian|Black ',
'Arab / West Asian':r'Arab|Lebanese|Iranian|Algerian', 'Nordic':r'Nordic|Norwegian|Swedish|Danish',
'British / Irish':r'British|Irish', 'Other continental European':r'French|Hungarian|Polish|Spanish|Czech|Bulgarian|German|Romanian|Greek|Italian',
'Latin American / Caribbean':r'Mexican|Peruvian|Chilean|Brazilian|Colombian|Costa Rican|Caribbean|Martini',
'North American':r'Canadian|American', 'Māori / Polynesian':r'Māori',
'Invented / fantasy / speculative':r'Invented|invented|fantasy|folklore|orbital|Orbital|future|portal|Portal|saga|Saga|storybook|spirit|magical'}
report+='## Cultural and setting range\n\nMulti-label counts below match the **authored design-basis text**; mixed backgrounds count in several rows, so these are not percentages and must not be summed. They are not claims that a name uniquely identifies an ethnicity. Non-human local ecology and invented cultures are tracked through the same explicit text.\n\n'
report+=table(['Design-basis category','Count'],[[name,sum(bool(re.search(pattern,r['cultural_basis'])) for r in rows)] for name,pattern in CULTURES.items()])
report+='## Changes that improve coverage\n\nThe first authored 192-character pass covered 186/210 pairs. Refinement measured each missed pair and each thin Role × Type cell, then revised transferable performance logic rather than appending a fourth affinity. The final pass covers 210/210 and all 168 Role × Type × Genre cells visibly, with at least two complete-affinity options per cell. Fantasy is no longer a catch-all; Survival, Pirate, Martial Arts, Mythology and Nordic have independent role coverage. The source roster had zero entries in those five new GenreIds.\n\n'
report+='Grounded antagonists now include school/social rivals, coaches, a camp warden, a clinic director, a gallery director, a residential manager, talent management and a Nordic restaurateur. Monster/ghost antagonists remain for productions that call for them. Three already non-human support characters moved to Mascot; Pip remains a sapient analytical Sidekick. Two new mascots add pangolin and cuttlefish forms instead of repeating cats.\n\n'
report+=table(['Primary status','Count'],Counter(r['status'] for r in rows).items())
report+=f"Display names changed: {sum(r['old_name'] and r['old_name']!=r['new_name'] for r in rows if r['old_name'])}. Role changes: 9. Status is a primary category; migration notes record overlapping name/visual changes. Canonical visible/hidden slots replace all old merged extra-affinity arrays.\n\n"
report+='Automated checks: 192 unique IDs; 48 per role; 24 per Type per role; 12/12 ledger cells; exactly two visible and one hidden distinct valid affinities; every genre represented visibly and secretly; all 210 pairs enumerated and covered; every old ID retained; every source member has exactly one migration row. The separate mechanics validator checks discovery and 0/1/2 bonus tiers.\n'
save('CAST_V2_COVERAGE.md',report)
manifest=dict(source_commit='63e072d310670b6cb19dbef77d2d13526f7d5317',source_count=len(old),count=len(rows),preserved_ids=len(oldby),new_ids=sorted(set(r['id'] for r in rows)-set(oldby)),covered_pairs=sum(p['total']>0 for p in pairrows),pairs_measured=len(pairrows),single_witness_pairs=len(weak),minimum_group_complete=min(sum(g in gs(r) for r in rows if r['role']==role and r['anime_type']==typ) for role in ROLES for typ in TYPES for g in GENRES),minimum_group_visible=min(sum(g in gs(r)[:2] for r in rows if r['role']==role and r['anime_type']==typ) for role in ROLES for typ in TYPES for g in GENRES))
save('evidence/roster_validation.json',json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
