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
  items_container_height?: string; // Conservé pour compatibilité ascendante
  visible_items_count?: number | string;
  show_version?: boolean;
}

export const DEFAULT_CONFIG: Partial<KodiPlaylistCardConfig> = {
  title: "Kodi Playlist",
  show_thumbnail: true,
  show_thumbnail_overlay: true,
  show_thumbnail_border: false,
  show_line_separator: true,
  hide_last_line_separator: false,
  outline_color: "white",
  items_container_scrollable: false,
  visible_items_count: 5,
  show_version: false,
};