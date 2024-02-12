import { css, CSSResultGroup, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { HomeAssistant, LovelaceCardEditor, getLovelace, hasConfigOrEntityChanged } from "custom-card-helpers";
import { localize } from "./localize/localize";
import Sortable from "sortablejs";
import type { SortableEvent } from "sortablejs";
import { until } from "lit/directives/until";

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
    DEFAULT_SHOW_VERSION,
} from "./const";

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
            show_version: DEFAULT_SHOW_VERSION,
        };
    }

    private ICON_CURRENT_PLAYING = "mdi:arrow-left-bold";
    private _entityState;
    private _json_meta;
    private _json_data;
    private _kodi_entity_id;
    private _service_domain;
    private _currently_playing;
    private _currently_playing_file;
    private sortable;

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
                    this._kodi_entity_id = this._json_meta[0]["kodi_entity_id"];
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
                ${this.config.show_version ? html`<div>${CARD_VERSION}</div>` : ""}
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
            <div class=${css} id="playlist">
                ${this._json_data.map(item => this._formatItem(item, position++, resultCount - position == 0))}
            </div>
        `;
    }

    private _destroySortable() {
        this.sortable?.destroy();
        this.sortable = undefined;
    }

    protected updated(): void {
        this._destroySortable();
        this._createSortable();
        if (this.sortable) {
            const order = this.sortable.toArray();
            this.sortable.sort(
                order.sort(function (a, b) {
                    return parseInt(a) - parseInt(b);
                }),
                false,
            );
        }


        // This part of the update is necessary to tackle the remove method. For some reason, the refresh is not done well and we need to manually remove it.
        const playlist = this.shadowRoot?.querySelector("#playlist") as HTMLElement;
        let idx = 0;
        if (playlist != null) {
            for (const child of playlist.children) {
                const dataEntry = this._json_data[idx];
                const childrenKodiId = child.getAttribute("kodi-id");
                if (dataEntry) {
                    if (dataEntry.id != childrenKodiId) {
                        window.location.reload();
                        break;
                    }
                    idx++;
                } else {
                    playlist.removeChild(child);
                }
            }
        }
    }

    private async _createSortable() {
        const playlist = this.shadowRoot?.querySelector("#playlist") as HTMLElement;
        if (!playlist) return;

        this.sortable = new Sortable(this.shadowRoot!.querySelector("#playlist")!, {
            filter: ".playing",
            animation: 150,
            dataIdAttr: "data-id",
            delayOnTouchOnly: true,
            delay: 300,
            forceFallback: false,
            fallbackClass: "sortable-fallback",
            ghostClass: "sortable-ghost",
            onEnd: (evt: SortableEvent) => this.onDragEnd(evt),
        });
    }

    private onDragEnd(event) {
        const playlistType = this._json_meta[0].playlist_type;
        this._moveTo(event.oldIndex, event.newIndex, PLAYER_TYPE[playlistType].kodi_player_id);
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
        let classCss = this.getItemCss("playlist-unknown-grid playlist-grid", isLast);
        if (isPlaying) {
            classCss += " playing";
        }

        return html`<div class=${classCss} data-id=${position}>
             ${this._createAlbumCover(item,position)}
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

    // For more example on implementation, see https://github.com/home-assistant/frontend/blob/dev/src/components/media-player/ha-media-player-browse.ts#L675
    private _getThumbnailURLorBase64(thumbnailUrl){
        if (thumbnailUrl.startsWith("/")) {
            // Thumbnails served by local API require authentication
            return new Promise((resolve, reject) => {
              this.hass
                .fetchWithAuth(thumbnailUrl!)
                // Since we are fetching with an authorization header, we cannot just put the
                // URL directly into the document; we need to embed the image. We could do this
                // using blob URLs, but then we would need to keep track of them in order to
                // release them properly. Instead, we embed the thumbnail using base64.
                .then((response) => response.blob())
                .then((blob) => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result;
                    resolve(typeof result === "string" ? result : "");
                  };
                  reader.onerror = (e) => reject(e);
                  reader.readAsDataURL(blob);
                });
            });
          }

        return thumbnailUrl;
    }

    private _formatSong(item, position, isLast) {
        const isPlaying = this.checkIsPlaying(item);
        const classCss = this._getItemClass(isPlaying, isLast, "playlist-song-grid");

        return html`<div class=${classCss} data-id=${position} kodi-id=${item["id"]}>
            ${this._createAlbumCover(item,position)}
            <div class="playlist-song-title playlist-title">${item["artist"]} - ${item["title"]}</div>
            <div class="playlist-song-genre playlist-genre">${item["genre"] ? item["genre"] : "undefined"}</div>
            <div class="playlist-song-album playlist-album">
                ${item["album"]} ${item["year"] ? "(" + item["year"] + ")" : ""}
            </div>
            <div class="playlist-song-duration playlist-duration">${this._formatDuration(item["duration"])}</div>
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
        const classCss = this._getItemClass(isPlaying, isLast, "playlist-movie-grid");

        return html`<div class=${classCss} data-id=${position} kodi-id=${item["id"]}>
            ${this._createMovieCover(item,position)}
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
        const classCss = this._getItemClass(isPlaying, isLast, "playlist-movie-grid");

        return html`<div class=${classCss} data-id=${position} kodi-id=${item["id"]}>
            ${this._createMovieCover(item,position)}
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
        const classCss = this._getItemClass(isPlaying, isLast, "playlist-episode-grid");

        return html`<div class=${classCss} data-id=${position} kodi-id=${item["id"]}>
            ${this._createEpisodeCover(item,position)}
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

    private _getItemClass(isPlaying, isLast, item_class_grid){
        let classCss = this.getItemCss(item_class_grid + " playlist-grid", isLast);
        if (isPlaying) {
            classCss += " playing";
        }
        return classCss;
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

    private _createAlbumCover(item,position) {
        const image_url = "/api/media_player_proxy/"+this._kodi_entity_id+"/browse_media/album/"+item["albumid"]
        const class_cover = "playlist-song-cover"
        const class_cover_image_default =  "playlist-song-cover-image-default";
        const icon_default = "mdi:music";
        const icon_overlay ="mdi:play";
        const isPlaying = this.checkIsPlaying(item);
        return this._createCoverElement (image_url, class_cover,class_cover_image_default, icon_overlay, icon_default,isPlaying, () => this._goTo(position, PLAYER_TYPE.audio.kodi_player_id))
    }

    private _createMovieCover(item,position) {
        const image_url = item["poster"] && item["poster"] != "" ? item["poster"] : item["thumbnail"];
        const class_cover = "playlist-movie-cover"
        const class_cover_image_default =  "playlist-movie-cover-image-default";
        const icon_default = "mdi:movie";
        const icon_overlay ="mdi:play";
        const isPlaying = this.checkIsPlaying(item);
        return this._createCoverElement (image_url, class_cover,class_cover_image_default, icon_overlay, icon_default,isPlaying, () => this._goTo(position, PLAYER_TYPE.video.kodi_player_id))
    }


    private _createEpisodeCover(item,position) {
        const image_url = item["poster"] && item["poster"] != "" ? item["poster"] : item["thumbnail"];
        const class_cover = "playlist-episode-cover"
        const class_cover_image_default =  "playlist-episode-cover-image-default";
        const icon_default = "mdi:movie";
        const icon_overlay ="mdi:play";
        const isPlaying = this.checkIsPlaying(item);
        return this._createCoverElement (image_url, class_cover,class_cover_image_default, icon_overlay, icon_default,isPlaying, () => this._goTo(position, PLAYER_TYPE.video.kodi_player_id))
    }

    private _createUnknownCover(item,position) {
        const image_url = item["thumbnail"];
        const class_cover = "playlist-unknown-cover"
        const class_cover_image_default =  "playlist-unknown-cover-image-default";
        const icon_default = "mdi:sparkles";
        const icon_overlay ="mdi:play";
        const isPlaying = this.checkIsPlaying(item);
        return this._createCoverElement (image_url, class_cover,class_cover_image_default, icon_overlay, icon_default,isPlaying, () => this._goTo(position, PLAYER_TYPE.audio.kodi_player_id))
    }

    private _createCoverElement(
            image_url,
            class_cover,
            class_cover_image_default,
            icon_overlay,
            icon_default,
            isPlaying,
            action_click,
        ) {

        const class_cover_div = class_cover + " playlist-item-cover" + (this.config.show_thumbnail_border ? " cover-image-outline-border" : "");
        const class_cover_container_div = "playlist-item-cover-container";

        let cover_api = false;
        let cover = image_url;
        if (image_url.startsWith("/api")){
            cover =   image_url ? this._getThumbnailURLorBase64(image_url).then((value) => `url(${value})`) : "none";
            cover_api = true;
        }

        const class_default_image = class_cover_image_default + " playlist-item-cover-image-default";
        const class_cover_image = "playlist-item-cover-image";

        return html`
        <div class=${class_cover_div}>
            <div class=${class_cover_container_div}>
                <ha-icon icon=${icon_default} class=${class_default_image}></ha-icon>
                ${
                    cover_api?
                    html`<div class=${class_cover_image} @click="${!this.config.show_thumbnail_overlay?action_click:''}" style="background-size: contain; background-image: ${until(cover, "")}"></div>`:
                    html`<img class=${class_cover_image}" @click="${!this.config.show_thumbnail_overlay?action_click:''}" src="${cover}"></img>`
                }
                ${this.config.show_thumbnail_overlay && !isPlaying ? html`<ha-icon class="overlay-play" icon=${icon_overlay} @click="${action_click}"></ha-icon>`:html``}
            </div>
        </div>
        `
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
                --episode-thumbnail-ratio: 1.7;
                --background-basic-color: #9b9595;
                --container-rows-gap: 10px;
                --mdc-select-fill-color: rgba(0, 0, 0, 0);
            }

            /* SORTABLE PLAYLIST */
            .sortable-fallback {
                visibility: hidden;
            }

            .sortable-ghost {
                opacity: 0.8;
                border-radius: 5px;
                background: var(--primary-color, #03a9f4);
            }
            /*
            PLAYLIST
            */

            .playlist-line-separator {
                border-bottom: 1px solid var(--outline-color);
            }

            .cover-image-outline-border {
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
                transition: 0.5s ease opacity;
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
                width: var(--song-thumbnail-width);
                height: var(--song-thumbnail-width);
                position: absolute;
            }

            .playlist-item-cover-image {
                position: absolute;
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

            .playlist-playing {
                color: var(--primary-color, #03a9f4);
            }

            .playlist-item-cover {
                position: relative;
            }

            .playlist-item-cover:hover .overlay-play {
                opacity: 1;
            }

            .playlist-item-cover-container{
                position: relative;
                background-color: var(--background-basic-color);
            }

            .playlist-item-cover-image-default {
                display: flex;
                justify-content: flex-end;
                align-items: flex-end;
                color: white;
                height: 100%;
            }

            .playlist-item-cover-image, .playlist-item-cover-container{
                width: 100%;
                height: 100%;
                top: 0;
                left: 0;
            }

            /*
          //// SONGS
          */

            .playlist-song-grid {
                grid-template-columns: auto auto 1fr auto auto;
                grid-auto-rows: auto;
                margin-top: 15px;
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
                width: var(--song-thumbnail-width);
                height: var(--song-thumbnail-width);
            }

            .playlist-song-cover-image-default {
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
                width: var(--movie-thumbnail-width);
                height: calc(var(--movie-thumbnail-width) / var(--movie-thumbnail-ratio));
            }

            .playlist-movie-cover-image-default {
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
                width: var(--episode-thumbnail-width);
                height: calc(var(--episode-thumbnail-width) / var(--episode-thumbnail-ratio));
            }

            .playlist-episode-cover-image-default {
                --mdc-icon-size: calc(var(--episode-thumbnail-width) - 30px);
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
                width: var(--song-thumbnail-width);
                height: var(--song-thumbnail-width);
            }

            .playlist-unknown-cover-image-default {
                --mdc-icon-size: calc(var(--song-thumbnail-width) - 30px);
            }

            /* COMMON */
            .playlist-song-cover-container, .playlist-movie-cover-container, .playlist-episode-cover-container
            .playlist-unknown-cover-container {
                position: relative;
                width: 100%;
                height: 100%;
                top: 0;
                left: 0;
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

    private _moveTo(from, to, player) {
        this.hass.callService(this._service_domain, "call_method", {
            entity_id: this.config.entity,
            method: "moveto",
            item: {
                playlistid: player,
                position_from: from,
                position_to: to,
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
        // window.location.reload();
    }
}
