/* eslint-disable @typescript-eslint/no-explicit-any */
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { fireEvent, HomeAssistant, LovelaceCardEditor } from "custom-card-helpers";

import { KodiPlaylistCardConfig } from "./types";

@customElement("kodi-playlist-card-editor")
export class KodiPlaylistCardEditor extends LitElement implements LovelaceCardEditor {
    @property({ attribute: false }) public hass?: HomeAssistant;
    @state() private _config?: KodiPlaylistCardConfig;

    public setConfig(config: KodiPlaylistCardConfig): void {
        this._config = config;
    }

    private _schema = [
        {
            name: "entity",
            selector: { entity: { domain: "sensor" } },
        },
        {
            name: "title",
            selector: { text: {} },
        },
        { name: "show_version", selector: { boolean: {} } },
        {
            type: "grid",
            name: "",
            schema: [
                { name: "show_thumbnail", selector: { boolean: {} } },
                { name: "show_thumbnail_overlay", selector: { boolean: {} } },
                { name: "show_thumbnail_border", selector: { boolean: {} } },

                { name: "show_line_separator", selector: { boolean: {} } },
                { name: "hide_last_line_separator", selector: { boolean: {} } },
               
               { name: "items_container_scrollable", selector: { boolean: {} } },
            ],
        },
        {
            name: "outline_color",
            selector: { color_rgb: {} },
        },
 
        {
            name: "visible_items_count",
            selector: { number: { min: 0, mode: "box" } },
        },
    ];

    private _computeLabel = (schema: { name: string }): string => {
        const labels: Record<string, string> = {
            entity: "Entity",
            title: "Title",
            show_thumbnail: "Show Thumbnail",
            show_thumbnail_overlay: "Show Thumbnail Overlay",
            show_thumbnail_border: "Show Thumbnail Border",
            show_line_separator: "Show line separator",
            hide_last_line_separator: "Hide last line separator",
            items_container_scrollable: "Make container scrollable",
            visible_items_count: "Number of visible items",
            outline_color: "Outline Color (optional)",
            show_version: "Show card version"
        };
        return labels[schema.name] ?? schema.name;
    };

    protected render(): TemplateResult | void {
        if (!this.hass || !this._config) return html``;

        return html`
            <ha-form
                .hass=${this.hass}
                .data=${this._config}
                .schema=${this._schema}
                .computeLabel=${this._computeLabel}
                @value-changed=${this._valueChanged}>
            </ha-form>
        `;
    }

    private _valueChanged(ev: CustomEvent): void {
        if (!this._config || !this.hass) return;
        this._config = ev.detail.value;
        fireEvent(this, "config-changed", { config: this._config });
    }
}

