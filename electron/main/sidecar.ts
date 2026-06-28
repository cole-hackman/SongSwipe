import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface } from 'node:readline'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { app } from 'electron'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

type Pending = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
}

let child: ChildProcessWithoutNullStreams | null = null
let nextId = 1
const pending = new Map<number, Pending>()

function pythonExecutable(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'sidecar-venv', 'bin', 'python3')
  }
  return path.join(process.env.APP_ROOT ?? '', '.venv', 'bin', 'python3')
}

function bridgeScript(): string {
  return path.join(process.env.APP_ROOT ?? '', 'sidecar', 'rb_bridge.py')
}

export function startSidecar(): void {
  if (child) return

  const script = bridgeScript()
  const executable = pythonExecutable()

  child = spawn(executable, [script], {
    cwd: path.dirname(script),
    env: { ...process.env },
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
    console.error('[sidecar]', chunk.toString())
  })

  child.on('exit', (code) => {
    console.error(`Sidecar exited with code ${code}`)
    child = null
    for (const [, entry] of pending) {
      entry.reject(new Error('Sidecar process exited'))
    }
    pending.clear()
  })
}

export function stopSidecar(): void {
  if (!child) return
  child.kill()
  child = null
}

export function callSidecar<T = unknown>(
  method: string,
  params: Record<string, unknown> = {},
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
    pending.set(id, {
      resolve: resolve as (value: unknown) => void,
      reject,
    })
    child!.stdin.write(request, (error) => {
      if (error) {
        pending.delete(id)
        reject(error)
      }
    })
  })
}
