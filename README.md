# Playlist-Media-Card

This card displays the playlist running on the kodi entity. The refresh is automatic based on events triggered by the entity. 
This card is intented to be an alternative to an iframe containing chorus


| Playlist Audio | Playlist Video
| ---- | ---- 
<img src="https://raw.githubusercontent.com/jtbgroup/kodi-playlist-card/master/assets/playlist_audio.png" alt="Palylist Audio" width="400"/> | <img src="https://raw.githubusercontent.com/jtbgroup/kodi-playlist-card/master/assets/playlist_video.png" alt="Palylist Video" width="400"/>

**Requires a custom-component:**<br/>
This card will only work if you've installed the custom component [Kodi Media Sensors](https://github.com/jtbgroup/kodi-media-sensors).

## Features:

The card will let you track the playlist of kodi. You can perform some actions directly from the card like removing an item from the playlist or play a specific entry in the playlist.

## Installation:

* Install the custom component by following it's instructions using HACS.
* Install the card using HACS
* Reference this card in lovelace

```
resources:
- url: /local/custom-lovelace/upcoming-media-card/upcoming-media-card.js?v=0.1.1
  type: module
```

This goes into one of your views under "cards:" in the same file

```
  - type: custom:kodi-playlist-card
    entity: sensor.kodi_playlist
```
No need to pass the entity of the Kodi player as it is embedded in the data of the sensor.