// src/utils/formatters.ts
import { ITEMTYPE_EPISODE, ITEMTYPE_MOVIE, ITEMTYPE_MUSIC, ITEMTYPE_SONG } from "../const";
import { PlaylistItemType } from "../types";

export function formatDuration(seconds: number | undefined): string {
  if (!seconds || isNaN(seconds)) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function buildMetadataString(item: PlaylistItemType): string {
  const itemType = item.type;

  if (itemType === ITEMTYPE_SONG || itemType === ITEMTYPE_MUSIC) {
        const parts: string[] = [];

        if (item.year) {
            parts.push(`(${item.year})`);
        }
        if (item.artist) {
            parts.push(Array.isArray(item.artist) ? item.artist.join(", ") : item.artist);
        }
        if (item.album) {
            parts.push(item.album);
        }
        return parts.length > 0 ? parts.join(" • ") : "";
  }

  if (itemType === ITEMTYPE_EPISODE) {
    const showTitle = item.showtitle || "Unknown Show";
    const season = item.season ?? "?";
    const episode = item.episode ?? "?";
    return `${showTitle} • S${season}E${episode}`;
  }

  return "";
}

export function formatGenre(genre: string | string[] | undefined): string {
  if (!genre) return "";
  if (Array.isArray(genre)) {
    return genre.length > 0 ? genre.join(", ") : "";
  }
  return genre;
}

export function getItemIcon(item: PlaylistItemType): string {
  const itemType = item.type;

  if (itemType === ITEMTYPE_SONG || itemType === ITEMTYPE_MUSIC) {
    return "mdi:music";
  }
  if (itemType === ITEMTYPE_MOVIE) {
    return "mdi:movie";
  }
  if (itemType === ITEMTYPE_EPISODE) {
    return "mdi:television";
  }
  return "mdi:play";
}


export function getAspectRatio(item: PlaylistItemType | undefined): string {
    if (!item || !item.type) return "1 / 1";
    
    switch (item.type) {
      case ITEMTYPE_MOVIE:
        return "2/3"; 
      case ITEMTYPE_EPISODE:
        return "16 / 9";
      default:
        return "1 / 1";
    }
  }

  export function convertOutlineColor(color: string): string {
        if (!color) return "var(--divider-color)";

        if (Array.isArray(color)) {
            return `rgb(${color.join(",")})`;
        }

        return color;
    }