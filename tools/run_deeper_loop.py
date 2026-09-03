from pathlib import Path
import runpy

src = Path(__file__).with_name("apply_deeper_loop.py")
text = src.read_text(encoding="utf-8")
old = "replace_once(produce, '              lifeMult={lifeMult}\\n              bugRate={bugRate}', '              lifeMult={lifeMult}\\n              autoSpeedMult={autoSpeedMult}\\n              bugRate={bugRate}')"
new = "replace_once(produce, '              lifeMult={lifeMult}\\n              bugRate={isEdit ? 1 : bugRate}', '              lifeMult={lifeMult}\\n              autoSpeedMult={autoSpeedMult}\\n              bugRate={isEdit ? 1 : bugRate}')"
if old not in text:
    raise SystemExit("Expected Produce prop anchor patch not found in migration script")
fixed = Path(__file__).with_name("apply_deeper_loop_fixed.py")
fixed.write_text(text.replace(old, new, 1), encoding="utf-8")
try:
    runpy.run_path(str(fixed), run_name="__main__")
finally:
    fixed.unlink(missing_ok=True)
