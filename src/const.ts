export const CARD_VERSION = "4.4.0_s";

export const PLAYER_TYPE = {
    audio: { kodi_player_id: 0, label: "Audio", icon: "mdi:music" },
    video: { kodi_player_id: 1, label: "Movie", icon: "mdi:movie" },
};

// order : must be >= 0 to be taken in consideration. -1, means single displayable
export const MEDIA_TYPE_PARAMS = {
    song: { id: "song", label: "Songs", icon: "mdi:music", order: 0 },
    album: { id: "album", label: "Albums", icon: "mdi:disc", order: 1 },
    artist: { id: "artist", label: "Artists", icon: "mdi:account-circle", order: 2 },
    movie: { id: "movie", label: "Movies", icon: "mdi:movie", order: 3 },
    musicvideo: { id: "musicvideo", label: "Music Videos", icon: "mdi:movie", order: 4 },
    tvshow: { id: "tvshow", label: "TV Shows", icon: "mdi:movie", order: 5 },
    episode: { id: "episode", label: "Episodes", icon: "mdi:movie", order: 6 },
    channel: { id: "channel", label: "Channels", icon: "mdi:movie", order: 7 },
    seasondetail: { id: "seasondetail", label: "Season Detail", icon: "mdi:movie", order: -1 },
    albumdetail: { id: "albumdetail", label: "Album Detail", icon: "mdi:music", order: -1 },
};
export const MEDIA_TYPES = Object.keys(MEDIA_TYPE_PARAMS);
export const MEDIA_TYPES_SINGLE_DISPLAY = MEDIA_TYPES.filter(type => MEDIA_TYPE_PARAMS[type].order == -1);

export const DEFAULT_ENTITY_NAME = "sensor.kodi_media_sensor_playlist";
export const DEFAULT_SHOW_THUMBNAIL = true;
export const DEFAULT_SHOW_THUMBNAIL_OVERLAY = true;
export const DEFAULT_SHOW_THUMBNAIL_BORDER = false;
export const DEFAULT_SHOW_LINE_SEPARATOR = false;
export const DEFAULT_HIDE_LAST_LINE_SEPARATOR = false;
export const DEFAULT_OUTLINE_COLOR = "var(--primary-text-color)";
export const DEFAULT_ITEMS_CONTAINER_SCROLLABLE = false;
export const DEFAULT_ITEMS_CONTAINER_HEIGHT = "300px";

