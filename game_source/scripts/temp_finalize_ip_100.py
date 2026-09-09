from pathlib import Path
import json
import re

root=Path(__file__).resolve().parents[1]
catalog=[
(81,'Skyshard Chronicle','Dark Cloud','game','shojo','fantasy','magical','World Rebuilding Quest','lore','Worldbuilding Dive'),
(82,'Bramble & Beak','Banjo-Kazooie','game','shojo','comedy','fantasy','Collectathon World Hop','lore','Worldbuilding Dive'),
(83,'Scarlet Tail',"Conker's Bad Fur Day",'game','shonen','comedy','survival','Bad-Day Escalation','cliffhanger','Cliffhanger'),
(84,'Mindgate Zero','Psi-Ops: The Mindgate Conspiracy','game','shonen','supernatural','military','Psychic Blacksite Conspiracy','twist','Plot Twist'),
(85,'Sea of the Second Sun','Life of Pi','film','shojo','survival','mythology','Castaway Faith Voyage','lore','Worldbuilding Dive'),
(86,'Ashen Mile','The Road','novel','shojo','survival','horror','Parent-and-Child Pilgrimage','cliffhanger','Cliffhanger'),
(87,'Tideborn Drift','Waterworld','film','shonen','pirate','survival','Oceanic Settlement Siege','war','War Arc'),
(88,'Townlight Rhythm','Footloose','film','shojo','romance','idol','Dance Ban Rebellion','live','Live Performance'),
(89,'Autumn Chalkheart','Good Will Hunting','film','shojo','slice','romance','Reluctant Prodigy Mentorship','confession','Confession'),
(90,'Paper Constellations','Wish I Was Here','film','shojo','slice','comedy','Family Reinvention','origin','Origin Story'),
(91,'Golden Whistle','Ted Lasso','tv','shojo','sports','slice','Culture-First Underdog Season','tournament','Tournament Arc'),
(92,'Primate Panic','Ape Escape','game','shojo','comedy','cyber','Time-Hopping Primate Hunt','launch','Launch Arc'),
(93,'Ashfall Junction','Jericho','tv','shojo','survival','military','Small-Town Nuclear Aftermath','war','War Arc'),
(94,'Smile Trigger','Happy!','tv','shonen','comedy','supernatural','Imaginary Sidekick Investigation','twist','Plot Twist'),
(95,'Wings of Yesterday','The Butterfly Effect','film','shojo','supernatural','mystery','Memory Rewrite Cascade','twist','Plot Twist'),
(96,'Desert Formula','Breaking Bad','tv','shonen','mystery','survival','Criminal Transformation','origin','Origin Story'),
(97,'The Last Windkeeper','Avatar: The Last Airbender','tv','shonen','magical','martial','Four Nations Journey','lore','Worldbuilding Dive'),
(98,'Aether Divide','Arcane','tv','shojo','cyber','magical','Twin City Revolution','war','War Arc'),
(99,'Starwind Outlaws','Firefly','tv','shonen','space','pirate','Found-Family Job','launch','Launch Arc'),
(100,'Pine Veil','Twin Peaks','tv','shojo','mystery','supernatural','Dream Logic Investigation','twist','Plot Twist'),
]

def anti_for(g1,g2):
    if 'romance' in (g1,g2) or 'slice' in (g1,g2): return 'military'
    if 'comedy' in (g1,g2) or 'sports' in (g1,g2): return 'horror'
    return 'slice'

costs=[26000,29000,32000,14000,17000,20000,23000]

# Runtime catalogue.
p=root/'src/engine/userIpCatalog.ts'; s=p.read_text()
if '"slot":81' not in s:
    rows=[]
    for slot,title,ref,source,atype,g1,g2,arc_name,partner,partner_name in catalog:
        obj={'slot':slot,'id':f'ip_{slot:03d}','title':title,'sourceType':source,'animeType':atype,'genres':[g1,g2],'hiddenArcId':f'ip_arc_{slot:03d}','posterAsset':f'/auction-ip/poster_{slot:03d}.webp'}
        rows.append('  '+json.dumps(obj,separators=(',',':'))+',')
    s=s.replace('] as const;','\n'.join(rows)+'\n] as const;')
    p.write_text(s)

