import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { fireEvent } from "custom-card-helpers";
import { KodiPlaylistCardConfig, EDITOR_SCHEMA, DEFAULT_CONFIG } from "./types";
import { KodiPlaylistCardEditor } from "./editor";

@customElement("kodi-playlist-card-editor")
export class KodiPlaylistCardEditorElement extends LitElement {
    @property({ attribute: false }) public hass?: any;
    @property({ attribute: false }) public lovelace?: any;

    @state() private _config?: KodiPlaylistCardConfig;
    @state() private _editor?: KodiPlaylistCardEditor;
    @state() private _errors: Record<string, string> = {};

    public setConfig(config: KodiPlaylistCardConfig): void {
        this._config = config;
        this._editor = new KodiPlaylistCardEditor(config);
        this._validateConfig();
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

            .form-group input[type="text"],
            .form-group input[type="color"] {
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

            .form-group input[type="text"]:focus,
            .form-group input[type="color"]:focus {
                border-color: var(--primary-color);
                outline: none;
            }

            .form-group input[type="checkbox"] {
                width: 20px;
                height: 20px;
                cursor: pointer;
                margin-right: 8px;
            }

            .checkbox-label {
                display: flex;
                align-items: center;
                cursor: pointer;
            }

            .checkbox-label input[type="checkbox"] {
                margin: 0 8px 0 0;
            }

            .error-message {
                color: var(--error-color);
                font-size: 12px;
                margin-top: 4px;
            }

            .description {
                color: var(--secondary-text-color);
                font-size: 12px;
                margin-top: 4px;
                font-style: italic;
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

            ha-select {
                width: 100%;
            }
        `;
    }

    protected render() {
        if (!this._config) {
            return html`<div>No config</div>`;
        }

        return html`
            <!-- Required Section -->
            <div class="section-title">Entity Configuration</div>

            ${this._renderField("entry_id")}

            <!-- Display Section -->
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
                <label class="checkbox-label">
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
                        .value="${value || ""}"
                        placeholder="white, #fff, rgb(255,255,255)"
                        @input="${(e: Event) => this._updateConfig(key, (e.target as HTMLInputElement).value)}"
                        style="flex: 1;" />
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
    private _updateConfig(key: keyof KodiPlaylistCardConfig, value: any): void {
        if (!this._config) return;

        const newConfig = { ...this._config, [key]: value };
        this._config = newConfig;
        this._editor?.setConfigValue(key, value);

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
     * Convert hex color to CSS color format (or return as-is if already a color name)
     */
    private _hexToColor(value: string): string {
        if (!value) return "#ffffff";
        
        // If it's already a hex color, return it
        if (value.startsWith("#")) {
            return value;
        }
        
        // For color names and rgb values, try to return white as default
        return "#ffffff";
    }
}