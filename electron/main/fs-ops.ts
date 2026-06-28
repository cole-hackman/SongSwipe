import { access } from 'node:fs/promises'
import { shell } from 'electron'
import { toHttpMediaUrl } from './media-server'

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

export async function batchFileExists(paths: string[]): Promise<Record<string, boolean>> {
  const entries = await Promise.all(
    paths.map(async (filePath) => [filePath, await fileExists(filePath)] as const),
  )
  return Object.fromEntries(entries)
}

export function toFileUrl(filePath: string): string {
  return toHttpMediaUrl(filePath)
}

export function revealInFinder(filePath: string): void {
  shell.showItemInFolder(filePath)
}
