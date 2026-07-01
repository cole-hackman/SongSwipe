import { useEffect, useState } from 'react'
import { writeSettings } from '@/lib/ipc'
import type { BatchRule } from '@/lib/types'
import { useQueueStore } from '@/store/queue'
import { useSettingsStore } from '@/store/settings'

const DEFAULT_RULE: BatchRule = {
  id: 'default-bpm-cut',
  enabled: false,
  field: 'bpm',
  op: 'lt',
  value: 110,
  action: 'suggest_cut',
}

type NumberStepperProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  id?: string
}

function NumberStepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  id,
}: NumberStepperProps) {
  const handleDecrement = () => {
    onChange(Math.max(min, value - step))
  }

  const handleIncrement = () => {
    onChange(Math.min(max, value + step))
  }

  return (
    <div className="number-stepper">
      <button
        type="button"
        className="number-stepper__btn"
        onClick={handleDecrement}
        disabled={value <= min}
        aria-label="Decrease value"
      >
        −
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="number-stepper__input"
        value={value}
        onChange={(event) => {
          const val = Number(event.target.value.replace(/\D/g, ''))
          if (!isNaN(val)) {
            onChange(Math.max(min, Math.min(max, val)))
          }
        }}
      />
      <button
        type="button"
        className="number-stepper__btn"
        onClick={handleIncrement}
        disabled={value >= max}
        aria-label="Increase value"
      >
        +
      </button>
    </div>
  )
}

