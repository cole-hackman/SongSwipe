// Runs the local venv's Python with the given arguments, on any OS.
// Usage: node scripts/venv.mjs -m pytest sidecar/tests -q
import { spawnSync } from 'node:child_process'
import { repoRoot, venvPython, venvExists } from './_venv.mjs'

if (!venvExists()) {
  console.error('Python virtual environment not found (.venv).')
  console.error('Run the setup first:  npm run setup')
  process.exit(1)
}

const result = spawnSync(venvPython(), process.argv.slice(2), {
  stdio: 'inherit',
  cwd: repoRoot,
})
process.exit(result.status ?? 1)
