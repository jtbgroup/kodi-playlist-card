# Kodi Playlist Card for Home Assistant

A modern, responsive Lovelace card for Home Assistant that displays your Kodi playlist in real-time using the `kodi_media_sensors` custom integration.

## 📋 Features

✨ **Phase 1 Features**
- Real-time playlist display via WebSocket
- Album art thumbnails with fallback icons
- Connection status indicator with keep-alive pulse
- Responsive design (desktop & mobile)
- Clean, modern Material Design UI
- Proper error and unavailable states
- Type-safe TypeScript implementation
- Modular, maintainable code structure

🚀 **Phase 2 (Coming Soon)**
- Card configuration editor UI
- Multi-language support (i18n)
- Play button to trigger track playback
- Drag & drop playlist reordering
- Delete button to remove items
- Context menu actions

## 🖼️ Preview

The card displays a playlist with:
- Album art thumbnails (56×56px on desktop, 48×48px on mobile)
- Track title and artist/album metadata
- Track duration (formatted as mm:ss)
- Connection status indicator showing live updates
- Responsive grid layout

## 📦 Installation

### Prerequisites

- Home Assistant with custom integrations support
- `kodi_media_sensors` integration installed
- Home Assistant 2021.6 or later (for WebSocket subscribeMessage support)

### Step 1: Install the Integration

Install the `kodi_media_sensors` integration from HACS or manually:

1. Go to Settings → Devices & Services → Create Automation
2. Search for and install `kodi_media_sensors`
3. Note your config entry ID (shown in integration details)

### Step 2: Install the Card

**Option A: Via HACS (Recommended)**
1. Open HACS → Frontend
2. Search for "Kodi Playlist Card"
3. Install and restart Home Assistant

**Option B: Manual Installation**
1. Download the card from releases
2. Copy to `www/kodi-playlist-card/kodi-playlist-card.js`
3. Add to your resources in Lovelace

**Option C: Development Setup**
```bash
git clone <repository-url>
cd kodi-playlist-card
npm install
npm run build
# Copy dist/kodi-playlist-card.js to your www folder
```

## ⚙️ Configuration

### Basic Configuration

Add to your Lovelace dashboard (YAML):

```yaml
type: custom:kodi-playlist-card
entry_id: "YOUR_CONFIG_ENTRY_ID"
```

### Full Configuration

```yaml
type: custom:kodi-playlist-card
entry_id: "a1b2c3d4e5f6"           # Required: Config entry ID from kodi_media_sensors
title: "My Music"                   # Optional: Card title (default: "Audio Playlist")
```

### Finding Your entry_id

1. Open Home Assistant Settings
2. Go to Devices & Services → Integrations
3. Find the `kodi_media_sensors` integration
4. Click on it to see the entry ID in the integration details
5. Copy the ID and paste it into your card configuration

## 🏗️ Architecture

### File Structure

```
src/
├── kodi-playlist-card.ts      # Main LitElement component
├── styles.scss                # All SCSS styling
├── types.ts                   # TypeScript interfaces and enums
├── config.ts                  # Configuration validation
└── utils.ts                   # Utility functions
```

### Component Lifecycle

1. **Mount** → Subscribe to WebSocket
2. **Receive Events** → playlist_update or kodi_unavailable
3. **Update State** → Items, Kodi state, connection status
4. **Render** → Display playlist or error state
5. **Keep-Alive** → 2-second visual refresh to show connection
6. **Unmount** → Unsubscribe and clean up

### Data Flow

```
┌─────────────────────┐
│ Home Assistant      │
│ kodi_media_sensors  │
└──────────┬──────────┘
           │
           │ WebSocket subscribeMessage()
           │
           ▼
┌─────────────────────┐     ┌──────────────────┐
│ Kodi Playlist Card  │────▶│ Connection Ind.  │
│                     │     │ (Status Dot)     │
│ ┌─────────────────┐ │     └──────────────────┘
│ │ Playlist Items  │ │
│ │ + Thumbnails    │ │
│ │ + Metadata      │ │
│ │ + Duration      │ │
│ └─────────────────┘ │
└─────────────────────┘
```

## 🎨 Styling & Customization

The card uses CSS variables for theming. Customize via your Home Assistant theme:

```yaml
# configuration.yaml
frontend:
  themes:
    my_theme:
      primary-color: "#03a9f4"
      primary-text-color: "#212121"
      secondary-text-color: "#757575"
      divider-color: "rgba(0, 0, 0, 0.12)"
      card-background-color: "#ffffff"
      secondary-background-color: "#fafafa"
      success-color: "#4caf50"
      error-color: "#f44336"
      warning-color: "#ff9800"
```

## 🔧 Development

### Prerequisites
- Node.js 14+
- npm or yarn

### Setup

```bash
git clone <repository-url>
cd kodi-playlist-card
npm install
```

### Development Server

```bash
npm run start
```

