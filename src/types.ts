import { LovelaceCard, LovelaceCardConfig, LovelaceCardEditor } from "custom-card-helpers";

declare global {
    interface HTMLElementTagNameMap {
        "kodi-playlist-card-editor": LovelaceCardEditor;
        "hui-error-card": LovelaceCard;
    }
}

// TODO Add your configuration elements here for type-checking
export interface KodiPlaylistCardConfig extends LovelaceCardConfig {
    entity: string;
    title?: string;
    outline_color?: string;
    show_thumbnail?: boolean;
    show_thumbnail_overlay?: boolean;
    show_thumbnail_border?: boolean;
    show_line_separator?: boolean;
    hide_last_line_separator?: boolean;
    items_container_scrollable?: boolean;
    items_container_height?: string;
}

