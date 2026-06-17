# Kodi Playlist Card Specification

## Overview
A custom Lovelace card for Home Assistant that displays the current Kodi playlist in real-time using the `kodi_media_sensors` custom integration's WebSocket API.

## Architecture

### Communication
- **Connection Method**: Home Assistant's existing frontend WebSocket connection (`hass.connection`)
- **No Separate WebSocket**: The card uses the unified HA connection, not a separate WebSocket
- **Event-Driven**: Updates via message subscriptions, not polling

### Subscription Flow

On card mount (when `hass` and config are available):

```typescript
this._unsubscribeMessage = await this.hass.connection.subscribeMessage(
    (event) => this._handlePlaylistEvent(event),
    {
        type: "kodi_media_sensors/subscribe_playlist",
        entry_id: this._config.entry_id,
    }
);
```

**Cleanup**: Call the returned unsubscribe function in `disconnectedCallback()` to prevent backend subscription leaks when the card is removed.

## Message Types

### 1. `playlist_update`

Sent when the playlist or Kodi state changes.

```json
{
    "type": "playlist_update",
    "items": [
        {
            "title": "Track title",
            "artist": ["Artist Name"],
            "album": "Album name",
            "duration": 245,
            "thumbnail": "image://...",
            "file": "...",
            "showtitle": "...",
            "episode": 3,
            "season": 1,
            "type": "song"
        }
    ],
    "kodi_state": "playing"
}
```

**Fields**:
- `items`: Array of playlist entries. Fields vary by content type (`song`, `movie`, `episode`, etc.). Not all fields are always present.
- `kodi_state`: Current Kodi media player state. Values: `playing`, `paused`, `idle`, etc.

### 2. `kodi_unavailable`

Sent when the Kodi instance is unreachable (powered off, network issues, etc.).

```json
{
    "type": "kodi_unavailable"
}
```

No `items` or `kodi_state` field is included.

## UI Behavior

### Playlist Update
- **Render** the list of items with:
  - Thumbnail (album art if available)
  - Title (bold, primary text)
  - Metadata (artist and album, secondary text)
  - Duration formatted as `mm:ss`
  - Currently playing indicator (visual highlight)
- **Status Indicator**: Show connection status reflecting the card's subscription state
  - Connected: Green dot with subtle pulse animation
  - Connecting: Yellow dot with pulse
  - Offline/Unavailable: Red dot
  - Error: Red state with error icon

### Empty Playlist
When `items: []` with non-unavailable `kodi_state`:
- Show "No tracks in playlist" message
- Display empty state icon (music box outline)

### Kodi Unavailable
When `kodi_unavailable` event is received:
- Show "Kodi is unavailable" message
- Optionally keep last known playlist visible but dimmed
- Display offline icon

## Card Configuration

Exposed via the card editor:

```yaml
type: custom:kodi-playlist-card
entry_id: abc123def456  # Required: config entry ID of kodi_media_sensors instance
title: My Music          # Optional: custom title (default: "Audio Playlist")
```

### Configuration Fields
- **entry_id** (string, required): The config entry ID of the `kodi_media_sensors` instance to subscribe to
- **title** (string, optional): Title displayed at the top of the card (default: "Audio Playlist")

## Component Structure

### Files
- `src/kodi-playlist-card.ts` - Main LitElement component
- `src/styles.scss` - All styling (SCSS)
- `src/types.ts` - TypeScript interfaces and types
- `src/config.ts` - Configuration validation
- `src/utils.ts` - Utility functions (formatting, helpers)

### LitElement Implementation

The card implements standard Lovelace card lifecycle:
- `setConfig()` - Validate and store configuration
- `set hass()` - Implicit property setter for Home Assistant instance
- `getCardSize()` - Return card height hint for grid layout
- `connectedCallback()` - Subscribe to WebSocket messages
- `disconnectedCallback()` - Clean up subscriptions

## Visual Design

### Layout
- **Header**: Title with music icon, connection status indicator on the right
- **Content Area**: Scrollable playlist
- **Items**: Grid layout with:
  - Column 1: 56×56px thumbnail (placeholder if unavailable)
  - Column 2: Track info (title and metadata)
  - Column 3: Duration (monospace font)

### Connection Indicator
A small badge in the header showing:
- Status dot (colored based on connection state)
- Status text ("Live", "Connecting...", "Offline", "Error")

The dot pulses when connected to indicate ongoing activity.

## Development Notes

### Multi-File Structure
- Separation of concerns: Logic in `.ts`, styling in `.scss`, types in separate files
- Rollup handles SCSS compilation via `rollup-plugin-lit-css`
- SCSS imports directly into TS: `import styles from "./styles.scss"`

### Error Handling
- Configuration validation on `setConfig()`
- WebSocket subscription errors logged and displayed
- Graceful fallback to error states

### Performance
- Each card instance creates its own subscription (no sharing)
- Keep-alive timer (2s) to maintain visual connection indicator
- Proper cleanup in `disconnectedCallback()` to prevent memory leaks

## Future Enhancements (Phase 2)

- **Card Editor**: UI for configuration instead of YAML
- **Internationalization**: Multi-language support
- **Play Button**: Trigger playback of specific items
- **Drag & Drop**: Reorder playlist items
- **Delete Function**: Remove items from playlist