- Starts dev server on http://localhost:5000
- Watch mode automatically rebuilds on changes
- Access card at: http://localhost:5000/kodi-playlist-card.js

### Building for Production

```bash
npm run build
```

- Minified and optimized output
- Outputs to `dist/` directory
- Ready for HACS or manual installation

### Linting

```bash
npm run lint
```

Checks TypeScript for errors using ESLint

## 📡 How It Works

### WebSocket Subscription

The card subscribes to the `kodi_media_sensors` integration's WebSocket:

```typescript
this.hass.connection.subscribeMessage(
    (event) => this._handlePlaylistEvent(event),
    {
        type: "kodi_media_sensors/subscribe_playlist",
        entry_id: this._config.entry_id,
    }
);
```

### Message Types

**playlist_update**: Sent when playlist or Kodi state changes
```json
{
    "type": "playlist_update",
    "items": [
        {
            "title": "Track Name",
            "artist": ["Artist Name"],
            "album": "Album Name",
            "duration": 245,
            "thumbnail": "image://...",
            "type": "song"
        }
    ],
    "kodi_state": "playing"
}
```

**kodi_unavailable**: Sent when Kodi is unreachable
```json
{
    "type": "kodi_unavailable"
}
```

### Connection Status Indicator

The card shows connection status via an animated dot:
- 🟢 **Connected**: Green pulsing dot (live updates)
- 🟡 **Connecting**: Yellow pulsing dot (establishing connection)
- 🔴 **Unavailable**: Red dot (Kodi offline)
- 🔴 **Error**: Red dot with error message

## 🐛 Troubleshooting

### Card doesn't appear in Lovelace

1. Check browser console for errors (F12 → Console)
2. Verify card is added to resources:
   ```yaml
   resources:
     - url: /local/kodi-playlist-card/kodi-playlist-card.js
       type: module
   ```
3. Clear browser cache and restart HA

### Connection shows "Error" or "Offline"

1. Verify `kodi_media_sensors` integration is installed
2. Check config entry ID is correct
3. Look for error message in browser console
4. Check Home Assistant logs for integration errors

### Playlist doesn't update

1. Open browser DevTools (F12)
2. Check Network tab → WS connections
3. Should see active WebSocket to `/api/websocket`
4. Check Console for JavaScript errors
5. Try triggering a play/pause action in Kodi

### Thumbnails not showing

1. Verify Kodi has HTTP library access enabled
2. Check that thumbnail URLs are valid (image://)
3. Ensure Home Assistant can reach Kodi's HTTP server
4. Check browser console for image load errors

### Card size too large/small

The card height is calculated as:
```
height = 5 + min(items.length, 10)
```

To customize card height in your dashboard, use the built-in grid sizing in Lovelace.

## 📚 API Reference

### Component Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `hass` | HomeAssistant | Yes | Home Assistant instance (automatic) |
| `entry_id` | string | Yes | Config entry ID of kodi_media_sensors |
| `title` | string | No | Card title (default: "Audio Playlist") |

### Component Methods

| Method | Purpose |
|--------|---------|
| `setConfig(config)` | Set card configuration |
| `getCardSize()` | Return height hint for layout |
| `connectedCallback()` | Subscribe to updates on mount |
| `disconnectedCallback()` | Cleanup on unmount |

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📋 Phase 2 Roadmap

- [ ] Card configuration UI editor
- [ ] Multi-language support (English, German, Spanish, French, Dutch)
- [ ] Play button for individual tracks
- [ ] Drag & drop to reorder playlist
- [ ] Delete button to remove tracks
- [ ] Context menu with advanced options
- [ ] Search/filter functionality
- [ ] Keyboard shortcuts
- [ ] Theme customization UI

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Credits

- Built for the [Home Assistant](https://www.home-assistant.io/) community
- Uses [Lit](https://lit.dev/) web components framework
- Integrates with [kodi_media_sensors](https://github.com/jtbgroup/kodi-media-sensors) integration

## 📞 Support

### Getting Help

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review the [Specification](specs.md) for API details
3. Check browser console for error messages
4. Open an issue on GitHub with:
   - Your card configuration
   - Browser console errors
   - Home Assistant version
   - kodi_media_sensors version

### Reporting Bugs

Please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser and HA versions
- Any console errors

### Requesting Features

Please provide:
- Clear description of the feature
- Use case / why you need it
- Any related issues or discussions

## 📖 Additional Resources

- [Home Assistant Documentation](https://www.home-assistant.io/docs/)
- [Custom Card Development](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/)
- [Lit Documentation](https://lit.dev/)
- [SCSS Documentation](https://sass-lang.com/)
- [WebSocket API](https://developers.home-assistant.io/docs/api/websocket)

## ⭐ Show Your Support

If you like this card, please consider:
- Starring the repository
- Sharing feedback and suggestions
- Contributing to improvements
- Reporting bugs to help make it better

---

**Built with ❤️ for Home Assistant**
