import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant, LovelaceCard, LovelaceCardEditor } from "custom-card-helpers";

// Importation unifiée via les dossiers modulaires
import { KodiPlaylistCardConfig, KodiMediaSensorEvent, PlaylistItem } from "./types";
import { ConfigService, KodiService, ThumbnailService } from "./services";
import "./components"; // Enregistrement automatique des balises <kodi-card-header>, <kodi-playlist-container>, etc.

const CARD_VERSION = "5.0.0";

@customElement("kodi-playlist-card")
export class KodiPlaylistCard extends LitElement implements LovelaceCard {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: KodiPlaylistCardConfig;
  @state() private _items: PlaylistItem[] = [];
  @state() private _currentIndex = -1;
  @state() private _sensorState = "unavailable";
  @state() private _thumbnailCache: Map<string, string> = new Map();

  // Instances des services
  private _configService = new ConfigService();
  private _kodiService?: KodiService;
  private _thumbnailService?: ThumbnailService;

  // Variables de suivi d'état des identifiants résolus depuis les attributs du sensor
  private _resolvedEntryId?: string;
  private _resolvedKodiEntityId?: string;
  private _unsubscribePlaylistCleanup?: () => void;

  /**
   * Fournit l'élément d'édition Lovelace à Home Assistant.
   */
  static getConfigElement(): LovelaceCardEditor {
    return document.createElement("kodi-playlist-card-editor") as LovelaceCardEditor;
  }

  /**
   * Configuration de démo par défaut lors de l'ajout de la carte.
   */
  static getStubConfig(): Record<string, any> {
    return {
      type: "custom:kodi-playlist-card",
      entity: "sensor.kodi_playlist",
    };
  }

  /**
   * Applique et valide la configuration brute de Lovelace.
   */
  public setConfig(config: any): void {
    this._config = this._configService.validateConfig(config);
  }

  /**
   * Cycle de vie Lit : Détecte les modifications des propriétés de Home Assistant.
   */
  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (!this.hass || !this._config) return;

    // Instanciation paresseuse des services dépendants de l'objet hass
    if (!this._kodiService) {
      this._kodiService = new KodiService(this.hass);
    }
    if (!this._thumbnailService) {
      this._thumbnailService = new ThumbnailService(this.hass);
    }

    const oldHass = changedProperties.get("hass") as HomeAssistant | undefined;
    
