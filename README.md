# Playlist-Media-Card

This card displays the playlist running on the kodi entity. The refresh is automatic based on events triggered by the entity. 
This card is intented to be an alternative to an iframe containing chorus


| Playlist Audio | Playlist Video
| ---- | ---- 
[Playlist Audio](https://github.com/jtbgroup/playlist-media-card/tree/master/assets/playlist_audio.png) | [Playlist Video](https://github.com/jtbgroup/playlist-media-card/tree/master/assets/playlist_vodeo.png)


**Requires a custom-component:**<br/>
This card will only work if you've installed the custom component [Kodi Media Sensors](https://github.com/jtbgroup/kodi-media-sensors).


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
  - type: custom:playlist-media-card
    entity: sensor.kodi_playlist
```