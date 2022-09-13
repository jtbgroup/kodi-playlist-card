/* eslint-disable @typescript-eslint/no-explicit-any */
import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { HomeAssistant, LovelaceCardEditor, getLovelace, hasConfigOrEntityChanged } from "custom-card-helpers";
import { localize } from "./localize/localize";

import "./editor";
import type { KodiPlaylistCardConfig } from "./types";
import {
    CARD_VERSION,
    MEDIA_TYPE_PARAMS,
    DEFAULT_SHOW_THUMBNAIL,
    DEFAULT_SHOW_THUMBNAIL_OVERLAY,
    DEFAULT_SHOW_THUMBNAIL_BORDER,
    DEFAULT_SHOW_LINE_SEPARATOR,
    DEFAULT_HIDE_LAST_LINE_SEPARATOR,
    DEFAULT_OUTLINE_COLOR,
    DEFAULT_ENTITY_NAME,
    PLAYER_TYPE,
    DEFAULT_ITEMS_CONTAINER_SCROLLABLE,
    DEFAULT_ITEMS_CONTAINER_HEIGHT,
} from "./const";

/* eslint no-console: 0 */
console.info(
    `%c  KODI-PLAYLIST-CARD\n%c  ${localize("common.version")} ${CARD_VERSION}    `,
    "color: orange; font-weight: bold; background: black",
    "color: white; font-weight: bold; background: dimgray",
);

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
    type: "kodi-playlist-card",
    name: "Kodi Playlist Card",
    description: "This custom card allows you interact with the playlist of your kodi instance",
});

@customElement("kodi-playlist-card")
export class KodiPlaylistCard extends LitElement {
    public static async getConfigElement(): Promise<LovelaceCardEditor> {
        return document.createElement("kodi-playlist-card-editor");
    }

    public static getStubConfig(): Record<string, unknown> {
        return {
            entity: DEFAULT_ENTITY_NAME,
            show_thumbnail: DEFAULT_SHOW_THUMBNAIL,
            show_thumbnail_border: DEFAULT_SHOW_THUMBNAIL_BORDER,
            show_thumbnail_overlay: DEFAULT_SHOW_THUMBNAIL_OVERLAY,
            show_line_separator: DEFAULT_SHOW_LINE_SEPARATOR,
            hide_last_line_separator: DEFAULT_HIDE_LAST_LINE_SEPARATOR,
            outline_color: DEFAULT_OUTLINE_COLOR,
            items_container_scrollable: DEFAULT_ITEMS_CONTAINER_SCROLLABLE,
            items_container_height: DEFAULT_ITEMS_CONTAINER_HEIGHT,
        };
    }

    private ICON_CURRENT_PLAYING = "mdi:arrow-left-bold";
    private _entityState;
    private _json_meta;
    private _json_data;
    private _service_domain;
    private _currently_playing;
    private _currently_playing_file;

    // TODO Add any properities that should cause your element to re-render here
    // https://lit.dev/docs/components/properties/
    @property({ attribute: false }) public hass!: HomeAssistant;

    @state() private config!: KodiPlaylistCardConfig;

    public setConfig(config: KodiPlaylistCardConfig): void {
        // TODO Check for required fields and that they are of the proper format
        if (!config) {
            throw new Error(localize("common.invalid_configuration"));
        }

        if (config.test_gui) {
            getLovelace().setEditMode(true);
        }

        this.config = config;

        document.documentElement.style.setProperty(
            `--outline-color`,
            this.config.outline_color ? this.config.outline_color : DEFAULT_OUTLINE_COLOR,
        );
        document.documentElement.style.setProperty(
            `--items-container-height`,
            this.config.items_container_height ? this.config.items_container_height : DEFAULT_ITEMS_CONTAINER_HEIGHT,
        );
    }

    public getCardSize(): number {
        return 1;
    }

    // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
    protected shouldUpdate(changedProps: PropertyValues): boolean {
        if (!this.config) {
            return false;
        }

        return hasConfigOrEntityChanged(this, changedProps, false);
    }

    // https://lit.dev/docs/components/rendering/
    protected render(): TemplateResult | void {
        let errorMessage;
        const entity = this.config.entity;
        if (!entity) {
            errorMessage = "No Entity defined";
            console.error(errorMessage);
        } else {
            this._entityState = this.hass.states[entity];
            if (!this._entityState) {
                errorMessage = "No State for the sensor";
                console.error(errorMessage);
            } else {
                if (this._entityState.state == "off") {
                    errorMessage = "Kodi is off";
                    console.error(errorMessage);
                } else {
                    const meta = this._entityState.attributes.meta;
                    if (!meta) {
                        console.error("no metadata for the sensor");
                        return;
                    }
                    this._json_meta = typeof meta == "object" ? meta : JSON.parse(meta);
                    if (this._json_meta.length == 0) {
                        console.error("empty metadata attribute");
                        return;
                    }
                    this._service_domain = this._json_meta[0]["service_domain"];
                    this._currently_playing = this._json_meta[0]["currently_playing"];
                    this._currently_playing_file = this._json_meta[0]["currently_playing_file"];
                    const data = this._entityState.attributes.data;
                    this._json_data = typeof data == "object" ? data : JSON.parse(data);
                }
            }
        }

        const card = html`
            <ha-card
                .header=${this.config.title ? this.config.title : ""}
                tabindex="0"
                .label=${`Kodi Playlist ${this.config.entity || "No Entity Defined"}`}>
                <div class="card-container">${errorMessage ? errorMessage : this._buildCardContainer()}</div>
            </ha-card>
        `;
        return card;
    }

    private _buildCardContainer() {
        const playlistType = this._json_meta[0].playlist_type;
        if (!playlistType) {
            return html`<div>No Playlist found</div>`;
        } else {
            return html`
                <div>${this._buildPlaylistType(playlistType)}</div>
                <div>${this._buildResultContainer()}</div>
            `;
        }
    }

    private _buildPlaylistType(playlistType) {
        return html`<div class="playlist-playlisttype-title">
            Playlist ${PLAYER_TYPE[playlistType].label} <ha-icon icon=${PLAYER_TYPE[playlistType].icon}></ha-icon>
        </div>`;
    }

    private _buildResultContainer() {
        let position = 0;
        const resultCount = this._json_data.length;

        let css = "playlist-items-container";
        if (this.config.items_container_scrollable) {
            css += " playlist-items-container-scrollable";
        }

        return html`
            <div class=${css}>
                ${this._json_data.map(item => this._formatItem(item, position++, resultCount - position == 0))}
            </div>
        `;
    }

    private _formatItem(item, position, isLast) {
        switch (item.type) {
            case MEDIA_TYPE_PARAMS.song.id:
                return this._formatSong(item, position, isLast);
            case MEDIA_TYPE_PARAMS.movie.id:
                return this._formatMovie(item, position, isLast);
            case MEDIA_TYPE_PARAMS.musicvideo.id:
                return this._formatMusicVideo(item, position, isLast);
            case MEDIA_TYPE_PARAMS.episode.id:
                return this._formatEpisode(item, position, isLast);
            default:
                return this._formatUnknown(item, position, isLast);
        }
        return html``;
    }

    private getItemCss(itemClass, isLast) {
        return (
            itemClass +
            (this.config.show_line_separator && (!isLast || (isLast && !this.config.hide_last_line_separator))
                ? " playlist-line-separator"
                : "")
        );
    }

    private checkIsPlaying(item) {
        if (this._currently_playing) {
            return item.id == this._currently_playing;
        } else {
            return item.file == this._currently_playing_file;
        }
    }

