# SongSwipe Triage UI Redesign Implementation Plan

## 1. Summary

This redesign should treat the mockup as the visual and layout source of truth, and the existing app as the behavioral source of truth. The mockup defines the target token set, spacing, hierarchy, card composition, and affordances; the real app must continue to own all data flow, audio playback, wavesurfer rendering, hot-cue/beatgrid loading, IPC, sidecar JSON-RPC, commit logic, session persistence, keyboard handling, gamepad, and MIDI behavior.

Important split:

- Mockup-only visuals to translate, not copy literally:
  - The fake `<div>` waveform becomes a restyled `wavesurfer.js` instance via [`src/components/WaveformPlayer.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/WaveformPlayer.tsx:1) and [`src/audio/useWaveform.ts`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/audio/useWaveform.ts:1).
  - Static cue flags become a real cue overlay fed by `useQueueStore().cues` plus the existing beatgrid fetch in [`src/App.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/App.tsx:228).
  - Hardcoded track metadata becomes bindings to `useQueueStore`, `useDecisionsStore`, and `useSettingsStore`.
  - Destination chips, rating, and color controls must keep calling the same state setters and IPC-backed helpers as the current dropdowns and action controls.

Assumption used for this plan: on June 28, 2026 the prompt path `docs/superpowers/plans/ui-redesign/mockup.html` was not present, and the only matching mockup file in-repo was [`docs/superpowers/plans/songswipe-redesign.html`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/docs/superpowers/plans/songswipe-redesign.html:1). Treat that as the visual source unless you provide a newer file.

## 2. Step-1 Mapping Table

