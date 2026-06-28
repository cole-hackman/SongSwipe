export type SongSwipeApi = {
  rb: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>
  fileExists: (filePath: string) => Promise<boolean>
  toFileUrl: (filePath: string) => Promise<string>
  revealInFinder: (filePath: string) => Promise<void>
  readSession: () => Promise<unknown>
  writeSession: (data: unknown) => Promise<void>
}

declare global {
  interface Window {
    api: SongSwipeApi
  }
}

export {}
