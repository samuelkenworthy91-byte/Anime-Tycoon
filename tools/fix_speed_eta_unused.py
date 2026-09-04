from pathlib import Path

p = Path("game_source/src/components/ContractJob.tsx")
text = p.read_text()
old_import = 'import { useMemo, useState } from "react";'
new_import = 'import { useState } from "react";'
old_crew = '  const crew = useMemo(() => run.staff.filter((s) => selected.includes(s.id)), [run.staff, selected]);\n'
if text.count(old_import) != 1:
    raise RuntimeError("ContractJob React import anchor missing")
if text.count(old_crew) != 1:
    raise RuntimeError("ContractJob crew memo anchor missing")
text = text.replace(old_import, new_import, 1).replace(old_crew, "", 1)
p.write_text(text)
print("cleaned ContractJob unused crew memo")
