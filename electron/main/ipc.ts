import { ipcMain } from 'electron'
import { readAppSettings, writeAppSettings } from './app-settings'
import { ALLOWED_SIDECAR_METHODS } from './sidecar-allowlist'
import {
  callSidecar,
  ensureSidecarReady,
  getSidecarDbPath,
  getSidecarStatus,
  getSidecarStderr,
  restartSidecar,
  setSidecarDbPath,
  startSidecar,
  stopSidecar,
} from './sidecar'
import { batchFileExists, fileExists, revealInFinder, toFileUrl } from './fs-ops'
import { getCachedPeaks, saveCachedPeaks } from './peak-cache'
import { exportTextFile } from './export-dialog'
import {
  deleteNamedSession,
  listNamedSessions,
  loadNamedSession,
  saveNamedSession,
  type NamedSessionData,
} from './named-sessions'
import { readSession, writeSession, type SessionData } from './session'

export async function loadPersistedSettings(): Promise<void> {
  const settings = await readAppSettings()
  if (settings.dbPathOverride) {
    setSidecarDbPath(settings.dbPathOverride)
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('rb:call', async (_event, method: string, params: Record<string, unknown>) => {
    if (!ALLOWED_SIDECAR_METHODS.has(method)) {
      throw new Error(`Sidecar method not allowed: ${method}`)
    }
    const sidecarStatus = getSidecarStatus()
    if (sidecarStatus.state === 'error') {
      throw new Error(sidecarStatus.error ?? 'Sidecar is not available')
    }
    return callSidecar(method, params)
  })

  ipcMain.handle('sidecar:status', () => ({
    ...getSidecarStatus(),
    stderr: getSidecarStderr(),
  }))

  ipcMain.handle('sidecar:ensureReady', () => ensureSidecarReady())

  ipcMain.handle('settings:read', () => readAppSettings())

  ipcMain.handle('settings:write', async (_event, settings: Record<string, unknown>) => {
    const current = await readAppSettings()
    const next = { ...current, ...settings }
    await writeAppSettings(next)

    if ('dbPathOverride' in settings) {
      const dbPath = (settings.dbPathOverride as string | null) ?? null
      setSidecarDbPath(dbPath)
      restartSidecar()
      await ensureSidecarReady()
    }

    return next
  })

  ipcMain.handle('settings:getDbPath', () => getSidecarDbPath())

  ipcMain.handle('fs:exists', async (_event, filePath: string) => fileExists(filePath))

  ipcMain.handle('fs:batchExists', async (_event, paths: string[]) => batchFileExists(paths))

  ipcMain.handle('peaks:get', async (_event, filePath: string) => getCachedPeaks(filePath))

  ipcMain.handle(
    'peaks:save',
    async (_event, filePath: string, peaks: number[][], duration: number) => {
      await saveCachedPeaks(filePath, peaks, duration)
    },
  )

  ipcMain.handle('fs:toFileUrl', (_event, filePath: string) => toFileUrl(filePath))

  ipcMain.handle('fs:reveal', (_event, filePath: string) => {
    revealInFinder(filePath)
  })

  ipcMain.handle('session:read', () => readSession())

  ipcMain.handle('session:write', (_event, data: SessionData) => writeSession(data))

  ipcMain.handle('sessions:list', () => listNamedSessions())

  ipcMain.handle('sessions:save', (_event, id: string, data: NamedSessionData) =>
    saveNamedSession(id, data),
  )

  ipcMain.handle('sessions:load', (_event, id: string) => loadNamedSession(id))

  ipcMain.handle('sessions:delete', (_event, id: string) => deleteNamedSession(id))

  ipcMain.handle(
    'export:textFile',
    (_event, defaultName: string, contents: string, filters: Array<{ name: string; extensions: string[] }>) =>
      exportTextFile(defaultName, contents, filters),
  )
}

export { startSidecar, stopSidecar, ensureSidecarReady }
