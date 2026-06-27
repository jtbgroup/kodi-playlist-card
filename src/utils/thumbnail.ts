import { PlaylistItem } from "../types";

export function getThumbnailUrl(item: PlaylistItem): string | undefined {
    const itemType = (item as any).type;

    if (itemType === "song" || itemType === "music") {
        const albumId = (item as any).albumid;
        if (albumId) {
            return `/api/media_player_proxy/media_player.kodi/browse_media/album/${albumId}`;
        }
    }

    if (itemType === "movie" || itemType === "episode" || itemType === "video") {
        const poster = (item as any).poster;
        if (poster && poster !== "") {
            return poster;
        }
    }

    return item.thumbnail;
}