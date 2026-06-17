# Implementation Comparison: Before & After

## Configuration

### ❌ BEFORE
```yaml
type: custom:kodi-playlist-card
entity: media_player.kodi
playlistid: 0
name: Kodi Playlist
```

### ✅ AFTER
```yaml
type: custom:kodi-playlist-card
entry_id: "a1b2c3d4e5f6"
title: Audio Playlist
```

**Why?** The new config is simpler and follows the kodi_media_sensors integration pattern.

---

## Subscription Method

### ❌ BEFORE
```typescript
private _subscribeKodiEvents(): void {
    if (!this.hass || !this.hass.connection) return;
    this._unsubEvents = this.hass.connection.subscribeEvents<any>(
        (event) => this._handleKodiResultEvent(event),
        "kodi_call_method_result"  // ← Listening to service call results
    );
}
```

**Problems**:
- Listens for generic service call results
- No filtering by config entity
- Requires constant polling with `_queryKodiData()`

### ✅ AFTER
```typescript
private _subscribeToPlaylistUpdates(): void {
    this.hass.connection.subscribeMessage<KodiMediaSensorEvent>(
        (event) => this._handlePlaylistEvent(event),
        {
            type: "kodi_media_sensors/subscribe_playlist",
            entry_id: this._config.entry_id,
        }
    );
}
```

**Benefits**:
- Subscribed to specific integration
- Event-driven updates only
- No polling needed
- Type-safe event handling

---

## Data Updates

### ❌ BEFORE
```typescript
protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    // Poll on every property change
    const currentMediaId = `${stateObj.state}-${stateObj.attributes.media_title || ""}...`;
    if (currentMediaId !== this._lastMediaId) {
        this._lastMediaId = currentMediaId;
        this._queryKodiData();  // ← Make an API call to Kodi
    }
}

private _queryKodiData(): void {
    this.hass.callService("kodi", "call_method", {
        entity_id: entityId,
        method: "Playlist.GetItems",  // ← Direct Kodi API call
        playlistid: this._config.playlistid,
        properties: ["title", "artist", "album", "duration"],
    });
}
```

**Problems**:
- Polling-based (inefficient)
- Direct Kodi API calls needed
- Race conditions possible
- Requires entity state tracking

### ✅ AFTER
```typescript
private _handlePlaylistEvent(event: KodiMediaSensorEvent): void {
    if (event.type === "playlist_update") {
        this._items = event.items || [];
        this._kodiState = event.kodi_state || "idle";
        this._connectionState = ConnectionState.CONNECTED;
        this._error = null;
    } else if (event.type === "kodi_unavailable") {
        this._connectionState = ConnectionState.UNAVAILABLE;
    }
}
```

**Benefits**:
- Event-driven (efficient)
- Data already formatted
- No API calls needed
- Clear state management

---

## Keep-Alive & Connection Status

### ❌ BEFORE
```typescript
.connection-status { 
    display: flex; 
    align-items: center; 
    gap: 6px; 
    font-size: 0.8rem; 
    color: var(--secondary-text-color); 
}
// Simple static indicator, no animation
```

**Status**: Only shows online/offline based on entity state

### ✅ AFTER
```typescript
private _startKeepAlive(): void {
    this._keepAliveInterval = setInterval(() => {
        if (this._connectionState === ConnectionState.CONNECTED) {
            this.requestUpdate();  // ← Periodic visual refresh
        }
    }, 2000);
}
```

**CSS**:
```scss
.status-dot.connected {
    background-color: var(--kodi-success);
    box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
    animation: pulse-connected 2s ease-in-out infinite;  // ← Visual feedback
}
```

**Status**: 
- Connected (green pulsing)
- Connecting (yellow pulsing)
- Unavailable (red)
- Error (red with explanation)

---

## Layout

### ❌ BEFORE
Simple list with minimal styling:
```html
<li class="playlist-item">
    <span class="track-number">1</span>
    <div class="track-info">
        <span class="track-title">Song Title</span>
        <span class="track-meta">Artist • Album</span>
    </div>
    <span class="track-duration">3:47</span>
</li>
```

### ✅ AFTER
Grid layout with thumbnails:
```html
<li class="playlist-item">
    <img class="track-thumbnail" src="image://..." alt="..." />
    <div class="track-info">
        <p class="track-title">Song Title</p>
        <p class="track-meta">Artist • Album</p>
    </div>
    <span class="track-duration">3:47</span>
</li>
```