| Mockup region | Real owner today | Change type | Current stores / props / IPC / side effects |
| --- | --- | --- | --- |
| Top bar: brand + mode | [`src/App.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/App.tsx:441), [`src/components/ModeSwitcher.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/ModeSwitcher.tsx:1) | Restructure | `sessionMode`, `handleModeChange()`, `writeSettings({ sessionMode })` |
| Top bar: source name + progress | [`src/App.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/App.tsx:439) plus playlist data from [`src/store/queue.ts`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/store/queue.ts:30) | Restructure | `tracks`, `currentIndex`, `sourcePlaylistId`, `playlists`, `selectPlaylist()` |
| Top bar: Rekordbox status + Commit | [`src/components/RekordboxStatus.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/RekordboxStatus.tsx:1), commit trigger in [`src/App.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/App.tsx:448), dialog in [`src/components/CommitDialog.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/CommitDialog.tsx:1) | Restyle / move | `rb('is_rekordbox_running')`, `commitOpen`, full commit / backup / restore / XML export flow |
| Left playlist sidebar | [`src/components/PlaylistNav.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/PlaylistNav.tsx:1) | Restructure | `playlists`, `loading`, `error`, `sourcePlaylistId`, `selectPlaylist()`, localStorage expansion state |
| Center swipe card | [`src/components/SwipeDeck.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/SwipeDeck.tsx:1), [`src/components/TrackCard.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/TrackCard.tsx:1) | Restructure / likely new component | `track`, `handleKeep()`, `handleCull()`, artwork via `getArtworkUrl()` and `songswipe-media://` via `toMediaUrl()` |
| Artwork + metadata header | [`src/components/TrackCard.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/TrackCard.tsx:12) | Likely new triage-specific component | `track.title`, `artist`, `bpm`, `key`, `durationSec`, `artworkPath`, playlist membership badges |
| Waveform area | [`src/components/WaveformPlayer.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/WaveformPlayer.tsx:1), [`src/audio/useWaveform.ts`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/audio/useWaveform.ts:17) | Restyle / embed inside card | `pool.active()`, `track.path`, `cues`, `beatgrid`, `waveformBarWidth`, `waveformNormalize`, `waveformFastMode`, cached peaks |
| Cue flags above waveform | Real cue data already loaded in [`src/store/queue.ts`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/store/queue.ts:112) and beatgrid loaded in [`src/App.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/App.tsx:228) | New component | `rb('get_playlist_bundle', { includeCues: true })`, `rb('get_cues')`, `rb('get_beatgrid')` |
| Swipe-direction glow / ghost labels | Decision actions in [`src/App.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/App.tsx:275) and gesture shell in [`src/components/SwipeDeck.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/SwipeDeck.tsx:8) | New visual state | Keyboard map, gamepad, MIDI, TinderCard swipe callbacks; must remain non-blocking |
| Right rail: keep/cull destination | [`src/components/DestinationPlaylist.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/DestinationPlaylist.tsx:6), [`src/components/PerTrackDestination.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/PerTrackDestination.tsx:9) | Restructure | `destinationPlaylistId`, `cullPlaylistId`, `setDestinationPlaylistId()`, `setCullPlaylistId()`, `patch()`, `rb('create_playlist')`, `writeSettings()` |
| Right rail: rating | [`src/components/RatingControl.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/RatingControl.tsx:8) | Restyle | `useDecisionsStore.patch()` |
| Right rail: color | [`src/components/ColorPicker.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/ColorPicker.tsx:9), Rekordbox palette in [`src/lib/types.ts`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/lib/types.ts:77) | Restyle | `useDecisionsStore.patch()`, `REKORDBOX_COLORS` |
| Right rail: one-line stat | [`src/components/StatsPanel.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/StatsPanel.tsx:6) | Restructure / reduce | `computeSessionStats()`, `tracks`, `decisions` |
| Session / export / dupes overflow | [`src/components/NamedSessions.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/NamedSessions.tsx:26), [`src/components/DuplicatesPanel.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/DuplicatesPanel.tsx:3), duplicate fetch in [`src/App.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/App.tsx:238) | Move into drawer | `listNamedSessions()`, `saveNamedSession()`, `loadNamedSession()`, `deleteNamedSession()`, `exportTextFile()`, `buildSessionReportCsv()`, `buildSessionReportJson()`, `rb('find_duplicates')` |
| Transport bar | [`src/components/TransportBar.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/TransportBar.tsx:17) | Restyle | `togglePlay()`, `pool.seek()`, `playbackSec`, `playbackDuration` |
| Cue preset buttons in transport | [`src/components/CueButtons.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/CueButtons.tsx:8), [`src/components/SkipPresetButtons.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/SkipPresetButtons.tsx:8), [`src/lib/cue-presets.ts`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/lib/cue-presets.ts:11) | Restyle | `jumpToCue()`, real cues, computed Intro / 32 bars / Drop / Outro presets |

## 3. Design Tokens And Theming

### Extracted candidate token set from the mockup `:root`

These should replace the current app-level design tokens in [`src/styles/tokens.css`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/styles/tokens.css:1):

| Mockup token | Value |
| --- | --- |
| `--bg` | `#0a0c0e` |
| `--bg-2` | `#0f1316` |
| `--panel` | `#14191d` |
| `--panel-2` | `#191f24` |
| `--line` | `#232b31` |
| `--line-2` | `#2e383f` |
| `--txt` | `#eef3f5` |
| `--txt-2` | `#9aa7af` |
| `--txt-3` | `#5e6b73` |
| `--keep` | `#5eead4` |
| `--keep-deep` | `#10b981` |
| `--cull` | `#fb7185` |
| `--cull-deep` | `#e11d48` |
| `--amber` | `#fbbf24` |
| `--radius` | `16px` |
| `--mono` | `'IBM Plex Mono', ui-monospace, monospace` |
| `--sans` | `'Archivo', system-ui, sans-serif` |

### Adoption approach

- Keep `src/styles/tokens.css` as the single source of truth; do not create a parallel TS theme unless a component genuinely needs numeric constants in TS.
- Add semantic aliases in `tokens.css` instead of scattering mockup names through components. Example: map `--surface`, `--elevated`, `--text`, `--muted`, `--radius-lg`, `--glow-keep`, `--glow-cull`, and waveform-specific variables back to the mockup primitives.
- Replace current bundled fonts in [`src/styles/global.css`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/styles/global.css:2) from `Bricolage Grotesque`, `Hanken Grotesk`, and `JetBrains Mono` to `Archivo` and `IBM Plex Mono`.
- Load fonts as bundled assets, not remote CDN:
  - Preferred: add `@fontsource/archivo` and `@fontsource/ibm-plex-mono` to [`package.json`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/package.json:19) and import them from `global.css`.
  - Acceptable fallback: self-host font files under `src/assets/fonts` and define `@font-face`.
- Replace hardcoded visual values in:
  - [`src/audio/useWaveform.ts`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/audio/useWaveform.ts:43) for `height`, `waveColor`, `progressColor`, `cursorColor`, and `barGap`.
  - [`src/styles/global.css`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/styles/global.css:21) for layout colors, fonts, borders, and radii.
  - [`electron/main/index.ts`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/electron/main/index.ts:40) for the BrowserWindow background color if you want startup chrome to match the new renderer background.
- Do not change `REKORDBOX_COLORS` in [`src/lib/types.ts`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/lib/types.ts:77); those represent real Rekordbox color choices, not app theme tokens.

## 4. Phased Plan

### Phase 0: Design tokens, fonts, and theme scaffolding

- Files to add/change:
  - Modify [`package.json`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/package.json:19)
  - Modify [`src/styles/tokens.css`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/styles/tokens.css:1)
  - Modify [`src/styles/global.css`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/styles/global.css:1)
  - Optional modify [`electron/main/index.ts`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/electron/main/index.ts:40)
  - Add `src/styles/triage.css`
- Specific edits:
  - Replace the current token palette with the mockup palette while keeping current class names working through semantic aliases.
  - Swap font imports to bundled `Archivo` and `IBM Plex Mono`.
  - Add triage-specific shell classes in `triage.css` but do not change structure yet; this phase should be visually close to current layout and safe to ship alone.
  - Tokenize shared button, border, muted-text, and surface styles so later phases mostly move markup rather than introduce more new colors.
- Stores / IPC touched:
  - None directly.
- Risks:
  - Global token swaps can unintentionally restyle Audit and Compare.
  - Font metric changes can create layout shifts in existing tables and forms.
- How to verify it still works:
  - Run `npm run typecheck`
  - Run `npm run test`
  - Manual: `npm run dev`, open the app, confirm current layout still functions, fonts load locally, and no blank/unstyled renderer appears.

### Phase 1: Top bar to 3 fixed zones

- Files to add/change:
  - Add `src/components/triage/TriageTopBar.tsx`
  - Modify [`src/App.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/App.tsx:441)
  - Optional modify [`src/components/ModeSwitcher.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/ModeSwitcher.tsx:1)
  - Optional modify [`src/components/RekordboxStatus.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/RekordboxStatus.tsx:1)
  - Modify `src/styles/triage.css`
- Specific edits:
  - Replace the current flat header with a three-zone header component:
    - Zone 1: brand + mode switcher.
    - Zone 2: selected playlist name plus progress bar and `currentIndex / total`.
    - Zone 3: Rekordbox status pill plus existing Commit button.
  - Derive source name from `sourcePlaylistId` plus `playlists` already in `useQueueStore`; do not add new IPC.
  - Preserve `handleModeChange()` and the same `setCommitOpen(true)` behavior.
  - Keep error banners below the header exactly as today.
- Stores / IPC touched:
  - `useQueueStore`: `playlists`, `sourcePlaylistId`, `tracks`, `currentIndex`
  - `useSettingsStore`: `sessionMode`
  - `writeSettings({ sessionMode })`
  - `rb('is_rekordbox_running')` via `RekordboxStatus`
- Risks:
  - Header refactor is shared across all three modes; a triage-oriented header must not make Audit or Compare ambiguous.
  - The mockup’s tiny “swatch” beside the source name has no known real data source; do not invent a playlist color field.
- How to verify it still works:
  - Run `npm run typecheck`
  - Run `npm run test`
  - Manual: switch between Triage, Audit, and Compare; select a playlist; confirm the header source label and progress update; confirm Commit still opens [`CommitDialog`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/CommitDialog.tsx:20).

### Phase 2: Left rail collapse plus slide-out playlist panel

- Files to add/change:
  - Add `src/components/triage/TriageSourceRail.tsx`
  - Add `src/components/triage/TriageSourceDrawer.tsx`
  - Modify [`src/components/PlaylistNav.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/PlaylistNav.tsx:1)
  - Modify [`src/App.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/App.tsx:486)
  - Modify `src/styles/triage.css`
- Specific edits:
  - Keep `PlaylistNav` as the real playlist tree and selection owner.
  - Wrap `PlaylistNav` in a slide-out drawer/sheet opened from a thin icon rail instead of permanently rendering it full width in Triage.
  - Preserve folder expansion state in localStorage by leaving `PlaylistNav` logic intact.
  - Keep playlist selection keyboard reachable: drawer toggle must be focusable, openable via keyboard, and closable with `Esc`.
  - Scope the collapsed-rail behavior to Triage first; leave Audit/Compare on the current persistent nav until the redesign is proven stable.
- Stores / IPC touched:
  - `useQueueStore`: `playlists`, `loading`, `error`, `sourcePlaylistId`, `selectPlaylist()`
  - localStorage in `PlaylistNav`
- Risks:
  - Unmount/remount behavior can reset scroll position within the playlist tree.
  - Triage-only layout branching in `App.tsx` can become messy if not isolated behind a `TriageView` wrapper.
- How to verify it still works:
  - Run `npm run typecheck`
  - Run `npm run test`
  - Manual: open the drawer, expand folders, select playlists, close and reopen the drawer, switch modes, and confirm the selected playlist persists.

### Phase 3: Card stack, filled card, waveform restyle, cue flags, swipe glow

- Files to add/change:
  - Add `src/components/triage/TriageView.tsx`
  - Add `src/components/triage/TriageCardStack.tsx`
  - Add `src/components/triage/TriageTrackCard.tsx`
  - Add `src/components/triage/CueFlagBar.tsx`
  - Modify [`src/App.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/App.tsx:494)
  - Modify [`src/components/SwipeDeck.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/SwipeDeck.tsx:8) or replace it inside `TriageView`
  - Modify [`src/components/WaveformPlayer.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/WaveformPlayer.tsx:14)
  - Modify [`src/audio/useWaveform.ts`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/audio/useWaveform.ts:17)
  - Modify `src/styles/triage.css`
- Specific edits:
  - Move Triage center rendering out of `App.tsx` into a dedicated `TriageView` so the new stack/card composition does not spill into Audit/Compare.
  - Build a card stack with:
    - current interactive card on top
    - two non-interactive background cards as decorative depth layers
  - Keep the actual swipe behavior on the front card only through `react-tinder-card`.
  - Use a triage-specific card component instead of heavily mutating shared [`TrackCard`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/TrackCard.tsx:12), because Compare also renders `TrackCard`.
  - Embed `WaveformPlayer` into the lower half of the triage card and restyle wavesurfer to approximate the mockup:
    - keep wavesurfer bars, colors, and cursor
    - do not replace it with static div bars
    - keep cached peaks and the current `AudioPool` media element
  - Add a cue overlay component above the waveform using real `cues`; if cue naming is inconsistent, fall back to cue index labels rather than inventing Intro/A/Drop/Outro.
  - Add transient keep/cull “lean” visual state driven by existing input events, but do not delay or wrap the real decision actions.
- Stores / IPC touched:
  - `useQueueStore`: `tracks`, `currentIndex`, `cues`
  - `rb('get_beatgrid')` from `App.tsx`
  - `AudioPool`, `pool.active()`, `pool.play()`, `pool.seek()`
  - `useSettingsStore`: waveform settings
  - `handleKeep()`, `handleCull()`, keyboard/gamepad/MIDI action flow already in `App.tsx`
- Risks:
  - `wavesurfer.js` styling is the highest regression area; cue regions and beatgrid regions must stay visible after custom theming.
  - Shared `TrackCard` changes could break Compare; prefer a triage-only component.
  - Decorative background cards must not trigger extra audio loads or expensive artwork fetches unless explicitly intended.
- How to verify it still works:
  - Run `npm run typecheck`
  - Run `npm run test`
  - Manual: `npm run dev`, load a playlist, swipe left/right, use arrow keys, confirm glow feedback appears without changing decision timing, play audio, seek, and confirm cues and beatgrid render over the real waveform.

### Phase 4: Right decision rail plus Session / Export / Dupes drawer

- Files to add/change:
  - Add `src/components/triage/TriageDecisionRail.tsx`
  - Add `src/components/triage/SessionDrawer.tsx`
  - Add `src/components/triage/DestinationChip.tsx`
  - Modify [`src/components/DestinationPlaylist.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/DestinationPlaylist.tsx:6)
  - Modify [`src/components/PerTrackDestination.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/PerTrackDestination.tsx:9)
  - Modify [`src/components/RatingControl.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/RatingControl.tsx:8)
  - Modify [`src/components/ColorPicker.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/ColorPicker.tsx:9)
  - Modify [`src/components/StatsPanel.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/StatsPanel.tsx:6)
  - Modify [`src/components/NamedSessions.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/NamedSessions.tsx:26)
  - Modify [`src/components/DuplicatesPanel.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/DuplicatesPanel.tsx:3)
  - Modify [`src/App.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/App.tsx:516)
  - Modify `src/styles/triage.css`
- Specific edits:
  - Replace the current broad right rail with a triage-specific essentials rail:
    - keep destination chip
    - cull destination chip
    - rating
    - color
    - compact one-line session stat
  - Keep the default keep/cull destinations wired to `useSettingsStore`, and per-track overrides wired to `useDecisionsStore.patch()`.
  - Preserve the ability to create a new keep playlist; likely move the text input and create action into the drawer rather than keep it always visible.
  - Consolidate `NamedSessions`, CSV/JSON export, and duplicates into a single drawer opened from a bottom overflow button.
  - Keep duplicate track jump behavior by continuing to call `handleDuplicateSelect`.
  - Do not lose current settings surfaces silently. If `LibrarySettings` and `KeymapSettings` do not fit the mockup, move them deliberately into the same drawer or a separate settings affordance; do not leave them inaccessible.
- Stores / IPC touched:
  - `useSettingsStore`: `destinationPlaylistId`, `cullPlaylistId`, setters
  - `useDecisionsStore.patch()`
  - `rb('create_playlist')`
  - `writeSettings()`
  - `listNamedSessions()`, `saveNamedSession()`, `loadNamedSession()`, `deleteNamedSession()`
  - `exportTextFile()`, `buildSessionReportCsv()`, `buildSessionReportJson()`
  - `duplicateClusters` loaded via `rb('find_duplicates')`
- Risks:
  - Moving too many controls into a drawer can hurt keyboard-first efficiency unless focus order and shortcuts are explicit.
  - `LibrarySettings` and `KeymapSettings` are currently part of the same rail but are not represented in the mockup; they need an explicit home.
  - The per-track keep override must remain distinguishable from the default keep destination.
- How to verify it still works:
  - Run `npm run typecheck`
  - Run `npm run test`
  - Manual: change keep/cull destinations, set a per-track override, create a new keep playlist, rate/color a track, open the drawer, save/load/delete a named session, export CSV/JSON, open a duplicate cluster, and confirm selection jumps to the right track.

### Phase 5: Transport restyle plus keyboard hint

- Files to add/change:
  - Add `src/components/triage/KeyboardHint.tsx`
  - Modify [`src/components/TransportBar.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/TransportBar.tsx:17)
  - Modify [`src/components/CueButtons.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/CueButtons.tsx:8)
  - Modify [`src/components/SkipPresetButtons.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/SkipPresetButtons.tsx:8)
  - Optional modify [`src/components/HelpOverlay.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/components/HelpOverlay.tsx:6)
  - Modify [`src/App.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/App.tsx:549)
  - Modify `src/styles/triage.css`
- Specific edits:
  - Restyle the transport into the mockup’s three-part footer without changing play, seek, or jump logic.
  - Keep the current range input or a semantically equivalent accessible scrubber; do not replace it with a non-semantic div-only control.
  - Style cue buttons and preset buttons as colored pills that reflect the semantic categories already returned by `buildCuePresets()`.
  - Add a persistent keyboard hint pill for Triage only, while keeping the full `?` help overlay.
  - Ensure the footer remains above the undo toast and does not become visually blocked.
- Stores / IPC touched:
  - `togglePlay()`, `pool.seek()`, `jumpToCue()`
  - `cues`
  - `cuePresets` from `buildCuePresets()`
  - Existing keyboard map in `App.tsx`
- Risks:
  - `CueButtons` and `SkipPresetButtons` are also used in Compare; variant styling should not make Compare inherit the triage footer styling unintentionally.
  - A floating keyboard hint can collide with the toast or footer on smaller windows.
- How to verify it still works:
  - Run `npm run typecheck`
  - Run `npm run test`
  - Run `npm run build` if the full desktop packaging path is available in this environment
  - Manual: play/pause with button and `Space`, drag the scrubber, jump to hot cues and presets, show help with `?`, trigger undo toast with `Z`, and confirm footer controls remain keyboard reachable.

## 5. Risks And Regressions

- Wavesurfer restyling is the main technical risk. The safe path is to keep [`useWaveform()`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/audio/useWaveform.ts:17) intact and only expose more styling hooks; replacing it would risk peaks, cached durations, cue regions, and beatgrid markers.
- Audit and Compare share some current building blocks:
  - `ModeSwitcher`
  - `TrackCard`
  - `CueButtons`
  - `SkipPresetButtons`
  - app-level header state in `App.tsx`
  The safest strategy is triage-specific wrapper components rather than aggressive mutation of shared markup.
- Audio prefetch and playback must remain untouched:
  - `AudioPool` setup and prefetch window in [`src/App.tsx`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/App.tsx:109)
  - `pool.setTracks()`, `pool.setCurrent()`, `pool.play()`, `pool.seek()`
  - `songswipe-media://` / file URL resolution via [`src/lib/ipc.ts`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/src/lib/ipc.ts:26)
- Commit flow must remain exactly reachable after the top-bar move. The redesign should only move the button, not change:
  - dry-run preview
  - review queue
  - backup / rollback
  - Rekordbox-open guard
  - XML export
- Keyboard-first access must survive every move. Specifically verify:
  - mode switching
  - playlist source selection
  - keep / cull
  - play / pause
  - cue jumps
  - undo
  - session drawer open / close
  - commit dialog open / close

## 6. Open Questions For User Decision

- Which mockup file is canonical? The prompt referenced `docs/superpowers/plans/ui-redesign/mockup.html`, but the repo currently only contains [`docs/superpowers/plans/songswipe-redesign.html`](/Users/coleh/conductor/workspaces/SongSwipe/harrisburg/docs/superpowers/plans/songswipe-redesign.html:1).
- Should the collapsed left rail be Triage-only at first, or should Audit and Compare adopt it in the same rollout?
- Where should the current `LibrarySettings` and `KeymapSettings` live after the right rail shrinks? They are functional today but absent from the mockup.
- Should the two background cards in the stack be purely decorative shells, or should they preview the next tracks’ artwork/title?
- How should cue labels be derived when real hot cues do not have names like `INTRO`, `A`, `DROP`, or `OUTRO`? Recommended default: use real cue names when present; otherwise show `Cue 1`, `Cue 2`, etc.
- Should new-playlist creation stay available directly from the keep destination control, or is it acceptable to move that text input into the consolidated drawer?