export function LibrarySettings() {
  const dbPathOverride = useSettingsStore((s) => s.dbPathOverride)
  const zeroRatingOnCut = useSettingsStore((s) => s.zeroRatingOnCut)
  const prefetchAhead = useSettingsStore((s) => s.prefetchAhead)
  const prefetchBehind = useSettingsStore((s) => s.prefetchBehind)
  const autoPlay = useSettingsStore((s) => s.autoPlay)
  const waveformBarWidth = useSettingsStore((s) => s.waveformBarWidth)
  const waveformNormalize = useSettingsStore((s) => s.waveformNormalize)
  const waveformFastMode = useSettingsStore((s) => s.waveformFastMode)
  const batchRules = useSettingsStore((s) => s.batchRules)
  const setDbPathOverride = useSettingsStore((s) => s.setDbPathOverride)
  const setZeroRatingOnCut = useSettingsStore((s) => s.setZeroRatingOnCut)
  const setPrefetchAhead = useSettingsStore((s) => s.setPrefetchAhead)
  const setPrefetchBehind = useSettingsStore((s) => s.setPrefetchBehind)
  const setAutoPlay = useSettingsStore((s) => s.setAutoPlay)
  const setWaveformBarWidth = useSettingsStore((s) => s.setWaveformBarWidth)
  const setWaveformNormalize = useSettingsStore((s) => s.setWaveformNormalize)
  const setWaveformFastMode = useSettingsStore((s) => s.setWaveformFastMode)
  const setBatchRules = useSettingsStore((s) => s.setBatchRules)
  const gamepadEnabled = useSettingsStore((s) => s.gamepadEnabled)
  const midiEnabled = useSettingsStore((s) => s.midiEnabled)
  const cuePlacementMode = useSettingsStore((s) => s.cuePlacementMode)
  const setGamepadEnabled = useSettingsStore((s) => s.setGamepadEnabled)
  const setMidiEnabled = useSettingsStore((s) => s.setMidiEnabled)
  const setCuePlacementMode = useSettingsStore((s) => s.setCuePlacementMode)
  const loadPlaylists = useQueueStore((s) => s.loadPlaylists)
  const [draftPath, setDraftPath] = useState(dbPathOverride ?? '')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const rule = batchRules[0] ?? DEFAULT_RULE

  useEffect(() => {
    setDraftPath(dbPathOverride ?? '')
  }, [dbPathOverride])

  async function applyDbPath() {
    setBusy(true)
    setStatus(null)
    try {
      const nextPath = draftPath.trim() || null
      await writeSettings({ dbPathOverride: nextPath })
      setDbPathOverride(nextPath)
      await loadPlaylists()
      setStatus(nextPath ? 'Library path updated.' : 'Using default Rekordbox library path.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to update library path')
    } finally {
      setBusy(false)
    }
  }

  async function toggleZeroRating(checked: boolean) {
    setZeroRatingOnCut(checked)
    await writeSettings({ zeroRatingOnCut: checked })
  }

  async function updatePrefetch(ahead: number, behind: number) {
    setPrefetchAhead(ahead)
    setPrefetchBehind(behind)
    await writeSettings({ prefetchAhead: ahead, prefetchBehind: behind })
  }

  async function toggleAutoPlay(checked: boolean) {
    setAutoPlay(checked)
    await writeSettings({ autoPlay: checked })
  }

  async function updateWaveform(patch: {
    waveformBarWidth?: number
    waveformNormalize?: boolean
    waveformFastMode?: boolean
  }) {
    if (patch.waveformBarWidth != null) setWaveformBarWidth(patch.waveformBarWidth)
    if (patch.waveformNormalize != null) setWaveformNormalize(patch.waveformNormalize)
    if (patch.waveformFastMode != null) setWaveformFastMode(patch.waveformFastMode)
    await writeSettings(patch)
  }

  async function updateRule(next: BatchRule) {
    setBatchRules([next])
    await writeSettings({ batchRules: [next] })
  }

  async function toggleGamepad(checked: boolean) {
    setGamepadEnabled(checked)
    await writeSettings({ gamepadEnabled: checked })
  }

  async function toggleMidi(checked: boolean) {
    setMidiEnabled(checked)
    await writeSettings({ midiEnabled: checked })
  }

  async function handleCueModeChange(mode: 'presets' | 'smart') {
    setCuePlacementMode(mode)
    await writeSettings({ cuePlacementMode: mode })
  }

  return (
    <>
      <div className="panel-block">
        <h2>Playback</h2>
        <label className="panel-block" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={autoPlay}
            onChange={(event) => void toggleAutoPlay(event.target.checked)}
          />
          <span>Auto-play when track loads</span>
        </label>
        <label className="top-bar__meta" htmlFor="prefetch-ahead">
          Prefetch ahead
        </label>
        <NumberStepper
          id="prefetch-ahead"
          min={0}
          max={20}
          value={prefetchAhead}
          onChange={(val) => void updatePrefetch(val, prefetchBehind)}
        />
        <label className="top-bar__meta" htmlFor="prefetch-behind">
          Prefetch behind
        </label>
        <NumberStepper
          id="prefetch-behind"
          min={0}
          max={10}
          value={prefetchBehind}
          onChange={(val) => void updatePrefetch(prefetchAhead, val)}
        />
      </div>
      <div className="panel-block">
        <h2>Waveform</h2>
        <label className="top-bar__meta" htmlFor="waveform-bar-width">
          Bar width
        </label>
        <NumberStepper
          id="waveform-bar-width"
          min={1}
          max={6}
          value={waveformBarWidth}
          onChange={(val) => void updateWaveform({ waveformBarWidth: val })}
        />
        <label className="panel-block" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={waveformNormalize}
            onChange={(event) => void updateWaveform({ waveformNormalize: event.target.checked })}
          />
          <span>Normalize waveform</span>
        </label>
        <label className="panel-block" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={waveformFastMode}
            onChange={(event) => void updateWaveform({ waveformFastMode: event.target.checked })}
          />
          <span>Fast mode (coarser bars)</span>
        </label>
      </div>
      <div className="panel-block">
        <h2>Cues</h2>
        <label className="top-bar__meta" htmlFor="cue-placement-mode">
          Cue Placement Mode
        </label>
        <select
          id="cue-placement-mode"
          className="input"
          value={cuePlacementMode}
          onChange={(event) => void handleCueModeChange(event.target.value as 'presets' | 'smart')}
        >
          <option value="presets">Fixed Metrical Presets (Intro/32/64/Outro)</option>
          <option value="smart">Algorithmic Smart Detection (Librosa)</option>
        </select>
      </div>
      <div className="panel-block">
        <h2>Controllers</h2>
        <label className="panel-block" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={gamepadEnabled}
            onChange={(event) => void toggleGamepad(event.target.checked)}
          />
          <span>Gamepad (A=cut, B=keep, X=play)</span>
        </label>
        <label className="panel-block" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={midiEnabled}
            onChange={(event) => void toggleMidi(event.target.checked)}
          />
          <span>MIDI (C2=cut, D2=keep, E2=play)</span>
        </label>
      </div>
      <div className="panel-block">
        <h2>Batch rules</h2>
        <label className="panel-block" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={rule.enabled}
            onChange={(event) => void updateRule({ ...rule, enabled: event.target.checked })}
          />
          <span>Suggest cut when BPM &lt;</span>
        </label>
        <NumberStepper
          min={40}
          max={250}
          value={Number(rule.value ?? 110)}
          onChange={(val) => void updateRule({ ...rule, value: val, action: 'suggest_cut' })}
        />
      </div>
      <div className="panel-block">
        <h2>Library</h2>
        <label className="top-bar__meta" htmlFor="db-path">
          master.db path (optional)
        </label>
        <input
          id="db-path"
          className="input"
          value={draftPath}
          placeholder="~/Library/Pioneer/rekordbox/master.db"
          onChange={(event) => setDraftPath(event.target.value)}
        />
        <button type="button" className="btn" onClick={() => void applyDbPath()} disabled={busy}>
          {busy ? 'Applying…' : 'Apply path'}
        </button>
        <label className="panel-block" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={zeroRatingOnCut}
            onChange={(event) => void toggleZeroRating(event.target.checked)}
          />
          <span>Set cut tracks to 0 stars on commit</span>
        </label>
        {status ? <p className="top-bar__meta">{status}</p> : null}
      </div>
    </>
  )
}
