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
    year?: number;
    genre?: string | string[];
}

/**
 * Playlist update event from kodi_media_sensors
 */
export interface PlaylistUpdateEvent {
    type: "playlist_update";
    items: PlaylistItem[];
    kodi_state: "playing" | "paused" | "idle" | string;
    current_index?: number; // Index of the currently playing item (-1 if none)
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
export interface KodiPlaylistCardConfig {
    entry_id: string;
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

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<KodiPlaylistCardConfig> = {
    title: "Kodi Playlist",
    show_thumbnail: false,
    show_thumbnail_overlay: true,
    show_thumbnail_border: false,
    show_line_separator: true,
    hide_last_line_separator: false,
    outline_color: "white",
    items_container_scrollable: false,
    visible_items_count: 5,
};

/**
 * Editor schema - Describes how to render the configuration UI
 * Structure prête pour l'intégration futur d'un éditeur
 */
export interface EditorField {
    key: keyof KodiPlaylistCardConfig;
    label: string;
    type: "text" | "number" | "boolean" | "color" | "select";
    required?: boolean;
    default?: any;
    description?: string;
    options?: Array<{ label: string; value: any }>;
    placeholder?: string;
    min?: number;
    max?: number;
}

export const EDITOR_SCHEMA: EditorField[] = [
    {
        key: "entry_id",
        label: "Entity",
        type: "text",
        required: true,
        placeholder: "sensor.kodi_media_sensor_playlist",
        description: "Sensor entity that provides Kodi playlist data",
    },
    {
        key: "title",
        label: "Card Title",
        type: "text",
        default: "Kodi Playlist",
        placeholder: "Kodi Playlist",
        description: "Title displayed at the top of the card",
    },
    {
        key: "show_thumbnail",
        label: "Show Thumbnail",
        type: "boolean",
        default: false,
        description: "Display thumbnail/album art for playlist items",
    },
    {
        key: "show_thumbnail_overlay",
        label: "Show Thumbnail Overlay",
        type: "boolean",
        default: true,
        description: "Add a light grey overlay above thumbnails for better play icon visibility",
    },
    {
        key: "show_thumbnail_border",
        label: "Show Thumbnail Border",
        type: "boolean",
        default: false,
        description: "Add a 1px border around thumbnails",
    },
    {
        key: "show_line_separator",
        label: "Show Line Separator",
        type: "boolean",
        default: true,
        description: "Add a 1px border under each playlist item",
    },
    {
        key: "hide_last_line_separator",
        label: "Hide Last Line Separator",
        type: "boolean",
        default: false,
        description: "Hide the separator line for the last item",
    },
    {
        key: "outline_color",
        label: "Outline Color",
        type: "color",
        default: "white",
        description: "Color for thumbnail borders and line separators (color name, rgb, or hex)",
    },
    {
        key: "items_container_scrollable",
        label: "Make Playlist Scrollable",
        type: "boolean",
        default: false,
        description: "Add scrollbar for long playlists",
    },
    { key: "visible_items_count", label: "Number of visible items (based on the default item height)", type: "number", min: 1, max: 20 },
    {
        key: "show_version",
        label: "Show Version",
        type: "boolean",
        default: false,
        description: "Display card version number (for development)",
    },
];

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

