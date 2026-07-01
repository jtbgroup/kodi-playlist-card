export interface PlaylistItem {
    title?: string;
    artist?: string | string[];
    album?: string;
    year?: string | number;
    genre?: string | string[];
    duration?: number;
    thumbnail?: string;
    type?: "song" | "music" | "movie" | "episode" | "video" | string;
    albumid?: number | string;
    poster?: string;
    showtitle?: string;
    season?: number | string;
    episode?: number | string;
    art?: {
        poster?: string;
        thumb?: string;
    };
}

export interface PlaylistUpdateEvent {
    type: "playlist_initial_state" | "playlist_update";
    items: PlaylistItem[];
    current_index: number;
}

export interface KodiUnavailableEvent {
    type: "kodi_unavailable";
}

export type KodiMediaSensorEvent = PlaylistUpdateEvent | KodiUnavailableEvent;
