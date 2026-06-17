/**
 * KODI PLAYLIST CARD - Éditeur amélioré avec combobox pour entry_id
 * 
 * Cette version améliore le champ entry_id en proposant une liste déroulante
 * filtrée des intégrations kodi_media_sensors disponibles.
 */

import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { fireEvent } from "custom-card-helpers";
import { KodiPlaylistCardConfig, EDITOR_SCHEMA, DEFAULT_CONFIG } from "./types";
import { KodiPlaylistCardEditor } from "./editor";

interface ConfigEntry {
    entry_id: string;
    domain: string;
    title: string;
    state: "loaded" | "failed" | "not_loaded";
}

@customElement("kodi-playlist-card-editor")
export class KodiPlaylistCardEditorElement extends LitElement {
    @property({ attribute: false }) public hass?: any;
    @property({ attribute: false }) public lovelace?: any;

    @state() private _config?: KodiPlaylistCardConfig;
    @state() private _editor?: KodiPlaylistCardEditor;
    @state() private _errors: Record<string, string> = {};
    @state() private _kodiIntegrations: ConfigEntry[] = []; // 👈 NOUVEAU

    public setConfig(config: KodiPlaylistCardConfig): void {
        this._config = config;
        this._editor = new KodiPlaylistCardEditor(config);
        this._validateConfig();
        this._loadKodiIntegrations(); // 👈 NOUVEAU
    }


private async _fetchConfigEntries(): Promise<void> {
    // Si l'objet hass n'est pas prêt, on réessaye
    if (!this.hass) {
        setTimeout(() => this._fetchConfigEntries(), 500);
        return;
    }

    try {
        // La méthode officielle pour récupérer les entrées de configuration
        // via l'API interne du frontend Home Assistant
        const entries = await this.hass.callWS({ type: "config_entries/get" });
        
        this._kodiIntegrations = entries
            .filter((entry: any) => entry.domain === "kodi_media_sensors")
            .map((entry: any) => ({
                entry_id: entry.entry_id,
                domain: entry.domain,
                title: entry.title || entry.entry_id,
                state: entry.state
            }));
            
        this.requestUpdate();
    } catch (err) {
        console.error("Erreur lors de la récupération des config_entries :", err);
    }
}

connectedCallback(): void {
    super.connectedCallback();
    this._loadKodiIntegrations(); // Appel unique et propre
}

private async _loadKodiIntegrations(): Promise<void> {
    if (!this.hass) return;

    try {
        const entries = await this.hass.callWS({ type: "config_entries/get" });
        
        this._kodiIntegrations = entries
            .filter((entry: any) => entry.domain === "kodi_media_sensors")
            .map((entry: any) => ({
                // L'entry_id reste la valeur technique pure
                entry_id: entry.entry_id, 
                domain: entry.domain,
                // Le titre affiché combine le nom et l'ID
                title: `${entry.title || 'Kodi'} (ID: ${entry.entry_id})`,
                state: entry.state
            }));
            
        this.requestUpdate();
    } catch (err) {
        console.error("Erreur chargement intégrations Kodi:", err);
    }
}

    static get styles() {
        return css`
            :host {
                display: block;
            }

            .form-group {
                margin-bottom: 20px;
            }

            .form-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: var(--primary-text-color);
            }

            /* Styles pour le select/combobox */
            ha-select {
                width: 100%;
                --ha-select-minimum-line-height: 40px;
            }

            /* Fallback pour le champ texte */
            .input-fallback {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid var(--divider-color);
                border-radius: 4px;
                font-family: monospace;
                font-size: 14px;
                background: var(--input-background-color);
                color: var(--input-text-color);
                box-sizing: border-box;
            }

            .input-fallback:focus {
                border-color: var(--primary-color);
                outline: none;
            }

            .description {
                color: var(--secondary-text-color);
                font-size: 12px;
                margin-top: 4px;
                font-style: italic;
            }

            .error-message {
                color: var(--error-color);
                font-size: 12px;
                margin-top: 4px;
            }

            .info-message {
                color: var(--warning-color);
                font-size: 12px;
                margin-top: 4px;
                padding: 8px;
                background: rgba(255, 152, 0, 0.1);
                border-radius: 4px;
                border-left: 3px solid var(--warning-color);
                padding-left: 8px;
            }

            .section-title {
                font-size: 16px;
                font-weight: 600;
                color: var(--primary-text-color);
                margin-top: 24px;
                margin-bottom: 16px;
                border-bottom: 1px solid var(--divider-color);
                padding-bottom: 8px;
            }

            .form-group:first-child .section-title {
                margin-top: 0;
            }
        `;
    }

