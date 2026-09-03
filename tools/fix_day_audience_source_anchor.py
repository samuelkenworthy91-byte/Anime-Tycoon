from pathlib import Path
p = Path('game_source/src/engine/state.ts')
s = p.read_text()
old = '    notices: [...r.notices, `🔬 Research started: ${def.name} — ${weeks} weeks to completion.`],'
new = '    notices: [...r.notices, `🔬 ${def.name} begins — ${weeks} weeks in R&D (cost ${rdCost} RD).`],'
if old not in s:
    raise SystemExit('current research-start notice anchor missing')
p.write_text(s.replace(old, new, 1))
print('normalised research-start notice for day migration')
