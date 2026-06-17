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
    year?: number;
    genre?: string | string[];
}

interface PlaylistUpdateEvent {
    type: "playlist_update";
    items: PlaylistItem[];
    kodi_state: "playing" | "paused" | "idle" | string;
    current_index?: number; // Index of the currently playing item (-1 if none)
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
                transition: background 0.3s ease;
            }

            /* Green fix (défaut) */
            .status-dot.fixed-green {
                background: var(--success-color);
            }

            /* Orange fixe */
            .status-dot.fixed-orange {
                background: var(--warning-color);
            }

            /* Red fix */
            .status-dot.fixed-red {
                background: var(--error-color);
            }

            /* Green blinking */
            .status-dot.flashing-green {
                background: var(--success-color);
                animation: pulse-dot 1s infinite;
            }

            /* Container pour l'action à droite */
            .item-action {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                margin-left: auto;
            }

            /* Style du marqueur "En lecture" */
            .playing-marker {
                color: var(--accent-color);
                --icon-size: 24px;
                animation: pulse-marker 1.5s infinite;
            }

            @keyframes pulse-dot {
                0%, 100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.3;
                }
            }

            @keyframes pulse-marker {
                0%, 100% {
                    transform: scale(1);
                    opacity: 1;
                }
                50% {
                    transform: scale(1.1);
                    opacity: 0.8;
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

            /* Thumbnail button styling */
            .thumbnail-button {
                position: relative;
                width: 45px;
                height: 45px;
                flex-shrink: 0;
                cursor: pointer;
                border-radius: 4px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--secondary-background-color);
            }

            /* Disabled state for playing item */
            .thumbnail-button.disabled {
                cursor: not-allowed;
                opacity: 0.6;
            }

            .track-thumb {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 4px;
            }

            .thumb-placeholder {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--secondary-background-color);
                border-radius: 4px;
            }

            /* Play overlay - hidden by default */
            .play-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0, 0, 0, 0.4);
                opacity: 0;
                transition: opacity 0.2s ease-in-out;
                border-radius: 4px;
            }

            .play-overlay ha-icon {
                --icon-size: 24px;
                color: white;
                text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
            }

            /* Show overlay on hover - but not if disabled */
            .thumbnail-button:not(.disabled):hover .play-overlay {
                opacity: 1;
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
            .track-genre {
                font-size: 0.8rem;
                color: var(--secondary-text-color);
                font-style: italic;
                margin-top: 2px;
            }

            /* Remove button styling */
            .remove-button {
                flex-shrink: 0;
                cursor: pointer;
                background: transparent;
                border: none;
                padding: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--secondary-text-color);
                transition: all 0.2s ease;
                opacity: 0.5;
                border-radius: 4px;
                user-select: none;
            }

            .remove-button:hover {
                color: var(--error-color);
                background: rgba(255, 0, 0, 0.1);
                transform: scale(1.1);
            }

            .remove-button:active {
                transform: scale(0.95);
            }

            .remove-button ha-icon {
                --icon-size: 20px;
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
                type: "kodi_media_sensors/playlist_subscribe",
                entry_id: this._config.entry_id,
            } as any,
        );
    }

    private _handlePlaylistMessage(message: KodiMediaSensorEvent): void {
        console.log("Kodi card: Message received", message);

        if (message.type === "playlist_update") {
            this._items = message.items || [];
            this._kodiState = message.kodi_state || "idle";
            this._currentIndex = message.current_index ?? -1; // Update current index from backend
            this._isAvailable = true;
            this._thumbnailLoadingSet.clear();
            console.log(
                "Kodi card: Playlist updated",
                this._items.length,
                "items, state:",
                this._kodiState,
                "current index:",
                this._currentIndex,
            );

            // Log first item properties for debugging
            if (this._items.length > 0) {
                console.log("Kodi card: First item properties:", Object.keys(this._items[0]));
                console.log("Kodi card: First item:", this._items[0]);
            }
        } else if (message.type === "kodi_unavailable") {
            this._isAvailable = false;
            this._items = [];
            this._currentIndex = -1;
            this._thumbnailLoadingSet.clear();
            console.log("Kodi card: Kodi is unavailable");
        }
    }

    /**
     * Sends a command to play a specific item in the playlist
     */
    private _playItem(itemIndex: number): void {
        // Prevent playing the already playing item
        if (itemIndex === this._currentIndex) {
            console.log("Kodi card: Item is already playing");
            return;
        }

        if (!this.hass?.connection) {
            console.error("Kodi card: Cannot play item - missing hass connection");
            return;
        }

        console.log("Kodi card: Playing item at index", itemIndex);

        this.hass.connection.sendMessage({
            type: "kodi_media_sensors/playlist_play_item",
            entry_id: this._config.entry_id,
            index: itemIndex,
        } as any);
    }

    /**
     * Sends a command to remove a specific item from the playlist
     */
    private _removeItem(itemIndex: number): void {
        // Prevent removing the currently playing item
        if (itemIndex === this._currentIndex) {
            console.log("Kodi card: Cannot remove the currently playing item");
            return;
        }

        console.log("=== REMOVE ITEM CALLED ===");
        console.log("Item index:", itemIndex);
        console.log("Hass connection exists:", !!this.hass?.connection);
        console.log("Config:", this._config);

        if (!this.hass?.connection) {
            console.error("Kodi card: Cannot remove item - missing hass connection");
            return;
        }

        if (!this._config?.entry_id) {
            console.error("Kodi card: Cannot remove item - missing entry_id");
            return;
        }

        const message = {
            type: "kodi_media_sensors/playlist_remove_item",
            entry_id: this._config.entry_id,
            index: itemIndex,
        };

        console.log("Kodi card: Sending remove message:", message);

        try {
            this.hass.connection.sendMessage(message as any);
            console.log("Message sent successfully");
        } catch (error) {
            console.error("Error sending message:", error);
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
            const year = item.year ? ` (${item.year})` : "";
            return `${artist}${album}${year}`;
        }

        if (itemType === "episode") {
            const showTitle = (item as any).showtitle || "Unknown Show";
            const season = (item as any).season ?? "?";
            const episode = (item as any).episode ?? "?";
            return `${showTitle} • S${season}E${episode}`;
        }

        return "";
    }

    /**
     * Gets genre string from item
     */
    private _getItemGenre(item: PlaylistItem): string {
        const genre = (item as any).genre;
        if (!genre) return "";
        if (Array.isArray(genre)) {
            return genre.length > 0 ? genre.join(", ") : "";
        }
        return genre;
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
        let statusClass = "fixed-green"; // par défaut

        if (!this._isAvailable) {
            statusClass = "fixed-red";
        } else if (this._kodiState === "playing") {
            statusClass = "flashing-green";
        } else if (["paused", "stopped"].includes(this._kodiState)) {
            statusClass = "fixed-green";
        } else if (this._kodiState === "idle") {
            statusClass = "fixed-orange";
        }

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
                            ${this._items.map((item, index) => this._renderPlaylistItem(item, index))}
                        </div>
                    `}
        `;
    }

    private _renderPlaylistItem(item: PlaylistItem, index: number) {
        const thumbUrl = this._getItemThumbnailUrl(item);
        const metadata = this._getItemMetadata(item);
        const icon = this._getItemIcon(item);
        const genre = this._getItemGenre(item);

        // Check if this item is currently playing
        const isPlaying = index === this._currentIndex;

        return html`
            <li class="playlist-item ${isPlaying ? "active" : ""}">
                ${this._renderThumbnailButton(thumbUrl, icon, index, isPlaying)}
                <div class="track-info">
                    <span class="track-title">${item.title || "Unknown"}</span>
                    ${genre ? html`<span class="track-genre">${genre}</span>` : ""}
                    ${metadata ? html`<span class="track-meta">${metadata}</span>` : ""}
                </div>
                ${item.duration ? html`<span class="track-duration">${this._formatDuration(item.duration)}</span>` : ""}

                <div class="item-action">
                    ${isPlaying
                        ? html`<ha-icon icon="mdi:volume-high" class="playing-marker"></ha-icon>`
                        : html`
                              <div class="remove-button" @click="${() => this._removeItem(index)}" title="Remove">
                                  <ha-icon icon="mdi:trash-can"></ha-icon>
                              </div>
                          `}
                </div>
            </li>
        `;
    }

    private _renderThumbnailButton(
        thumbnailUrl: string | undefined,
        icon = "mdi:music",
        itemIndex: number,
        isPlaying: boolean,
    ) {
        return html`
            <div
                class="thumbnail-button ${isPlaying ? "disabled" : ""}"
                @click="${() => this._playItem(itemIndex)}"
                title="${isPlaying ? "Currently playing" : "Play"}">
                ${this._renderThumbnailContent(thumbnailUrl, icon)}
                ${!isPlaying ? html`<div class="play-overlay"><ha-icon icon="mdi:play-circle"></ha-icon></div>` : ""}
            </div>
        `;
    }

    private _renderThumbnailContent(thumbnailUrl: string | undefined, icon = "mdi:music") {
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