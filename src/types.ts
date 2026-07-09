export interface KodiPlaylistCardConfig {
  type: string;
  entity: string;
  title?: string;
  show_thumbnail?: boolean;
  show_thumbnail_overlay?: boolean;
  show_thumbnail_border?: boolean;
  show_line_separator?: boolean;
  hide_last_line_separator?: boolean;
  outline_color?: string;
  items_container_scrollable?: boolean;
  items_container_height?: string;
  visible_items_count?: number | string;
  show_version?: boolean;
}

export interface PlaylistItemType {
    id: number;
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
    items: PlaylistItemType[];
    current_index: number;
}

export interface KodiUnavailableEvent {
    type: "kodi_unavailable";
}

export type KodiMediaSensorEvent = PlaylistUpdateEvent | KodiUnavailableEvent;
