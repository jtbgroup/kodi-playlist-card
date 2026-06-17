# Kodi Playlist Card - Phase 1: Refactoring Guide

## Overview

This document describes the refactored Kodi Playlist Card that follows the `kodi_media_sensors` integration specification and uses a clean, multi-file architecture.

## What Changed

### API Integration
**Before**: Used direct Kodi service calls via `hass.callService("kodi", "call_method", ...)`
**After**: Uses Home Assistant WebSocket subscriptions via `hass.connection.subscribeMessage()`

### Configuration
**Before**:
```yaml
type: custom:kodi-playlist-card
entity: media_player.kodi
playlistid: 0
```

**After**:
```yaml
type: custom:kodi-playlist-card
entry_id: abc123def456  # Config entry ID from kodi_media_sensors integration
title: My Music         # Optional
```

### Architecture
**Before**: Single monolithic file with mixed concerns
**After**: Clean separation into multiple focused files

## File Structure

```
src/
├── kodi-playlist-card.ts    # Main LitElement component (logic only)
├── styles.scss              # All styling (SCSS)
├── types.ts                 # TypeScript interfaces & enums
├── config.ts                # Configuration validation
└── utils.ts                 # Utility functions
```

### File Responsibilities

#### `kodi-playlist-card.ts` (Main Component)
- **Purpose**: LitElement component logic
- **Responsibilities**:
  - WebSocket subscription management
  - Event handling (`playlist_update`, `kodi_unavailable`)
  - Component lifecycle (`connectedCallback`, `disconnectedCallback`)
  - Template rendering
  - Keep-alive indicator logic
- **Size**: ~350 lines (clean, focused)

#### `styles.scss` (Styling)
- **Purpose**: All visual styling
- **Features**:
  - CSS variables for theming
  - Responsive design (mobile-first)
  - Animation keyframes
  - Grid layout for playlist items
  - Dark/light mode support via CSS vars
- **Size**: ~400 lines of well-organized SCSS

#### `types.ts` (Type Definitions)
- **Purpose**: TypeScript interfaces and enums
- **Exports**:
  - `PlaylistItem` - Kodi media item
  - `PlaylistUpdateEvent` - Update message shape
  - `KodiUnavailableEvent` - Unavailable message shape
  - `KodiMediaSensorEvent` - Union type
  - `KodiPlaylistCardConfig` - Card config
  - `ConnectionState` - Enum for connection states
- **Size**: ~50 lines

#### `config.ts` (Configuration)
- **Purpose**: Configuration validation
- **Exports**:
  - `validateConfig()` - Validates and normalizes config
  - Throws descriptive errors for missing fields
- **Size**: ~25 lines

#### `utils.ts` (Utilities)
- **Purpose**: Helper functions
- **Exports**:
  - `formatDuration()` - Converts seconds to mm:ss
  - `formatArtist()` - Handles artist string/array
  - `buildMetadataString()` - Creates "artist • album" string
  - `isValidThumbnail()` - Validates image URLs
- **Size**: ~50 lines

## Key Features

### 1. **WebSocket Subscription**
```typescript
private _subscribeToPlaylistUpdates(): void {
    this.hass.connection.subscribeMessage<KodiMediaSensorEvent>(
        (event) => this._handlePlaylistEvent(event),
        {
            type: "kodi_media_sensors/subscribe_playlist",
            entry_id: this._config.entry_id,
        }
    ).then((unsubscribe) => {
        this._unsubscribeMessage = unsubscribe;
        this._connectionState = ConnectionState.CONNECTED;
    });
}
```

### 2. **Keep-Alive Indicator**
- Visual feedback showing the card is actively connected
- 2-second update interval to demonstrate connection
- Colored status dot with pulse animation:
  - Green + pulse: Connected and receiving updates
  - Yellow + pulse: Currently connecting
  - Red: Offline or error
  - Gray: Idle

### 3. **Layout (From Image Reference)**
Grid-based responsive layout:
- **Desktop**: 56×56px thumbnail | Track info | Duration
- **Mobile**: Scales down to 48×48px, adjusted spacing
- Album art thumbnails with fallback icon
- Clean, modern Material Design aesthetic

