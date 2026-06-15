import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant } from "custom-card-helpers";

interface PlaylistItem {
    title?: string;
    artist?: string | string[];
    album?: string;
    albumid?: number;
    duration?: number;
    thumbnail?: string;
    poster?: string;
    type?: string;
    showtitle?: string;
    season?: number;
    episode?: number;
}

interface PlaylistUpdateEvent {
    type: "playlist_update";
    items: PlaylistItem[];
    kodi_state: "playing" | "paused" | "idle" | string;
}

interface KodiUnavailableEvent {
    type: "kodi_unavailable";
}

type KodiMediaSensorEvent = PlaylistUpdateEvent | KodiUnavailableEvent;

@customElement("kodi-playlist-card")
export class KodiPlaylistCard extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;

    @state() private _config?: any;
    @state() private _items: PlaylistItem[] = [];
    @state() private _currentIndex = -1;
    @state() private _kodiState = "idle";
    @state() private _isAvailable = true;
    @state() private _thumbnailCache: Map<string, string> = new Map();

    private _unsubscribe?: Promise<() => void>;
    private _thumbnailPromiseCache: Map<string, Promise<string>> = new Map();
    private _thumbnailLoadingSet: Set<string> = new Set();

    public setConfig(config: any): void {
        if (!config) throw new Error("Configuration invalide.");
        if (!config.entry_id) throw new Error('Configuration invalide: "entry_id" is required.');
        this._config = { ...config };
        console.log("Kodi card config:", this._config);
    }

    static get styles() {
        return css`
            :host {
                display: block;
                background: var(--ha-card-background, var(--card-background-color, #ffffff));
                border-radius: var(--ha-card-border-radius, 12px);
                border: 1px solid var(--divider-color);
                overflow: hidden;
            }
            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
            }
            .card-title {
                margin: 0;
                font-size: 1.25rem;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .kodi-icon {
                color: var(--accent-color);
            }
            .status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--disabled-text-color);
            }
            .status-dot.available {
                background: var(--success-color);
                animation: pulse 2s infinite;
            }
            .status-dot.unavailable {
                background: var(--error-color);
            }
            @keyframes pulse {
                0%,
                100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.5;
                }
            }
            .playlist-container {
                max-height: 400px;
                overflow-y: auto;
            }
            .empty-state {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 12px;
                padding: 40px 16px;
                color: var(--secondary-text-color);
                text-align: center;
            }
            .empty-state ha-icon {
                --icon-size: 48px;
                opacity: 0.5;
            }
            .playlist-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 16px;
                cursor: pointer;
                border-bottom: 1px solid var(--divider-color);
                transition: background-color 0.2s;
            }
            .playlist-item:hover {
                background: var(--secondary-background-color);
            }
            .playlist-item.active {
                background: rgba(3, 169, 244, 0.1);
                border-left: 4px solid var(--accent-color);
                padding-left: 12px;
            }
            .track-thumb {
                width: 45px;
                height: 45px;
                object-fit: cover;
                border-radius: 4px;
                flex-shrink: 0;
            }
            .thumb-placeholder {
                width: 45px;
                height: 45px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--secondary-background-color);
                border-radius: 4px;
                flex-shrink: 0;
            }
            .track-info {
                display: flex;
                flex-direction: column;
                flex-grow: 1;
                min-width: 0;
            }
            .track-title {
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .track-meta {
                font-size: 0.8rem;
                color: var(--secondary-text-color);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .track-duration {
                font-size: 0.85rem;
                color: var(--secondary-text-color);
                flex-shrink: 0;
            }
        `;
    }

    public connectedCallback(): void {
        super.connectedCallback();
        this._subscribe();
    }

    public disconnectedCallback(): void {
        super.disconnectedCallback();
        if (this._unsubscribe) {
            this._unsubscribe.then(unsub => {
                unsub();
            });
            this._unsubscribe = undefined;
        }
    }

    private _subscribe(): void {
        if (!this.hass?.connection || !this._config?.entry_id) {
            console.warn("Kodi card: Cannot subscribe - missing hass connection or entry_id");
            return;
        }

        console.log("Kodi card: Subscribing to playlist updates for entry_id:", this._config.entry_id);

        this._unsubscribe = this.hass.connection.subscribeMessage<KodiMediaSensorEvent>(
            (message: KodiMediaSensorEvent) => this._handlePlaylistMessage(message),
            {
                type: "kodi_media_sensors/subscribe_playlist",
                entry_id: this._config.entry_id,
            } as any,
        );
    }

    private _handlePlaylistMessage(message: KodiMediaSensorEvent): void {
        console.log("Kodi card: Message received", message);

        if (message.type === "playlist_update") {
            this._items = message.items || [];
            this._kodiState = message.kodi_state || "idle";
            this._isAvailable = true;
            this._thumbnailLoadingSet.clear(); // Reset loading state on new playlist
            console.log("Kodi card: Playlist updated", this._items.length, "items, state:", this._kodiState);

            // Log first item properties for debugging
            if (this._items.length > 0) {
                console.log("Kodi card: First item properties:", Object.keys(this._items[0]));
                console.log("Kodi card: First item:", this._items[0]);
            }
        } else if (message.type === "kodi_unavailable") {
            this._isAvailable = false;
            this._items = [];
            this._thumbnailLoadingSet.clear();
            console.log("Kodi card: Kodi is unavailable");
        }
    }

    /**
     * Gets thumbnail URL based on item type and properties
     */
    private _getItemThumbnailUrl(item: PlaylistItem): string | undefined {
        const itemType = (item as any).type;

        // For audio items, use the album proxy if albumid is available
        if (itemType === "song" || itemType === "music") {
            const albumId = (item as any).albumid;
            if (albumId) {
                return `/api/media_player_proxy/media_player.kodi/browse_media/album/${albumId}`;
            }
        }

        // For video items, prefer poster over thumbnail
        if (itemType === "movie" || itemType === "episode" || itemType === "video") {
            const poster = (item as any).poster;
            if (poster && poster !== "") {
                return poster;
            }
        }

        // Fallback to thumbnail for any type
        return item.thumbnail;
    }

    /**
     * Gets metadata string based on item type
     */
    private _getItemMetadata(item: PlaylistItem): string {
        const itemType = (item as any).type;

        if (itemType === "song" || itemType === "music") {
            const artist = Array.isArray(item.artist) ? item.artist.join(", ") : item.artist || "Unknown Artist";
            const album = item.album ? ` • ${item.album}` : "";
            return `${artist}${album}`;
        }

        if (itemType === "episode") {
            const showTitle = (item as any).showtitle || "Unknown Show";
            const season = (item as any).season ?? "?";
            const episode = (item as any).episode ?? "?";
            return `${showTitle} • S${season}E${episode}`;
        }

        // Default for movies and others
        return "";
    }

    /**
     * Gets the icon based on item type
     */
    private _getItemIcon(item: PlaylistItem): string {
        const itemType = (item as any).type;

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

    private _formatDuration(seconds: number | undefined): string {
        if (!seconds) return "";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    }

    protected render() {
        const statusClass = this._isAvailable ? "available" : "unavailable";

        return html`
            <div class="card-header">
                <h3 class="card-title">
                    <ha-icon class="kodi-icon" icon="mdi:kodi"></ha-icon> ${this._config?.title || "Kodi Playlist"}
                </h3>
                <div class="status-dot ${statusClass}"></div>
            </div>

            ${!this._isAvailable
                ? html`
                    <div class="empty-state">
                        <ha-icon icon="mdi:wifi-off"></ha-icon>
                        <div>Kodi is unavailable</div>
                    </div>
                `
                : this._items.length === 0
                  ? html`
                    <div class="empty-state">
                        <ha-icon icon="mdi:playlist-music"></ha-icon>
                        <div>Empty playlist</div>
                    </div>
                `
                  : html`
                    <div class="playlist-container">
                        ${this._items.map((item) => this._renderPlaylistItem(item))}
                    </div>
                `}
        `;
    }

    private _renderPlaylistItem(item: PlaylistItem) {
        const thumbUrl = this._getItemThumbnailUrl(item);
        const metadata = this._getItemMetadata(item);
        const icon = this._getItemIcon(item);

        return html`
            <li class="playlist-item">
                ${this._renderThumbnail(thumbUrl, icon)}
                <div class="track-info">
                    <span class="track-title">${item.title || "Unknown"}</span>
                    ${metadata ? html`<span class="track-meta">${metadata}</span>` : ""}
                </div>
                ${item.duration ? html`<span class="track-duration">${this._formatDuration(item.duration)}</span>` : ""}
            </li>
        `;
    }

    private _renderThumbnail(thumbnailUrl: string | undefined, icon = "mdi:music") {
        if (!thumbnailUrl) {
            return html`<div class="thumb-placeholder"><ha-icon icon="${icon}"></ha-icon></div>`;
        }

        // Check cache first
        const cachedUrl = this._thumbnailCache.get(thumbnailUrl);
        if (cachedUrl) {
            return html`<img class="track-thumb" src="${cachedUrl}" alt="Album art" />`;
        }

        // Only trigger loading if we haven't started yet
        if (!this._thumbnailLoadingSet.has(thumbnailUrl)) {
            this._thumbnailLoadingSet.add(thumbnailUrl);
            this._getThumbnailURL(thumbnailUrl).then(() => {
                this.requestUpdate();
            });
        }

        // Show placeholder while loading
        return html`<div class="thumb-placeholder"><ha-icon icon="${icon}"></ha-icon></div>`;
    }

    /**
     * Converts a thumbnail URL to base64 if it's a local API URL (requires auth)
     * Otherwise returns the URL as-is for external images
     */
    private async _getThumbnailURL(thumbnailUrl: string | undefined): Promise<string | undefined> {
        if (!thumbnailUrl) return undefined;

        // Check cache first
        const cached = this._thumbnailCache.get(thumbnailUrl);
        if (cached) return cached;

        // Check if already loading
        if (this._thumbnailPromiseCache.has(thumbnailUrl)) {
            return this._thumbnailPromiseCache.get(thumbnailUrl);
        }

        // External URLs (http/https) can be used directly
        if (thumbnailUrl.startsWith("http://") || thumbnailUrl.startsWith("https://")) {
            this._thumbnailCache.set(thumbnailUrl, thumbnailUrl);
            return thumbnailUrl;
        }

        // Kodi image:// URLs - skip these as they need special handling
        if (thumbnailUrl.startsWith("image://")) {
            console.warn("Skipping Kodi image:// URL:", thumbnailUrl);
            this._thumbnailCache.set(thumbnailUrl, "");
            return undefined;
        }

        // Local API URLs (starting with /) require authentication
        if (thumbnailUrl.startsWith("/")) {
            const promise = this._loadLocalImageAsBase64(thumbnailUrl);
            this._thumbnailPromiseCache.set(thumbnailUrl, promise);
            try {
                const result = await promise;
                this._thumbnailCache.set(thumbnailUrl, result);
                return result;
            } catch (e) {
                console.error("Failed to load local image:", e);
                this._thumbnailCache.set(thumbnailUrl, "");
                return undefined;
            } finally {
                this._thumbnailPromiseCache.delete(thumbnailUrl);
            }
        }

        return undefined;
    }

    /**
     * Loads a local API image with authentication and converts to base64
     */
    private async _loadLocalImageAsBase64(url: string): Promise<string> {
        try {
            const response = await this.hass.fetchWithAuth(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status}`);
            }
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result;
                    resolve(typeof result === "string" ? result : "");
                };
                reader.onerror = e => reject(e);
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error("Error loading image:", error);
            throw error;
        }
    }
}