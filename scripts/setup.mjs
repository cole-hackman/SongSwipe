// One-command setup: creates the Python venv, installs Python + Node
// dependencies. Works on Windows and macOS/Linux. Requires Node and Python
// to already be installed (see the README for how to get them).
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { repoRoot, venvPython } from './_venv.mjs'

const isWindows = process.platform === 'win32'

function step(message) {
  console.log(`\n==> ${message}`)
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: repoRoot, ...opts })
  if (result.error) {
    console.error(`\nCould not run "${cmd}". Is it installed and on your PATH?`)
    console.error(result.error.message)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status ?? 1)
}

// 1. Locate a system Python to create the venv with.
const systemPython = isWindows ? 'python' : 'python3'

// 2. Create the virtual environment (skip if it already exists).
if (existsSync(venvPython())) {
  step('Python virtual environment already exists — skipping')
} else {
  step('Creating Python virtual environment (.venv)')
  run(systemPython, ['-m', 'venv', '.venv'])
}

// 3. Install the Python packages the Rekordbox bridge needs.
step('Installing Python packages (this can take a few minutes)')
run(venvPython(), ['-m', 'pip', 'install', '--upgrade', 'pip', '-q'])
run(venvPython(), ['-m', 'pip', 'install', '-r', 'sidecar/requirements.txt'])

// 4. Install the Node packages for the app.
step('Installing app packages')
run('npm', ['install', '--legacy-peer-deps'], { shell: true })

console.log('\n=====================================')
console.log(' Done! Setup complete.')
console.log(' Start the app with:  npm run dev')
console.log('=====================================')
