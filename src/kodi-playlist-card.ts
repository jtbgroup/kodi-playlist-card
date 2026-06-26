/**
 * KODI PLAYLIST CARD - Frontend Component
 * 
 * Corrected version: sends item_id and item_name to play_item instead of index
 * Uses entry_id resolution from sensor attributes
 */

import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant, LovelaceCardEditor } from "custom-card-helpers";
import "./editor";
import { KodiMediaSensorEvent, KodiUnavailableEvent, PlaylistItem, PlaylistUpdateEvent } from "./types";

const CARD_VERSION = "5.0.0";

@customElement("kodi-playlist-card")
export class KodiPlaylistCard extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;

    @state() private _config?: any;
    @state() private _items: PlaylistItem[] = [];
    @state() private _currentIndex = -1;
    @state() private _playlistCurrentIndex = -1;  // ✅ NEW: Current index from websocket

    @state() private _draggedIndex = -1;
    @state() private _dragOverIndex = -1;
    @state() private _isDragging = false;

    private _unsubscribePlaylistListener?: Promise<() => void>;
    @state() private _thumbnailCache: Map<string, string> = new Map();
    private _thumbnailLoadingSet: Set<string> = new Set();
    @state() private _resolvedEntryId?: string;
    // @state() private _resolvedKodiEntityId?: string;

    @state() private _sensorState = "unavailable";
    @state() private _currentTrackId = -1;
    @state() private _currentTrackType = "";

    static getConfigElement(): LovelaceCardEditor {
        return document.createElement("kodi-playlist-card-editor") as LovelaceCardEditor;
    }

    static getStubConfig(): Record<string, unknown> {
        return {
            entity: "sensor.kodi_playlist",
            title: "Kodi Playlist",
            show_thumbnail: false,
            show_thumbnail_overlay: true,
            show_thumbnail_border: false,
            show_line_separator: true,
            hide_last_line_separator: false,
            outline_color: "white",
            items_container_scrollable: false,
            items_container_height: "300px",
            show_version: false,
        };
    }

    public setConfig(config: any): void {
        if (!config || !config.entity) {
            throw new Error("Entity configuration is required");
        }
        this._config = config;
    }

    // willUpdate : Reads the state before rendering the card
    protected willUpdate(changedProperties: PropertyValues) {
        super.willUpdate(changedProperties);

        // update internal variables on HA triggers
        if (changedProperties.has("hass") || changedProperties.has("_config")) {
            this._resolveConfig();
            this._fetchSensorState();
        }
    }

    protected updated(changedProperties: PropertyValues) {
        super.updated(changedProperties);

        if (this._resolvedEntryId && !this._unsubscribePlaylistListener) {
            this._subscribePlaylist();
        }
    }

    private _resolveConfig(): void {
        if (!this.hass || !this._config?.entity) return;

        const entityState = this.hass.states[this._config.entity];

        if (entityState?.attributes) {
            this._resolvedEntryId = entityState.attributes.config_entry_id;
        }
    }

    private _fetchSensorState(): void {
        if (!this.hass || !this._config?.entity) {
            this._sensorState = "unavailable";
            return;
        }

        const sensorEntity = this.hass.states[this._config.entity];

        if (sensorEntity) {
            this._sensorState = sensorEntity.state;

            const currentTrack = sensorEntity.attributes?.current_track;
            if (currentTrack) {
                this._currentTrackId = currentTrack.id ?? -1;
                this._currentTrackType = currentTrack.type ?? "";
            } else {
                this._currentTrackId = -1;
                this._currentTrackType = "";
            }

            console.debug("[Kodi Card] Sensor state:", {
                state: this._sensorState,
                currentTrackId: this._currentTrackId,
                currentTrackType: this._currentTrackType,
            });
        } else {
            this._sensorState = "unavailable";
            this._currentTrackId = -1;
            this._currentTrackType = "";
        }
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

            .status-dot.fixed-green {
                background: var(--success-color);
            }

            .status-dot.fixed-orange {
                background: var(--warning-color);
            }

            .status-dot.fixed-red {
                background: var(--error-color);
            }

            .status-dot.flashing-green {
                background: var(--success-color);
                animation: pulse-dot 1s infinite;
            }

            .item-action {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 40px;
                margin-left: auto;
            }

            .playing-marker {
                color: var(--accent-color);
                --icon-size: 24px;
                animation: pulse-marker 1.5s infinite;
            }

            @keyframes pulse-dot {
                0%,
                100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.3;
                }
            }

            @keyframes pulse-marker {
                0%,
                100% {
                    transform: scale(1);
                    opacity: 1;
                }
                50% {
                    transform: scale(1.1);
                    opacity: 0.8;
                }
            }

            .playlist-container {
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

            .playlist-items-container {
                list-style: none;
                padding: 0;
                margin: 0;
                width: 100%;
                box-sizing: border-box;
                -webkit-overflow-scrolling: touch;
            }

            .playlist-items-container::-webkit-scrollbar {
                width: 6px;
            }
            .playlist-items-container::-webkit-scrollbar-thumb {
                background-color: var(--divider-color);
                border-radius: 3px;
            }

            .playlist-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 16px;
                border-bottom: 1px solid transparent;
                transition: all 0.2s ease;
                user-select: none;
                position: relative;
            }

            .playlist-item.dragging {
                opacity: 0.5;
                background: var(--secondary-background-color);
                border-left: 4px solid var(--warning-color);
                padding-left: calc(12px - 4px);
            }

            .playlist-item.drag-over {
                background: rgba(3, 169, 244, 0.15);
                border-top: 2px solid var(--primary-color);
                padding-top: calc(8px - 2px);
                margin-top: 2px;
            }

            .drag-handle {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 32px;
                height: 32px;
                cursor: grab;
                color: var(--secondary-text-color);
                opacity: 0;
                transition: opacity 0.2s;
                flex-shrink: 0;
            }

            .drag-handle:active {
                cursor: grabbing;
            }

            .playlist-item:not(.active):hover .drag-handle {
                opacity: 1;
            }

            .playlist-item.active {
                cursor: not-allowed;
            }

            .playlist-item.active .drag-handle {
                display: none;
            }

            .playlist-item.with-separator {
                border-bottom: 1px solid var(--outline-color);
            }

            .playlist-item.hide-last.with-separator:last-child {
                border-bottom: none;
            }
            
            .playlist-item:hover {
                background: var(--secondary-background-color);
            }
            
            .playlist-item.active {
                background: rgba(3, 169, 244, 0.1);
                border-left: 4px solid var(--accent-color);
                padding-left: 12px;
            }

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
            .version-footer {
                text-align: right;
                font-size: 0.7em;
                color: var(--secondary-text-color);
                padding: 8px;
                opacity: 0.6;
            }
        `;
    }

    public connectedCallback(): void {
        super.connectedCallback();
        this._subscribePlaylist();
    }

    public disconnectedCallback(): void {
        super.disconnectedCallback();

        if (this._unsubscribePlaylistListener) {
            this._unsubscribePlaylistListener.then(unsub => {
                unsub();
            });
            this._unsubscribePlaylistListener = undefined;
        }
    }

    private _subscribePlaylist(): void {
        // Strict verification
        if (!this.hass?.connection || !this._resolvedEntryId) {
            console.warn("Kodi card: Subscription deferred (missing IDs)");
            return;
        }

        // ✅ FIXED: Only send entry_id, backend will resolve kodi_entity_id
        this._unsubscribePlaylistListener = this.hass.connection.subscribeMessage<KodiMediaSensorEvent>(
            (message: KodiMediaSensorEvent) => this._handlePlaylistEvent(message),
            {
                type: "kodi_media_sensors/playlist_subscribe",
                entry_id: this._resolvedEntryId,
            },
        );
    }

    private _handlePlaylistEvent(message: KodiMediaSensorEvent): void {
        console.log("Kodi card: Message received", message);

        if (message.type === "playlist_update") {
            this._items = message.items || [];
            this._playlistCurrentIndex = message.current_index ?? -1;  // ✅ Store current_index
            this._thumbnailLoadingSet.clear();
            console.log("Kodi card: Playlist updated", this._items.length, "current index:", this._playlistCurrentIndex);
        } else if (message.type === "kodi_unavailable") {
            this._items = [];
            this._playlistCurrentIndex = -1;
            this._thumbnailLoadingSet.clear();
            console.log("Kodi card: Kodi is unavailable");
        }
    }

    private _playItem(itemIndex: number): void {
        if (itemIndex === this._playlistCurrentIndex) {  // ✅ Use playlist current index
            console.log("Kodi card: Item is already playing");
            return;
        }

        if (!this.hass?.connection) {
            console.error("Kodi card: Cannot play item - missing hass connection");
            return;
        }

        const item = this._items[itemIndex];
        if (!item) {
            console.error("Kodi card: Item not found at index", itemIndex);
            return;
        }

        // Extract item_id and item_name from the playlist item
        const itemType = (item as any).type;
        let itemId: number | undefined;
        let itemName: string | undefined;

        if (itemType === "song" || itemType === "music") {
            itemId = (item as any).id;
            itemName = "songid";
        } else if (itemType === "movie") {
            itemId = (item as any).id;
            itemName = "movieid";
        } else if (itemType === "episode") {
            itemId = (item as any).id;
            itemName = "episodeid";
        } else if (itemType === "musicvideo") {
            itemId = (item as any).id;
            itemName = "musicvideoid";
        } else {
            console.error("Kodi card: Unknown item type:", itemType);
            return;
        }

        if (!itemId || !itemName) {
            console.error("Kodi card: Cannot determine item_id or item_name for item", item);
            return;
        }

        console.log("Kodi card: Playing item", { itemIndex, itemId, itemName });

        // ✅ FIXED: Send item_id and item_name instead of index, no kodi_entity_id needed
        this.hass.connection.sendMessage({
            type: "kodi_media_sensors/playlist_play_item",
            entry_id: this._resolvedEntryId,
            item_id: itemId,
            item_name: itemName,
        } as any);
    }

    private _removeItem(itemIndex: number): void {
        if (itemIndex === this._playlistCurrentIndex) {  // ✅ Use playlist current index
            console.log("Kodi card: Cannot remove the currently playing item");
            return;
        }

        if (!this.hass?.connection) {
            console.error("Kodi card: Cannot remove item - missing hass connection");
            return;
        }

        if (!this._resolvedEntryId) {
            console.error("Kodi card: Cannot remove item - missing entry_id");
            return;
        }

        // ✅ FIXED: No kodi_entity_id needed
        const message = {
            type: "kodi_media_sensors/playlist_remove_item",
            entry_id: this._resolvedEntryId,
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

    private _getItemThumbnailUrl(item: PlaylistItem): string | undefined {
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

    private _getItemGenre(item: PlaylistItem): string {
        const genre = (item as any).genre;
        if (!genre) return "";
        if (Array.isArray(genre)) {
            return genre.length > 0 ? genre.join(", ") : "";
        }
        return genre;
    }

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
        let statusClass = "fixed-green";

        if (this._sensorState === "off") {
            statusClass = "fixed-red";
        } else if (this._sensorState === "playing") {
            statusClass = "flashing-green";
        } else if (["paused", "stopped"].includes(this._sensorState)) {
            statusClass = "fixed-green";
        } else if (this._sensorState === "idle") {
            statusClass = "fixed-orange";
        }

        const showVersion = this._config?.show_version ?? false;

        return html`
            <div class="card-header">
                <h3 class="card-title">
                    <ha-icon class="kodi-icon" icon="mdi:kodi"></ha-icon> ${this._config?.title || "Kodi Playlist"}
                </h3>
                <div class="status-dot ${statusClass}"></div>
            </div>

            ${this._sensorState == "off"
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
                      <div class="card-content">
                          <ul class="playlist-items-container" style="${this._getContainerStyle()}">
                              ${this._items.map((item, index) => this._renderPlaylistItem(item, index))}
                          </ul>
                      </div>
                  `}
            ${showVersion ? html` <div class="version-footer">Version: ${CARD_VERSION}</div> ` : ""}
        `;
    }

    private _getContainerStyle() {
        if (!this._config?.items_container_scrollable) {
            return "overflow-y: visible; display: flex; flex-direction: column;";
        }

        const count = Number(this._config?.visible_items_count || 5);
        const heightPerItem = 60;
        const totalHeight = count * heightPerItem;

        console.debug("Count :", count, "items *", heightPerItem, "px =", totalHeight, "px");

        return `
        overflow-y: auto !important;
        max-height: ${totalHeight}px !important;
        display: flex;
        flex-direction: column;
    `;
    }

    private _renderPlaylistItem(item: PlaylistItem, index: number) {
        const thumbUrl = this._getItemThumbnailUrl(item);
        const metadata = this._getItemMetadata(item);
        const icon = this._getItemIcon(item);
        const genre = this._getItemGenre(item);
        const isPlaying = index === this._playlistCurrentIndex;  // ✅ Compare with playlist current index

        const dragClasses = [
            "playlist-item",
            isPlaying ? "active" : "",
            this._draggedIndex === index ? "dragging" : "",
            this._dragOverIndex === index ? "drag-over" : "",
            this._config?.show_line_separator ? "with-separator" : "",
            this._config?.hide_last_line_separator ? "hide-last" : "",
        ]
            .filter(Boolean)
            .join(" ");

        return html`
            <li
                class="${dragClasses}"
                draggable="${!isPlaying}"
                @dragstart="${(e: DragEvent) => this._handleDragStart(e, index)}"
                @dragover="${(e: DragEvent) => this._handleDragOver(e, index)}"
                @dragleave="${() => this._handleDragLeave()}"
                @drop="${(e: DragEvent) => this._handleDrop(e, index)}"
                style="${this._config?.show_line_separator
                    ? `--outline-color: ${this._config?.outline_color || "var(--divider-color)"}`
                    : ""}">
                ${!isPlaying
                    ? html`
                          <div class="drag-handle" title="Drag to reorder">
                              <ha-icon icon="mdi:drag"></ha-icon>
                          </div>
                      `
                    : ""}
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
                        : html`<div class="remove-button" @click="${() => this._removeItem(index)}" title="Remove">
                              <ha-icon icon="mdi:trash-can"></ha-icon>
                          </div>`}
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
        const showBorder = this._config?.show_thumbnail_border ?? false;
        const showOverlay = this._config?.show_thumbnail_overlay ?? false;
        const showImage = this._config?.show_thumbnail ?? true;
        const outlineColor = this._config?.outline_color || "var(--divider-color)";

        const buttonStyle = showBorder ? `border: 1px solid ${outlineColor};` : "";

        return html`
            <div
                class="thumbnail-button ${isPlaying ? "disabled" : ""} ${showBorder ? "with-border" : ""}"
                style="${buttonStyle}"
                @click="${() => this._playItem(itemIndex)}"
                title="${isPlaying ? "Currently playing" : "Play"}">
                ${showImage
                    ? this._renderThumbnailContent(thumbnailUrl, icon)
                    : html`<div class="thumb-placeholder"><ha-icon icon="${icon}"></ha-icon></div>`}
                ${!isPlaying && showOverlay
                    ? html`<div class="play-overlay"><ha-icon icon="mdi:play-circle"></ha-icon></div>`
                    : ""}
            </div>
        `;
    }

    private _renderThumbnailContent(thumbnailUrl: string | undefined, icon = "mdi:music") {
        if (!thumbnailUrl) {
            return html`<div class="thumb-placeholder"><ha-icon icon="${icon}"></ha-icon></div>`;
        }

        if (this._thumbnailCache.has(thumbnailUrl)) {
            const cached = this._thumbnailCache.get(thumbnailUrl);
            return cached
                ? html`<img class="track-thumb" src="${cached}" alt="Album art" />`
                : html`<div class="thumb-placeholder"><ha-icon icon="${icon}"></ha-icon></div>`;
        }

        if (!this._thumbnailLoadingSet.has(thumbnailUrl)) {
            this._getThumbnailURL(thumbnailUrl);
        }

        return html`<div class="thumb-placeholder"><ha-icon icon="${icon}"></ha-icon></div>`;
    }

    private async _getThumbnailURL(thumbnailUrl: string): Promise<void> {
        if (this._thumbnailLoadingSet.has(thumbnailUrl) || this._thumbnailCache.has(thumbnailUrl)) {
            return;
        }

        this._thumbnailLoadingSet.add(thumbnailUrl);

        try {
            if (thumbnailUrl.startsWith("http")) {
                this._thumbnailCache.set(thumbnailUrl, thumbnailUrl);
            } else if (thumbnailUrl.startsWith("/")) {
                const base64 = await this._loadLocalImageAsBase64(thumbnailUrl);
                this._thumbnailCache.set(thumbnailUrl, base64 ?? "");
            } else {
                this._thumbnailCache.set(thumbnailUrl, "");
            }
        } catch (e) {
            console.info(`Kodi Playlist: Error loading thumbnail ${thumbnailUrl}`, e);
            this._thumbnailCache.set(thumbnailUrl, "");
        } finally {
            this._thumbnailLoadingSet.delete(thumbnailUrl);
            this.requestUpdate();
        }
    }

    private async _loadLocalImageAsBase64(url: string): Promise<string | undefined> {
        try {
            const response = await this.hass.fetchWithAuth(url);

            if (!response.ok) {
                console.info(`Kodi Playlist: Image not found (404) or not accessible at ${url}`);
                return undefined;
            }

            const blob = await response.blob();
            return await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            console.info("Kodi Playlist: Impossible to load the image through proxy:", err);
            return undefined;
        }
    }

    private _handleDragStart(event: DragEvent, fromIndex: number): void {
        this._draggedIndex = fromIndex;
        this._isDragging = true;

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", fromIndex.toString());
        }

        console.log("🎯 Drag start from index:", fromIndex);
        this.requestUpdate();
    }

    private _handleDragOver(event: DragEvent, overIndex: number): void {
        event.preventDefault();

        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }

        this._dragOverIndex = overIndex;
        this.requestUpdate();
    }

    private _handleDragLeave(): void {
        this._dragOverIndex = -1;
        this.requestUpdate();
    }

    private _handleDrop(event: DragEvent, toIndex: number): void {
        event.preventDefault();
        event.stopPropagation();

        const fromIndex = this._draggedIndex;

        this._draggedIndex = -1;
        this._dragOverIndex = -1;
        this._isDragging = false;

        console.log(`📦 Drop: ${fromIndex} → ${toIndex}`);

        if (fromIndex === -1 || fromIndex === toIndex) {
            this.requestUpdate();
            return;
        }

        if (fromIndex === this._playlistCurrentIndex) {  // ✅ Use playlist current index
            console.warn("Cannot reorder currently playing item");
            this.requestUpdate();
            return;
        }

        this._reorderPlaylist(fromIndex, toIndex);

        this.requestUpdate();
    }

    private _reorderPlaylist(fromIndex: number, toIndex: number): void {
        if (!this.hass?.connection || !this._resolvedEntryId) {
            console.error("Cannot reorder: missing connection or entry_id");
            return;
        }

        console.log("📡 Sending reorder request:", { fromIndex, toIndex });

        // ✅ FIXED: No kodi_entity_id needed
        this.hass.connection.sendMessage({
            type: "kodi_media_sensors/playlist_reorder",
            entry_id: this._resolvedEntryId,
            from_index: fromIndex,
            to_index: toIndex,
        } as any);
    }
}