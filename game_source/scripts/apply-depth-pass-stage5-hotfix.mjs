import fs from 'node:fs';
const path='scripts/apply-depth-pass-stage5.mjs';
let s=fs.readFileSync(path,'utf8');
for (const token of ['${id}|score','${id}|week']) {
  if (!s.includes(token)) throw new Error(`missing stage5 token ${token}`);
  s=s.replace(token, `\\${token}`);
}
fs.writeFileSync(path,s);
console.log('Stage 5 generator escaping repaired');
