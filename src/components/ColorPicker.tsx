import { REKORDBOX_COLORS } from '@/lib/types'
import { useDecisionsStore } from '@/store/decisions'

type ColorPickerProps = {
  trackId: string
  value: number
}

export function ColorPicker({ trackId, value }: ColorPickerProps) {
  const patch = useDecisionsStore((s) => s.patch)

  return (
    <div className="panel-block">
      <h2>Color</h2>
      <div className="color-row">
        {REKORDBOX_COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            className={`color-swatch ${value === color.id ? 'is-active' : ''}`}
            style={{ background: color.hex }}
            aria-label={color.label}
            onClick={() => patch(trackId, { colorId: color.id })}
          />
        ))}
      </div>
    </div>
  )
}
