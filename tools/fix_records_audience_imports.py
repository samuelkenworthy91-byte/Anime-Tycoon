from pathlib import Path

p = Path('game_source/src/components/Projects.tsx')
s = p.read_text()
s = s.replace('  dateLabel,\n', '')
p.write_text(s)

p = Path('game_source/src/engine/__tests__/audience-time.test.ts')
s = p.read_text().replace('import { describe, expect, it, vi } from "vitest";', 'import { describe, expect, it } from "vitest";')
p.write_text(s)
print('cleaned day/audience UI test imports')
