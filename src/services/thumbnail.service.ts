import { HomeAssistant } from "custom-card-helpers";
import { PlaylistItemType } from "../types";
import { ITEMTYPE_EPISODE, ITEMTYPE_MOVIE, ITEMTYPE_MUSIC, ITEMTYPE_MUSICVIDEO, ITEMTYPE_SONG, ITEMTYPE_VIDEO } from "../const";

export interface ThumbnailOptions {
    mediaPlayerId?: string;
    category?: string;
}

export class ThumbnailService {
    private readonly _thumbnailCache: Map<string, string> = new Map();
    private readonly _loadingQueue: Map<string, Promise<string | undefined>> = new Map();

    private hass: HomeAssistant;
    public kodiEntityId: string | undefined;

    constructor(hass: HomeAssistant, kodiEntityId: string | undefined) {
        this.hass = hass;
        this.kodiEntityId = kodiEntityId;
    }

    private _cleanKodiUrl(url: any): string | undefined {
        if (typeof url !== "string") return undefined;
         let result = url;
        if (result.startsWith("image://http")) {
            result = decodeURIComponent(result.replace("image://", ""));
        }
        if(result.endsWith("/")){
            result = result.substring(0, result.length-1);
        }
        return result;
    }

    /**
     * Resolves the appropriate thumbnail URL based on media type.
     * Handles the different possible sources (poster, albumid, thumbnail).
     */
    public getThumbnailUrl(item: PlaylistItemType): string | undefined {
        const itemType = item.type;
        const rawArt = item.art?.poster || item.art?.thumb || item.thumbnail;
        const cleanedArt = this._cleanKodiUrl(rawArt);

        // Music: use albumid when available
        if (itemType === ITEMTYPE_SONG || itemType === ITEMTYPE_MUSIC) {
            if (item.albumid) {
                return `/api/media_player_proxy/${this.kodiEntityId}/browse_media/album/${String(item.albumid)}`;
            }
        }

        // Video: prefer the poster
        if (itemType === ITEMTYPE_MOVIE || itemType === ITEMTYPE_VIDEO || itemType === ITEMTYPE_MUSICVIDEO) {
            if (cleanedArt && cleanedArt.startsWith("http")) {
                return cleanedArt;
            }

            if (!this.kodiEntityId) {
                console.warn(
                    "[ThumbnailService] kodiEntityId is undefined, cannot generate the proxy URL for the movie",
                );
                return "";
            }
            return `/api/media_player_proxy/${this.kodiEntityId}/browse_media/movie/${item.id}`;
        }

        if (itemType === ITEMTYPE_EPISODE) {
            if (cleanedArt && cleanedArt.startsWith("http")) {
                return cleanedArt;
            }
        }

        // Fallback: generic thumbnail
        return item.thumbnail ? String(item.thumbnail) : undefined;
    }

    /**
     * Loads a thumbnail and caches it.
     * Remote URLs (http/https) are used directly.
     * Local URLs (/) are converted to base64.
     * * @returns cached URL (base64 for local, URL for remote)
     */
    public async load(url: string): Promise<string | undefined> {
        if (this._thumbnailCache.has(url)) {
            return this._thumbnailCache.get(url);
        }

        if (this._loadingQueue.has(url)) {
            return await this._loadingQueue.get(url);
        }

        const loadPromise = this._performLoad(url);
        this._loadingQueue.set(url, loadPromise);

        const result = await loadPromise;
        this._loadingQueue.delete(url);

        return result;
    }

    private async _performLoad(url: string): Promise<string | undefined> {
        try {
            let cachedUrl: string;

            if (url.startsWith("http")) {
                // Remote URL: use it directly
                cachedUrl = url;
            } else if (url.startsWith("/")) {
                // Local URL: convert it to base64
                const base64 = await this._loadLocalImageAsBase64(url);
                cachedUrl = base64 ?? "";
            } else {
                cachedUrl = "";
            }

            this._thumbnailCache.set(url, cachedUrl);
            return cachedUrl;
        } catch (error) {
            console.info(`Kodi Playlist: Error while loading thumbnail ${url}`, error);
            this._thumbnailCache.set(url, "");
            return undefined;
        }
    }

    /**
     * Retrieves a thumbnail from the cache.
     * Returns undefined if it has not been loaded yet.
     */
    public getFromCache(url: string): string | undefined {
        return this._thumbnailCache.get(url);
    }

    /**
     * Clears the entire thumbnail cache.
     */
    public clearCache(): void {
        this._thumbnailCache.clear();
        this._loadingQueue.clear();
    }

    /**
     * Loads a local image via the HA proxy and converts it to base64.
     */
    private async _loadLocalImageAsBase64(url: string): Promise<string | undefined> {
        try {
            const response = await this.hass.fetchWithAuth(url);
            if (!response.ok) {
                console.warn(`Kodi Playlist: HTTP error ${response.status} for ${url}`);
                return undefined;
            }

            const blob = await response.blob();
            return await this._blobToBase64(blob);
        } catch (error) {
            console.info("Kodi Playlist: Failed to load the image via proxy", error);
            return undefined;
        }
    }

    /**
     * Converts a Blob into a base64 string.
     */
    private _blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