    // Déclenche la mise à jour uniquement si l'état ou les attributs du capteur de playlist changent
    if (!oldHass || oldHass.states[this._config.entity] !== this.hass.states[this._config.entity]) {
      this._handleTargetEntityChange();
    }
  }

  /**
   * Nettoie les écouteurs et caches à la destruction ou retrait de la carte.
   */
  public disconnectedCallback(): void {
    this._disconnectKodiWebSocket();
    if (this._thumbnailService) {
      this._thumbnailService.clearCache();
    }
    super.disconnectedCallback();
  }

  /**
   * Extrait et valide les attributs requis du sensor pour piloter l'intégration Python.
   */
  private _handleTargetEntityChange(): void {
    const stateObj = this.hass.states[this._config!.entity];
    if (!stateObj) {
      this._sensorState = "unavailable";
      return;
    }

    this._sensorState = stateObj.state;

    // Récupération des attributs injectés par l'intégration Python kodi_media_sensors
    const entryId = stateObj.attributes.entry_id;
    const kodiEntityId = stateObj.attributes.kodi_entity_id;

    // Si les identifiants changent ou se résolvent enfin, on réinitialise l'abonnement
    if (entryId !== this._resolvedEntryId || kodiEntityId !== this._resolvedKodiEntityId) {
      this._resolvedEntryId = entryId;
      this._resolvedKodiEntityId = kodiEntityId;
      
      this._connectKodiWebSocket();
    }
  }

  /**
   * Établit la connexion et la souscription aux push de l'intégration Python via WebSocket.
   */
  private async _connectKodiWebSocket(): Promise<void> {
    this._disconnectKodiWebSocket();

    // 🔒 SÉCURITÉ IMPORTANTE : Évite les crashs Voluptuous / unknown_command en bloquant si indéterminé
    if (!this._resolvedEntryId || !this._resolvedKodiEntityId || !this._kodiService) {
      return;
    }

    try {
      // Appel asynchrone du service ré-encapsulé
      const cleanupFunction = await this._kodiService.subscribe(
        String(this._resolvedEntryId),
        String(this._resolvedKodiEntityId),
        (event: KodiMediaSensorEvent) => this._handleWebSocketMessage(event)
      );

      this._unsubscribePlaylistCleanup = cleanupFunction;
    } catch (error) {
      console.error("Kodi Playlist Card: Erreur lors de la tentative de souscription :", error);
    }
  }

  /**
   * Coupe proprement et immédiatement l'abonnement WebSocket.
   */
  private _disconnectKodiWebSocket(): void {
    if (this._unsubscribePlaylistCleanup) {
      this._unsubscribePlaylistCleanup();
      this._unsubscribePlaylistCleanup = undefined;
    }
  }

  /**
   * Traite et dispatche les paquets de données reçus depuis le fichier Python playlist.py
   */
  private _handleWebSocketMessage(event: KodiMediaSensorEvent): void {
    if (event.type === "kodi_unavailable") {
      this._items = [];
      this._currentIndex = -1;
      return;
    }

    if (event.type === "playlist_initial_state" || event.type === "playlist_update") {
      this._items = event.items || [];
      this._currentIndex = event.current_index ?? -1;
      
      // Lancement en tâche de fond asynchrone du préchargement des images de couverture
      this._preloadThumbnails();
    }
  }

  /**
   * Gère la conversion asynchrone et la mise en cache locale des vignettes de morceaux.
   */
  private async _preloadThumbnails(): Promise<void> {
    if (!this._thumbnailService) return;

    for (const item of this._items) {
      const url = this._thumbnailService.getThumbnailUrl(item);
      if (url && !this._thumbnailCache.has(url)) {
        await this._thumbnailService.loadThumbnail(url, () => {
          if (this._thumbnailService) {
            // Recréation de la Map pour forcer la réactivité Lit
            this._thumbnailCache = new Map(this._thumbnailCache).set(url, url);
            this.requestUpdate();
          }
        });
      }
    }
  }

  /**
   * Écouteurs de Custom Events relayés par les sous-composants graphiques enfants
   */
  private _handlePlayItem(e: CustomEvent<{ index: number }>): void {
    if (this._kodiService && this._resolvedEntryId && this._resolvedKodiEntityId) {
      this._kodiService.sendPlayItem(
        String(this._resolvedEntryId), 
        String(this._resolvedKodiEntityId), 
        e.detail.index
      );
    }
  }

  private _handleRemoveItem(e: CustomEvent<{ index: number }>): void {
    if (this._kodiService && this._resolvedEntryId && this._resolvedKodiEntityId) {
      this._kodiService.sendRemoveItem(
        String(this._resolvedEntryId), 
        String(this._resolvedKodiEntityId), 
        e.detail.index
      );
    }
  }

  private _handleReorderItem(e: CustomEvent<{ fromIndex: number; toIndex: number }>): void {
    if (this._kodiService && this._resolvedEntryId && this._resolvedKodiEntityId) {
      this._kodiService.sendReorderPlaylist(
        String(this._resolvedEntryId),
        String(this._resolvedKodiEntityId),
        e.detail.fromIndex,
        e.detail.toIndex
      );
    }
  }

  static styles = css`
    ha-card {
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }
    .version-footer {
      padding: 4px 16px;
      text-align: right;
      font-size: 0.7rem;
      color: var(--secondary-text-color);
      opacity: 0.4;
    }
  `;

  protected render() {
    if (!this._config || !this.hass) return html``;

    return html`
      <ha-card>
        <kodi-card-header 
          .title="${this._config.title || "Kodi Playlist"}" 
          .statusState="${this._sensorState}">
        </kodi-card-header>

        ${this._sensorState === "unavailable"
          ? html`<kodi-empty-state icon="mdi:cloud-off-outline" message="L'intégration Kodi est indisponible."></kodi-empty-state>`
          : this._items.length === 0
            ? html`<kodi-empty-state icon="mdi:playlist-remove" message="Aucun média dans la playlist active."></kodi-empty-state>`
            : html`
                <kodi-playlist-container
                  .items="${this._items}"
                  .currentIndex="${this._currentIndex}"
                  .config="${this._config}"
                  .thumbnailCache="${this._thumbnailCache}"
                  @play-item="${this._handlePlayItem}"
                  @remove-item="${this._handleRemoveItem}"
                  @reorder-item="${this._handleReorderItem}">
                </kodi-playlist-container>
              `}

        ${this._config.show_version 
          ? html`<div class="version-footer">v${CARD_VERSION}</div>` 
          : ""}
      </ha-card>
    `;
  }

  /**
   * Méthode requise par Lovelace pour estimer la hauteur de rendu de la carte dans l'UI Grid.
   */
  public getCardSize(): number {
    if (!this._config) return 1;
    return this._config.items_container_scrollable 
      ? 3 
      : Math.min(Number(this._config.visible_items_count || 5), 10);
  }
}