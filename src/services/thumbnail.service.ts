import { HomeAssistant } from "custom-card-helpers";
import { PlaylistItem } from "../types";

/**
 * Service gérant le chargement et la mise en cache des miniatures.
 * Responsabilités :
 * - Résoudre l'URL de miniature appropriée selon le type de média
 * - Charger et convertir les images en base64
 * - Cacher les miniatures chargées pour éviter les requêtes répétées
 */
export interface ThumbnailOptions {
    mediaPlayerId?: string;
    category?: string;
}

export class ThumbnailService {
    private readonly _thumbnailCache: Map<string, string> = new Map();
    private readonly _loadingQueue: Map<string, Promise<string | undefined>> = new Map();

    constructor(private hass: HomeAssistant) {}

    /**
     * Résout l'URL appropriée pour une miniature selon le type de média.
     * Gère les différentes sources possibles (poster, albumid, thumbnail).
     */
    public getItemThumbnail(item: PlaylistItem,   options: ThumbnailOptions = {} ): string | undefined {
        const itemType = item.type;
          const mediaPlayerId = options.mediaPlayerId || "media_player.kodi";

        // Musique : utiliser l'albumid si disponible
        if (itemType === "song" || itemType === "music") {
            if (item.albumid) {
                return `/api/media_player_proxy/${mediaPlayerId}/browse_media/album/${String(item.albumid)}`;
            }
        }

        // Vidéo : préférer le poster
        if (itemType === "movie" || itemType === "video") {
            if (item.poster && item.poster !== "") {
                return String(item.poster);
            }
        }


         if (itemType === "episode") {
            console.log("In CONDITION : " + item.art?.poster + " / " + item.art?.thumb + " / " + item.thumbnail);
            const art = item.art?.poster || item.art?.thumb || item.thumbnail;
            if (typeof art === "string" && art.startsWith("image://http")) {
                return decodeURIComponent(art.replace("image://", ""));
            }
         }

        // Fallback : thumbnail générique
        return item.thumbnail ? String(item.thumbnail) : undefined;
    }

    /**
     * Charge une miniature et la cache.
     * Les URL distantes (http/https) sont utilisées directement.
     * Les URL locales (/) sont converties en base64.
     * 
     * @returns URL déjà cachée (base64 pour local, URL pour distant)
     */
    public async load(url: string, onUpdate: () => void): Promise<string | undefined> {
        // Retourner immédiatement si déjà en cache
        if (this._thumbnailCache.has(url)) {
            return this._thumbnailCache.get(url);
        }

        // Si déjà en cours de chargement, attendre le résultat
        if (this._loadingQueue.has(url)) {
            return await this._loadingQueue.get(url);
        }

        // Créer la promesse de chargement
        const loadPromise = this._performLoad(url, onUpdate);
        this._loadingQueue.set(url, loadPromise);

        const result = await loadPromise;
        this._loadingQueue.delete(url);

        return result;
    }

    private async _performLoad(url: string, onUpdate: () => void): Promise<string | undefined> {
        try {
            let cachedUrl: string;

            if (url.startsWith("http")) {
                // URL distante : l'utiliser directement
                cachedUrl = url;
            } else if (url.startsWith("/")) {
                // URL locale : la convertir en base64
                const base64 = await this._loadLocalImageAsBase64(url);
                cachedUrl = base64 ?? "";
            } else {
                // URL inconnue : stocker vide
                cachedUrl = "";
            }

            this._thumbnailCache.set(url, cachedUrl);
            return cachedUrl;
        } catch (error) {
            console.info(`Kodi Playlist: Erreur lors du chargement de la miniature ${url}`, error);
            this._thumbnailCache.set(url, "");
            return undefined;
        } finally {
            onUpdate();
        }
    }

    /**
     * Récupère une miniature depuis le cache.
     * Retourne undefined si pas encore chargée.
     */
    public getFromCache(url: string): string | undefined {
        return this._thumbnailCache.get(url);
    }

    /**
     * Vide tout le cache des miniatures.
     */
    public clearCache(): void {
        this._thumbnailCache.clear();
        this._loadingQueue.clear();
    }

    /**
     * Charge une image locale via le proxy HA et la convertit en base64.
     */
    private async _loadLocalImageAsBase64(url: string): Promise<string | undefined> {
        try {
            const response = await this.hass.fetchWithAuth(url);
            if (!response.ok) {
                console.warn(`Kodi Playlist: Erreur HTTP ${response.status} pour ${url}`);
                return undefined;
            }

            const blob = await response.blob();
            return await this._blobToBase64(blob);
        } catch (error) {
            console.info("Kodi Playlist: Échec du chargement de l'image via proxy", error);
            return undefined;
        }
    }

    /**
     * Convertit un Blob en chaîne base64.
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