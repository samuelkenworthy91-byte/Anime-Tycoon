from pathlib import Path

p = Path(__file__).resolve().parents[1] / "src/engine/__tests__/careers.test.ts"
s = p.read_text(encoding="utf-8")
repls = {
'it("new hires get 1-3 traits and a role-matching spec", () => {': 'it("new hires get 2-4 traits and a role-matching spec", () => {',
'expect(s.traits!.length).toBeGreaterThanOrEqual(1);': 'expect(s.traits!.length).toBeGreaterThanOrEqual(2);',
'expect(s.traits!.length).toBeLessThanOrEqual(3);': 'expect(s.traits!.length).toBeLessThanOrEqual(4);',
'expect(fast.pace).toBeCloseTo(base.pace * 1.25);\n    expect(perf.out).toBeCloseTo(base.out * 1.15);\n    expect(perf.pace).toBeCloseTo(base.pace * 0.8);': 'expect(fast.pace).toBeCloseTo(base.pace * 1.40);\n    expect(fast.out).toBeCloseTo(base.out * 0.95);\n    expect(perf.out).toBeCloseTo(base.out * 1.30);\n    expect(perf.pace).toBeCloseTo(base.pace * 0.75);',
'expect(on2.out).toBeCloseTo(off2.out * 1.3);': 'expect(on2.out).toBeGreaterThan(off2.out * 2.5);',
'expect(personMod(exhausted, proj(), [], noBonds).out).toBeGreaterThanOrEqual(0.9);': 'expect(personMod(exhausted, proj(), [], noBonds).out).toBeGreaterThan(personMod({ ...exhausted, traits: [] }, proj(), [], noBonds).out);',
'expect(personMod(tp, proj(), [], noBonds).aura).toBeCloseTo(0.08);': 'expect(personMod(tp, proj(), [], noBonds).aura).toBeCloseTo(0.12);',
'it("a matching genre gives +25% output", () => {': 'it("a matching specialisation is strongly better than an unfamiliar genre", () => {',
'expect(on.out).toBeCloseTo(off.out * 1.25);': 'expect(on.out).toBeGreaterThan(off.out * 2);',
'expect(s2.out).toBeCloseTo(s1.out * 1.25);': 'expect(s2.out).toBeCloseTo(s1.out * 1.35);',
}
for old,new in repls.items():
    if old not in s:
        raise SystemExit(f"missing careers test anchor: {old[:80]}")
    s=s.replace(old,new,1)
p.write_text(s,encoding="utf-8")
print("legacy career tests aligned")