    private _formatUnknown(item, position, isLast) {
        const isPlaying = this.checkIsPlaying(item);

        const classCss = this.getItemCss("playlist-unknown-grid playlist-grid", isLast);

        return html`<div class=${classCss}>
            ${this._prepareCover(
                item["thumbnail"],
                "playlist-unknown-cover",
                "playlist-unknown-cover-image",
                "playlist-unknown-cover-image-default",
                "mdi:play",
                "mdi:sparkles",
                isPlaying,
                () => this._goTo(position, PLAYER_TYPE.audio.kodi_player_id),
            )}
            <div class="playlist-unknown-message">type of media is... : ${item["type"]}</div>
            <div class="playlist-unknown-title playlist-title">${item["title"]}</div>
            ${this._createControl(
                isPlaying,
                position,
                PLAYER_TYPE.audio,
                "playlist-unknown-playing",
                "playlist-unknown-remove",
            )}
        </div>`;
    }

    private _formatSong(song, position, isLast) {
        const isPlaying = this.checkIsPlaying(song);

        const classCss = this.getItemCss("playlist-song-grid playlist-grid", isLast);
        return html`<div class=${classCss}>
            ${this._prepareCover(
                song["thumbnail"],
                "playlist-song-cover",
                "playlist-song-cover-image",
                "playlist-song-cover-image-default",
                "mdi:play",
                "mdi:music",
                isPlaying,
                () => this._goTo(position, PLAYER_TYPE.audio.kodi_player_id),
            )}
            <div class="playlist-song-title playlist-title">${song["artist"]} - ${song["title"]}</div>
            <div class="playlist-song-genre playlist-genre">${song["genre"] ? song["genre"] : "undefined"}</div>
            <div class="playlist-song-album playlist-album">${song["album"]} ${song["year"] ? song["year"] : ""}</div>
            <div class="playlist-song-duration playlist-duration">${this._formatDuration(song["duration"])}</div>
            ${this._createControl(
                isPlaying,
                position,
                PLAYER_TYPE.audio,
                "playlist-song-playing",
                "playlist-song-remove",
            )}
        </div>`;
    }

    private _formatMovie(item, position, isLast) {
        const isPlaying = this.checkIsPlaying(item);
        const classCss = this.getItemCss("playlist-movie-grid playlist-grid", isLast);

        const cover = item["poster"] && item["poster"] != "" ? item["poster"] : item["thumbnail"];

        return html`<div class=${classCss}>
            ${this._prepareCover(
                cover,
                "playlist-movie-cover",
                "playlist-movie-cover-image",
                "playlist-movie-cover-image-default",
                "mdi:play",
                "mdi:movie",
                isPlaying,
                () => this._goTo(position, PLAYER_TYPE.video.kodi_player_id),
            )}
            <div class="playlist-movie-title playlist-title">${item["title"]}</div>
            <div class="playlist-movie-genre playlist-genre">${item["genre"] ? item["genre"] : "undefined"}</div>
            <div class="playlist-movie-year playlist-year">${item["year"]}</div>
            ${this._createControl(
                isPlaying,
                position,
                PLAYER_TYPE.video,
                "playlist-song-playing",
                "playlist-song-remove",
            )}
        </div>`;
    }

    private _formatMusicVideo(item, position, isLast) {
        const isPlaying = this.checkIsPlaying(item);
        const classCss = this.getItemCss("playlist-movie-grid playlist-grid", isLast);

        const cover = item["poster"] && item["poster"] != "" ? item["poster"] : item["thumbnail"];

        return html`<div class=${classCss}>
            ${this._prepareCover(
                cover,
                "playlist-movie-cover",
                "playlist-movie-cover-image",
                "playlist-movie-cover-image-default",
                "mdi:play",
                "mdi:movie",
                isPlaying,
                () => this._goTo(position, PLAYER_TYPE.video.kodi_player_id),
            )}
            <div class="playlist-movie-title playlist-title">${item["artist"]}: ${item["title"]}</div>
            <div class="playlist-movie-genre playlist-genre">${item["genre"] ? item["genre"] : "undefined"}</div>
            <div class="playlist-movie-year playlist-year">${item["year"]}</div>
            ${this._createControl(
                isPlaying,
                position,
                PLAYER_TYPE.video,
                "playlist-song-playing",
                "playlist-song-remove",
            )}
        </div>`;
    }

