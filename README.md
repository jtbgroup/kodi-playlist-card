# Playlist-Media-Card

This card displays the playlist running on the kodi entity. The refresh is automatic based on events triggered by the entity. 
This card is intented to be an alternative to an iframe containing chorus


| Playlist Audio | Playlist Video
| ---- | ---- 
<img src="https://raw.githubusercontent.com/jtbgroup/kodi-playlist-card/master/assets/playlist_audio.png" alt="Palylist Audio" width="400"/> | <img src="https://raw.githubusercontent.com/jtbgroup/kodi-playlist-card/master/assets/playlist_video.png" alt="Palylist Video" width="400"/>

## Requirements

This card requires a specific sensor that gets the data from Kodi. The sensor is provided by the custom component [Kodi Media Sensors](https://github.com/jtbgroup/kodi-media-sensors).

## Features:

The card will let you track the playlist of kodi. 
You can perform some actions directly from the card like removing an item from the playlist or play a specific entry in the playlist.

## Installation:

1. Install the custom component by following it's instructions using HACS.
2.  Install the card using HACS
3.  Reference the new card in lovelace

```
resources:
- url: hacsfiles/kodi-playlist-card/kodi-playlist-card.js
  type: Javascript module
```


4. Create a Manual Card and add the following lines

```
  - type: custom:kodi-playlist-card
    entity: sensor.kodi_playlist
```
**No need to pass the entity of the Kodi player as it is embedded in the data of the sensor.**