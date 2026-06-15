import { PlaylistItem } from "./types";

/**
 * Formats duration in seconds to mm:ss format
 */
export function formatDuration(seconds: number | undefined): string {
    if (seconds === undefined || isNaN(seconds) || seconds <= 0) {
        return "";
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formats artist array or string into display string
 */
export function formatArtist(artist: string | string[] | undefined): string {
    if (!artist) {
        return "Unknown Artist";
    }
    if (Array.isArray(artist)) {
        return artist.length > 0 ? artist.join(", ") : "Unknown Artist";
    }
    return artist;
}

/**
 * Builds metadata string (artist • album)
 */
export function buildMetadataString(item: PlaylistItem): string {
    const artist = formatArtist(item.artist);
    const album = item.album ? ` • ${item.album}` : "";
    return `${artist}${album}`;
}

/**
 * Determines if a URL is a valid image thumbnail
 */
export function isValidThumbnail(thumbnail: string | undefined): boolean {
    if (!thumbnail) return false;
    return thumbnail.startsWith("http://") || thumbnail.startsWith("https://") || thumbnail.startsWith("image://");
}