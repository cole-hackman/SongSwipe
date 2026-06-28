import { dialog } from 'electron'
import { writeFile } from 'node:fs/promises'

export async function exportTextFile(
  defaultName: string,
  contents: string,
  filters: Array<{ name: string; extensions: string[] }>,
): Promise<string | null> {
  const result = await dialog.showSaveDialog({ defaultPath: defaultName, filters })
  if (result.canceled || !result.filePath) return null
  await writeFile(result.filePath, contents, 'utf8')
  return result.filePath
}