    protected render() {
        if (!this._config) {
            return html`<div>No config</div>`;
        }

        return html`
            <!-- Required Section -->

            <!-- Champ entry_id amélioré avec combobox -->
            ${this._renderEntryIdField()}

            <!-- Display Options -->
            <div class="section-title">Display Options</div>
            ${this._renderField("title")}
            ${this._renderField("show_version")}

            <!-- Thumbnail Section -->
            <div class="section-title">Thumbnail Options</div>
            ${this._renderField("show_thumbnail")}
            ${this._renderField("show_thumbnail_overlay")}
            ${this._renderField("show_thumbnail_border")}

            <!-- Separator Section -->
            <div class="section-title">Separator & Styling</div>
            ${this._renderField("show_line_separator")}
            ${this._renderField("hide_last_line_separator")}
            ${this._renderField("outline_color")}

            <!-- Container Section -->
            <div class="section-title">Playlist Container</div>
            ${this._renderField("items_container_scrollable")}
            ${this._renderField("items_container_height")}
        `;
    }

    /**
     * Rend le champ entry_id avec combobox ou fallback texte
     */
    private _renderEntryIdField() {
        const value = this._config?.entry_id || "";
        const error = this._errors["entry_id"];
        const hasIntegrations = this._kodiIntegrations.length > 0;

        if (hasIntegrations) {
            // Mode combobox : affiche la liste déroulante
            return html`
                <div class="form-group">
                    <label for="entry_id">Kodi Media Sensors Integration</label>
                    <ha-select
                        id="entry_id"
                        .value="${value}"
                        @change="${(e: Event) => this._updateConfig("entry_id", (e.target as any).value)}"
                        natural-menu-width>
                        <mwc-list-item value="">
                            -- Select an integration --
                        </mwc-list-item>
                        ${this._kodiIntegrations.map(
                            integration => html`
                                <mwc-list-item value="${integration.entry_id}">
                                    ${integration.title || integration.entry_id}
                                </mwc-list-item>
                            `
                        )}
                    </ha-select>
                    <div class="description">
                        Select the kodi media sensors integration to use
                    </div>
                    ${error ? html`<div class="error-message">${error}</div>` : ""}
                </div>
            `;
        } else {
            // Mode fallback : affiche un champ texte avec avertissement
            return html`
                <div class="form-group">
                    <label for="entry_id">Entity</label>
                    <input
                        type="text"
                        id="entry_id"
                        class="input-fallback"
                        .value="${value || ""}"
                        placeholder="sensor.kodi_media_sensor_playlist"
                        @input="${(e: Event) =>
                            this._updateConfig("entry_id", (e.target as HTMLInputElement).value)}" />
                    <div class="description">
                        Sensor entity that provides Kodi playlist data
                    </div>
                    ${this._kodiIntegrations.length === 0
                        ? html`
                              <div class="info-message">
                                  ℹ️ No kodi_media_sensors integration found. 
                                  Please install it first via HACS or manually.
                              </div>
                          `
                        : ""}
                    ${error ? html`<div class="error-message">${error}</div>` : ""}
                </div>
            `;
        }
    }

    /**
     * Render a single field based on its type
     */
    private _renderField(key: keyof KodiPlaylistCardConfig) {
        const field = EDITOR_SCHEMA.find(f => f.key === key);
        if (!field) return html``;

        const value = this._config![key];
        const error = this._errors[key];

        switch (field.type) {
            case "boolean":
                return this._renderBooleanField(field, value as boolean, key);
            case "text":
                return this._renderTextField(field, value as string, key);
            case "color":
                return this._renderColorField(field, value as string, key);
            case "number":
                return this._renderNumberField(field, value as number, key);
            default:
                return html``;
        }
    }

