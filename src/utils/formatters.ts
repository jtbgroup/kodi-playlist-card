// src/utils/formatters.ts
import { PlaylistItem } from "../types";

export function formatDuration(seconds: number | undefined): string {
  if (!seconds || isNaN(seconds)) return "";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function buildMetadataString(item: PlaylistItem): string {
  const itemType = item.type;

  if (itemType === "song" || itemType === "music") {
    const artist = Array.isArray(item.artist) 
      ? item.artist.join(", ") 
      : item.artist || "Unknown Artist";
    const album = item.album ? ` • ${item.album}` : "";
    const year = item.year ? ` (${item.year})` : "";
    return `${artist}${album}${year}`;
  }

  if (itemType === "episode") {
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

export function getItemIcon(item: PlaylistItem): string {
  const itemType = item.type;

  if (itemType === "song" || itemType === "music") {
    return "mdi:music";
  }
  if (itemType === "movie") {
    return "mdi:movie";
  }
  if (itemType === "episode") {
    return "mdi:television";
  }
  return "mdi:play";
}