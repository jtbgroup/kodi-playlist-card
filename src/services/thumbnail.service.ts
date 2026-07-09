import { HomeAssistant } from "custom-card-helpers";
import { PlaylistItem } from "../types";
import { ITEMTYPE_EPISODE, ITEMTYPE_MOVIE, ITEMTYPE_MUSIC, ITEMTYPE_MUSICVIDEO, ITEMTYPE_SONG, ITEMTYPE_VIDEO } from "../const";

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

    private hass: HomeAssistant;
    // 💡 Uniformisé en kodiEntityId (CamelCase) partout
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
     * Résout l'URL appropriée pour une miniature selon le type de média.
     * Gère les différentes sources possibles (poster, albumid, thumbnail).
     */
    public getThumbnailUrl(item: PlaylistItem): string | undefined {
        const itemType = item.type;
        // Extraire la source d'image brute potentielle
        const rawArt = item.art?.poster || item.art?.thumb || item.thumbnail;
        // 💡 Correction : On nettoie l'URL immédiatement pour TOUS les cas de figure
        const cleanedArt = this._cleanKodiUrl(rawArt);

        // Musique : utiliser l'albumid si disponible
        if (itemType === ITEMTYPE_SONG || itemType === ITEMTYPE_MUSIC) {
            if (item.albumid) {
                return `/api/media_player_proxy/${this.kodiEntityId}/browse_media/album/${String(item.albumid)}`;
            }
        }

        // Vidéo : préférer le poster
        if (itemType === ITEMTYPE_MOVIE || itemType === ITEMTYPE_VIDEO || itemType === ITEMTYPE_MUSICVIDEO) {
            if (cleanedArt && cleanedArt.startsWith("http")) {
                return cleanedArt;
            }

            if (!this.kodiEntityId) {
                console.warn(
                    "[ThumbnailService] kodiEntityId est undefined, impossible de générer l'URL proxy pour le film",
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

        // Fallback : thumbnail générique
        return item.thumbnail ? String(item.thumbnail) : undefined;
    }

    /**
     * Charge une miniature et la cache.
     * Les URL distantes (http/https) sont utilisées directement.
     * Les URL locales (/) sont converties en base64.
     * * @returns URL déjà cachée (base64 pour local, URL pour distant)
     */
    public async load(url: string): Promise<string | undefined> {
        // Retourner immédiatement si déjà en cache
        if (this._thumbnailCache.has(url)) {
            return this._thumbnailCache.get(url);
        }

        // Si déjà en cours de chargement, attendre le résultat
        if (this._loadingQueue.has(url)) {
            return await this._loadingQueue.get(url);
        }

        // Créer la promesse de chargement (sans callback global !)
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

