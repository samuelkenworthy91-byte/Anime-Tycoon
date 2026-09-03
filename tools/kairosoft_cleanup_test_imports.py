from pathlib import Path
p = Path('game_source/src/engine/__tests__/careers.test.ts')
s = p.read_text()
s = s.replace('import { makeProject, tickProjectsWeek, teamSpeed, type Project, type StaffModFn } from "../projects";', 'import { makeProject, teamSpeed, type Project } from "../projects";')
p.write_text(s)
print('cleaned obsolete weekly-production test imports')