# One source-inspired studio-wide hidden blueprint per property.
p=root/'src/engine/ipHiddenArcs.ts'; s=p.read_text()
if '"slot":81' not in s:
    rows=[]
    for slot,title,ref,source,atype,g1,g2,arc_name,partner,partner_name in catalog:
        obj={
            'slot':slot,'id':f'ip_arc_{slot:03d}','name':arc_name,
            'cost':costs[(slot-81)%len(costs)],'q':2,'f':0.02,
            'syn':[g1,g2],'synQ':4,'synF':0.025,'anti':[anti_for(g1,g2)],'antiQ':-3,'antiF':-0.01,
            'partnerArc':partner,'comboName':f'{arc_name} + {partner_name}',
            'desc':f'A signature {arc_name.lower()} structure learned from {title}; exceptional with its native genres, but transferable to other productions once mastered.'
        }
        rows.append('  '+json.dumps(obj,separators=(',',':'))+',')
    s=s.replace('] as const;','\n'.join(rows)+'\n] as const;',1)
    p.write_text(s)

# Canonical regression coverage.
p=root/'src/engine/__tests__/annual-auction-hidden-arcs.test.ts'; s=p.read_text()
s=s.replace('uses the full 80-property user catalogue','uses the full 100-property user catalogue')
s=s.replace('expect(AUCTION_IPS).toHaveLength(80);','expect(AUCTION_IPS).toHaveLength(100);')
s=s.replace('expect(new Set(ids).size).toBe(80);','expect(new Set(ids).size).toBe(100);')
needle='    for(const id of ids){const a=ARCS.find(x=>x.id===id);expect(a?.unlock).toEqual({kind:"studioArc"});expect(a?.syn?.length).toBeGreaterThanOrEqual(2);}\n'
if needle in s and 'toHaveLength(50)' not in s:
    s=s.replace(needle,needle+'    expect(AUCTION_IPS.map(ip=>ip.posterSlot)).toEqual(Array.from({length:100},(_,i)=>i+1));\n    expect(AUCTION_IPS.filter(ip=>ip.animeType==="shonen")).toHaveLength(50);\n    expect(AUCTION_IPS.filter(ip=>ip.animeType==="shojo")).toHaveLength(50);\n')
p.write_text(s)

p=root/'src/engine/__tests__/ip-expansion.test.ts'; s=p.read_text()
s=s.replace('assigns immutable poster slots inside the 80-asset contract','assigns immutable poster slots inside the 100-asset contract')
s=s.replace('x.posterSlot<=80','x.posterSlot<=100')
p.write_text(s)

# All 100 slots are now assigned and therefore all 100 uploaded assets are validated.
p=root/'docs/AUCTION_IP_POSTER_SLOTS.csv'; s=p.read_text()
for slot in range(1,101):
    pattern=rf'^"{slot}","poster_{slot:03d}\.webp","[^"]*","[^"]*","(?:reserved|assigned)"$'
    replacement=f'"{slot}","poster_{slot:03d}.webp","ip_{slot:03d}","","assigned"'
    s,n=re.subn(pattern,replacement,s,flags=re.MULTILINE)
    if n!=1: raise RuntimeError(f'poster slot {slot} row not found exactly once')
p.write_text(s)

# Documentation catalogue keeps homage/reference names out of runtime.
p=root/'docs/USER_AUCTION_IP_CATALOG.csv'; s=p.read_text().rstrip('\n')
if not any(line.startswith('81,') for line in s.splitlines()):
    def q(v): return '"'+v.replace('"','""')+'"' if ',' in v else v
    rows=[f'{slot},poster_{slot:03d}.webp,user_ip_{slot:03d},{q(title)},{q(ref)},{atype},{g1},{g2}' for slot,title,ref,source,atype,g1,g2,arc_name,partner,partner_name in catalog]
    s+='\n'+'\n'.join(rows)
p.write_text(s+'\n')

p=root/'docs/USER_AUCTION_IP_HIDDEN_ARCS.csv'; s=p.read_text().rstrip('\n')
if not any(line.startswith('81,') for line in s.splitlines()):
    def q(v): return '"'+v.replace('"','""')+'"' if ',' in v else v
    rows=[f'{slot},{q(title)},ip_arc_{slot:03d},{q(arc_name)},{g1},{g2},{partner},{q(partner_name)}' for slot,title,ref,source,atype,g1,g2,arc_name,partner,partner_name in catalog]
    s+='\n'+'\n'.join(rows)
p.write_text(s+'\n')

p=root/'public/auction-ip/README.md'; s=p.read_text()
s=s.replace('poster_080.webp','poster_100.webp').replace('These 80 slots','These 100 slots').replace('The 80-IP','The 100-IP').replace('live 80-property catalogue','live 100-property catalogue')
p.write_text(s)

p=root/'docs/ECONOMY_IP_EXPANSION_COMPLETION.md'; s=p.read_text().replace('Canonical 80-property annual IP auction catalogue','Canonical 100-property annual IP auction catalogue')
p.write_text(s)
