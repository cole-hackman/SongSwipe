import { toMediaUrl } from '@/lib/ipc'

export type CompareSlot = 'a' | 'b'

export class ComparePlayer {
  private elements: Record<CompareSlot, HTMLAudioElement> = {
    a: new Audio(),
    b: new Audio(),
  }

  private urls: Record<CompareSlot, string | null> = { a: null, b: null }

  async load(slot: CompareSlot, path: string): Promise<void> {
    if (!path) return
    const url = await toMediaUrl(path)
    const element = this.elements[slot]
    if (this.urls[slot] !== url) {
      element.src = url
      element.load()
      this.urls[slot] = url
    }
  }

  active(slot: CompareSlot): HTMLAudioElement {
    return this.elements[slot]
  }

  async play(slot: CompareSlot): Promise<void> {
    const other: CompareSlot = slot === 'a' ? 'b' : 'a'
    this.elements[other].pause()
    await this.elements[slot].play()
  }

  pause(slot: CompareSlot): void {
    this.elements[slot].pause()
  }

  seek(slot: CompareSlot, seconds: number): void {
    this.elements[slot].currentTime = Math.max(0, seconds)
  }

  release(): void {
    for (const slot of ['a', 'b'] as CompareSlot[]) {
      const element = this.elements[slot]
      element.pause()
      element.removeAttribute('src')
      element.load()
      this.urls[slot] = null
    }
  }
}
