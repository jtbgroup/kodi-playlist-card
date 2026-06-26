import { HomeAssistant } from "custom-card-helpers";
import { PlaylistItem } from "../types";

export class ThumbnailService {
  private _thumbnailCache: Map<string, string> = new Map();
  private _thumbnailLoadingSet: Set<string> = new Set();

  constructor(private hass: HomeAssistant) {}

  /**
   * Récupère l'URL brute ou proxyfiée de la miniature en fonction du type de média.
   */
  public getThumbnailUrl(item: PlaylistItem): string | undefined {
    const itemType = item.type;

    if (itemType === "song" || itemType === "music") {
      if (item.albumid) {
        return `/api/media_player_proxy/media_player.kodi/browse_media/album/${item.albumid}`;
      }
    }

    if (itemType === "movie" || itemType === "episode" || itemType === "video") {
      if (item.poster && item.poster !== "") {
        return item.poster;
      }
    }

    return item.thumbnail;
  }

  /**
   * Charge une miniature en tâche de fond (avec cache et conversion Base64 si locale).
   */
  public async loadThumbnail(url: string, onUpdate: () => void): Promise<string | undefined> {
    if (this._thumbnailCache.has(url)) {
      return this._thumbnailCache.get(url);
    }

    if (this._thumbnailLoadingSet.has(url)) {
      return undefined;
    }

    this._thumbnailLoadingSet.add(url);

    try {
      if (url.startsWith("http")) {
        this._thumbnailCache.set(url, url);
      } else if (url.startsWith("/")) {
        const base64 = await this._loadLocalImageAsBase64(url);
        this._thumbnailCache.set(url, base64 ?? "");
      } else {
        this._thumbnailCache.set(url, "");
      }
    } catch (e) {
      console.info(`Kodi Playlist Service: Erreur lors du chargement de la miniature ${url}`, e);
      this._thumbnailCache.set(url, "");
    } finally {
      this._thumbnailLoadingSet.delete(url);
      onUpdate(); // Déclenche le re-render du composant parent
    }

    return this._thumbnailCache.get(url);
  }

  public clearCache(): void {
    this._thumbnailCache.clear();
    this._thumbnailLoadingSet.clear();
  }

  private async _loadLocalImageAsBase64(url: string): Promise<string | undefined> {
    try {
      const response = await this.hass.fetchWithAuth(url);
      if (!response.ok) return undefined;

      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.info("Kodi Playlist Service: Échec du chargement de l'image via proxy:", err);
      return undefined;
    }
  }
}