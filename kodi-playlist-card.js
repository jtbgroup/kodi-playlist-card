const DEFAULT_SHOW_THUMBNAIL = true;
const DEFAULT_SHOW_THUMBNAIL_BORDER = false;
const DEFAULT_SHOW_THUMBNAIL_OVERLAY = true;
const DEFAULT_SHOW_LINE_SEPARATOR = true;
const DEFAULT_OUTLINE_COLOR = "white";

class PlaylistSensorCard extends HTMLElement {
  SONG_THUMBNAIL_WIDTH = "65px";
  EPISODE_THUMBNAIL_WIDTH = "150px";
  EPISODE_THUMBNAIL_RATIO = 1.5;
  MOVIE_THUMBNAIL_WIDTH = "100px";
  MOVIE_THUMBNAIL_RATIO = 0.8;

  BACKGROUND_BASIC_COLOR = "#9b9595";
  ICON_CURRENT_PLAYING = "mdi:arrow-left-bold";

  PLAYER_ID_MUSIC = 0;
  PLAYER_ID_VIDEO = 1;

  _config_show_thumbnail = DEFAULT_SHOW_THUMBNAIL;
  _config_show_thumbnail_border = DEFAULT_SHOW_THUMBNAIL_BORDER;
  _config_show_line_separator = DEFAULT_SHOW_LINE_SEPARATOR;
  _config_show_thumbnail_overlay = DEFAULT_SHOW_THUMBNAIL_OVERLAY;
  _config_outline_color = DEFAULT_OUTLINE_COLOR;

  static async getConfigElement() {
    await import("./kodi-playlist-card-editor.js");
    return document.createElement("kodi-playlist-card-editor");
  }

  static getStubConfig() {
    return {
      entity: "",
      show_thumbnail: DEFAULT_SHOW_THUMBNAIL,
      show_thumbnail_border: DEFAULT_SHOW_THUMBNAIL_BORDER,
      show_line_separator: DEFAULT_SHOW_LINE_SEPARATOR,
      show_thumbnail_overlay: DEFAULT_SHOW_THUMBNAIL_OVERLAY,
      outline_color: DEFAULT_OUTLINE_COLOR,
    };
  }

  setConfig(config) {
    this._config = config;
    this.cardSize = 50;
    this.last_update_time;

    if (!config.entity) {
      // If no entity was specified, this will display a red error card with the message below
      throw new Error("You need to define an entity");
    }

    if (this._config.hasOwnProperty("show_thumbnail")) {
      this._config_show_thumbnail = this._config.show_thumbnail;
    }

    if (this._config.hasOwnProperty("show_thumbnail_border")) {
      this._config_show_thumbnail_border = this._config.show_thumbnail_border;
    }

    if (this._config.hasOwnProperty("show_thumbnail_overlay")) {
      this._config_show_thumbnail_overlay = this._config.show_thumbnail_overlay;
    }

    if (this._config.hasOwnProperty("show_line_separator")) {
      this._config_show_line_separator = this._config.show_line_separator;
    }

    if (this._config.hasOwnProperty("outline_color")) {
      this._config_outline_color = this._config.outline_color;
    }

    // Make sure this only runs once
    if (!this.setupComplete) {
      // A ha-card element should be the base of all cards
      // Best practice, and makes themes and stuff work
      const card = document.createElement("ha-card");
      card.header = this._config.title;

      // At this point, we don't necessarily know anything about the current state
      // of anything, but we can set up the general structure of the card.
      this.playerTypeDiv = document.createElement("div");
      this.playerTypeDiv.setAttribute("class", "playertype-container");
      card.appendChild(this.playerTypeDiv);

      this.playlistDiv = document.createElement("div");
      this.playlistDiv.setAttribute("class", "playlist-container");
      card.appendChild(this.playlistDiv);

      let style = document.createElement("style");
      style.textContent = this.defineCSS();
      this.appendChild(style);

      this.appendChild(card);
      this.setupComplete = true;
    }
  }

  getCardSize() {
    // return this.cardSize;
    return 30;
  }

