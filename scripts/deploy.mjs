// Publica dist/ en la rama gh-pages (GitHub Pages "Deploy from a branch").
// Uso: npm run deploy
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts })
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim()

const remote = out('git remote get-url origin')
const repo = remote.replace(/\.git$/, '').split('/').pop()
const sha = out('git rev-parse --short HEAD')

if (out('git status --porcelain')) {
  console.warn('⚠ Hay cambios sin commit; se publicará el estado actual del disco.')
}

run('npm test')
run('npx tsc --noEmit')
run('npx vite build', { env: { ...process.env, BASE_PATH: `/${repo}/` } })
writeFileSync('dist/.nojekyll', '')

const git = (cmd) => run(`git ${cmd}`, { cwd: 'dist' })
git('init -q -b gh-pages')
git('add -A')
git(`-c user.name="${out('git config user.name')}" -c user.email="${out('git config user.email')}" commit -q -m "Deploy ${sha}"`)
git(`push -f -q ${remote} gh-pages`)
console.log(`\n✓ Publicado ${sha} → https://${remote.split('/').at(-2)}.github.io/${repo}/`)
