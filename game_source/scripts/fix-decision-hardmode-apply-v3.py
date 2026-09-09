from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
APPLY = ROOT / "scripts/apply-decision-hardmode.py"

# First apply all v2 hardening: exact genre targets, audience-learning patch,
# and the uniquely anchored preview fan multiplier.
subprocess.run([sys.executable, str(ROOT / "scripts/fix-decision-hardmode-apply-v2.py")], check=True)

s = APPLY.read_text()

# The Projects file deliberately contains two prop destructuring blocks with
# the same three-line shape: one for ProjectCard and one for ProjectsPanel.
# The integration script already has a separate later patch for the panel, so
# this first patch must replace only the FIRST occurrence instead of requiring
# global uniqueness.
helper_anchor = '''def once(text, old, new, label):
    if text.count(old) != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {text.count(old)}")
    return text.replace(old, new, 1)

'''
helper_replacement = helper_anchor + '''def first(text, old, new, label):
    if old not in text:
        raise SystemExit(f"{label}: patch point missing")
    return text.replace(old, new, 1)

'''
if 'def first(text, old, new, label):' not in s:
    if helper_anchor not in s:
        raise SystemExit('could not insert first-match helper')
    s = s.replace(helper_anchor, helper_replacement, 1)

lines = s.splitlines(keepends=True)
hit = next((i for i, line in enumerate(lines) if '"card scrap prop")' in line), None)
if hit is None:
    raise SystemExit('card scrap prop block missing')
start = hit
while start >= 0 and not lines[start].startswith('s = once(s,') and not lines[start].startswith('s = first(s,'):
    start -= 1
if start < 0:
    raise SystemExit('card scrap prop block start missing')
lines[start] = lines[start].replace('s = once(s,', 's = first(s,', 1)
s = ''.join(lines)

APPLY.write_text(s)
print('decision hardmode patch v3 hardened')
