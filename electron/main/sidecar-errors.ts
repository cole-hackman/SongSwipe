export function describeMissingSidecarPath(kind: 'executable' | 'script', targetPath: string): string {
  return `Sidecar ${kind} not found: ${targetPath}`
}

export function normalizeSidecarCallFailure(
  error: unknown,
  stderr: string,
  fallback = 'Sidecar process exited before responding',
): Error {
  const detail = stderr.trim()
  if (detail) return new Error(detail)

  if (error instanceof Error) {
    if (/EPIPE/.test(error.message)) return new Error(fallback)
    return error
  }

  return new Error(fallback)
}
