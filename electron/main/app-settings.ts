import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type AppSettings = {
  dbPathOverride?: string | null
  zeroRatingOnCut?: boolean
  prefetchAhead?: number
  prefetchBehind?: number
  autoPlay?: boolean
  waveformBarWidth?: number
  waveformNormalize?: boolean
  waveformFastMode?: boolean
  batchRules?: Array<{
    id: string
    enabled: boolean
    field: 'bpm' | 'rating' | 'key'
    op: 'lt' | 'gt' | 'eq' | 'empty'
    value?: string | number
    action: 'suggest_keep' | 'suggest_cut'
  }>
  sessionMode?: 'triage' | 'audit' | 'compare'
  keymap?: Record<string, string>
  gamepadEnabled?: boolean
  midiEnabled?: boolean
  auditColumns?: Array<{ id: string; visible: boolean; width: number }>
  cuePlacementMode?: 'presets' | 'smart'
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

export async function readAppSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8')
    return JSON.parse(raw) as AppSettings
  } catch {
    return {}
  }
}

export async function writeAppSettings(settings: AppSettings): Promise<void> {
  const dir = path.dirname(settingsPath())
  await mkdir(dir, { recursive: true })
  await writeFile(settingsPath(), JSON.stringify(settings, null, 2))
}
