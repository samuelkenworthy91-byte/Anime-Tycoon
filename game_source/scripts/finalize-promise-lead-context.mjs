import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

if (process.env.GITHUB_WORKFLOW !== 'Publish GitHack dist') {
  console.log(`Skipping source finalisation in workflow: ${process.env.GITHUB_WORKFLOW ?? 'local'}`);
  process.exit(0);
}

const repoRoot = '..';
const runGit = (...args) => execFileSync('git', ['-C', repoRoot, ...args], { stdio: 'inherit' });

runGit('config', 'user.name', 'github-actions[bot]');
runGit('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');

const status = execFileSync('git', ['-C', repoRoot, 'status', '--porcelain'], { encoding: 'utf8' });
if (!status.includes('game_source/src/components/Produce.tsx') || !status.includes('game_source/src/App.tsx')) {
  throw new Error(`Expected patched production files before finalisation. Status:\n${status}`);
}

runGit('checkout', 'HEAD^', '--', 'game_source/package.json');
for (const path of [
  'game_source/scripts/patch-promise-lead-context.mjs',
  'game_source/scripts/finalize-promise-lead-context.mjs',
]) {
  if (fs.existsSync(path.replace('game_source/', ''))) runGit('rm', '-f', path);
}

runGit('add',
  'game_source/package.json',
  'game_source/src/App.tsx',
  'game_source/src/components/Produce.tsx',
  'game_source/docs/THREE_CLICK_UX_AUDIT.md',
);
runGit('commit', '-m', 'Surface promised leads in rush and edit screens');
runGit('push', 'origin', 'HEAD:main');
console.log('Validated promise-lead UX patch committed to main and temporary hooks removed.');
