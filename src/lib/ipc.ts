export function rb<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!window.api) {
    return Promise.reject(new Error('SongSwipe API is unavailable'))
  }
  return window.api.rb<T>(method, params)
}

export async function toMediaUrl(filePath: string): Promise<string> {
  return window.api.toFileUrl(filePath)
}

export async function fileExists(filePath: string): Promise<boolean> {
  return window.api.fileExists(filePath)
}

export async function readSession<T>(): Promise<T | null> {
  return (await window.api.readSession()) as T | null
}

export async function writeSession(data: unknown): Promise<void> {
  await window.api.writeSession(data)
}
