// Builds the standalone rb-bridge sidecar binary with PyInstaller, on any OS.
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { repoRoot, venvPython, venvExists } from './_venv.mjs'

if (!venvExists()) {
  console.error('Python virtual environment not found (.venv).')
  console.error('Run the setup first:  npm run setup')
  process.exit(1)
}

const python = venvPython()
const sidecarDir = path.join(repoRoot, 'sidecar')

function run(args, cwd = repoRoot) {
  const result = spawnSync(python, args, { stdio: 'inherit', cwd })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run(['-m', 'pip', 'install', 'pyinstaller', '-q'])
run(['-m', 'PyInstaller', 'build.spec', '--noconfirm', '--clean'], sidecarDir)
