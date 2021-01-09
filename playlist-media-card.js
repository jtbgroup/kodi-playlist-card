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
              .song_title {
                  font-weight: bold;
                  font-size: 12px;
                }
                .song_artist {
                  font-style: italic;
                  font-size: 10px;
                }
                .song_album {
                  font-size: 10px;
                }
                img{
                  border: 1px solid #ddd;
                  border-radius: 4px;
                  padding: 5px;
                  width: 64px;
                  height: 64px;
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
          <ul>
            <li>
              <div class="inner-item">

                <div class="meta">${item("label")}</div>
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
