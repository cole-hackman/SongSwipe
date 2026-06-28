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

  loadedIndices(): number[] {
    return [...this.elements.keys()].sort((a, b) => a - b)
  }

  async setTracks(tracks: Array<{ path: string }>): Promise<void> {
    this.releaseAll()
    this.paths.clear()
    tracks.forEach((track, index) => {
      if (track.path) this.paths.set(index, track.path)
    })
    await this.setCurrent(this.currentIndex)
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

  private async ensureElement(index: number): Promise<void> {
    const path = this.paths.get(index)
    if (!path) return
    if (this.elements.has(index) && this.urls.get(index)) return

    const url = await this.resolveUrl(path)
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

  async play(): Promise<void> {
    await this.active()?.play()
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
  }
}