    private _formatEpisode(item, position, isLast) {
        const isPlaying = this.checkIsPlaying(item);
        const classCss = this.getItemCss("playlist-episode-grid playlist-grid", isLast);

        const cover = item["poster"] && item["poster"] != "" ? item["poster"] : item["thumbnail"];

        return html`<div class=${classCss}>
            ${this._prepareCover(
                cover,
                "playlist-episode-cover",
                "playlist-episode-cover-image",
                "playlist-episode-cover-image-default",
                "mdi:play",
                "mdi:movie",
                isPlaying,
                () => this._goTo(position, PLAYER_TYPE.video.kodi_player_id),
            )}
            <div class="playlist-episode-title playlist-title">${item["title"]}</div>
            <div class="playlist-episode-genre playlist-genre">${item["genre"] ? item["genre"] : "undefined"}</div>
            <div class="playlist-episode-season">
                Season ${item["season"] ? item["season"] : "undefined"} - Episode
                ${item["episode"] ? item["episode"] : "undefined"}
            </div>
            ${this._createControl(
                isPlaying,
                position,
                PLAYER_TYPE.video,
                "playlist-episode-playing",
                "playlist-episode-remove",
            )}
        </div>`;
    }

    private _createControl(isPlaying, position, playerType, classPlaying, class_remove) {
        const controlIcon = document.createElement("ha-icon");
        if (isPlaying) {
            controlIcon.setAttribute("class", classPlaying + " playlist-control playlist-playing");
            controlIcon.setAttribute("icon", this.ICON_CURRENT_PLAYING);
        } else {
            controlIcon.setAttribute("class", class_remove + " playlist-control");
            controlIcon.setAttribute("icon", "mdi:delete");
            controlIcon.addEventListener("click", () => this._remove(position, playerType.kodi_player_id));
        }
        return html`${controlIcon}`;
    }

    private _formatDuration(duration) {
        return new Date(duration * 1000).toISOString().substring(11, 19);
    }

    private _prepareCover(
        cover,
        class_cover,
        class_cover_image,
        class_cover_image_default,
        icon_overlay,
        icon_default,
        isPlaying,
        action_click,
    ) {
        const cssClass =
            "playlist-cover-container" + (this.config.show_thumbnail_border ? " playlist-thumbnail-border" : "");

        const coverDiv = document.createElement("div");
        coverDiv.setAttribute("class", class_cover);

        const coverContainer = document.createElement("div");
        coverContainer.setAttribute("class", cssClass);
        coverDiv.appendChild(coverContainer);
        if (this.config.show_thumbnail && cover && cover != "") {
            const coverImg = document.createElement("img");
            coverImg.setAttribute("src", cover);
            coverImg.onerror = function () {
                coverImg.remove();

                const coverImgDefault = document.createElement("ha-icon");
                coverImgDefault.setAttribute("class", "playlist-cover-image-default " + class_cover_image_default);
                coverImgDefault.setAttribute("icon", icon_default);
                coverContainer.appendChild(coverImgDefault);
            };
            coverImg.setAttribute("class", class_cover_image + " playlist-cover-image");
            coverContainer.appendChild(coverImg);
        } else {
            const coverImgDefault = document.createElement("ha-icon");
            coverImgDefault.setAttribute("class", "playlist-cover-image-default " + class_cover_image_default);
            coverImgDefault.setAttribute("icon", icon_default);
            coverContainer.appendChild(coverImgDefault);
        }

        if (!this.config.show_thumbnail_overlay) {
            coverContainer.addEventListener("click", action_click);
        } else if (this.config.show_thumbnail_overlay && !isPlaying) {
            const overlayImg = document.createElement("ha-icon");
            overlayImg.setAttribute("class", "overlay-play");
            overlayImg.setAttribute("icon", icon_overlay);
            overlayImg.addEventListener("click", action_click);
            coverContainer.appendChild(overlayImg);
        }

        return html`${coverDiv}`;
    }

