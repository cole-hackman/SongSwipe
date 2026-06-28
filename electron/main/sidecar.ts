import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface } from 'node:readline'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app } from 'electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

type Pending = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
}

export type SidecarStatus = {
  state: 'starting' | 'ready' | 'error'
  error?: string
}

let child: ChildProcessWithoutNullStreams | null = null
let nextId = 1
const pending = new Map<number, Pending>()
let status: SidecarStatus = { state: 'starting' }
let lastStderr = ''
let stoppingIntentionally = false

function sidecarBinaryName(): string {
  return process.platform === 'win32' ? 'rb-bridge.exe' : 'rb-bridge'
}

function sidecarPaths(): { executable: string; args: string[]; cwd: string } {
  if (app.isPackaged) {
    const resources = process.resourcesPath
    const bundled = path.join(resources, sidecarBinaryName())
    const script = path.join(resources, 'sidecar', 'rb_bridge.py')
    const hasBinary = existsSync(bundled)
    if (hasBinary) {
      return { executable: bundled, args: [], cwd: path.dirname(bundled) }
    }
    const python = path.join(resources, 'sidecar-venv', 'bin', 'python3')
    return { executable: python, args: [script], cwd: path.dirname(script) }
  }

  const appRoot = process.env.APP_ROOT ?? ''
  const script = path.join(appRoot, 'sidecar', 'rb_bridge.py')
  const python = path.join(appRoot, '.venv', 'bin', 'python3')
  return { executable: python, args: [script], cwd: path.dirname(script) }
}

let dbPathOverride: string | null = null

export function setSidecarDbPath(path: string | null): void {
  dbPathOverride = path
  if (path) {
    process.env.SONGSWIPE_DB_PATH = path
  } else {
    delete process.env.SONGSWIPE_DB_PATH
  }
}

export function getSidecarDbPath(): string | null {
  return dbPathOverride
}

function sidecarEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  if (dbPathOverride) {
    env.SONGSWIPE_DB_PATH = dbPathOverride
  }
  return env
}

export function restartSidecar(): void {
  stopSidecar()
  startSidecar()
}

export function getSidecarStatus(): SidecarStatus {
  return status
}

export function getSidecarStderr(): string {
  return lastStderr
}

function setStatus(next: SidecarStatus): void {
  status = next
}

export function startSidecar(): void {
  if (child) return

  setStatus({ state: 'starting' })
  lastStderr = ''

  const { executable, args, cwd } = sidecarPaths()

  child = spawn(executable, args, {
    cwd,
    env: sidecarEnv(),
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  const rl = createInterface({ input: child.stdout })
  rl.on('line', (line) => {
    try {
      const payload = JSON.parse(line) as {
        id?: number
        result?: unknown
        error?: { message: string }
      }
      if (payload.id == null) return
      const entry = pending.get(payload.id)
      if (!entry) return
      pending.delete(payload.id)
      if (payload.error) {
        entry.reject(new Error(payload.error.message))
      } else {
        entry.resolve(payload.result)
      }
    } catch (error) {
      console.error('Failed to parse sidecar response', error, line)
    }
  })

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString()
    lastStderr = (lastStderr + text).slice(-4000)
    console.error('[sidecar]', text)
  })

  child.on('error', (error) => {
    setStatus({ state: 'error', error: error.message })
    child = null
  })

  child.on('exit', (code) => {
    if (!stoppingIntentionally && status.state === 'ready') {
      setStatus({
        state: 'error',
        error: lastStderr.trim() || `Sidecar exited unexpectedly (code ${code ?? 'unknown'})`,
      })
    } else if (!stoppingIntentionally && status.state !== 'ready') {
      setStatus({
        state: 'error',
        error: lastStderr.trim() || `Sidecar exited with code ${code ?? 'unknown'}`,
      })
    }
    child = null
    stoppingIntentionally = false
    for (const [, entry] of pending) {
      entry.reject(new Error('Sidecar process exited'))
    }
    pending.clear()
  })
}

export async function ensureSidecarReady(timeoutMs = 5000): Promise<SidecarStatus> {
  if (!child) startSidecar()

  try {
    await callSidecar('ping', {}, timeoutMs)
    setStatus({ state: 'ready' })
    return status
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sidecar ping failed'
    setStatus({ state: 'error', error: lastStderr.trim() || message })
    return status
  }
}

export function stopSidecar(): void {
  if (!child) return
  stoppingIntentionally = true
  child.kill()
  child = null
  setStatus({ state: 'starting' })
}

export function callSidecar<T = unknown>(
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 30000,
): Promise<T> {
  if (!child?.stdin.writable) {
    startSidecar()
  }
  if (!child?.stdin.writable) {
    return Promise.reject(new Error('Sidecar is not running'))
  }

  const id = nextId++
  const request = JSON.stringify({ id, method, params }) + '\n'

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`Sidecar call timed out: ${method}`))
    }, timeoutMs)

    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timer)
        resolve(value as T)
      },
      reject: (error) => {
        clearTimeout(timer)
        reject(error)
      },
    })

    child!.stdin.write(request, (error) => {
      if (error) {
        clearTimeout(timer)
        pending.delete(id)
        reject(error)
      }
    })
  })
}
