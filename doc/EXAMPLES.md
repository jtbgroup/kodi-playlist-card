# Example Configurations

## Example 1: Basic Configuration

### configuration.yaml
```yaml
# Example Home Assistant main configuration

homeassistant:
  name: Home
  latitude: !secret latitude
  longitude: !secret longitude
  elevation: 0
  unit_system: metric
  time_zone: Europe/Brussels

frontend:
  # Add custom card resources
  extra_module_url:
    - /local/kodi-playlist-card/kodi-playlist-card.js

# Example integrations that work with this card
integrations:
  - platform: kodi_media_sensors
    # Configuration will be via UI in Settings > Devices & Services
```

### dashboard.yaml (or lovelace.yaml)
```yaml
# Basic dashboard configuration with the Kodi Playlist Card

views:
  - title: Home
    path: home
    cards:
      - type: custom:kodi-playlist-card
        entry_id: "a1b2c3d4e5f6"
        title: "Now Playing"

  - title: Music
    path: music
    cards:
      - type: custom:kodi-playlist-card
        entry_id: "a1b2c3d4e5f6"
        title: "My Music Library"
```

---

## Example 2: Advanced Dashboard with Multiple Cards

```yaml
views:
  - title: Entertainment
    path: entertainment
    icon: mdi:entertainment-center
    cards:
      # Kodi status card
      - type: entities
        title: Kodi Status
        entities:
          - entity_id: media_player.kodi_living_room
            name: Living Room Kodi

      # Kodi Playlist Card
      - type: custom:kodi-playlist-card
        entry_id: "living_room_kodi"
        title: "Living Room Playlist"

      # Vertical stack with multiple playlist cards
      - type: vertical-stack
        cards:
          - type: custom:kodi-playlist-card
            entry_id: "bedroom_kodi"
            title: "Bedroom Music"

          - type: custom:kodi-playlist-card
            entry_id: "kitchen_kodi"
            title: "Kitchen Audio"
```

---

## Example 3: With Custom Theme

### configuration.yaml
```yaml
frontend:
  extra_module_url:
    - /local/kodi-playlist-card/kodi-playlist-card.js
  
  themes:
    dark_mode:
      primary-color: "#03a9f4"
      primary-text-color: "#ffffff"
      secondary-text-color: "#b0bec5"
      divider-color: "rgba(255, 255, 255, 0.12)"
      card-background-color: "#1e1e1e"
      secondary-background-color: "#2a2a2a"
      success-color: "#4caf50"
      error-color: "#f44336"
      warning-color: "#ff9800"
      # Kodi card specific
      accent-color: "#03a9f4"
```

### dashboard.yaml
```yaml
views:
  - title: Music
    cards:
      - type: custom:kodi-playlist-card
        entry_id: "music_server"
        title: "Now Playing"
        # Theme will be applied automatically
```

---

## Example 4: Development Setup

### For local development with npm run start

Create a development dashboard at `http://localhost:8123/dashboard-dev`:

```yaml
views:
  - title: Development
    path: dev
    cards:
      # Test with different states
      - type: custom:kodi-playlist-card
        entry_id: "test_kodi"
        title: "Test Playlist"

      # Empty playlist test
      - type: custom:kodi-playlist-card
        entry_id: "empty_kodi"
        title: "Empty Playlist"

      # Error state test
      - type: custom:kodi-playlist-card
        entry_id: "offline_kodi"
        title: "Offline Kodi"
```

### Development server setup

1. Run `npm run start` (starts on port 5000)
2. Add to lovelace resources via UI:
   - URL: `http://localhost:5000/kodi-playlist-card.js`
   - Type: JavaScript Module
3. Refresh dashboard and use the card
4. Use browser DevTools to debug

---

## Example 5: Multiple Kodi Instances

If you have multiple Kodi instances configured with `kodi_media_sensors`:

### configuration.yaml
```yaml
# Each Kodi instance gets its own config entry in kodi_media_sensors
# You can see them all in Settings > Devices & Services > Integrations
```

### dashboard.yaml
```yaml
views:
  - title: All Rooms
    cards:
      - type: vertical-stack
        cards:
          - type: custom:kodi-playlist-card
            entry_id: "kodi_living_room"
            title: "Living Room"

          - type: custom:kodi-playlist-card
            entry_id: "kodi_bedroom"
            title: "Bedroom"

          - type: custom:kodi-playlist-card
            entry_id: "kodi_kitchen"
            title: "Kitchen"

          - type: custom:kodi-playlist-card
            entry_id: "kodi_garage"
            title: "Garage"
```

