/**
 * Environment for the sidecar process. Only the packaged app opens the real
 * Rekordbox library by itself; a source checkout needs SONGSWIPE_DB_PATH, or
 * SONGSWIPE_ALLOW_REAL=1 set by the person who starts it.
 */
export function buildSidecarEnv(
  env: NodeJS.ProcessEnv,
  options: { isPackaged: boolean; dbPath: string | null },
): NodeJS.ProcessEnv {
  const next = { ...env }
  if (options.dbPath) next.SONGSWIPE_DB_PATH = options.dbPath
  if (options.isPackaged) next.SONGSWIPE_ALLOW_REAL = '1'
  return next
}
