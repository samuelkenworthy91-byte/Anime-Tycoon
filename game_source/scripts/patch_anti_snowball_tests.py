from pathlib import Path

p = Path(__file__).resolve().parents[1] / "src/engine/__tests__/market.test.ts"
s = p.read_text(encoding="utf-8")

old = '''  it("splits audience attention across simultaneous releases", () => {
    expect(attentionMult(0)).toBe(1);
    expect(attentionMult(1)).toBeCloseTo(0.93, 5);
    expect(attentionMult(10)).toBe(0.8); // floor
  });'''
new = '''  it("splits audience attention more sharply across simultaneous releases", () => {
    expect(attentionMult(0)).toBe(1);
    expect(attentionMult(1)).toBeCloseTo(0.9, 5);
    expect(attentionMult(3)).toBeCloseTo(0.7, 5);
    expect(attentionMult(10)).toBe(0.65); // anti-snowball floor
  });'''
if s.count(old) != 1:
    raise SystemExit(f"attention contract test: expected one match, found {s.count(old)}")
s = s.replace(old, new, 1)

old = '''    const stacked = attentionMult(3);
    expect(stacked).toBeLessThan(singles);
    expect(stacked).toBeGreaterThanOrEqual(0.8);'''
new = '''    const stacked = attentionMult(3);
    expect(stacked).toBeLessThan(singles);
    expect(stacked).toBeCloseTo(0.7, 5);
    expect(stacked).toBeGreaterThanOrEqual(0.65);'''
if s.count(old) != 1:
    raise SystemExit(f"stacking balance test: expected one match, found {s.count(old)}")
s = s.replace(old, new, 1)

p.write_text(s, encoding="utf-8")
print("market anti-snowball expectations updated")
