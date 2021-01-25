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
    this.playerTypeDiv.innerHTML = `<ha-icon icon="mdi:movie"></ha-icon> Playlist`;
    this.content.innerHTML = "";
    this.content.innerHTML = `<div class="playerType"><ha-icon icon="mdi:movie"></ha-icon> Playlist</div>`;
    for (let count = 1; count <= max; count++) {
      const item = (key) => json[count][key];

      row = document.createElement("div");
      row.setAttribute("class", "inner-item");

      thumbnailDiv = document.createElement("div");
      thumbnailDiv.setAttribute("class", "thumbnailCell");
      url = "background-image: url('" + item("thumbnail") + "')";
      thumbnailDiv.setAttribute("style", "url");
      row.appendChild(thumbnailDiv);

      titleDiv = document.createElement("div");
      titleDiv.setAttribute("class", "titleCell");
      titleDiv.innerHTML = item("label");
      row.appendChild(titleDiv);

      genreDiv = document.createElement("div");
      genreDiv.setAttribute("class", "genreCell");
      genreDiv.innerHTML = item("genre") ? item("genre") : "undefined";
      row.appendChild(genreDiv);

      trashIcon = document.createElement("ha-icon");
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
    this.playerTypeDiv.innerHTML = `<ha-icon icon="mdi:music"></ha-icon> Playlist`;
    this.content.innerHTML = "";
    for (let count = 1; count <= max; count++) {
      const item = (key) => json[count][key];
      let row = document.createElement("div");
      row.setAttribute("class", "inner-item");

      let thumbnailDiv = document.createElement("div");
      thumbnailDiv.setAttribute("class", "thumbnailCell");
      let url = "background-image: url('" + item("thumbnail") + "')";
      thumbnailDiv.setAttribute("style", url);
      row.appendChild(thumbnailDiv);

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

      if (count < max) {
        row.appendChild(document.createElement("br"));
        row.appendChild(document.createElement("br"));
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
  // set hass(hass) {
  //   if (!this.content) {
  //     this._hass = hass;
  //     this.card = document.createElement("ha-card");
  //     this.card.header = this.config.title;
  //     this.content = document.createElement("div");
  //     this.content.style.padding = "5px 10px";
  //     this.card.appendChild(this.content);
  //     this.appendChild(this.card);
  //   }
  //   let style = document.createElement("style");
  //   style.textContent = `

  //               // .thumbnailCell, .titleCell, .genreCell, .albumCell, .durationCell, .removeCell{
  //               //   border: 1px solid orange;
  //               // }
  //               .playerType{
  //                 width: 100%;
  //                 height: 50px;
  //                 text-align: right;
  //                 font-weight: bold;
  //                 font-size: 18px;
  //               }

  //               .inner-item{
  //                 display: grid;
  //                 grid-template-columns: 65px 1fr auto auto;
  //                 grid-gap: 3px;
  //                 grid-auto-rows: auto;
  //               }

  //               .thumbnailCell{
  //                 grid-column-start: 1;
  //                 grid-column-end: 2;
  //                 grid-row-start: 1;
  //                 grid-row-end: 4;
  //                 display: block;
  //                 background-size: contain;
  //                 background-repeat: no-repeat;
  //                 width: 65px;
  //                 height: 65px;
  //               }

  //               .thumbnailPlayCell{
  //                 grid-column-start: 1;
  //                 grid-column-end: 2;
  //                 grid-row-start: 1;
  //                 grid-row-end: 4;
  //                 background-color: rgba(255, 255, 255, .4);
  //                 display: block;
  //                 background-size: cover;
  //                 width: 65px;
  //                 height: 65px;
  //                 color: BLACK;
  //               }

  //               .titleCell{
  //                 grid-column-start: 2;
  //                 grid-column-end: end-1;
  //                 grid-row-start: 1;
  //                 grid-row-end: 2;
  //                 font-weight: bold;
  //                 font-size: 14px;
  //                 // background: rgb(230,230,230);
  //                 // background: linear-gradient(90deg, rgba(230,230,230,1) 10%, rgba(255,255,255,1) 90%);
  //               }
  //               .genreCell{
  //                 grid-column-start: 2;
  //                 grid-column-end: 3;
  //                 grid-row-start: 2;
  //                 grid-row-end: 3;
  //                 font-style: italic;
  //               }
  //               .albumCell{
  //                 grid-column-start: 2;
  //                 grid-column-end: 3;
  //                 grid-row-start: 3;
  //                 grid-row-end: 4;
  //               }
  //               .durationCell{
  //                 grid-column-start: 3;
  //                 grid-column-end: end;
  //                 grid-row-start: 3;
  //                 grid-row-end: 4;
  //                 text-align: right;
  //               }

  //               .removeCell{
  //                 grid-column-start: 4;
  //                 grid-column-end: end;
  //                 grid-row-start: 1;
  //                 grid-row-end: 2;
  //                 text-align: right;
  //                 display:flex;
  //                 justify-content:flex-end;
  //                 align-items:flex-end;
  //                 width: 30px;
  //               }

  //               .removeCell:hover, .thumbnailPlayCell:hover{
  //                 color: red;
  //               }
  //         `;

  //   // MY CODE
  //   const entity = this.config.entity;
  //   let data = hass.states[entity].attributes.data;
  //   const json =
  //     typeof data == "object"
  //       ? hass.states[entity].attributes.data
  //       : JSON.parse(hass.states[entity].attributes.data);
  //   const max = json.length - 1;
  //   const playerType = json[0]["player_type"].toLowerCase();
  //   const kodi_entity_id = json[0]["kodi_entity_id"];
  //   //const max = Math.min(json.length - 1, this.config.max || 5);

  //   this.content.innerHTML = ``;

  //   if (playerType == "video") {
  //     this.content.innerHTML += `<div class="playerType"><ha-icon icon="mdi:movie"></ha-icon> Playlist</div>`;
  //     for (let count = 1; count <= max; count++) {
  //       const item = (key) => json[count][key];
  //       this.content.innerHTML += `
  //         <div class="inner-item">
  //           <div class="thumbnailCell" style="background-image: url('${item(
  //             "thumbnail"
  //           )}')"> </div>
  //           <div class="titleCell">${item("label")}</div>
  //           <div class="genreCell">${
  //             item("genre") ? item("genre") : "undefined"
  //           }</div>
  //           <ha-icon class="removeCell" position="${
  //             count - 1
  //           }" icon="mdi:delete"></ha-icon>
  //         </div>
  //         `;
  //       if (count < max) {
  //         this.content.innerHTML += `<br>`;
  //       }
  //     }
  //     this._bindButtons(this.card, this._hass, this.config, kodi_entity_id);
  //   } else if (playerType == "audio") {
  //     this.content.innerHTML += `<div class="playerType"><ha-icon icon="mdi:music"></ha-icon> Playlist</div>`;
  //     for (let count = 1; count <= max; count++) {
  //       const item = (key) => json[count][key];
  //       this.content.innerHTML += `
  //         <div class="inner-item">
  //           <div class="thumbnailCell" style="background-image: url('${item(
  //             "thumbnail"
  //           )}')"> </div>
  //           <ha-icon class="thumbnailPlayCell" icon="mdi:play" position="${
  //             count - 1
  //           }"></ha-icon>
  //           <div class="titleCell">${item("label")}</div>
  //           <div class="genreCell">${
  //             item("genre") ? item("genre") : "undefined"
  //           }</div>
  //           <div class="albumCell">${item("album")}</div>
  //           <div class="durationCell">${new Date(item("duration") * 1000)
  //             .toISOString()
  //             .substr(11, 8)}</div>
  //           <ha-icon class="removeCell" position="${
  //             count - 1
  //           }" icon="mdi:delete"></ha-icon>
  //         </div>
  //         `;
  //       if (count < max) {
  //         this.content.innerHTML += `<br>`;
  //       }
  //     }
  //     this._bindButtons(this.card, this._hass, this.config, kodi_entity_id);
  //   } else {
  //     this.content.innerHTML += `<div class="playerType">No playlist found</div>`;
  //   }
  //   this.appendChild(style);
  // }

  // _bindButtons(card, hass, config, kodi_entity_id) {
  //   //GoTo buttons
  //   var buttons = card.getElementsByClassName(`thumbnailPlayCell`);
  //   var i;
  //   for (i = 0; i < buttons.length; i++) {
  //     let button = buttons[i];
  //     button.addEventListener("click", function (source) {
  //       const posn = parseInt(button.getAttribute("position"));
  //       hass.callService("kodi", "call_method", {
  //         entity_id: kodi_entity_id,
  //         method: "Player.GoTo",
  //         playerid: 0,
  //         to: posn,
  //       });
  //     });
  //   }

  //   // Remove buttons
  //   var removeButtons = card.getElementsByClassName(`removeCell`);
  //   var i;
  //   for (i = 0; i < removeButtons.length; i++) {
  //     let removeButton = removeButtons[i];
  //     removeButton.addEventListener("click", function (source) {
  //       const posn = parseInt(removeButton.getAttribute("position"));
  //       hass.callService("kodi", "call_method", {
  //         entity_id: kodi_entity_id,
  //         method: "Playlist.Remove",
  //         playlistid: 0,
  //         position: posn,
  //       });
  //       hass.callService("homeassistant", "update_entity", {
  //         entity_id: config.entity,
  //       });
  //     });
  //   }
  // }

  // setConfig(config) {
  //   if (!config.service && !config.entity && !config.entityPlayer)
  //     throw new Error("Define entity.");
  //   this.config = config;
  // }
  // getCardSize() {
  //   // let view = this.config.image_style || "poster";
  //   // return view == "poster" ? window.cardSize * 5 : window.cardSize * 3;
  //   return 1;
  // }
}
customElements.define("kodi-playlist-card", PlaylistMediaCard);
