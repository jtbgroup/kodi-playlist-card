# Kodi Playlist Card — Specification

## Goal

Create a custom Lovelace card for Home Assistant that displays, in
real time, the current Kodi playlist via the `kodi_media_sensors`
custom integration's WebSocket API.

## Connection

The card must use Home Assistant's existing frontend WebSocket
connection (`hass.connection`), not open a separate WebSocket. Use
`hass.connection.subscribeMessage`.

### Subscription

On card mount (or as soon as `hass`/config are available):

```js
this._unsubscribe = await this.hass.connection.subscribeMessage(
  (event) => this._handleEvent(event),
  {
    type: "kodi_media_sensors/subscribe_playlist",
    entry_id: this.config.entry_id,
  }
);
```

`subscribeMessage` returns an `unsubscribe` function. Call it in
`disconnectedCallback()` to avoid leaking the backend subscription
when the card is removed (e.g. navigating away from the dashboard).

## Messages received

The `event` object passed to the handler has one of two shapes:

### `playlist_update`

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

- `items`: array of playlist entries. Fields vary by content type
  (`song`, `movie`, `episode`, ...). Not all fields are always
  present.
- `kodi_state`: the current state of the Kodi `media_player` entity
  (`playing`, `paused`, `idle`, etc.).

### `kodi_unavailable`

```json
{ "type": "kodi_unavailable" }
```

Sent when the Kodi instance is unreachable (e.g. powered off). No
`items` or `kodi_state` field is included.

## Expected card behavior

- On `playlist_update`: render the list of items — title, artist (if
  present, join array with `, `), formatted duration (`mm:ss`),
  thumbnail (`thumbnail` field) if available. Show a status indicator
  reflecting `kodi_state` (e.g. play/pause/idle icon).
- On `kodi_unavailable`: show a "Kodi unavailable" state instead of
  the list. Optionally keep the last known playlist visible but
  visually dimmed, rather than clearing it abruptly.
- Empty playlist (`items: []` with a non-`unavailable` `kodi_state`):
  show an "Empty playlist" message.

## Card configuration

Exposed via the card editor:

- `entry_id` (string, required): the config entry ID of the
  `kodi_media_sensors` instance to subscribe to.
- `title` (string, optional): title displayed at the top of the card.

## Implementation notes

- Implement as a LitElement (standard for HA custom cards), with
  `setConfig()`, `set hass()`, `getCardSize()`, and proper cleanup of
  the subscription in `disconnectedCallback()`.
- Each card instance creates its own backend subscription. Multiple
  cards with the same `entry_id` each get their own subscription
  (no automatic sharing) — acceptable given the low cost of
  `_send_playlist`, but worth knowing if many cards are shown at once.