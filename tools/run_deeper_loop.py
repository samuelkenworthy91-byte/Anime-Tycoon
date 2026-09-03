from pathlib import Path
import runpy

src = Path(__file__).with_name("apply_deeper_loop.py")
text = src.read_text(encoding="utf-8")

old = "replace_once(produce, '              lifeMult={lifeMult}\\n              bugRate={bugRate}', '              lifeMult={lifeMult}\\n              autoSpeedMult={autoSpeedMult}\\n              bugRate={bugRate}')"
new = "replace_once(produce, '              lifeMult={lifeMult}\\n              bugRate={isEdit ? 1 : bugRate}', '              lifeMult={lifeMult}\\n              autoSpeedMult={autoSpeedMult}\\n              bugRate={isEdit ? 1 : bugRate}')"
if old not in text:
    raise SystemExit("Expected Produce prop anchor patch not found in migration script")
text = text.replace(old, new, 1)

old_market = '''# The partner tab already exposes reputation; append tier beside it wherever the literal rep line occurs.\nregex_once(\n    marketui,\n    r'(<span[^>]*>REP\\s*\\{rep\\}[^<]*</span>)',\n    r'\\1 <span className="ml-1 text-[9px] font-extrabold text-cyanx">{partnerTier(rep).label}</span>'\n)'''
new_market = '''# The partner tab already exposes reputation; show the relationship tier beside it.\nreplace_once(\n    marketui,\n    ''' + '"""' + '''                  <div className="shrink-0 text-[10px] font-bold text-cyanx">\\n                    {repLabel(rep)} · {rep}/100\\n                  </div>''' + '"""' + ''',\n    ''' + '"""' + '''                  <div className="shrink-0 text-right text-[10px] font-bold text-cyanx">\\n                    <div>{partnerTier(rep).label}</div>\\n                    <div className="text-paper/45">{repLabel(rep)} · {rep}/100</div>\\n                  </div>''' + '"""' + '''\n)'''
if old_market not in text:
    raise SystemExit("Expected Market partner-tier patch block not found in migration script")
text = text.replace(old_market, new_market, 1)

fixed = Path(__file__).with_name("apply_deeper_loop_fixed.py")
fixed.write_text(text, encoding="utf-8")
try:
    runpy.run_path(str(fixed), run_name="__main__")
finally:
    fixed.unlink(missing_ok=True)
