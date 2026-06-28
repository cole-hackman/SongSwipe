import { describePlaybackError } from '@/audio/playback'

export type AudioTrackRef = {
  index: number
  path: string
  url: string
}

export type AudioPoolOptions = {
  ahead?: number
  behind?: number
  resolveUrl: (path: string) => Promise<string>
}

export class AudioPool {
  private elements = new Map<number, HTMLAudioElement>()
  private paths = new Map<number, string>()
  private urls = new Map<number, string>()
  private currentIndex = 0
  private ahead: number
  private behind: number
  private resolveUrl: (path: string) => Promise<string>
  private trackSignature = ''

  constructor(options: AudioPoolOptions) {
    this.ahead = options.ahead ?? 5
    this.behind = options.behind ?? 2
    this.resolveUrl = options.resolveUrl
  }

  get current(): number {
    return this.currentIndex
  }

  active(): HTMLAudioElement | null {
    return this.elements.get(this.currentIndex) ?? null
  }

  activePath(): string | null {
    return this.paths.get(this.currentIndex) ?? null
  }

  loadedIndices(): number[] {
    return [...this.elements.keys()].sort((a, b) => a - b)
  }

  async setTracks(tracks: Array<{ path: string }>, index = this.currentIndex): Promise<void> {
    const signature = tracks.map((track) => track.path).join('\0')
    if (signature !== this.trackSignature) {
      this.trackSignature = signature
      this.releaseAll()
      this.paths.clear()
      tracks.forEach((track, trackIndex) => {
        if (track.path) this.paths.set(trackIndex, track.path)
      })
    }
    await this.setCurrent(index)
  }

  async setCurrent(index: number): Promise<void> {
    this.currentIndex = Math.max(0, index)
    const min = Math.max(0, this.currentIndex - this.behind)
    const max = this.currentIndex + this.ahead
    const keep = new Set<number>()

    for (let i = min; i <= max; i += 1) {
      keep.add(i)
      await this.ensureElement(i)
    }

    for (const [idx, element] of this.elements) {
      if (!keep.has(idx)) {
        element.pause()
        element.removeAttribute('src')
        element.load()
        this.elements.delete(idx)
        this.urls.delete(idx)
      }
    }
  }

  async ensureReady(index = this.currentIndex): Promise<HTMLAudioElement> {
    await this.setCurrent(index)
    const element = this.active()
    if (!element) {
      const filePath = this.paths.get(this.currentIndex)
      throw new Error(
        filePath
          ? `Audio file missing on disk:\n${filePath}`
          : 'No audio file for the current track.',
      )
    }
    return element
  }

  private async ensureElement(index: number): Promise<void> {
    const filePath = this.paths.get(index)
    if (!filePath) return
    if (this.elements.has(index) && this.urls.get(index)) return

    const url = await this.resolveUrl(filePath)
    let element = this.elements.get(index)
    if (!element) {
      element = new Audio()
      element.preload = 'auto'
      this.elements.set(index, element)
    }
    if (this.urls.get(index) !== url) {
      element.src = url
      element.load()
      this.urls.set(index, url)
    }
  }

  async play(index = this.currentIndex): Promise<void> {
    const element = await this.ensureReady(index)
    const filePath = this.paths.get(index) ?? null
    try {
      await element.play()
    } catch (error) {
      throw new Error(describePlaybackError(error, element, filePath))
    }
  }

  pause(): void {
    this.active()?.pause()
  }

  seek(seconds: number): void {
    const element = this.active()
    if (!element) return
    element.currentTime = Math.max(0, seconds)
  }

  releaseAll(): void {
    for (const element of this.elements.values()) {
      element.pause()
      element.removeAttribute('src')
      element.load()
    }
    this.elements.clear()
    this.urls.clear()
    this.trackSignature = ''
  }
}
