import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant } from "custom-card-helpers";
declare module "custom-card-helpers" {
    interface HomeAssistant {
        hassUrl(path: string): string;
    }
}

interface PlaylistItem {
    title?: string;
    artist?: string | string[];
    album?: string;
    duration?: number;
    thumbnail?: string;
}

@customElement("kodi-playlist-card")
export class KodiPlaylistCard extends LitElement {
    @property({ attribute: false }) public hass!: HomeAssistant;

    @state() private _config?: any;
    @state() private _items: PlaylistItem[] = [];
    @state() private _currentIndex = -1;
    @state() private _loading = false;

    private _lastMediaId?: string;
    private _unsubEvents?: Promise<() => void>;

    public setConfig(config: any): void {
        if (!config) throw new Error("Configuration invalide.");
        this._config = { entity: "media_player.kodi", playlistid: 0, ...config };
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
            .status-dot.connected {
                background: var(--success-color);
            }
            .status-dot.loading {
                background: var(--warning-color);
                animation: pulse 1.5s infinite;
            }
            @keyframes pulse {
                0%,
                100% {
                    opacity: 0.4;
                }
                50% {
                    opacity: 1;
                }
            }
            .playlist-container {
                max-height: 400px;
                overflow-y: auto;
            }
            .playlist-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 8px 16px;
                cursor: pointer;
                border-bottom: 1px solid var(--divider-color);
            }
            .playlist-item:hover {
                background: var(--secondary-background-color);
            }
            .playlist-item.active {
                background: rgba(3, 169, 244, 0.1);
                border-left: 4px solid var(--accent-color);
            }
            .track-thumb {
                width: 45px;
                height: 45px;
                object-fit: cover;
                border-radius: 4px;
            }
            .thumb-placeholder {
                width: 45px;
                height: 45px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--secondary-background-color);
                border-radius: 4px;
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
            }
        `;
    }

    public connectedCallback(): void {
        super.connectedCallback();
        this._subscribeKodiEvents();
    }

    public disconnectedCallback(): void {
        super.disconnectedCallback();

        if (this._unsubEvents) {
            // On appelle la promesse, on récupère la fonction d'annulation et on l'exécute
            this._unsubEvents.then(unsub => {
                unsub();
            });
            this._unsubEvents = undefined;
        }
    }

    protected updated(changedProperties: PropertyValues): void {
        super.updated(changedProperties);
        if (!this.hass || !this._config) return;
        const stateObj = this.hass.states[this._config.entity];
        if (stateObj) {
            const currentMediaId = `${stateObj.state}-${stateObj.attributes.media_title}`;
            if (currentMediaId !== this._lastMediaId) {
                this._lastMediaId = currentMediaId;
                this._queryKodiData();
            }
        }
    }

    private _subscribeKodiEvents(): void {
        if (!this.hass?.connection) return;
        this._unsubEvents = this.hass.connection.subscribeEvents<any>(
            e => this._handleKodiResultEvent(e),
            "kodi_call_method_result",
        );
    }

    private _handleKodiResultEvent(event: any): void {
        if (event.data.entity_id !== this._config.entity) return;
        const { input, result } = event.data;
        if (input.method === "Playlist.GetItems") {
            this._items = result?.items || [];
            this._loading = false;
        } else if (input.method === "Player.GetProperties") {
            this._currentIndex = result?.position ?? -1;
        }
    }

    private _queryKodiData(): void {
        this._loading = true;
        this.hass.callService("kodi", "call_method", {
            entity_id: this._config.entity,
            method: "Playlist.GetItems",
            playlistid: this._config.playlistid,
            properties: ["title", "artist", "album", "duration", "thumbnail"],
        });
    }

    private _playPlaylistItem(index: number): void {
        this.hass.callService("kodi", "call_method", {
            entity_id: this._config.entity,
            method: "Player.GoTo",
            playerid: this._config.playlistid === 0 ? 0 : 1,
            to: index,
        });
    }

    private _formatDuration(s: number): string {
        return `${Math.floor(s / 60)}:${Math.floor(s % 60)
            .toString()
            .padStart(2, "0")}`;
    }

    protected render() {
        const stateObj = this.hass.states[this._config.entity];
        const isConnected = stateObj?.state !== "unavailable" && stateObj?.state !== "off";

        return html`
            <div class="card-header">
                <h3 class="card-title">
                    <ha-icon class="kodi-icon" icon="mdi:kodi"></ha-icon> ${this._config.name || "Kodi"}
                </h3>
                <div class="status-dot ${this._loading ? "loading" : isConnected ? "connected" : ""}"></div>
            </div>
            <div class="playlist-container">
                ${this._items.map((item, index) => {
                    const isActive = index === this._currentIndex;
                    const stateObj = this.hass.states[this._config.entity];
                    const thumbUrl = item.thumbnail || stateObj?.attributes.entity_picture;

                    const thumb = thumbUrl
                        ? html`<img class="track-thumb" src="${this.hass.hassUrl(thumbUrl)}" />`
                        : html`<div class="thumb-placeholder"><ha-icon icon="mdi:music"></ha-icon></div>`;
                    return html` <li
                        class="playlist-item ${isActive ? "active" : ""}"
                        @click=${() => this._playPlaylistItem(index)}>
                        ${thumb}
                        <div class="track-info">
                            <span class="track-title">${item.title || "Inconnu"}</span>
                            <span class="track-meta"
                                >${Array.isArray(item.artist)
                                    ? item.artist.join(", ")
                                    : item.artist || "Artiste inconnu"}</span
                            >
                        </div>
                        ${item.duration ? html`<span>${this._formatDuration(item.duration)}</span>` : ""}
                    </li>`;
                })}
            </div>
        `;
    }

    private _getProxyUrl(url: string): string {
        // Si c'est déjà une URL complète (http), on la retourne
        if (url.startsWith("http")) return url;

        // Si c'est un format kodi "image://", il faut l'encoder
        // On passe par le proxy de l'intégration kodi
        const encodedUrl = encodeURIComponent(url);
        return `${this.hass.hassUrl("")}/api/kodi/image/${encodedUrl}?entity_id=${this._config.entity}`;
    }
}

