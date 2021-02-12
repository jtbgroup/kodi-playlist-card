class PlaylistMediaCard extends HTMLElement {
  setConfig(config) {
    this._config = config;

    // Example configuration:
    //
    // type: custom:my-custom-card2
    // entity: light.bed_light
    //

    if (!config.entity) {
      // If no entity was specified, this will display a red error card with the message below
      throw new Error("You need to define an entity");
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
      this.playerTypeDiv.setAttribute("class", "playerType");
      card.appendChild(this.playerTypeDiv);

      this.content = document.createElement("div");
      card.appendChild(this.content);

      // this.button = document.createElement("button");
      // this.button.addEventListener("click", () => this.buttonClicked());
      // card.appendChild(this.button);

      let style = document.createElement("style");
      style.textContent = this.defineCSS();
      this.appendChild(style);

      this.appendChild(card);
      this.setupComplete = true;
    }
  }

  defineCSS() {
    return `
                // .thumbnailCell, .titleCell, .genreCell, .albumCell, .durationCell, .removeCell{
                //   border: 1px solid orange;
                // }
                .playerType{
                  width: 100%;
                  height: 50px;
                  text-align: right;
                  font-weight: bold;
                  font-size: 18px;
                }

                .inner-item{
                  display: grid;
                  grid-template-columns: 65px 1fr auto auto;
                  grid-gap: 3px;
                  grid-auto-rows: auto;
                }

                .thumbnailCell{
                  grid-column-start: 1;
                  grid-column-end: 2;
                  grid-row-start: 1;
                  grid-row-end: 4;
                  display: block;
                  background-size: contain;
                  background-repeat: no-repeat;
                  width: 65px;
                  height: 65px;
                }

                .thumbnailPlayCell{
                  grid-column-start: 1;
                  grid-column-end: 2;
                  grid-row-start: 1;
                  grid-row-end: 4;
                  background-color: rgba(255, 255, 255, .4);
                  display: block;
                  background-size: cover;
                  width: 65px;
                  height: 65px;
                  color: BLACK;
                }

                .titleCell{
                  grid-column-start: 2;
                  grid-column-end: end-1;
                  grid-row-start: 1;
                  grid-row-end: 2;
                  font-weight: bold;
                  font-size: 14px;
                  // background: rgb(230,230,230);
                  // background: linear-gradient(90deg, rgba(230,230,230,1) 10%, rgba(255,255,255,1) 90%);
                }
                .genreCell{
                  grid-column-start: 2;
                  grid-column-end: 3;
                  grid-row-start: 2;
                  grid-row-end: 3;
                  font-style: italic;
                }
                .albumCell{
                  grid-column-start: 2;
                  grid-column-end: 3;
                  grid-row-start: 3;
                  grid-row-end: 4;
                }
                .durationCell{
                  grid-column-start: 3;
                  grid-column-end: end;
                  grid-row-start: 3;
                  grid-row-end: 4;
                  text-align: right;
                }

                .removeCell{
                  grid-column-start: 4;
                  grid-column-end: end;
                  grid-row-start: 1;
                  grid-row-end: 2;
                  text-align: right;
                  display:flex;
                  justify-content:flex-end;
                  align-items:flex-end;
                  width: 30px;
                }

                .removeCell:hover, .thumbnailPlayCell:hover{
                  color: red;
                }
          `;
  }

  set hass(hass) {
    this._hass = hass;
    // Update the card in case anything has changed
    if (!this._config) return; // Can't assume setConfig is called before hass is set

    this._hass.callService("homeassistant", "update_entity", {
      entity_id: this._config.entity,
    });

    const entity = this._config.entity;
    let data = hass.states[entity].attributes.data;
    const json =
      typeof data == "object"
        ? hass.states[entity].attributes.data
        : JSON.parse(hass.states[entity].attributes.data);
    const max = json.length - 1;
    const playerType = json[0]["player_type"].toLowerCase();
    const kodi_entity_id = json[0]["kodi_entity_id"];
    //const max = Math.min(json.length - 1, this.config.max || 5);

    if (playerType == "video") {
      this.fillVideoPlaylist(max, json);
    } else if (playerType == "audio") {
      this.fillAudioPlaylist(max, json, kodi_entity_id);
    } else {
      this.playerTypeDiv.innerHTML = `<div class="playerType">No playlist found</div>`;
      this.content.innerHTML = "";
    }
  }

  fillVideoPlaylist(max, json, kodi_entity_id) {
    this.playerTypeDiv.innerHTML = `Movie Playlist <ha-icon icon="mdi:movie"></ha-icon>`;
    this.content.innerHTML = "";
    for (let count = 1; count <= max; count++) {
      const item = (key) => json[count][key];

      let row = document.createElement("div");
      row.setAttribute("class", "inner-item");

      if (this._config.show_thumbnail) {
        let thumbnailDiv = document.createElement("div");
        thumbnailDiv.setAttribute("class", "thumbnailCell");
        let url = "background-image: url('" + item("thumbnail") + "')";
        thumbnailDiv.setAttribute("style", "url");
        row.appendChild(thumbnailDiv);
      }

      let titleDiv = document.createElement("div");
      titleDiv.setAttribute("class", "titleCell");
      titleDiv.innerHTML = item("label");
      row.appendChild(titleDiv);

      let genreDiv = document.createElement("div");
      genreDiv.setAttribute("class", "genreCell");
      genreDiv.innerHTML = item("genre") ? item("genre") : "undefined";
      row.appendChild(genreDiv);

      let trashIcon = document.createElement("ha-icon");
      trashIcon.setAttribute("class", "removeCell");
      trashIcon.setAttribute("icon", "mdi:delete");
      trashIcon.addEventListener("click", () =>
        this.remove(kodi_entity_id, count - 1)
      );
      row.appendChild(trashIcon);

      if (count < max) {
        row.appendChild(document.createElement("br"));
      }
    }
    // this._bindButtons(this.card, this._hass, this.config, kodi_entity_id);
  }

  fillAudioPlaylist(max, json, kodi_entity_id) {
    this.playerTypeDiv.innerHTML = `Audio Playlist <ha-icon icon="mdi:music"></ha-icon>`;
    this.content.innerHTML = "";
    for (let count = 1; count <= max; count++) {
      const item = (key) => json[count][key];
      let row = document.createElement("div");
      row.setAttribute("class", "inner-item");

      if (this._config.show_thumbnail) {
        let thumbnailDiv = document.createElement("div");
        thumbnailDiv.setAttribute("class", "thumbnailCell");
        let url = "background-image: url('" + item("thumbnail") + "')";
        thumbnailDiv.setAttribute("style", url);
        row.appendChild(thumbnailDiv);
      }

      let thumbnailPlayDiv = document.createElement("ha-icon");
      thumbnailPlayDiv.setAttribute("class", "thumbnailPlayCell");
      thumbnailPlayDiv.setAttribute("icon", "mdi:play");
      thumbnailPlayDiv.addEventListener("click", () =>
        this.goTo(kodi_entity_id, count - 1)
      );
      row.appendChild(thumbnailPlayDiv);

      let titleDiv = document.createElement("div");
      titleDiv.setAttribute("class", "titleCell");
      titleDiv.innerHTML = item("label");
      row.appendChild(titleDiv);

      let genreDiv = document.createElement("div");
      genreDiv.setAttribute("class", "genreCell");
      genreDiv.innerHTML = item("genre") ? item("genre") : "undefined";
      row.appendChild(genreDiv);

      let albumDiv = document.createElement("div");
      albumDiv.setAttribute("class", "albumCell");
      albumDiv.innerHTML = item("album");
      row.appendChild(albumDiv);

      let durationDiv = document.createElement("div");
      durationDiv.setAttribute("class", "durationCell");
      durationDiv.innerHTML = new Date(item("duration") * 1000)
        .toISOString()
        .substr(11, 8);
      row.appendChild(durationDiv);

      let trashIcon = document.createElement("ha-icon");
      trashIcon.setAttribute("class", "removeCell");
      trashIcon.setAttribute("icon", "mdi:delete");
      trashIcon.addEventListener("click", () =>
        this.remove(kodi_entity_id, count - 1)
      );
      row.appendChild(trashIcon);

      if (count - 1 < max) {
        this.content.appendChild(document.createElement("br"));
      }

      this.content.appendChild(row);
    }
    //     this._bindButtons(this.card, this._hass, this.config, kodi_entity_id);
  }

  goTo(kodi_entity_id, posn) {
    this._hass.callService("kodi", "call_method", {
      entity_id: kodi_entity_id,
      method: "Player.GoTo",
      playerid: 0,
      to: posn,
    });
    this._hass.callService("homeassistant", "update_entity", {
      entity_id: this._config.entity,
    });
  }

  remove(kodi_entity_id, posn) {
    this._hass.callService("kodi", "call_method", {
      entity_id: kodi_entity_id,
      method: "Playlist.Remove",
      playlistid: 0,
      position: posn,
    });
    this._hass.callService("homeassistant", "update_entity", {
      entity_id: this._config.entity,
    });
  }
}
customElements.define("kodi-playlist-card", PlaylistMediaCard);
