class PlaylistMediaCard extends HTMLElement {
  SONG_THUMBNAIL_SIZE = "65px";

  // the height of the epthumbnailsode of the episode in the search result
  EPISODE_THUMBNAIL_MIN_HEIGHT = "80px";
  EPISODE_THUMBNAIL_RATIO = 1.8;
  // the height of the thumbnail
  MOVIE_THUMBNAIL_MIN_HEIGHT = "80px";
  MOVIE_THUMBNAIL_RATIO = 0.7;
  MOVIE_THUMBNAIL_WIDTH = "100px";

  BACKGROUND_BASIC_COLOR = "#9b9595";

  // ICON_CURRENT_PLAYING = "mdi:minus-circle";
  ICON_CURRENT_PLAYING = "mdi:arrow-left-bold";

  _config_show_thumbnail = true;
  _config_show_thumbnail_border = false;
  _config_thumbnail_border_color = "white";
  _config_thumbnail_overlay = true;

  setConfig(config) {
    this._config = config;
    this.cardSize = 50;
    this.last_update_time;

    if (!config.entity) {
      // If no entity was specified, this will display a red error card with the message below
      throw new Error("You need to define an entity");
    }

    if (this._config.show_thumbnail) {
      this._config_show_thumbnail = this._config.show_thumbnail;
    }
    if (this._config.show_thumbnail_border) {
      this._config_show_thumbnail_border = this._config.show_thumbnail_border;
    }

    if (this._config.thumbnail_border_color) {
      this._config_thumbnail_border_color = this._config.thumbnail_border_color;
    }

    if (this._config.thumbnail_overlay) {
      this._config_thumbnail_overlay = this._config.thumbnail_overlay;
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

      // this.content = document.createElement("div");
      // card.appendChild(this.content);

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

    // this._hass.callService("homeassistant", "update_entity", {
    //   entity_id: this._config.entity,
    // });

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

      /** Here the real code */
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
    row.setAttribute("class", "movie-item-grid");

    let thumbnailDiv = document.createElement("div");
    thumbnailDiv.setAttribute("class", "movie-item-thumbnail");
    row.appendChild(thumbnailDiv);
    if (this._config_show_thumbnail && item["thumbnail"] != "") {
      let image = item["thumbnail"];
      if (item["poster"]) {
        image = item["poster"];
      }
      let url = "background-image: url('" + image + "')";
      thumbnailDiv.setAttribute("style", url);
    }

    let thumbnailPlayDiv = document.createElement("ha-icon");
    if (!isPlaying) {
      thumbnailPlayDiv.setAttribute("class", "movie-item-play");
      thumbnailPlayDiv.setAttribute("icon", "mdi:play");
      thumbnailPlayDiv.addEventListener("click", () => this.goTo(position, 1));
    }
    thumbnailDiv.appendChild(thumbnailPlayDiv);

    let titleDiv = document.createElement("div");
    titleDiv.setAttribute("class", "movie-item-title");
    titleDiv.innerHTML = item["title"] + " (" + item["year"] + ")";
    row.appendChild(titleDiv);

    let genreDiv = document.createElement("div");
    genreDiv.setAttribute("class", "movie-item-genre");
    genreDiv.innerHTML = item["genre"] ? item["genre"] : "undefined";
    row.appendChild(genreDiv);

    let trashIcon = document.createElement("ha-icon");
    row.appendChild(trashIcon);
    if (isPlaying) {
      trashIcon.setAttribute("class", "movie-item-playing");
      trashIcon.setAttribute("icon", this.ICON_CURRENT_PLAYING);
    } else {
      trashIcon.setAttribute("class", "movie-item-remove");
      trashIcon.setAttribute("icon", "mdi:delete");
      trashIcon.addEventListener("click", () => this.remove(position, 1));
    }

    return row;
  }
  formatEpisode(item, position) {
    let isPlaying = item["id"] == this._currently_playing;

    let row = document.createElement("div");
    row.setAttribute("class", "episode-item-grid");

    let thumbnailDiv = document.createElement("div");
    thumbnailDiv.setAttribute("class", "episode-item-thumbnail");
    row.appendChild(thumbnailDiv);

    if (this._config_show_thumbnail && item["thumbnail"] != "") {
      let image = item["thumbnail"];
      if (item["poster"]) {
        image = item["poster"];
      }

      let url = "background-image: url('" + image + "')";
      thumbnailDiv.setAttribute("style", url);
    }

    let thumbnailPlayDiv = document.createElement("ha-icon");
    if (!isPlaying) {
      thumbnailPlayDiv.setAttribute("class", "episode-item-play");
      thumbnailPlayDiv.setAttribute("icon", "mdi:play");
      thumbnailPlayDiv.addEventListener("click", () => this.goTo(position, 1));
    }
    thumbnailDiv.appendChild(thumbnailPlayDiv);

    let titleDiv = document.createElement("div");
    titleDiv.setAttribute("class", "episode-item-title");
    titleDiv.innerHTML = item["title"] + " (" + item["year"] + ")";
    row.appendChild(titleDiv);

    let genreDiv = document.createElement("div");
    genreDiv.setAttribute("class", "episode-item-genre");
    genreDiv.innerHTML = item["genre"] ? item["genre"] : "undefined";
    row.appendChild(genreDiv);

    let seasonDiv = document.createElement("div");
    seasonDiv.setAttribute("class", "episode-item-season");
    seasonDiv.innerHTML = item["season"]
      ? "Season " + item["season"]
      : "undefined";
    row.appendChild(seasonDiv);

    let trashIcon = document.createElement("ha-icon");
    row.appendChild(trashIcon);
    if (isPlaying) {
      trashIcon.setAttribute("class", "episode-item-playing");
      trashIcon.setAttribute("icon", this.ICON_CURRENT_PLAYING);
    } else {
      trashIcon.setAttribute("class", "episode-item-remove");
      trashIcon.setAttribute("icon", "mdi:delete");
      trashIcon.addEventListener("click", () => this.remove(position, 1));
    }
    return row;
  }
  formatSong(item, position) {
    let isPlaying = item["id"] == this._currently_playing;

    let row = document.createElement("div");
    row.setAttribute("class", "song-item-grid");

    let thumbnailDiv = document.createElement("div");
    thumbnailDiv.setAttribute("class", "song-item-thumbnail");
    row.appendChild(thumbnailDiv);

    if (this._config_show_thumbnail && item["thumbnail"] != "") {
      let url = "background-image: url('" + item["thumbnail"] + "')";
      thumbnailDiv.setAttribute("style", url);
    }

    let thumbnailPlayDiv = document.createElement("ha-icon");
    if (!isPlaying) {
      thumbnailPlayDiv.setAttribute("class", "song-item-play");
      thumbnailPlayDiv.setAttribute("icon", "mdi:play");
      thumbnailPlayDiv.addEventListener("click", () => this.goTo(position, 0));
    }
    thumbnailDiv.appendChild(thumbnailPlayDiv);

    let titleDiv = document.createElement("div");
    titleDiv.setAttribute("class", "song-item-title");
    titleDiv.innerHTML = item["artist"] + " - " + item["title"];
    row.appendChild(titleDiv);

    let genreDiv = document.createElement("div");
    genreDiv.setAttribute("class", "song-item-genre");
    genreDiv.innerHTML = item["genre"] ? item["genre"] : "undefined";
    row.appendChild(genreDiv);

    let albumDiv = document.createElement("div");
    albumDiv.setAttribute("class", "song-item-album");
    albumDiv.innerHTML = item["album"] + " (" + item["year"] + ")";
    row.appendChild(albumDiv);

    let durationDiv = document.createElement("div");
    durationDiv.setAttribute("class", "song-item-duration");
    durationDiv.innerHTML = new Date(item["duration"] * 1000)
      .toISOString()
      .substr(11, 8);
    row.appendChild(durationDiv);

    let trashIcon = document.createElement("ha-icon");
    row.appendChild(trashIcon);
    if (isPlaying) {
      trashIcon.setAttribute("class", "song-item-playing");
      trashIcon.setAttribute("icon", this.ICON_CURRENT_PLAYING);
    } else {
      trashIcon.setAttribute("class", "song-item-remove");
      trashIcon.setAttribute("icon", "mdi:delete");
      trashIcon.addEventListener("click", () => this.remove(position, 0));
    }

    return row;
  }

  formatUnknown(item) {
    let isPlaying = item["id"] == this._currently_playing;

    let row = document.createElement("div");
    row.setAttribute("class", "unknown-item-grid");

    let titleDiv = document.createElement("div");
    titleDiv.setAttribute("class", "unknown-item-title");
    titleDiv.innerHTML = item["title"];
    row.appendChild(titleDiv);

    let messageDiv = document.createElement("div");
    messageDiv.setAttribute("class", "unknown-item-message");
    messageDiv.innerHTML = "unknown type... " + item["type"];
    row.appendChild(messageDiv);

    let trashIcon = document.createElement("ha-icon");
    row.appendChild(trashIcon);
    if (isPlaying) {
      trashIcon.setAttribute("class", "unknown-item-remove-alt");
      trashIcon.setAttribute("icon", this.ICON_CURRENT_PLAYING);
    } else {
      trashIcon.setAttribute("class", "unknown-item-remove");
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
                //// UNKNOWN
               */
                .unknown-item-grid{
                  display: grid;
                  grid-template-columns: ${this.SONG_THUMBNAIL_SIZE} 1fr auto auto auto;
                  grid-gap: 3px;
                  grid-auto-rows: auto;
                }

                .unknown-item-title{
                  grid-column-start: 2;
                  grid-column-end: 4;
                  grid-row-start: 1;
                  grid-row-end: 2;
                  font-weight: bold;
                  font-size: 14px;
                }

                .unknown-message{
                  grid-column-start: 2;
                  grid-column-end: 3;
                  grid-row-start: 3;
                  grid-row-end: 4;
                }

                .unknown-item-remove, .unknown-item-remove-alt{
                  grid-column-start: 4;
                  grid-colu mn-end: 5;
                  grid-row-start: 1;
                  grid-row-end: 2;
                  text-align: right;
                  width: 30px;
                }

               /*
                //// SONGS
               */

                .song-item-grid{
                  display: grid;
                  grid-template-columns: ${this.SONG_THUMBNAIL_SIZE} 1fr auto auto auto;
                  grid-gap: 3px;
                  grid-auto-rows: auto;
                  border-bottom: solid 1px;
                }

                .song-item-title{
                  grid-column: 2 / 4;
                  grid-row: 1;
                  font-weight: bold;
                  font-size: 14px;
                }

                .song-item-album{
                  grid-column: 2;
                  grid-row: 3;
                }

                .song-item-genre{
                  grid-column: 2 / 4;
                  grid-row: 2;
                  font-style: italic;
                }
                .song-item-duration{
                  grid-column: 3 / 5;
                  grid-row: 3;
                  text-align: right;
                }

                .song-item-remove, .song-item-remove-alt{
                  grid-column: 4;
                  grid-row: 1;
                  text-align: right;
                  width: 30px;
                }

                .song-item-thumbnail, .song-item-play{
                  grid-column: 1;
                  grid-row: 1 / 5;
                  display: block;
                  background-size: contain;
                  background-repeat: no-repeat;
                  // background-color: ${this.BACKGROUND_BASIC_COLOR};
                  width: ${this.SONG_THUMBNAIL_SIZE};
                  height: ${this.SONG_THUMBNAIL_SIZE};
                }


                /*
                //// MOVIES
               */

                .movie-item-grid{
                  display: grid;
                  grid-template-columns: ${this.MOVIE_THUMBNAIL_WIDTH} 1fr auto;
                  grid-gap: 3px;
                  grid-auto-rows: auto;
                }

                .movie-item-title{
                  grid-column: 2;
                  grid-row: 1;
                  font-weight: bold;
                  font-size: 14px;
                }

                .movie-item-genre{
                  grid-column: 2;
                  grid-row: 2;
                  font-style: italic;
                }

                .movie-item-remove, .movie-item-playing{
                  grid-column: 3;
                  grid-row: 1;
                  text-align: right;
                  width: 30px;
                }

                .movie-item-thumbnail,  .movie-item-play{
                  grid-column: 1;
                  grid-row: 1 / 4;
                  display: block;
                  background-size: contain;
                  background-repeat: no-repeat;
                  // background-color: ${this.BACKGROUND_BASIC_COLOR};
                  width: ${this.MOVIE_THUMBNAIL_WIDTH};
                  height: calc(${this.MOVIE_THUMBNAIL_WIDTH} / ${this.MOVIE_THUMBNAIL_RATIO});
                }


                /*
                //// EPISODE
               */
                .episode-item-grid{
                  display: grid;
                  grid-template-columns: calc(${this.EPISODE_THUMBNAIL_MIN_HEIGHT} * ${this.EPISODE_THUMBNAIL_RATIO}) 1fr auto;
                  grid-gap: 3px;
                  grid-auto-rows: auto;
                }

                .episode-item-title{
                  grid-column: 2;
                  grid-row: 1;
                  font-weight: bold;
                  font-size: 14px;
                }

                .episode-item-genre{
                  grid-column: 2;
                  grid-row: 2;
                  font-style: italic;
                }

                .episode-item-season{
                  grid-column: 2;
                  grid-row: 3;
                }

                .episode-item-remove, .episode-item-remove-alt{
                  grid-column: 3;
                  grid-row: 1;
                  text-align: right;
                  display:flex;
                  justify-content:flex-end;
                  align-items:flex-end;
                  width: 30px;
                }

                .episode-item-thumbnail{
                  grid-column: 1;
                  grid-row: 1 / 4;
                  display: block;
                  background-size: cover;
                  backgrouFFnd-repeat: no-repeat;
                  // background-color: ${this.BACKGROUND_BASIC_COLOR};
                  width: calc(${this.EPISODE_THUMBNAIL_MIN_HEIGHT} * ${this.EPISODE_THUMBNAIL_RATIO});
                  height: ${this.EPISODE_THUMBNAIL_MIN_HEIGHT} ;
                }

                .episode-item-play{
                  display: block;
                  grid-column-start: 1;
                  grid-column-end: 2;
                  grid-row-start: 1;
                  grid-row-end: 5;
                  width: calc(${this.EPISODE_THUMBNAIL_MIN_HEIGHT} * ${this.EPISODE_THUMBNAIL_RATIO});
                  height: ${this.EPISODE_THUMBNAIL_MIN_HEIGHT} ;
                }

                .song-item-playing, .movie-item-playing, .episode-item-playing{
                  color: rgb(3, 169, 244);
                }

                .song-item-play:hover, .song-item-remove:hover, .movie-item-play:hover, .movie-item-remove:hover, .episode-item-play:hover, .episode-item-remove:hover{
                  color: red;
                }


                .song-item-grid, .movie-item-grid, .episode-item-grid{
                  border-bottom: solid 1px;
                }
          `;

    if (this._config_show_thumbnail_border) {
      css +=
        `
         .song-item-thumbnail, .movie-item-thumbnail, .episode-item-thumbnail{
                border:1px solid ` +
        this._config_thumbnail_border_color +
        `;
          }
      `;
    }

    if (this._config_thumbnail_overlay) {
      css += `
          .song-item-play, .movie-item-play, .episode-item-play{
              background-color: rgb(250, 250, 250, 0.4)
          }
      `;
    }
    return css;
  }
}
customElements.define("kodi-playlist-card", PlaylistMediaCard);
