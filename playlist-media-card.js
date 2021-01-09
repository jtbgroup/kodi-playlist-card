class PlaylistMediaCard extends HTMLElement {
  set hass(hass) {
    if (!this.content) {
      const card = document.createElement("ha-card");
      card.header = this.config.title;
      this.content = document.createElement("div");
      this.content.style.padding = "5px 10px";
      card.appendChild(this.content);
      this.appendChild(card);
    }

    let style = document.createElement("style");
    style.setAttribute("id", "umc_style");

    style.textContent = `
                li {
                  border: 1px solid #ccc;
                }

                .playlist-items{
                  list-style-type: none
                }

                .inner-item{
                  display: grid;
                  grid-template-columns: 55px auto 50px;
                  grid-gap: 5px;
                  grid-auto-rows: auto;
                }
                .thumb_img{
                  width: 50px;
                  height: 50px;
                  display: block;
                  background-size: cover;
                }

                .thumbnail {
                  grid-column-start: 1;
                  grid-column-end: 2;
                  grid-row-start: 1;
                  grid-row-end: 4;
                  border: 1px solid orange;
                }

                .title{
                  border: 1px solid red;
                  grid-column-start: 2;
                  grid-column-end: end;
                  grid-row-start: 1;
                  grid-row-end: 2;
                }

                .album{
                  border: 1px solid green;
                  grid-column-start: 2;
                  grid-column-end: 3;
                  grid-row-start: 2;
                  grid-row-end: 3;
                }
                .genre{
                  border: 1px solid yellow;
                  grid-column-start: 2;
                  grid-column-end: 3;
                  grid-row-start: 3;
                  grid-row-end: 4;
                }
                .duration{
                  border: 1px solid black;
                  grid-column-start: 3;
                  grid-column-end: end;
                  grid-row-start: 2;
                  grid-row-end: 3;
                  text-align: right;
                }
          `;

    // MY CODE
    const entity = this.config.entity;
    let data = hass.states[entity].attributes.data
    const json = typeof (data) == "object" ? hass.states[entity].attributes.data : JSON.parse(hass.states[entity].attributes.data);
    const max = json.length - 1;
    //const max = Math.min(json.length - 1, this.config.max || 5);

    this.content.innerHTML = "";
    for (let count = 1; count <= max; count++) {
      const item = key => json[count][key];
      this.content.innerHTML += `
        <div>
          <ul class="playlist-items">
            <li>
              <div class="inner-item">
                <div class="thumbnail">
                  <div class="thumb_img" style="background-image: url('${item("thumbnail")}')"></div>
                </div>
                <div class="title">${item("label")}</div>
                <div class="album">${item("album")}</div>
                <div class="genre">${item("genre")}</div>
                <div class="duration">${new Date(item("duration") * 1000).toISOString().substr(11, 8)}</div>
              </div>
            </li>
          </ul>
        </div>
        `;
      if (count < max) {
        this.content.innerHTML += `<br>`
      }
    }

    if (!this.querySelector('[id="umc_style"]')) this.appendChild(style);
  }

  next() {
    //    this._hass.callService("notify", "persistent_notification", { message: "The garage door has been open for 10 minutes.", title: "Your Garage Door Friend" });
    this._hass.callService("kodi", "call_method", { entity_id: this.entityId, method: "Player.GoTo", playerid: 0, to: "next" });
  }


  setConfig(config) {
    if (!config.service && !config.entity)
      throw new Error("Define entity.");
    this.config = config;
  }
  getCardSize() {
    // let view = this.config.image_style || "poster";
    // return view == "poster" ? window.cardSize * 5 : window.cardSize * 3;
    return 1;
  }
}
customElements.define("playlist-media-card", PlaylistMediaCard);
