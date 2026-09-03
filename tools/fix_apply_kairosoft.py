from pathlib import Path

p = Path("tools/apply_kairosoft_pass.py")
s = p.read_text()
needle = "replace(produce,\n'''  milestone: MilestoneId;"
start = s.find(needle)
if start < 0:
    raise SystemExit("bad Produce signature patch start not found")
end = s.find("\nreplace(produce,", start + len(needle))
if end < 0:
    raise SystemExit("next Produce patch boundary not found")
replacement = '''replace(produce,
''' + "'''export default function Produce({ run, project, milestone, onDone, onBack }: {''',\n'''export default function Produce({ run, project, milestone, workPulses = [], onDone, onBack }: {''')" + '''
'''
s = s[:start] + replacement + s[end + 1:]
s = s.replace('import { COMBO, GENRES, comboKey, type GenreId } from "../engine/data";', 'import { COMBO, GENRES, type GenreId } from "../engine/data";')
p.write_text(s)
print("fixed Produce migration signature anchor and dossier import")
