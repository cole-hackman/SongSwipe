import { toMediaUrl } from '@/lib/ipc'

/** Always resolve a playback URL; let the media element report load/play errors. */
export async function resolvePlaybackUrl(filePath: string): Promise<string> {
  return toMediaUrl(filePath)
}

export function describePlaybackError(
  error: unknown,
  element: HTMLAudioElement | null,
  filePath?: string | null,
): string {
  const mediaCode = element?.error?.code
  if (mediaCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
    return filePath
      ? `Playback failed (unsupported or unreadable):\n${filePath}`
      : 'Playback failed: unsupported or unreadable source.'
  }
  if (mediaCode === MediaError.MEDIA_ERR_NETWORK) {
    return filePath
      ? `Playback failed (could not read file):\n${filePath}`
      : 'Playback failed: could not read file.'
  }
  if (error instanceof Error && error.message) return error.message
  return 'Playback failed'
}
