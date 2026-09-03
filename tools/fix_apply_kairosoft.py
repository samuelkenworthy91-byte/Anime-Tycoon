from pathlib import Path
p = Path('tools/apply_kairosoft_pass.py')
s = p.read_text()
bad = '''replace(produce,\n''' + "'''  milestone: MilestoneId;\\n  paused: boolean;\\n  onDone:''',\n'''  milestone: MilestoneId;\\n  paused: boolean;\\n  workPulses = [],\\n  onDone:''')" + '''\n'''
if bad not in s:
    raise SystemExit('bad Produce signature patch block not found')
s = s.replace(bad, '''replace(produce,\n''' + "'''export default function Produce({ run, project, milestone, onDone, onBack }: {''',\n'''export default function Produce({ run, project, milestone, workPulses = [], onDone, onBack }: {''')" + '''\n''')
p.write_text(s)
print('fixed Produce migration signature anchor')