### 4. **State Management**
Three distinct states:
- **Connected**: Shows playlist with live updates
- **Unavailable**: Shows "Kodi is unavailable" message
- **Empty**: Shows "No tracks in playlist" message

### 5. **Proper Cleanup**
- Unsubscribes from WebSocket in `disconnectedCallback()`
- Stops keep-alive timer on unmount
- No memory leaks when navigating away

## Installation Instructions

### 1. Replace Files in Your Project
Copy the new files to your `src/` directory:
```bash
# Replace the main component file
cp kodi-playlist-card.ts src/

# Replace the SCSS styling
cp styles.scss src/

# Add new utility files
cp types.ts src/
cp config.ts src/
cp utils.ts src/
```

### 2. Update Rollup Configs
Replace both rollup configuration files:
```bash
cp rollup.config.js .
cp rollup.config.dev.js .
```

### 3. Install Dependencies
Ensure you have `rollup-plugin-lit-css` installed:
```bash
npm install --save-dev rollup-plugin-lit-css
```

### 4. Build the Card
```bash
npm run build
# or for development with watch mode:
npm run start
```

## Configuration in Home Assistant

### Manual YAML
```yaml
type: custom:kodi-playlist-card
entry_id: "a1b2c3d4e5f6"
title: "Music Library"
```

### Finding Your entry_id
1. Go to Home Assistant Settings → Devices & Services → Integrations
2. Find the `kodi_media_sensors` integration
3. The config entry ID is shown in the integration details

## Testing the Card

### Development Mode
```bash
npm run start
```
- Starts dev server on `http://localhost:5000`
- Watch mode automatically rebuilds on file changes
- Access via: `http://localhost:5000/kodi-playlist-card.js`

### Production Build
```bash
npm run build
```
- Minified and optimized output
- Ready for HACS distribution

## Architecture Benefits

### Separation of Concerns
- **Logic** (`kodi-playlist-card.ts`): Component behavior
- **Styling** (`styles.scss`): Visual presentation
- **Types** (`types.ts`): Data contracts
- **Config** (`config.ts`): Validation rules
- **Utils** (`utils.ts`): Reusable functions

### Maintainability
- **Easy to locate code**: Know where to look for specific concerns
- **Simple updates**: Change styling without touching logic
- **Type safety**: Full TypeScript support across all files
- **Testability**: Utilities can be unit tested independently

### Scalability
- **Easy to add features**: New functionality goes in logical places
- **Reduce conflicts**: Multiple developers can work on different files
- **Better imports**: Clear dependencies between modules

## Phase 2 Enhancements (Future)

The following features are planned for Phase 2:
- Card editor UI for configuration
- Multi-language support (i18n)
- Play button to trigger track playback
- Drag & drop to reorder playlist
- Delete button to remove items
- Context menu for advanced actions

The modular structure makes these additions straightforward—each feature will have its own concerns properly isolated.

## Troubleshooting

### "subscribeMessage is not defined"
- Ensure Home Assistant version supports `subscribeMessage`
- Minimum HA version: 2021.6+

### "entry_id not found"
- Verify the `kodi_media_sensors` integration is installed
- Check that the config entry ID is correct in your card config
- Entry IDs are visible in Devices & Services → Integrations

### Styles not loading
- Ensure `rollup-plugin-lit-css` is installed
- Check that `styles.scss` is in the `src/` directory
- SCSS must be imported: `import styles from "./styles.scss"`

### Keep-alive indicator not pulsing
- Check browser console for errors
- Verify WebSocket connection in DevTools Network tab
- Ensure `hass.connection` is available

## Next Steps

1. **Test locally**: Run `npm run start` and verify in Home Assistant
2. **Validate configuration**: Ensure your YAML has correct `entry_id`
3. **Check integration**: Confirm `kodi_media_sensors` is installed and working
4. **Monitor console**: Look for any errors in browser DevTools
5. **Plan Phase 2**: Decide which features to implement first

## Support Resources

- [Home Assistant Custom Cards Docs](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/)
- [Lit Documentation](https://lit.dev/)
- [kodi_media_sensors Integration](https://github.com/jtbgroup/kodi-media-sensors)
- [Home Assistant WebSocket API](https://developers.home-assistant.io/docs/api/websocket)