    /**
     * Render text input field
     */
    private _renderTextField(field: any, value: string, key: keyof KodiPlaylistCardConfig) {
        return html`
            <div class="form-group">
                <label for="${field.key}">${field.label}</label>
                <input
                    type="text"
                    id="${field.key}"
                    class="input-fallback"
                    .value="${value || ""}"
                    placeholder="${field.placeholder || ""}"
                    @input="${(e: Event) => this._updateConfig(key, (e.target as HTMLInputElement).value)}" />
                ${field.description ? html`<div class="description">${field.description}</div>` : ""}
                ${this._errors[key] ? html`<div class="error-message">${this._errors[key]}</div>` : ""}
            </div>
        `;
    }

    /**
     * Render boolean (checkbox) field
     */
    private _renderBooleanField(field: any, value: boolean, key: keyof KodiPlaylistCardConfig) {
        return html`
            <div class="form-group">
                <label>
                    <input
                        type="checkbox"
                        .checked="${value || false}"
                        @change="${(e: Event) => this._updateConfig(key, (e.target as HTMLInputElement).checked)}" />
                    <span>${field.label}</span>
                </label>
                ${field.description ? html`<div class="description">${field.description}</div>` : ""}
                ${this._errors[key] ? html`<div class="error-message">${this._errors[key]}</div>` : ""}
            </div>
        `;
    }

    /**
     * Render color picker field
     */
    private _renderColorField(field: any, value: string, key: keyof KodiPlaylistCardConfig) {
        return html`
            <div class="form-group">
                <label for="${field.key}">${field.label}</label>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <input
                        type="color"
                        id="${field.key}"
                        .value="${this._hexToColor(value) || "#ffffff"}"
                        @input="${(e: Event) => this._updateConfig(key, (e.target as HTMLInputElement).value)}"
                        style="width: 60px; height: 40px; padding: 4px;" />
                    <input
                        type="text"
                        class="input-fallback"
                        .value="${value || ""}"
                        placeholder="white, #fff, rgb(255,255,255)"
                        style="flex: 1;"
                        @input="${(e: Event) => this._updateConfig(key, (e.target as HTMLInputElement).value)}" />
                </div>
                ${field.description ? html`<div class="description">${field.description}</div>` : ""}
                ${this._errors[key] ? html`<div class="error-message">${this._errors[key]}</div>` : ""}
            </div>
        `;
    }

    /**
     * Render number input field
     */
    private _renderNumberField(field: any, value: number, key: keyof KodiPlaylistCardConfig) {
        return html`
            <div class="form-group">
                <label for="${field.key}">${field.label}</label>
                <input
                    type="number"
                    id="${field.key}"
                    class="input-fallback"
                    .value="${value || 0}"
                    min="${field.min || 0}"
                    max="${field.max || 999}"
                    @input="${(e: Event) => this._updateConfig(key, Number((e.target as HTMLInputElement).value))}" />
                ${field.description ? html`<div class="description">${field.description}</div>` : ""}
                ${this._errors[key] ? html`<div class="error-message">${this._errors[key]}</div>` : ""}
            </div>
        `;
    }

    /**
     * Update configuration and emit change event
     */
    private _updateConfig(key: keyof KodiPlaylistCardConfig | string, value: any): void {
        if (!this._config) return;

        const newConfig = { ...this._config, [key]: value };
        this._config = newConfig;
        if (this._editor) {
            this._editor.setConfigValue(key as keyof KodiPlaylistCardConfig, value);
        }

        // Validate and update errors
        this._validateConfig();

        // Emit the config-changed event that Home Assistant expects
        fireEvent(this, "config-changed", { config: newConfig });
    }

    /**
     * Validate the current configuration
     */
    private _validateConfig(): void {
        if (!this._editor) return;
        this._errors = this._editor.validate();
    }

    /**
     * Convert hex color to CSS color format
     */
    private _hexToColor(value: string): string {
        if (!value) return "#ffffff";
        if (value.startsWith("#")) {
            return value;
        }
        return "#ffffff";
    }
}