---

## Example 6: With Automations

### automations.yaml
```yaml
# Example automations that work with Kodi

- alias: "Notify when Kodi playlist updated"
  trigger:
    platform: event
    event_type: kodi_media_sensors_playlist_updated
  action:
    service: persistent_notification.create
    data:
      title: "Kodi Playlist Updated"
      message: "New items in the Kodi playlist"

- alias: "Turn off lights when playing music"
  trigger:
    platform: state
    entity_id: media_player.kodi_living_room
    to: "playing"
  action:
    service: light.turn_off
    entity_id: light.living_room
```

---

## Example 7: Responsive Mobile Layout

Use the `vertical-stack` and `horizontal-stack` for responsive layouts:

```yaml
views:
  - title: Mobile Music
    cards:
      - type: vertical-stack
        cards:
          # Header
          - type: entities
            entities:
              - entity_id: media_player.kodi_mobile
                name: "Kodi Speaker"

          # Main playlist card
          - type: custom:kodi-playlist-card
            entry_id: "kodi_mobile"
            title: "Now Playing"

          # Control buttons (for Phase 2)
          - type: button-group
            buttons:
              - entity: media_player.kodi_mobile
                name: Play
              - entity: media_player.kodi_mobile
                name: Pause
              - entity: media_player.kodi_mobile
                name: Stop
```

---

## Example 8: Lovelace Raw Configuration

For UI mode (non-YAML), the equivalent would be:

```json
{
  "views": [
    {
      "title": "Music",
      "cards": [
        {
          "type": "custom:kodi-playlist-card",
          "entry_id": "a1b2c3d4e5f6",
          "title": "Playlist"
        }
      ]
    }
  ]
}
```

---

## Tips & Best Practices

### 1. Finding Your entry_id

```bash
# SSH into your Home Assistant machine
cd /home/homeassistant/.homeassistant
grep -r "kodi_media_sensors" .

# Or check via the UI:
# Settings > Devices & Services > Integrations > kodi_media_sensors
```

### 2. Testing WebSocket Connection

In browser console (F12):
```javascript
// Check if subscribeMessage is available
console.log(window.customElements.get('home-assistant'));

// Monitor WebSocket messages
window.addEventListener('message', (event) => {
  if (event.data.type === 'playlist_update') {
    console.log('Playlist updated:', event.data);
  }
});
```

### 3. Performance Optimization

For dashboards with many cards:
```yaml
views:
  - title: Music
    # Only load this view when opened (reduces initial load)
    icon: mdi:music
    cards:
      - type: custom:kodi-playlist-card
        entry_id: "kodi_main"
        title: "Playlist"
```

### 4. Debugging Connection Issues

Enable debug logging in configuration.yaml:
```yaml
logger:
  default: info
  logs:
    custom_components.kodi_media_sensors: debug
```

Then check Home Assistant logs:
```bash
# SSH command
tail -f /home/homeassistant/.homeassistant/home-assistant.log | grep -i kodi
```

### 5. Browser Developer Tools

Use F12 to access DevTools:
- **Network tab**: Watch WebSocket `/api/websocket` connection
- **Console**: Check for JavaScript errors
- **Application**: Inspect component properties
- **Performance**: Profile rendering performance

---

## Troubleshooting Configuration

### Issue: Card doesn't show up

Check:
```yaml
# 1. Verify resources are registered
frontend:
  extra_module_url:
    - /local/kodi-playlist-card/kodi-playlist-card.js

# 2. Verify entry_id format
# Should be a string like "a1b2c3d4e5f6"

# 3. Check file is in correct location
# File should be at: /home/homeassistant/.homeassistant/www/kodi-playlist-card/kodi-playlist-card.js
```

### Issue: Connection shows "Error"

Check:
```yaml
# 1. Verify kodi_media_sensors is installed
# Settings > Devices & Services > Integration

# 2. Verify entry_id is correct
# Get it from the integration details page

# 3. Check Home Assistant logs for errors
```

---

## Integration with Other Custom Cards

The Kodi Playlist Card works well alongside:

- `mini-media-player` - Control playback
- `auto-entities` - Dynamic card generation
- `card-mod` - Style customization
- `button-card` - Custom buttons
- `fold-entity-row` - Collapsible sections

Example combination:
```yaml
- type: vertical-stack
  cards:
    - type: custom:mini-media-player
      entity: media_player.kodi_living_room
    
    - type: custom:kodi-playlist-card
      entry_id: "kodi_living_room"
      title: "Queue"
```