  set hass(hass) {
    this._hass = hass;
    // Update the card in case anything has changed

    if (!this._config) return; // Can't assume setConfig is called before hass is set

    const entity = this._config.entity;
    let state = hass.states[entity];
    if (!state) {
      console.error("no state for the sensor");
      return;
    }
    if (state.state == "off") {
      this.formatContainerOff();
    } else {
      let meta = state.attributes.meta;
      if (!meta) {
        console.error("no metadata for the sensor");
        return;
      }
      const json_meta = typeof meta == "object" ? meta : JSON.parse(meta);
      if (json_meta.length == 0) {
        console.error("empty metadata attribute");
        return;
      }

      let update_time = json_meta[0]["update_time"];
      if (this.last_update_time && this.last_update_time == update_time) {
        console.log("no update available");
        return;
      }

      this.last_update_time = update_time;

      /** Start building UI components */
      let json;
      let playerType;

      this._service_domain = json_meta[0]["service_domain"];
      this._currently_playing = json_meta[0]["currently_playing"];

      let data = state.attributes.data;
      json = typeof data == "object" ? data : JSON.parse(data);

      if (json[0] && json_meta[0]["playlist_type"]) {
        playerType = json_meta[0]["playlist_type"].toLowerCase();
      }
      this.formatContainer(playerType, json);
    }
  }

  formatContainerOff() {
    this.playerTypeDiv.innerHTML = `<div>Kodi is off</div>`;
    this.playlistDiv.innerHTML = "";
  }

  formatContainer(playerType, data) {
    this.playerTypeDiv.innerHTML = "";
    this.playlistDiv.innerHTML = "";

    this.formatPlayerType(playerType);

    if (data && data.length > 0) {
      for (let count = 0; count < data.length; count++) {
        let item = data[count];
        let attribute = item["type"];
        if (attribute == "song") {
          this.playlistDiv.appendChild(this.formatSong(item, count));
        } else if (attribute == "movie") {
          this.playlistDiv.appendChild(this.formatMovie(item, count));
        } else if (attribute == "episode") {
          this.playlistDiv.appendChild(this.formatEpisode(item, count));
        } else {
          this.playlistDiv.appendChild(this.formatUnknown(item));
        }
      }
    }
  }

  formatMovie(item, position) {
    let isPlaying = item["id"] == this._currently_playing;

    let row = document.createElement("div");
    row.setAttribute("class", "playlist-movie-grid playlist-grid");

    let cover =
      item["poster"] && item["poster"] != ""
        ? item["poster"]
        : item["thumbnail"];

    let coverDiv = this.prepareCover(
      cover,
      "playlist-movie-cover",
      "playlist-movie-cover-image",
      "playlist-movie-cover-image-default",
      "mdi:play",
      "mdi:movie",
      isPlaying,
      () => this.goTo(position, this.PLAYER_ID_VIDEO)
    );
    row.appendChild(coverDiv);

    let titleDiv = document.createElement("div");
    titleDiv.setAttribute("class", "playlist-movie-title playlist-title");
    titleDiv.innerHTML = item["title"];
    row.appendChild(titleDiv);

    let genreDiv = document.createElement("div");
    genreDiv.setAttribute("class", "playlist-movie-genre playlist-genre");
    genreDiv.innerHTML = item["genre"] ? item["genre"] : "undefined";
    row.appendChild(genreDiv);

    let trashIcon = document.createElement("ha-icon");
    row.appendChild(trashIcon);
    if (isPlaying) {
      trashIcon.setAttribute(
        "class",
        "playlist-movie-playing playlist-control playlist-playing"
      );
      trashIcon.setAttribute("icon", this.ICON_CURRENT_PLAYING);
    } else {
      trashIcon.setAttribute("class", "playlist-movie-remove playlist-control");
      trashIcon.setAttribute("icon", "mdi:delete");
      trashIcon.addEventListener("click", () =>
        this.remove(position, this.PLAYER_ID_VIDEO)
      );
    }

    return row;
  }

