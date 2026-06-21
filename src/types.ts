import { LovelaceCardConfig } from "custom-card-helpers";

/**
 * Playlist item as received from kodi_media_sensors integration
 */
export interface PlaylistItem {
    title?: string;
    artist?: string | string[];
    album?: string;
    albumid?: number;
    duration?: number;
    thumbnail?: string;
    poster?: string;
    type?: string;
    showtitle?: string;
    season?: number;
    episode?: number;
    year?: number;
    genre?: string | string[];
}

export interface PlaylistUpdateEvent {
    type: "playlist_update";
    items: PlaylistItem[];
    kodi_state: "playing" | "paused" | "idle" | string;
    current_index?: number;
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
 * Card configuration - All supported options
 */
export interface KodiPlaylistCardConfig extends LovelaceCardConfig {
    entity: string;
    title?: string;
    show_version?: boolean;

    // Thumbnails
    show_thumbnail?: boolean;
    show_thumbnail_overlay?: boolean;
    show_thumbnail_border?: boolean;

    // Separators & Colors
    show_line_separator?: boolean;
    hide_last_line_separator?: boolean;
    outline_color?: string;

    // Scroll & Height
    items_container_scrollable?: boolean;
    visible_items_count?: number;
}


