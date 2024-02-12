# Changelog

## 4.5.0

<<<<<<< HEAD
- Images are now retrieved by using home assistant api, which means there is no problem anymore of cors error when mixing http and https.
=======
- Images retrieved by the api to avoid http / https problems (see [Issue #9](https://github.com/jtbgroup/kodi-media-sensors/issues/9))

**This version needs at least the version 5.3.0 of the [Kodi Media Sendor](https://github.com/jtbgroup/kodi-media-sensors) integration**
>>>>>>> develop

## 4.4.3

- Bugfix: Added the `kodi-id` attribute to other items than songs to avoid the playlist to flash

## 4.4.2

- Bugfix: Fixed the workaround of the 4.4.1

## 4.4.1

- Bugfix: refresh page after removing a playlist entry. Not the cleanest workaround...

## 4.4.0

- Added new feature. The items in the playlist can be dragged and dropped to reorder the playlist. The trigger to drag an element is sent after 400ms. This is needed for touchscreen.

## 4.3.0

- Uses the file attribute in the meta data when no ID is present.

## 4.2.0

- Includes music video objects

## 4.1.0

- New feature allowing to make the playlist scrollable in order to make the navigation easier when very long playlists. Two new configuration options have been added (see README). See [issue #3](https://github.com/jtbgroup/kodi-playlist-card/issues/3) and [issue #14](https://github.com/jtbgroup/kodi-media-sensors/issues/14). Thanks [fax13](https://github.com/fax13).

## 4.0.0

- Conversion of HTMLElement to LitElement
- New Configuration parameter `hide_last_line_separator`

## 3.3.4

- Bugfix: wrong reference to the state of the entity

## 3.3.3

- Bugfix: added position for unknown item type to allow the delete action

## 3.3.2

- Bugfix : make available in the card chooser (regression)
- Order of the properties in the editor
- New property available: line separator

## 3.2.0

- Card editor + made available in the card picker
- bugfix: layout of the album name was over the duration when too long
- bugfix: border was not shown when default icon

## 3.1.5

- compatible with [kodi media sensors](https://github.com/jtbgroup/kodi-media-sensors) 3.1.5
- new options: show_thumbnail_overlay, show_thumbnail_border, thumbnail_border_color
- CSS & layout refactoring
- Default image used when not showing thumbnail is also used as backup when problem happens while loading the image

## 3.0.0

- compatible with [kodi media sensors](https://github.com/jtbgroup/kodi-media-sensors) 3.0.0
- displays a blue arrow near the currently playing item

## 2.0.0

- Modified to work with version 2.0.0 of the kodi media sensor

## 1.1

- Code review handling HTML document
- New option: show thumbnail

## 1.0

First version