  formatEpisode(item, position) {
    let isPlaying = item["id"] == this._currently_playing;

    let row = document.createElement("div");
    row.setAttribute("class", "playlist-episode-grid playlist-grid");

    let cover =
      item["poster"] && item["poster"] != ""
        ? item["poster"]
        : item["thumbnail"];

    let coverDiv = this.prepareCover(
      cover,
      "playlist-episode-cover",
      "playlist-episode-cover-image",
      "playlist-episode-cover-image-default",
      "mdi:play",
      "mdi:movie",
      isPlaying,
      () => this.goTo(position, this.PLAYER_ID_VIDEO)
    );
    row.appendChild(coverDiv);

    let titleDiv = document.createElement("div");
    titleDiv.setAttribute("class", "playlist-episode-title playlist-title");
    titleDiv.innerHTML = item["title"];
    row.appendChild(titleDiv);

    let genreDiv = document.createElement("div");
    genreDiv.setAttribute("class", "playlist-episode-genre playlist-genre");
    genreDiv.innerHTML = item["genre"] ? item["genre"] : "undefined";
    row.appendChild(genreDiv);

    let seasonDiv = document.createElement("div");
    seasonDiv.setAttribute("class", "playlist-episode-season");
    seasonDiv.innerHTML =
      "Season " +
      (item["season"] ? item["season"] : "undefined") +
      " - Episode " +
      (item["episode"] ? item["episode"] : "undefined");
    row.appendChild(seasonDiv);

    let trashIcon = document.createElement("ha-icon");
    row.appendChild(trashIcon);
    if (isPlaying) {
      trashIcon.setAttribute(
        "class",
        "playlist-episode-playing playlist-control playlist-playing"
      );
      trashIcon.setAttribute("icon", this.ICON_CURRENT_PLAYING);
    } else {
      trashIcon.setAttribute(
        "class",
        "playlist-episode-remove playlist-control"
      );
      trashIcon.setAttribute("icon", "mdi:delete");
      trashIcon.addEventListener("click", () =>
        this.remove(position, this.PLAYER_ID_VIDEO)
      );
    }

    return row;
  }

  formatSong(item, position) {
    let isPlaying = item["id"] == this._currently_playing;

    let row = document.createElement("div");
    row.setAttribute("class", "playlist-song-grid playlist-grid");

    let cover = item["thumbnail"];
    let coverDiv = this.prepareCover(
      cover,
      "playlist-song-cover",
      "playlist-song-cover-image",
      "playlist-song-cover-image-default",
      "mdi:play",
      "mdi:music",
      isPlaying,
      () => this.goTo(position, this.PLAYER_ID_MUSIC)
    );
    row.appendChild(coverDiv);

    let titleDiv = document.createElement("div");
    titleDiv.setAttribute("class", "playlist-song-title playlist-title");
    titleDiv.innerHTML = item["artist"] + " - " + item["title"];
    row.appendChild(titleDiv);

    let genreDiv = document.createElement("div");
    genreDiv.setAttribute("class", "playlist-song-genre playlist-genre");
    genreDiv.innerHTML = item["genre"] ? item["genre"] : "undefined";
    row.appendChild(genreDiv);

    let albumDiv = document.createElement("div");
    albumDiv.setAttribute("class", "playlist-song-album");
    albumDiv.innerHTML = item["album"] + " (" + item["year"] + ")";
    row.appendChild(albumDiv);

    let durationDiv = document.createElement("div");
    durationDiv.setAttribute("class", "playlist-song-duration");
    durationDiv.innerHTML = new Date(item["duration"] * 1000)
      .toISOString()
      .substring(11, 19);
    row.appendChild(durationDiv);

    let trashIcon = document.createElement("ha-icon");
    row.appendChild(trashIcon);
    if (isPlaying) {
      trashIcon.setAttribute(
        "class",
        "playlist-song-playing playlist-control playlist-playing"
      );
      trashIcon.setAttribute("icon", this.ICON_CURRENT_PLAYING);
    } else {
      trashIcon.setAttribute("class", "playlist-song-remove playlist-control");
      trashIcon.setAttribute("icon", "mdi:delete");
      trashIcon.addEventListener("click", () =>
        this.remove(position, this.PLAYER_ID_MUSIC)
      );
    }

    return row;
  }

