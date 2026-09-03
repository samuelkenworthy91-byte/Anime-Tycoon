from pathlib import Path

p = Path(__file__).resolve().parents[1] / "game_source/src/engine/state.ts"
s = p.read_text()
s = s.replace("st.stamina = Math.min(100, st.stamina + 38 + fx.staminaRest * 2);\n      if (st.stamina >= 68) delete resting[st.id];", "st.stamina = Math.min(100, st.stamina + 50 + fx.staminaRest * 2);\n      if (st.stamina >= 100) delete resting[st.id];")
p.write_text(s)
print("Recovery now takes roughly two strong rest days and returns staff fully charged")
