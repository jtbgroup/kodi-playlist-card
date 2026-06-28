/**
 * KODI PLAYLIST CARD - Frontend Component
 *
 */

import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant, LovelaceCardEditor } from "custom-card-helpers";
import "./editor";
import { KodiMediaSensorEvent, PlaylistItem } from "./types";
import "./components/index";
import { getThumbnailUrl } from "./utils/thumbnail";
import { ThumbnailService } from "./services";

const CARD_VERSION = "5.0.0";

@customElement("kodi-playlist-card")
export class KodiPlaylistCard extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;

    @state() private _config?: any;
    @state() private _items: PlaylistItem[] = [];
    @state() private _playlistCurrentIndex = -1; // ✅ NEW: Current index from websocket

    @state() private _draggedIndex = -1;
    @state() private _dragOverIndex = -1;
    @state() private _isDragging = false;

    private _unsubscribePlaylistListener?: Promise<() => void>;
    @state() private _resolvedEntryId?: string;

    @state() private _sensorState = "unavailable";
    @state() private _currentTrackId = -1;
    @state() private _currentTrackType = "";
    private _thumbnailService?: ThumbnailService;

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

    protected willUpdate(changedProperties: PropertyValues) {
        super.willUpdate(changedProperties);

        if (changedProperties.has("hass")) {
            if (!this._thumbnailService && this.hass) {
                this._thumbnailService = new ThumbnailService(this.hass);
            }
        }

        if (changedProperties.has("_config")) {
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

        this._unsubscribePlaylistListener = this.hass.connection.subscribeMessage<KodiMediaSensorEvent>(
            (message: KodiMediaSensorEvent) => this._handlePlaylistEvent(message),
            {
                type: "kodi_media_sensors/playlist_subscribe",
                entry_id: this._resolvedEntryId,
            },
        );
    }

    private _handlePlaylistEvent(message: KodiMediaSensorEvent): void {
        console.log("🔍 MESSAGE REÇU:", JSON.stringify(message, null, 2)); // ← FULL DUMP
        console.log("Current track:", {
            trackId: this._currentTrackId,
            trackType: this._currentTrackType,
        });

        if (message.type === "playlist_update") {
            this._items = message.items || [];
            this._playlistCurrentIndex = message.current_index ?? -1;

            console.log(
                "📋 Playlist items types:",
                this._items.map(i => i.type),
            );
            console.log("📋 Playlist length:", this._items.length);

            this._items = message.items || [];
            this._playlistCurrentIndex = message.current_index ?? -1;

            console.log(
                "Kodi card: Playlist updated",
                this._items.length,
                "items, current index:",
                this._playlistCurrentIndex,
            );

            this._items.forEach(item => {
                const url = this._thumbnailService?.getThumbnailUrl(item);
                if (url && !this._thumbnailService?.getThumbnailFromCache(url)) {
                    this._thumbnailService?.loadThumbnailForItem(item, () => this.requestUpdate());
                }
            });
        } else if (message.type === "kodi_unavailable") {
            this._items = [];
            this._playlistCurrentIndex = -1;
            console.log("Kodi card: Kodi is unavailable");
        }
    }

    private _playItem(itemIndex: number): void {
        if (itemIndex === this._playlistCurrentIndex) {
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

        this.hass.connection.sendMessage({
            type: "kodi_media_sensors/playlist_goto_index",
            entry_id: this._resolvedEntryId,
            index: itemIndex,
        } as any);
    }

    private _removeItem(itemIndex: number): void {
        if (itemIndex === this._playlistCurrentIndex) {
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
        const playlist_length = this._items.length;

        return html`
            <div class="card-header">
                <kodi-card-header
                    .title="${this._config?.title ?? "Kodi Playlist"}"
                    .statusState="${this._sensorState}"></kodi-card-header>
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

        return `
        overflow-y: auto !important;
        max-height: ${totalHeight}px !important;
        display: flex;
        flex-direction: column;
    `;
    }

    private _getOutlineColor(): string {
        const color = this._config.outline_color;
        if (!color) return "var(--divider-color)";

        // Si HA renvoie un tableau [255, 0, 0] (via l'éditeur visuel)
        if (Array.isArray(color)) {
            const result = `rgb(${color.join(",")})`;
            return result;
        }

        // Si l'utilisateur a tapé "#FF0000" ou "red" en YAML
        return color;
    }

    private _renderPlaylistItem(item: PlaylistItem, index: number) {
        const isPlaying = index === this._playlistCurrentIndex;

        // ✅ Récupère l'URL théorique ET le cache base64
        const thumbnailUrl = this._thumbnailService?.getThumbnailUrl(item);
        const cachedThumbnailUrl = thumbnailUrl
            ? this._thumbnailService?.getThumbnailFromCache(thumbnailUrl)
            : undefined;

        let showLineSeparator = this._config.show_line_separator;
        if (showLineSeparator && index + 1 >= this._items.length) {
            showLineSeparator = !this._config.hide_last_line_separator;
        }

        return html`
            <kodi-playlist-item
                .hass="${this.hass}"
                .item="${item}"
                .index="${index}"
                .cachedThumbnailUrl="${cachedThumbnailUrl}"
                .isPlaying="${isPlaying}"
                .showLineSeparator="${showLineSeparator}"
                .isDragging="${this._draggedIndex === index}"
                .isDragOver="${this._dragOverIndex === index}"
                .outlineColor="${this._getOutlineColor()}"
                .showThumbnailBorder="${this._config?.show_thumbnail_border ?? false}"
                .showThumbnailImage="${this._config?.show_thumbnail ?? true}"
                .showThumbnailOverlay="${this._config?.show_thumbnail_overlay ?? true}"
                draggable="${!isPlaying}"
                @dragstart="${(e: DragEvent) => this._handleDragStart(e, index)}"
                @dragover="${(e: DragEvent) => this._handleDragOver(e, index)}"
                @dragleave="${() => this._handleDragLeave()}"
                @drop="${(e: DragEvent) => this._handleDrop(e, index)}"
                @play-item="${(e: CustomEvent) => this._playItem(e.detail.index)}"
                @remove-item="${(e: CustomEvent) => this._removeItem(e.detail.index)}">
            </kodi-playlist-item>
        `;
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

        if (fromIndex === this._playlistCurrentIndex) {
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

        this.hass.connection.sendMessage({
            type: "kodi_media_sensors/playlist_reorder",
            entry_id: this._resolvedEntryId,
            from_index: fromIndex,
            to_index: toIndex,
        } as any);
    }
}