  prepareCover(
    cover,
    class_cover,
    class_cover_image,
    class_cover_image_default,
    icon_overlay,
    icon_default,
    isPlaying,
    action_click
  ) {
    let thumbnailDiv = document.createElement("div");
    thumbnailDiv.setAttribute("class", class_cover);

    let thumbContainer = document.createElement("div");
    thumbContainer.setAttribute("class", "playlist-cover-container");
    thumbnailDiv.appendChild(thumbContainer);

    if (this._config_show_thumbnail && cover && cover != "") {
      let thumbImg = document.createElement("img");
      thumbImg.setAttribute(
        "class",
        "playlist-cover-image " + class_cover_image
      );
      thumbImg.setAttribute("src", cover);
      thumbImg.onerror = function () {
        thumbImg.remove();

        let thumbImgDefault = document.createElement("ha-icon");
        thumbImgDefault.setAttribute(
          "class",
          "playlist-cover-image-default " + class_cover_image_default
        );
        thumbImgDefault.setAttribute("icon", icon_default);
        thumbContainer.appendChild(thumbImgDefault);
      };

      thumbContainer.appendChild(thumbImg);
    } else {
      let thumbImgDefault = document.createElement("ha-icon");
      thumbImgDefault.setAttribute(
        "class",
        "playlist-cover-image-default " + class_cover_image_default
      );
      thumbImgDefault.setAttribute("icon", icon_default);
      thumbContainer.appendChild(thumbImgDefault);
    }

    if (!this._config_show_thumbnail_overlay) {
      thumbContainer.addEventListener("click", action_click);
    } else if (this._config_show_thumbnail_overlay && !isPlaying) {
      let overlayImg = document.createElement("ha-icon");
      overlayImg.setAttribute("class", "overlay-play");
      overlayImg.setAttribute("icon", icon_overlay);
      overlayImg.addEventListener("click", action_click);
      thumbContainer.appendChild(overlayImg);
    }

    return thumbnailDiv;
  }

  formatUnknown(item) {
    let isPlaying = item["id"] == this._currently_playing;

    let row = document.createElement("div");
    row.setAttribute("class", "playlist-unknown-grid playlist-grid");

    let cover = item["thumbnail"];
    let coverDiv = this.prepareCover(
      cover,
      "playlist-unknown-cover",
      "playlist-unknown-cover-image",
      "playlist-unknown-cover-image-default",
      "mdi:play",
      "mdi:sparkles",
      isPlaying,
      () => this.goTo(position, this.PLAYER_ID_MUSIC)
    );
    row.appendChild(coverDiv);

    let messageDiv = document.createElement("div");
    messageDiv.setAttribute("class", "playlist-unknown-message");
    messageDiv.innerHTML = "type of media is... : " + item["type"];
    row.appendChild(messageDiv);

    let titleDiv = document.createElement("div");
    titleDiv.setAttribute("class", "playlist-unknown-title playlist-title");
    titleDiv.innerHTML = item["title"];
    row.appendChild(titleDiv);

    let trashIcon = document.createElement("ha-icon");
    row.appendChild(trashIcon);
    if (isPlaying) {
      trashIcon.setAttribute(
        "class",
        "playlist-unknown-playing playlist-control"
      );
      trashIcon.setAttribute("icon", this.ICON_CURRENT_PLAYING);
    } else {
      trashIcon.setAttribute(
        "class",
        "playlist-unknown-remove playlist-control"
      );
      trashIcon.setAttribute("icon", "mdi:delete");
      trashIcon.addEventListener("click", () => this.remove(position, 1));
    }

    return row;
  }

