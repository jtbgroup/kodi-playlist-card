import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant } from "custom-card-helpers";

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
  @state() private _currentIndex: number = -1;
  @state() private _error: string | null = null;
  @state() private _loading: boolean = false;
  
  private _lastMediaId?: string;
  // Change: Store as a promise to handle async resolution correctly
  private _unsubEvents?: Promise<() => void>;

  public setConfig(config: any): void {
    if (!config) {
      throw new Error("Invalid card configuration provided.");
    }
    this._config = {
      entity: "media_player.kodi",
      playlistid: 0,
      ...config,
    };
  }

  static get styles() {
    return css`
      :host {
        display: block;
        min-height: 100px;
        background: var(--ha-card-background, var(--card-background-color, #ffffff));
        border-radius: var(--ha-card-border-radius, 12px);
        box-shadow: var(--ha-card-box-shadow, none);
        border: 1px solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
        overflow: hidden;
        transition: all 0.3s ease;
      }
      .card-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 16px 8px 16px; }
      .card-title { margin: 0; font-size: 1.25rem; font-weight: 500; color: var(--primary-text-color); display: flex; align-items: center; gap: 8px; }
      .kodi-icon { color: var(--accent-color, #03a9f4); }
      .connection-status { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--secondary-text-color); }
      .status-dot { width: 8px; height: 8px; border-radius: 50%; background-color: var(--disabled-text-color, #bdbdbd); }
      .status-dot.connected { background-color: var(--success-color, #4caf50); box-shadow: 0 0 6px var(--success-color, #4caf50); }
      .status-dot.loading { background-color: var(--warning-color, #ff9800); animation: pulse 1.5s infinite ease-in-out; }
      @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      .card-content { padding: 0 16px 16px 16px; }
      .error-container { display: flex; flex-direction: column; gap: 8px; background-color: var(--error-color-alpha, rgba(244, 67, 54, 0.1)); border-left: 4px solid var(--error-color, #f44336); padding: 12px; border-radius: 0 4px 4px 0; margin: 8px 16px 16px 16px; }
      .error-title { font-weight: bold; color: var(--error-color, #f44336); font-size: 0.9rem; }
      .error-text { color: var(--primary-text-color); font-size: 0.85rem; margin: 0; }
      .playlist-container { max-height: 400px; overflow-y: auto; border-radius: 8px; border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12)); }
      .playlist-list { list-style: none; padding: 0; margin: 0; }
      .playlist-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12)); transition: background-color 0.2s ease; cursor: pointer; }
      .playlist-item:hover { background-color: var(--secondary-background-color); }
      .playlist-item.active { background-color: var(--accent-color-alpha, rgba(3, 169, 244, 0.1)); border-left: 4px solid var(--accent-color, #03a9f4); padding-left: 8px; }
      .track-number { font-size: 0.85rem; font-weight: bold; color: var(--secondary-text-color); width: 24px; text-align: center; }
      .playlist-item.active .track-number { color: var(--accent-color, #03a9f4); }
      .track-info { display: flex; flex-direction: column; flex-grow: 1; min-width: 0; }
      .track-title { font-size: 0.95rem; font-weight: 500; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .playlist-item.active .track-title { color: var(--accent-color, #03a9f4); font-weight: 600; }
      .track-meta { font-size: 0.8rem; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
      .track-duration { font-size: 0.8rem; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; padding-left: 8px; }
      .empty-list { padding: 24px; text-align: center; color: var(--secondary-text-color); font-size: 0.9rem; }
    `;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._subscribeKodiEvents();
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    // Change: Handle async unsubscribe safely
    if (this._unsubEvents) {
      this._unsubEvents.then((unsub) => unsub()).catch(() => {});
      this._unsubEvents = undefined;
    }
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (!this.hass || !this._config) return;
    const entityId = this._config.entity;
    console.log(entityId);
    const stateObj = this.hass.states[entityId];
    if (stateObj) {
      const currentMediaId = `${stateObj.state}-${stateObj.attributes.media_title || ""}-${stateObj.attributes.media_duration || ""}`;
      if (currentMediaId !== this._lastMediaId) {
        this._lastMediaId = currentMediaId;
        this._queryKodiData();
      }
    }
  }

  private _subscribeKodiEvents(): void {
    if (!this.hass || !this.hass.connection) return;
    // Change: Assign the promise directly
    this._unsubEvents = this.hass.connection.subscribeEvents<any>(
      (event) => this._handleKodiResultEvent(event),
      "kodi_call_method_result"
    );
  }

  private _handleKodiResultEvent(event: any): void {
    if (!this._config || event.data.entity_id !== this._config.entity) return;
    const { result_ok, input, result } = event.data;
    if (!result_ok || !input) return;
    if (input.method === "Playlist.GetItems" && input.playlistid === this._config.playlistid) {
      this._items = result?.items || [];
      this._loading = false;
    } else if (input.method === "Player.GetProperties") {
      this._currentIndex = result?.position !== undefined ? result.position : -1;
    }
  }

  private _queryKodiData(): void {
    if (!this.hass || !this._config) return;
    const entityId = this._config.entity;
    const stateObj = this.hass.states[entityId];
    if (!stateObj || stateObj.state === "off" || stateObj.state === "unavailable") {
      this._items = [];
      this._currentIndex = -1;
      return;
    }
    this._loading = true;
    this.hass.callService("kodi", "call_method", {
      entity_id: entityId,
      method: "Playlist.GetItems",
      playlistid: this._config.playlistid,
      properties: ["title", "artist", "album", "duration"],
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

  private _formatDuration(seconds: number | undefined): string {
    if (seconds === undefined || isNaN(seconds) || seconds <= 0) return "";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  protected render() {
    if (!this.hass || !this._config) return html``;
    const stateObj = this.hass.states[this._config.entity];
    if (!stateObj) return html`<div class="error-container">Media Player Unavailable</div>`;
    const isConnected = stateObj.state !== "unavailable" && stateObj.state !== "off";

    return html`
      <div class="card-header">
        <h3 class="card-title">
          <ha-icon class="kodi-icon" icon="mdi:kodi"></ha-icon>
          <span>${this._config.name || "Kodi Playlist"}</span>
        </h3>
        <div class="connection-status">
          <div class="status-dot ${this._loading ? 'loading' : isConnected ? 'connected' : ''}"></div>
          <span>${this._loading ? 'Updating...' : isConnected ? 'Live' : 'Offline'}</span>
        </div>
      </div>
      <div class="card-content">
        <div class="playlist-container">
          ${this._items.length > 0
            ? html`<ul class="playlist-list">${this._items.map((item, index) => {
                const isActive = index === this._currentIndex;
                const artistDisplay = Array.isArray(item.artist) ? item.artist.join(", ") : item.artist;
                return html`
                  <li class="playlist-item ${isActive ? 'active' : ''}" @click=${() => this._playPlaylistItem(index)}>
                    <span class="track-number">${index + 1}</span>
                    <div class="track-info">
                      <span class="track-title">${item.title || "Unknown"}</span>
                      <span class="track-meta">${artistDisplay || "Unknown Artist"} ${item.album ? `• ${item.album}` : ""}</span>
                    </div>
                    ${item.duration ? html`<span class="track-duration">${this._formatDuration(item.duration)}</span>` : ""}
                  </li>`;
              })}</ul>`
            : html`<div class="empty-list">No tracks found.</div>`}
        </div>
      </div>
    `;
  }
}