**CSS Grid**:
```scss
.playlist-item {
    display: grid;
    grid-template-columns: 56px 1fr auto;  // thumbnail, info, duration
    gap: 12px;
    align-items: center;
}
```

**Visual Benefits**:
- Album art thumbnails (like the reference image)
- Better visual hierarchy
- Mobile responsive
- Modern Material Design

---

## File Organization

### ❌ BEFORE
```
src/
├── kodi-playlist-card.ts     (400+ lines)
├── kodi-playlist-card.scss   (separate but not imported)
└── kodi-playlist-card.html   (unused, has old template)
```

**Problems**:
- Logic, style, and html all over the place
- SCSS not imported into TS
- Unused HTML template
- Hard to maintain

### ✅ AFTER
```
src/
├── kodi-playlist-card.ts      (350 lines - logic only)
├── styles.scss                (400 lines - all styling)
├── types.ts                   (50 lines - interfaces)
├── config.ts                  (25 lines - validation)
└── utils.ts                   (50 lines - helpers)
```

**Benefits**:
- Clear separation of concerns
- SCSS properly imported
- Easy to locate code
- Easy to extend

---

## Error Handling

### ❌ BEFORE
```typescript
private _queryKodiData(): void {
    // No error handling if Kodi is offline
    // Silent failure if service call fails
}
```

### ✅ AFTER
```typescript
private _handlePlaylistEvent(event: KodiMediaSensorEvent): void {
    if (event.type === "kodi_unavailable") {
        this._connectionState = ConnectionState.UNAVAILABLE;
        // Render "Kodi is unavailable" state
    }
}

// Render error state
private _renderErrorState(): TemplateResult {
    return html`
        <div class="error-state">
            <ha-icon icon="mdi:alert-circle"></ha-icon>
            <p>${this._error || "An error occurred"}</p>
        </div>
    `;
}
```

**Benefits**:
- Explicit error states
- User-friendly messages
- Clear connection feedback

---

## Code Quality

### Type Safety

### ❌ BEFORE
```typescript
@state() private _items: PlaylistItem[] = [];
@state() private _currentIndex: number = -1;

interface PlaylistItem {
    title?: string;
    artist?: string | string[];
    // ... minimal documentation
}
```

### ✅ AFTER
```typescript
import { PlaylistItem, KodiMediaSensorEvent, ConnectionState } from "./types";

// types.ts is comprehensive:
export interface PlaylistItem {
    title?: string;
    artist?: string | string[];
    album?: string;
    duration?: number;
    thumbnail?: string;
    file?: string;
    showtitle?: string;
    episode?: number;
    season?: number;
    type?: string;
}

export type KodiMediaSensorEvent = PlaylistUpdateEvent | KodiUnavailableEvent;

export enum ConnectionState {
    IDLE = "idle",
    CONNECTING = "connecting",
    CONNECTED = "connected",
    UNAVAILABLE = "unavailable",
    ERROR = "error",
}
```

**Benefits**:
- Full type coverage
- Auto-completion in IDE
- Self-documenting code

---

## Summary Table

| Aspect | Before | After |
|--------|--------|-------|
| **API Method** | Direct Kodi service calls | WebSocket subscriptions |
| **Update Strategy** | Polling (inefficient) | Event-driven (efficient) |
| **Configuration** | entity + playlistid | entry_id + title |
| **File Organization** | Monolithic | Modular (5 files) |
| **Layout** | Text-only list | Grid with thumbnails |
| **Keep-Alive** | No animation | Pulsing status dot |
| **Error States** | Silent failures | Clear messages |
| **Type Safety** | Minimal | Comprehensive |
| **Lines of Code** | 400+ in one file | 350 + 400 + 50 + 25 + 50 organized files |

---

## Performance Impact

### Before
- **Polling Overhead**: Regular state checks even when nothing changed
- **API Calls**: Multiple Kodi API calls per state change
- **Memory**: No keep-alive management, potential leaks

### After
- **Event-Driven**: Only updates when data actually changes
- **No API Calls**: All data provided by integration
- **Keep-Alive**: Managed interval with proper cleanup

**Result**: More efficient, responsive, and maintainable.

---

## Migration Checklist

- [ ] Update YAML configuration with `entry_id`
- [ ] Replace component file
- [ ] Replace SCSS file
- [ ] Add new utility files (types, config, utils)
- [ ] Update rollup configs
- [ ] Run `npm install` if adding new packages
- [ ] Build with `npm run build`
- [ ] Test in Home Assistant
- [ ] Verify WebSocket connection in DevTools
- [ ] Check error states (disconnect Kodi to test)
