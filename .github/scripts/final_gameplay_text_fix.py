from pathlib import Path

# Temporary branch-only final copy migration used by the validated gameplay pass.
ROOT = Path('game_source/src')

def replace(rel: str, old: str, new: str) -> None:
    path = ROOT / rel
    text = path.read_text()
    if old not in text:
        raise SystemExit(f'{rel}: missing expected text: {old!r}')
    path.write_text(text.replace(old, new, 1))

replace(
    'components/BigThreeBoard.tsx',
    'The cultural landscape changes in Year 6.',
    'The cultural landscape changes in Year 3.'
)
replace(
    'components/BigThreeBoard.tsx',
    '<div className="text-[9px] text-paper/50">Fan-decided cultural canon · three permanent monuments for this era</div>',
    '<div className="text-[9px] text-paper/50">Fan-decided cultural canon · three permanent monuments for this era</div><div className="mt-0.5 text-[8px] text-gold/65">38+/40 · 150,000+ reach · elite all-round craft · sustained cultural momentum · at least 48 weeks between inductions</div>'
)
replace(
    'components/BigThreeReveal.tsx',
    'Your studio gains +75,000 fans, +60 RD, permanent franchise prestige and stronger renewal leverage for a licensed property.',
    'Your studio gains +75,000 fans, +60 RD and permanent franchise prestige. Big Three properties get +40% direct continuation revenue and +60% merchandise demand; licensed properties also gain stronger renewal leverage.'
)
replace(
    'engine/state.ts',
    '/** Year-6+ fan-decided cultural canon. Exactly three slots can ever be filled. */',
    '/** Year-3+ fan-decided cultural canon. Exactly three slots can ever be filled. */'
)
replace(
    'engine/rivalPosters.ts',
    '/** Dedicated Year-6 Big Three flagship art; never consumed by routine rival slates. */',
    '/** Dedicated Year-3 Big Three flagship art; never consumed by routine rival slates. */'
)
replace(
    'engine/bigThree.ts',
    '/* old post-Year-6 saves start competing from the moment this feature is',
    '/* old post-Year-3 saves start competing from the moment this feature is'
)
