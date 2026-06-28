import { ipcMain } from 'electron'
import { callSidecar, startSidecar, stopSidecar } from './sidecar'
import { fileExists, revealInFinder, toFileUrl } from './fs-ops'
import { readSession, writeSession, type SessionData } from './session'

export function registerIpcHandlers(): void {
  ipcMain.handle('rb:call', async (_event, method: string, params: Record<string, unknown>) => {
    return callSidecar(method, params)
  })

  ipcMain.handle('fs:exists', async (_event, filePath: string) => fileExists(filePath))

  ipcMain.handle('fs:toFileUrl', (_event, filePath: string) => toFileUrl(filePath))

  ipcMain.handle('fs:reveal', (_event, filePath: string) => {
    revealInFinder(filePath)
  })

  ipcMain.handle('session:read', () => readSession())

  ipcMain.handle('session:write', (_event, data: SessionData) => writeSession(data))
}

export { startSidecar, stopSidecar }
