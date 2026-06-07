// Builds the project and deploys dist/ to the gh-pages branch.
// Usage: npm run deploy
//
// This is a stopgap while the auto-deploy GitHub Actions workflow is
// blocked on OAuth `workflow` scope. Once the workflow at
// .github/workflows/deploy.yml is committed and pushed, this script
// becomes optional.
import { execSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync, cpSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const wt = resolve(root, '.gh-pages-tmp');

function run(cmd, cwd = root) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function quiet(cmd, cwd = root) {
  return execSync(cmd, { cwd }).toString().trim();
}

// 1. Fresh build
if (existsSync(resolve(root, 'dist'))) {
  rmSync(resolve(root, 'dist'), { recursive: true });
}
run('npm run build');

// 2. Set up gh-pages worktree (creates branch if missing)
if (existsSync(wt)) {
  try {
    run(`git worktree remove ${wt} -f`);
  } catch {
    rmSync(wt, { recursive: true, force: true });
  }
}

const branches = quiet('git branch --list gh-pages');
if (!branches.includes('gh-pages')) {
  run(`git worktree add -B gh-pages ${wt}`);
} else {
  run(`git worktree add ${wt} gh-pages`);
}

// 3. Clear the worktree (keep .git only)
for (const entry of readdirSync(wt)) {
  if (entry !== '.git') {
    rmSync(resolve(wt, entry), { recursive: true, force: true });
  }
}

// 4. Copy dist contents into worktree
cpSync(resolve(root, 'dist'), wt, { recursive: true });

// 5. Add a .nojekyll so GitHub Pages serves files starting with _ correctly
writeFileSync(resolve(wt, '.nojekyll'), '');

// 6. Commit + push
run('git add -A', wt);
let didCommit = true;
try {
  const status = quiet('git status --porcelain', wt);
  if (!status) {
    console.log('No changes to deploy.');
    didCommit = false;
  } else {
    const shortSha = quiet('git rev-parse --short main');
    run(`git commit -m "Deploy ${shortSha}"`, wt);
  }
} catch (err) {
  console.error('Commit failed:', err.message);
  process.exit(1);
}

if (didCommit) {
  run('git push origin gh-pages', wt);
}

// 7. Clean up worktree
try {
  run(`git worktree remove ${wt} -f`);
} catch {
  rmSync(wt, { recursive: true, force: true });
}

console.log('\n✓ Deployed to https://chinmaykodag.github.io/habit-tracker/');
console.log('  Pages may take 30-90 seconds to update.');
