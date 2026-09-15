import fs from 'node:fs';

const path = 'src/components/Office.tsx';
let s = fs.readFileSync(path, 'utf8');
function rep(a,b,label){if(!s.includes(a)) throw new Error(`anchor missing: ${label}`);s=s.replace(a,b);}
if (!s.includes('QUICK BEST TEAM')) {
  rep('  POINT_COLOR,\n  workerLookIndex,', '  POINT_COLOR,\n  staffPoint,\n  workerLookIndex,', 'staffPoint import');
  rep('  startBlockReason,\n  startResearchProject,', '  startBlockReason,\n  startContractAssignment,\n  startResearchProject,', 'startContractAssignment import');
  rep('  researchBlockReason,\n  type RunState,', '  researchBlockReason,\n  staffBusyReason,\n  type RunState,', 'staffBusyReason import');
  const old = `                <Btn variant="cyan" className="!px-3 !py-1.5 text-xs" onClick={() => onContract(c)}>\n                  TAKE\n                </Btn>`;
  const neu = `                {(() => {\n                  const best = run.staff\n                    .filter((st) => !staffBusyReason(run, st.id))\n                    .sort((a, b) => staffPoint(b, c.type) - staffPoint(a, c.type))\n                    .slice(0, 3);\n                  return <div className="flex flex-col gap-1">\n                    <Btn variant="cyan" className="!px-3 !py-1.5 text-xs" disabled={best.length === 0} onClick={() => {\n                      sfx.fanfare();\n                      setRun((r) => {\n                        const ids = r.staff\n                          .filter((st) => !staffBusyReason(r, st.id))\n                          .sort((a, b) => staffPoint(b, c.type) - staffPoint(a, c.type))\n                          .slice(0, 3)\n                          .map((st) => st.id);\n                        return startContractAssignment(r, c, ids, false) ?? r;\n                      });\n                    }}>QUICK BEST TEAM</Btn>\n                    <Btn variant="ghost" className="!px-3 !py-1 text-[9px]" onClick={() => onContract(c)}>CUSTOM TEAM</Btn>\n                  </div>;\n                })()}`;
  rep(old, neu, 'contract take button');
  fs.writeFileSync(path,s);
}
console.log('Quick contract assignment integrated.');
