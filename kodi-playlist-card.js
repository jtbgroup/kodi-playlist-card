class PlaylistMediaCard extends HTMLElement {
  SONG_THUMBNAIL_WIDTH = "65px";

  // the height of the epthumbnailsode of the episode in the search result
  EPISODE_THUMBNAIL_WIDTH = "150px";
  // the height of the thumbnail
  MOVIE_THUMBNAIL_WIDTH = "100px";
  BACKGROUND_BASIC_COLOR = "#9b9595";
  ICON_CURRENT_PLAYING = "mdi:arrow-left-bold";

  PLAYER_ID_MUSIC = 0;
  PLAYER_ID_VIDEO = 1;

  _config_show_thumbnail = true;
  _config_show_thumbnail_border = false;
  _config_thumbnail_border_color = "white";
  _config_show_thumbnail_overlay = true;

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

    if (this._config.hasOwnProperty("thumbnail_border_color")) {
      this._config_thumbnail_border_color = this._config.thumbnail_border_color;
    }

    if (this._config.hasOwnProperty("show_thumbnail_overlay")) {
      this._config_show_thumbnail_overlay = this._config.show_thumbnail_overlay;
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
    row.setAttribute("class", "movie-item-grid item-grid");

    let thumbnailDiv = document.createElement("div");
    thumbnailDiv.setAttribute("class", "movie-item-thumbnail");
    row.appendChild(thumbnailDiv);

    let thumbContainer = document.createElement("div");
    thumbContainer.setAttribute("class", "item-thumbnail-container");
    thumbnailDiv.appendChild(thumbContainer);

    let cover =
      item["poster"] && item["poster"] != ""
        ? item["poster"]
        : item["thumbnail"];

    if (this._config_show_thumbnail && cover != undefined && cover != "") {
      let thumbImg = document.createElement("img");
      thumbImg.setAttribute(
        "class",
        "movie-item-thumbnail-image item-thumbnail-image"
      );
      thumbImg.setAttribute("src", cover);
      thumbContainer.appendChild(thumbImg);
    } else {
      let thumbImgDefault = document.createElement("ha-icon");
      thumbImgDefault.setAttribute(
        "class",
        "movie-item-thumbnail-container-img-default item-thumbnail-container-img-default"
      );
      thumbImgDefault.setAttribute("icon", "mdi:account-circle");
      thumbContainer.appendChild(thumbImgDefault);
    }

    if (!this._config_show_thumbnail_overlay) {
      thumbContainer.addEventListener("click", () =>
        this.goTo(position, this.PLAYER_ID_VIDEO)
      );
    } else if (this._config_show_thumbnail_overlay && !isPlaying) {
      let overlayImg = document.createElement("ha-icon");
      overlayImg.setAttribute("class", "overlay-play");
      overlayImg.setAttribute("icon", "mdi:play");
      overlayImg.addEventListener("click", () =>
        this.goTo(position, this.PLAYER_ID_VIDEO)
      );
      thumbContainer.appendChild(overlayImg);
    }

    let titleDiv = document.createElement("div");
    titleDiv.setAttribute("class", "movie-item-title item-title");
    titleDiv.innerHTML = item["title"];
    row.appendChild(titleDiv);

    let genreDiv = document.createElement("div");
    genreDiv.setAttribute("class", "movie-item-genre item-genre");
    genreDiv.innerHTML = item["genre"] ? item["genre"] : "undefined";
    row.appendChild(genreDiv);

    let trashIcon = document.createElement("ha-icon");
    row.appendChild(trashIcon);
    if (isPlaying) {
      trashIcon.setAttribute("class", "movie-item-playing item-control");
      trashIcon.setAttribute("icon", this.ICON_CURRENT_PLAYING);
    } else {
      trashIcon.setAttribute("class", "movie-item-remove item-control");
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
    row.setAttribute("class", "episode-item-grid item-grid");

    let thumbnailDiv = document.createElement("div");
    thumbnailDiv.setAttribute("class", "episode-item-thumbnail");
    row.appendChild(thumbnailDiv);

    let thumbContainer = document.createElement("div");
    thumbContainer.setAttribute("class", "item-thumbnail-container");
    thumbnailDiv.appendChild(thumbContainer);

    let cover =
      item["poster"] && item["poster"] != ""
        ? item["poster"]
        : item["thumbnail"];

    if (this._config_show_thumbnail && cover && cover != "") {
      let thumbImg = document.createElement("img");
      thumbImg.setAttribute(
        "class",
        "episode-item-thumbnail-image item-thumbnail-image"
      );
      thumbImg.setAttribute("src", cover);
      thumbContainer.appendChild(thumbImg);
    } else {
      let thumbImgDefault = document.createElement("ha-icon");
      thumbImgDefault.setAttribute(
        "class",
        "episode-item-thumbnail-container-img-default item-thumbnail-container-img-default"
      );
      thumbImgDefault.setAttribute("icon", "mdi:account-circle");
      thumbContainer.appendChild(thumbImgDefault);
    }

    if (!this._config_show_thumbnail_overlay) {
      thumbContainer.addEventListener("click", () =>
        this.goTo(position, this.PLAYER_ID_VIDEO)
      );
    } else if (this._config_show_thumbnail_overlay && !isPlaying) {
      let overlayImg = document.createElement("ha-icon");
      overlayImg.setAttribute("class", "overlay-play");
      overlayImg.setAttribute("icon", "mdi:play");
      overlayImg.addEventListener("click", () =>
        this.goTo(position, this.PLAYER_ID_VIDEO)
      );
      thumbContainer.appendChild(overlayImg);
    }

    let titleDiv = document.createElement("div");
    titleDiv.setAttribute("class", "episode-item-title item-title");
    titleDiv.innerHTML = item["title"];
    row.appendChild(titleDiv);

    let genreDiv = document.createElement("div");
    genreDiv.setAttribute("class", "episode-item-genre item-genre");
    genreDiv.innerHTML = item["genre"] ? item["genre"] : "undefined";
    row.appendChild(genreDiv);

    let seasonDiv = document.createElement("div");
    seasonDiv.setAttribute("class", "episode-item-season");
    seasonDiv.innerHTML =
      "Season " +
      (item["season"] ? item["season"] : "undefined") +
      " - Episode " +
      (item["episode"] ? item["episode"] : "undefined");
    row.appendChild(seasonDiv);

    let trashIcon = document.createElement("ha-icon");
    row.appendChild(trashIcon);
    if (isPlaying) {
      trashIcon.setAttribute("class", "episode-item-playing item-control");
      trashIcon.setAttribute("icon", this.ICON_CURRENT_PLAYING);
    } else {
      trashIcon.setAttribute("class", "episode-item-remove item-control");
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
    row.setAttribute("class", "song-item-grid item-grid");

    let thumbnailDiv = document.createElement("div");
    thumbnailDiv.setAttribute("class", "song-item-thumbnail");
    row.appendChild(thumbnailDiv);

    let thumbContainer = document.createElement("div");
    thumbContainer.setAttribute("class", "item-thumbnail-container");
    thumbnailDiv.appendChild(thumbContainer);

    if (
      this._config_show_thumbnail &&
      item["thumbnail"] &&
      item["thumbnail"] != ""
    ) {
      let thumbImg = document.createElement("img");
      thumbImg.setAttribute(
        "class",
        "song-item-thumbnail-image item-thumbnail-image"
      );
      thumbImg.setAttribute("src", item["thumbnail"]);
      thumbContainer.appendChild(thumbImg);
    } else {
      let thumbImgDefault = document.createElement("ha-icon");
      thumbImgDefault.setAttribute(
        "class",
        "song-item-thumbnail-container-img-default item-thumbnail-container-img-default"
      );
      thumbImgDefault.setAttribute("icon", "mdi:account-circle");
      thumbContainer.appendChild(thumbImgDefault);
    }

    if (!this._config_show_thumbnail_overlay) {
      thumbContainer.addEventListener("click", () =>
        this.goTo(position, this.PLAYER_ID_MUSIC)
      );
    } else if (this._config_show_thumbnail_overlay && !isPlaying) {
      let overlayImg = document.createElement("ha-icon");
      overlayImg.setAttribute("class", "overlay-play");
      overlayImg.setAttribute("icon", "mdi:play");
      overlayImg.addEventListener("click", () =>
        this.goTo(position, this.PLAYER_ID_MUSIC)
      );
      thumbContainer.appendChild(overlayImg);
    }

    let titleDiv = document.createElement("div");
    titleDiv.setAttribute("class", "song-item-title item-title");
    titleDiv.innerHTML = item["artist"] + " - " + item["title"];
    row.appendChild(titleDiv);

    let genreDiv = document.createElement("div");
    genreDiv.setAttribute("class", "song-item-genre item-genre");
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
      trashIcon.setAttribute("class", "song-item-playing item-control");
      trashIcon.setAttribute("icon", this.ICON_CURRENT_PLAYING);
    } else {
      trashIcon.setAttribute("class", "song-item-remove item-control");
      trashIcon.setAttribute("icon", "mdi:delete");
      trashIcon.addEventListener("click", () =>
        this.remove(position, this.PLAYER_ID_MUSIC)
      );
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
                //// COMMUN USED
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

                .item-thumbnail-container-img-default{
                  display:flex;
                  justify-content:flex-end;
                  align-items:flex-end;
                  color: white;
                  background-color: ${this.BACKGROUND_BASIC_COLOR};
                }

                .item-thumbnail-image{
                  height:auto !important;
                  display: block;
                  justify-content:center;
                }

                .item-thumbnail-container{
                  position: relative;
                }

                .item-thumbnail-container:hover .overlay-play {
                  opacity: 1;
                }

                .item-grid {
                  display: grid;
                  column-gap:10px;
                  border-bottom:1px solid white;
                }

                .item-title{
                  font-weight: bold;
                  font-size: 14px;
                }

                .item-genre{
                  font-style: italic;
                }

                .item-control{
                  text-align: right;
                  width: 30px;
                }

                .song-item-playing, .movie-item-playing, .episode-item-playing{
                  color: rgb(3, 169, 244);
                }

                /*
                //// UNKNOWN
               */
                .unknown-item-grid{
                  display: grid;
                  grid-template-columns: auto 1fr auto auto auto;
                  grid-gap: 3px;
                  grid-auto-rows: auto;
                }

                .unknown-item-title{
                  grid-column: 2 / 4;
                  grid-row: 1;
                  font-weight: bold;
                  font-size: 14px;
                }

                .unknown-message{
                  grid-column: 2;
                  grid-row: 3;
                }

                .unknown-item-remove, .unknown-item-remove-alt{
                  grid-column: 4;
                  grid-row: 1;
                  text-align: right;
                  width: 30px;
                }

               /*
                //// SONGS
               */

                .song-item-grid{
                  grid-template-columns: auto 1fr auto auto;
                  grid-auto-rows: auto;
                }

                .song-item-title{
                  grid-column: 2 / 4;
                  grid-row: 1;
                }

                .song-item-genre{
                  grid-column: 2 / 4;
                  grid-row: 2;
                }

                .song-item-album{
                  grid-column: 2 / 5;
                  grid-row: 3;
                }

                .song-item-duration{
                  grid-column: 3 / 5;
                  grid-row: 3;
                  text-align: right;
                }

                .song-item-remove, .song-item-playing{
                  grid-column: 4 / 5;
                  grid-row: 1 / 3;
                }

                .song-item-thumbnail{
                  grid-column: 1;
                  grid-row: 1 /5 ;
                }

                .song-item-thumbnail-image{
                  width: ${this.SONG_THUMBNAIL_WIDTH};
                }

                .song-item-thumbnail-container-img-default{
                  width: ${this.SONG_THUMBNAIL_WIDTH};
                  height: ${this.SONG_THUMBNAIL_WIDTH};
                  --mdc-icon-size: calc(${this.SONG_THUMBNAIL_WIDTH} - 30px);
                }


                /*
                //// MOVIES
               */

                .movie-item-grid{
                  grid-template-columns: auto 1fr auto;
                  grid-auto-rows: auto;
                }

                .movie-item-title{
                  grid-column: 2;
                  grid-row: 1;
                }

                .movie-item-genre{
                  grid-column: 2;
                  grid-row: 2;
                }

                .movie-item-remove, .movie-item-playing{
                  grid-column: 3;
                  grid-row: 1 / 3;
                }

                .movie-item-thumbnail{
                  grid-column: 1;
                  grid-row: 1 / 4 ;

                }

                .movie-item-thumbnail-image{
                  width: ${this.MOVIE_THUMBNAIL_WIDTH};
                }

                .movie-item-thumbnail-container-img-default{
                  width: ${this.MOVIE_THUMBNAIL_WIDTH};
                  height: ${this.MOVIE_THUMBNAIL_WIDTH};
                  --mdc-icon-size: calc(${this.MOVIE_THUMBNAIL_WIDTH} - 30px);
                }


              /*
                //// EPISODE
               */
                .episode-item-grid{
                  grid-template-columns: auto 1fr auto;
                  grid-auto-rows: auto;
                }

                .episode-item-title{
                  grid-column: 2;
                  grid-row: 1;
                }

                .episode-item-genre{
                  grid-column: 2;
                  grid-row: 2;
                }

                .episode-item-season{
                  grid-column: 2;
                  grid-row: 3;
                }

                .episode-item-remove, .episode-item-playing{
                  grid-column: 3;
                  grid-row: 1 / 3;
                }

                .episode-item-thumbnail{
                  grid-column: 1;
                  grid-row: 1 / 4 ;

                }

                .episode-item-thumbnail-image{
                  width: ${this.EPISODE_THUMBNAIL_WIDTH};
                }

                .episode-item-thumbnail-container-img-default{
                  width: ${this.EPISODE_THUMBNAIL_WIDTH};
                  height: ${this.EPISODE_THUMBNAIL_WIDTH};
                  --mdc-icon-size: calc(${this.EPISODE_THUMBNAIL_WIDTH} - 30px);
                }

          `;

    if (this._config_show_thumbnail_border) {
      css +=
        `
         .song-item-thumbnail-image, .movie-item-thumbnail-image, .episode-item-thumbnail-image{
                border: 1px solid ` +
        this._config_thumbnail_border_color +
        `;
    }
    `;
    }

    return css;
  }
}
customElements.define("kodi-playlist-card", PlaylistMediaCard);
