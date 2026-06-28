import { pathToFileURL } from 'node:url'
import { access } from 'node:fs/promises'
import { shell } from 'electron'

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

export function toFileUrl(filePath: string): string {
  return pathToFileURL(filePath).href
}

export function revealInFinder(filePath: string): void {
  shell.showItemInFolder(filePath)
}