  formatPlayerType(playerType) {
    if (playerType) {
      let playerText = "Movie";
      let playerIcon = "mdi:movie";
      if (playerType == "audio") {
        playerText = "Audio";
        playerIcon = "mdi:music";
      }

      let playerTypeTxt = document.createElement("div");
      playerTypeTxt.innerHTML = playerText + ` Playlist`;
      this.playerTypeDiv.appendChild(playerTypeTxt);

      let playerTypeIcon = document.createElement("ha-icon");
      playerTypeIcon.setAttribute("icon", playerIcon);
      this.playerTypeDiv.appendChild(playerTypeIcon);
    } else {
      this.playerTypeDiv.innerHTML = `<div>No playlist found</div>`;
      this.playlistDiv.innerHTML = "";
    }
  }

  goTo(posn, player) {
    this._hass.callService(this._service_domain, "call_method", {
      entity_id: this._config.entity,
      method: "goto",
      item: {
        playerid: player,
        to: posn,
      },
    });
  }

  remove(posn, player) {
    this._hass.callService(this._service_domain, "call_method", {
      entity_id: this._config.entity,
      method: "remove",
      item: {
        playlistid: player,
        position: posn,
      },
    });
  }

  defineCSS() {
    let css = `

                .playertype-container{
                  display: grid;
                  grid-template-columns: 1fr auto;
                  grid-auto-rows: auto;
                  grid-gap: 10px;
                  text-align: right;
                  font-weight: bold;
                  font-size: 18px;
                  margin-top: 20px;
                  margin-bottom: 20px;
                  margin-left: 10px;
                  margin-right: 10px;
                  border-bottom: solid;
                }

                .playlist-container{
                  display: grid;
                  grid-template-columns: 1fr;
                  grid-auto-rows: auto;
                  grid-gap: 15px;
                }

                /*
                //// COMMON ATTRIBUTES
               */

                .overlay-play {
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  background: rgba(0, 0, 0, 0.5);
                  opacity:0;
                  color: white;
                  transition: .5s ease;
                  text-align: center;
                  --mdc-icon-size: 50px;
                }

                .playlist-cover-image-default{
                  display:flex;
                  justify-content:flex-end;
                  align-items:flex-end;
                  color: white;
                  background-color: ${this.BACKGROUND_BASIC_COLOR};
                }

                .playlist-cover-image{
                  height:auto !important;
                  display: block;
                  justify-content:center;
                }

                .playlist-cover-container{
                  position: relative;
                }

                .playlist-cover-container:hover .overlay-play {
                  opacity: 1;
                }

                .playlist-grid {
                  display: grid;
                  column-gap:10px;
                  padding-bottom: 5px;
                  margin-left:20px;
                }

                .playlist-title{
                  font-weight: bold;
                  font-size: 14px;
                }

                .playlist-genre{
                  font-style: italic;
                }

                .playlist-control{
                  text-align: right;
                  width: 30px;
                }

                .playlist-playing{
                  color: rgb(3, 169, 244);
                }

                /*
                //// UNKNOWN
               */
                .playlist-unknown-grid{
                  grid-template-columns: auto 1fr auto;
                  grid-auto-rows: auto;
                }

                .playlist-unknown-message{
                  grid-column: 2;
                  grid-row: 1;
                }

                .playlist-unknown-title{
                  grid-column: 2 ;
                  grid-row: 2;
                }

                .playlist-unknown-remove, .playlist-unknown-playing{
                  grid-column: 3;
                  grid-row: 1;
                }

                .playlist-unknown-cover{
                  grid-column: 1;
                  grid-row: 1 / 3 ;
                }

                .playlist-unknown-cover-image{
                  width: ${this.SONG_THUMBNAIL_WIDTH};
                }

                .playlist-unknown-cover-image-default{
                  width: ${this.SONG_THUMBNAIL_WIDTH};
                  height: ${this.SONG_THUMBNAIL_WIDTH};
                  --mdc-icon-size: calc(${this.SONG_THUMBNAIL_WIDTH} - 30px);
                }


               /*
                //// SONGS
               */
                .playlist-song-grid{
                  grid-template-columns: auto 1fr auto auto;
                  grid-auto-rows: auto;
                }

                .playlist-song-title{
                  grid-column: 2 / 4;
                  grid-row: 1;
                }

                .playlist-song-genre{
                  grid-column: 2 / 4;
                  grid-row: 2;
                }

                .playlist-song-album{
                  grid-column: 2 / 3;
                  grid-row: 3;
                }

                .playlist-song-duration{
                  grid-column: 3 / 5;
                  grid-row: 3;
                  text-align: right;
                }

                .playlist-song-remove, .playlist-song-playing{
                  grid-column: 4 / 5;
                  grid-row: 1 / 3;
                }

                .playlist-song-cover{
                  grid-column: 1;
                  grid-row: 1 / 5 ;
                }

                .playlist-song-cover-image{
                  width: ${this.SONG_THUMBNAIL_WIDTH};
                }

                .playlist-song-cover-image-default{
                  width: ${this.SONG_THUMBNAIL_WIDTH};
                  height: ${this.SONG_THUMBNAIL_WIDTH};
                  --mdc-icon-size: calc(${this.SONG_THUMBNAIL_WIDTH} - 30px);
                }


                /*
                //// MOVIES
               */

                .playlist-movie-grid{
                  grid-template-columns: auto 1fr auto;
                  grid-auto-rows: auto;
                }

                .playlist-movie-title{
                  grid-column: 2;
                  grid-row: 1;
                }

                .playlist-movie-genre{
                  grid-column: 2;
                  grid-row: 2;
                }

                .playlist-movie-remove, .playlist-movie-playing{
                  grid-column: 3;
                  grid-row: 1 / 3;
                }

                .playlist-movie-cover{
                  grid-column: 1;
                  grid-row: 1 / 4 ;

                }

                .playlist-movie-cover-image{
                  width: ${this.MOVIE_THUMBNAIL_WIDTH};
                }

                .playlist-movie-cover-image-default{
                  width: ${this.MOVIE_THUMBNAIL_WIDTH};
                  height: calc(${this.MOVIE_THUMBNAIL_WIDTH} / ${this.MOVIE_THUMBNAIL_RATIO});
                  --mdc-icon-size: calc(${this.MOVIE_THUMBNAIL_WIDTH} - 30px);
                }


              /*
                //// EPISODE
               */
                .playlist-episode-grid{
                  grid-template-columns: auto 1fr auto;
                  grid-auto-rows: auto;
                }

                .playlist-episode-title{
                  grid-column: 2;
                  grid-row: 1;
                }

                .playlist-episode-genre{
                  grid-column: 2;
                  grid-row: 2;
                }

                .playlist-episode-season{
                  grid-column: 2;
                  grid-row: 3;
                }

                .playlist-episode-remove, .playlist-episode-playing{
                  grid-column: 3;
                  grid-row: 1 / 3;
                }

                .playlist-episode-cover{
                  grid-column: 1;
                  grid-row: 1 / 5 ;
                }

                .playlist-episode-cover-image{
                  width: ${this.EPISODE_THUMBNAIL_WIDTH};
                }

                .playlist-episode-cover-image-default{
                  width: ${this.EPISODE_THUMBNAIL_WIDTH};
                  height: calc(${this.EPISODE_THUMBNAIL_WIDTH} / ${this.EPISODE_THUMBNAIL_RATIO});
                  --mdc-icon-size: calc((${this.EPISODE_THUMBNAIL_WIDTH} / ${this.EPISODE_THUMBNAIL_RATIO}) - 30px);
                }

          `;

    if (this._config_show_thumbnail_border) {
      css +=
        `
        .playlist-cover-image, .playlist-cover-image-default{
                border: 1px solid ` +
        this._config_outline_color +
        `;
    }
    `;
    }

    if (this._config_show_line_separator) {
      css +=
        `
        .playlist-grid{
            border-bottom: 1px solid ` +
        this._config_outline_color +
        `;
    }
    `;
    }

    return css;
  }
}
customElements.define("kodi-playlist-card", PlaylistSensorCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "kodi-playlist-card",
  name: "Kodi Playlist Card",
  preview: false, // Optional - defaults to false
  description: "Shows the playlist of Kodi", // Optional
});