    static get styles(): CSSResultGroup {
        return css`
            :root {
                --outline-color: "-----";
                --items-container-height: 300px;
            }

            :host {
                --album-thumbnail-width: 130px;
                --song-thumbnail-width: 65px;
                --movie-thumbnail-width: 100px;
                --movie-thumbnail-ratio: 0.8;
                --channel-thumbnail-width: 180px;
                --channel-thumbnail-ratio: 1.5;
                --artist-thumbnail-width: 130px;
                --episode-thumbnail-width: 180px;
                --episode-thumbnail-ratio: 1.5;
                --background-basic-color: #9b9595;
                --container-rows-gap: 10px;
                --mdc-select-fill-color: rgba(0, 0, 0, 0);
            }

            .playlist-line-separator {
                border-bottom: 1px solid var(--outline-color);
            }

            .playlist-thumbnail-border {
                border: 1px solid var(--outline-color);
            }

            .playlist-playlisttype-title {
                text-align: right;
                font-weight: bold;
                font-size: 18px;
                margin-top: 20px;
                margin-bottom: 20px;
                margin-left: 10px;
                margin-right: 10px;
                border-bottom: solid;
            }

            .playlist-items-container {
                margin-top: 20px;
                margin-bottom: 20px;
                margin-left: 10px;
                margin-right: 10px;
                display: grid;
                grid-template-columns: 1fr;
                grid-auto-rows: auto;
                grid-gap: 15px;
            }

            .playlist-items-container-scrollable {
                overflow-y: scroll;
                height: var(--items-container-height);
            }

            .overlay-play {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                opacity: 0;
                color: white;
                transition: 0.5s ease;
                text-align: center;
                --mdc-icon-size: 50px;
            }

            .playlist-cover-image-default {
                display: flex;
                justify-content: flex-end;
                align-items: flex-end;
                color: white;
                background-color: var(--background-basic-color);
            }

            .playlist-cover-image {
                height: auto !important;
                display: block;
                justify-content: center;
            }

            .playlist-cover-container {
                position: relative;
            }

            .playlist-cover-container:hover .overlay-play {
                opacity: 1;
            }

            .playlist-grid {
                display: grid;
                column-gap: 10px;
                padding-bottom: 5px;
            }

            .playlist-title {
                font-weight: bold;
                font-size: 14px;
            }

            .playlist-genre,
            .playlist-year {
                font-style: italic;
            }

            .playlist-control {
                text-align: right;
                width: 30px;
            }

            /* .playlist-control:hover {
            color: red;
          } */

            .playlist-playing {
                color: var(--primary-color, #03a9f4);
            }

            /*
          //// SONGS
          */

            .playlist-song-grid {
                grid-template-columns: auto 1fr auto auto;
                grid-auto-rows: auto;
            }

            .playlist-song-title {
                grid-column: 2 / 4;
                grid-row: 1;
            }

            .playlist-song-genre {
                grid-column: 2 / 4;
                grid-row: 2;
            }

            .playlist-song-album {
                grid-column: 2 / 3;
                grid-row: 3;
            }
            .playlist-song-duration {
                grid-column: 3 / 5;
                grid-row: 3;
                text-align: right;
            }

            .playlist-song-remove,
            .playlist-song-playing {
                grid-column: 4;
                grid-row: 1 / 3;
            }

            .playlist-song-cover {
                grid-column: 1;
                grid-row: 1 / 5;
            }

            .playlist-song-cover-image {
                width: var(--song-thumbnail-width);
            }

            .playlist-song-cover-image-default {
                width: var(--song-thumbnail-width);
                height: var(--song-thumbnail-width);
                --mdc-icon-size: calc(var(--song-thumbnail-width) - 30px);
            }

            /*
                    //// MOVIES
                   */

            .playlist-movie-grid {
                grid-template-columns: auto 1fr auto;
                grid-auto-rows: auto;
            }

            .playlist-movie-title {
                grid-column: 2;
                grid-row: 1;
            }

            .playlist-movie-genre {
                grid-column: 2;
                grid-row: 2;
            }

            .playlist-movie-year {
                grid-column: 2;
                grid-row: 3;
            }

            .playlist-movie-remove,
            .playlist-movie-playing {
                grid-column: 3;
                grid-row: 1 / 3;
            }

            .playlist-movie-cover {
                grid-column: 1;
                grid-row: 1 / 5;
            }

            .playlist-movie-cover-image {
                width: var(--movie-thumbnail-width);
            }

            .playlist-movie-cover-image-default {
                width: var(--movie-thumbnail-width);
                height: calc(var(--movie-thumbnail-width) / var(--movie-thumbnail-ratio));
                --mdc-icon-size: calc(var(--movie-thumbnail-width) - 30px);
            }

            /*
                    //// EPISODE
                   */
            .playlist-episode-grid {
                grid-template-columns: auto 1fr auto;
                grid-auto-rows: auto;
            }

            .playlist-episode-title {
                grid-column: 2;
                grid-row: 1;
            }

            .playlist-episode-genre {
                grid-column: 2;
                grid-row: 2;
            }

            .playlist-episode-season {
                grid-column: 2;
                grid-row: 3;
            }

            .playlist-episode-remove,
            .playlist-episode-playing {
                grid-column: 3;
                grid-row: 1 / 3;
            }

            .playlist-episode-cover {
                grid-column: 1;
                grid-row: 1 / 5;
            }

            .playlist-episode-cover-image {
                width: var(--episode-thumbnail-width);
            }

            .playlist-episode-cover-image-default {
                width: var(--episode-thumbnail-width);
                height: calc(var(--episode-thumbnail-width) / var(--episode-thumbnail-ratio));
                --mdc-icon-size: calc((var(--episode-thumbnail-width) / var(--episode-thumbnail-ratio)) - 30px);
            }

            /*
                    //// UNKNOWN
                   */
            .playlist-unknown-grid {
                grid-template-columns: auto 1fr auto;
                grid-auto-rows: auto;
            }

            .playlist-unknown-message {
                grid-column: 2;
                grid-row: 1;
            }

            .playlist-unknown-title {
                grid-column: 2;
                grid-row: 2;
            }

            .playlist-unknown-remove,
            .playlist-unknown-playing {
                grid-column: 3;
                grid-row: 1;
            }

            .playlist-unknown-cover {
                grid-column: 1;
                grid-row: 1 / 3;
            }

            .playlist-unknown-cover-image {
                width: var(--song-thumbnail-width);
            }

            .playlist-unknown-cover-image-default {
                width: var(--song-thumbnail-width);
                height: var(--song-thumbnail-width);
                --mdc-icon-size: calc(var(--song-thumbnail-width) - 30px);
            }
        `;
    }

    // TODO : remove the parameter 'to' once the sensor is updated
    private _goTo(posn, player) {
        console.info(posn + " " + player + " / " + this._service_domain + " * " + this.config.entity);
        this.hass.callService(this._service_domain, "call_method", {
            entity_id: this.config.entity,
            method: "goto",
            item: {
                playerid: player,
                position: posn,
                to: posn,
            },
        });
    }

    private _remove(posn, player) {
        this.hass.callService(this._service_domain, "call_method", {
            entity_id: this.config.entity,
            method: "remove",
            item: {
                playlistid: player,
                position: posn,
            },
        });
    }
}

