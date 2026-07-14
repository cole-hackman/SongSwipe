// Shared helper: resolves the Python interpreter inside the local .venv,
// picking the correct layout per OS (Windows uses Scripts\, Unix uses bin/).
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function venvPython() {
  return process.platform === 'win32'
    ? path.join(repoRoot, '.venv', 'Scripts', 'python.exe')
    : path.join(repoRoot, '.venv', 'bin', 'python')
}

export function venvExists() {
  return existsSync(venvPython())
}
