/**
 * Playlist item as received from kodi_media_sensors integration
 */
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

/**
 * Playlist update event from kodi_media_sensors
 */
export interface PlaylistUpdateEvent {
    type: "playlist_update";
    items: PlaylistItem[];
    kodi_state: "playing" | "paused" | "idle" | string;
}

/**
 * Kodi unavailable event from kodi_media_sensors
 */
export interface KodiUnavailableEvent {
    type: "kodi_unavailable";
}

/**
 * Union type for all possible events from the integration
 */
export type KodiMediaSensorEvent = PlaylistUpdateEvent | KodiUnavailableEvent;

/**
 * Card configuration
 */
export interface KodiPlaylistCardConfig {
    entry_id: string;
    title?: string;
}

/**
 * Connection state enumeration
 */
export enum ConnectionState {
    IDLE = "idle",
    CONNECTING = "connecting",
    CONNECTED = "connected",
    UNAVAILABLE = "unavailable",
    ERROR = "error",
}


