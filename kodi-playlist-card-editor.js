// import { html, LitElement } from "https://unpkg.com/lit?module";

// class KodiPlaylistCardEditor extends LitElement {
//   static get properties() {
//     return {
//       hass: {},
//       _config: {},
//     };
//   }

//   // setConfig works the same way as for the card itself
//   setConfig(config) {
//     this._config = config;
//   }

//   // This function is called when the input element of the editor loses focus
//   entityChanged(ev) {
//     // We make a copy of the current config so we don't accidentally overwrite anything too early
//     const _config = Object.assign({}, this._config);
//     // Then we update the entity value with what we just got from the input field
//     _config.entity = ev.target.value;
//     // And finally write back the updated configuration all at once
//     this._config = _config;

//     // A config-changed event will tell lovelace we have made changed to the configuration
//     // this make sure the changes are saved correctly later and will update the preview
//     const event = new CustomEvent("config-changed", {
//       detail: { config: _config },
//       bubbles: true,
//       composed: true,
//     });
//     this.dispatchEvent(event);
//   }

//   render() {
//     if (!this.hass || !this._config) {
//       return html``;
//     }

//     // @focusout below will call entityChanged when the input field loses focus (e.g. the user tabs away or clicks outside of it)
//     return html`
//     Entity:
//     <input
//     .value=${this._config.entity}
//     @focusout=${this.entityChanged}
//     ></input>
//     `;
//   }
// }

// customElements.define("kodi-playlist-card-editor", KodiPlaylistCardEditor);

// window.customCards = window.customCards || [];
// window.customCards.push({
//   type: "kodi-playlist-card",
//   name: "Kodi Playlist Card",
//   preview: false, // Optional - defaults to false
//   description: "Shows the playlist of Kodi", // Optional
// });

// Used weather-card-editor.js from Weather Card as template
// https://github.com/bramkragten/weather-card

const fireEvent = (node, type, detail, options) => {
  options = options || {};
  detail = detail === null || detail === undefined ? {} : detail;
  const event = new Event(type, {
    bubbles: options.bubbles === undefined ? true : options.bubbles,
    cancelable: Boolean(options.cancelable),
    composed: options.composed === undefined ? true : options.composed,
  });
  event.detail = detail;
  node.dispatchEvent(event);
  return event;
};

if (
  !customElements.get("ha-switch") &&
  customElements.get("paper-toggle-button")
) {
  customElements.define("ha-switch", customElements.get("paper-toggle-button"));
}

const LitElement = customElements.get("hui-masonry-view")
  ? Object.getPrototypeOf(customElements.get("hui-masonry-view"))
  : Object.getPrototypeOf(customElements.get("hui-view"));
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

const HELPERS = window.loadCardHelpers();

export class KodiPlaylistCardEditor extends LitElement {
  setConfig(config) {
    this._config = { ...config };
  }

  static get properties() {
    return { hass: {}, _config: {} };
  }

  get _entity() {
    return this._config.entity;
  }

  get _show_thumbnail() {
    return this._config.show_thumbnail;
  }

  get _show_thumbnail_border() {
    return this._config.show_thumbnail_border;
  }

  get _show_thumbnail_overlay() {
    return this._config.show_thumbnail_overlay;
  }

  get _thumbnail_border_color() {
    return this._config.thumbnail_border_color;
  }

  // WHAT DOES THIS DO?
  firstUpdated() {
    HELPERS.then((help) => {
      if (help.importMoreInfoControl) {
        help.importMoreInfoControl("fan");
      }
    });
  }

  render() {
    if (!this.hass) {
      return html``;
    }

    // WHAT DOES THIS DO?
    const entities = Object.keys(this.hass.states).filter(
      (eid) => eid.substr(0, eid.indexOf(".")) === "sensor"
    );

    // return html`
    //   <div class="card-config">
    //     <div>
    //       ${customElements.get("ha-entity-picker")
    //         ? html`
    //             <ha-entity-picker
    //               label="Air Pollution Level Sensor Entity"
    //               .hass="${this.hass}"
    //               .value="${this._air_pollution_level}"
    //               .configValue=${"air_pollution_level"}
    //               domain-filter="sensor"
    //               @change="${this._valueChanged}"
    //               allow-custom-entity
    //             ></ha-entity-picker>
    //           `
    //         : html``}
    //       <ha-entity-picker
    //         label="Air Quality Index Sensor"
    //         .hass="${this.hass}"
    //         .value="${this._air_quality_index}"
    //         .configValue=${"air_quality_index"}
    //         domain-filter="sensor"
    //         @change="${this._valueChanged}"
    //         allow-custom-entity
    //       ></ha-entity-picker>
    //       <ha-entity-picker
    //         label="Main Pollutant Sensor"
    //         .hass="${this.hass}"
    //         .value="${this._main_pollutant}"
    //         .configValue=${"main_pollutant"}
    //         domain-filter="sensor"
    //         @change="${this._valueChanged}"
    //         allow-custom-entity
    //       ></ha-entity-picker>
    //       <ha-entity-picker
    //         label="Weather Entity (Optional)"
    //         .hass="${this.hass}"
    //         .value="${this._weather}"
    //         .configValue=${"weather"}
    //         @change="${this._valueChanged}"
    //         allow-custom-entity
    //       ></ha-entity-picker>
    //       <paper-input
    //         label="City Name (Optional)"
    //         .value="${this._city}"
    //         .configValue="${"city"}"
    //         @value-changed="${this._valueChanged}"
    //       ></paper-input>
    //       <paper-input
    //         label="Country Name (Optional)"
    //         .value="${this._country}"
    //         .configValue="${"country"}"
    //         @value-changed="${this._valueChanged}"
    //       ></paper-input>
    //       <paper-input
    //         label="Speed Unit (Optional)"
    //         .value="${this._speed_unit}"
    //         .configValue="${"speed_unit"}"
    //         @value-changed="${this._valueChanged}"
    //       ></paper-input>
    //       <paper-input
    //         label="Icons location (Optional)"
    //         .value="${this._icons}"
    //         .configValue="${"icons"}"
    //         @value-changed="${this._valueChanged}"
    //       ></paper-input>
    //       <div class="switches">
    //         <div class="switch">
    //           <ha-switch
    //             .checked=${this._hide_title}
    //             .configValue="${"hide_title"}"
    //             @change="${this._valueChanged}"
    //           ></ha-switch
    //           ><span>Hide Title</span>
    //         </div>
    //         <div class="switch">
    //           <ha-switch
    //             .checked=${this._hide_weather}
    //             .configValue="${"hide_weather"}"
    //             @change="${this._valueChanged}"
    //           ></ha-switch
    //           ><span>Hide Weather</span>
    //         </div>
    //         <div class="switch">
    //           <ha-switch
    //             .checked=${this._hide_face}
    //             .configValue="${"hide_face"}"
    //             @change="${this._valueChanged}"
    //           ></ha-switch
    //           ><span>Hide Face</span>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    // `;
    return html`
      <div class="card-config">
        <div class="switch">
          <ha-entity-picker
            label="Playlist sensor entity"
            .hass="${this.hass}"
            .value="${this._config.entity}"
            .configValue=${"entity"}
            domain-filter="sensor"
            @change="${this._valueChanged}"
            allow-custom-entity
          ></ha-entity-picker>
        </div>

        <div class="switch">
          <ha-switch
            .checked=${this._config.show_thumbnail}
            .configValue="${"show_thumbnail"}"
            @change="${this._valueChanged}"
          ></ha-switch
          ><span>Show thumbnail</span>
        </div>

        <div class="switch">
          <ha-switch
            .checked=${this._config.show_thumbnail_border}
            .configValue="${"show_thumbnail_border"}"
            @change="${this._valueChanged}"
          ></ha-switch
          ><span>Show thumbnail border</span>
        </div>

        <div class="switch">
          <paper-input
            label="Thumbnail border color"
            .configValue="${"thumbnail_border_color"}"
            .value=${this._config.thumbnail_border_color}
            @value-changed=${this._valueChanged}
          ></paper-input
          ><span>Thumbnail border color</span>
        </div>

        <div class="switch">
          <ha-switch
            .checked=${this._config.show_thumbnail_overlay}
            .configValue="${"show_thumbnail_overlay"}"
            @change="${this._valueChanged}"
          ></ha-switch
          ><span>Show thumbnail overlay</span>
        </div>
      </div>
    `;
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }
    if (target.configValue) {
      if (target.value === "") {
        delete this._config[target.configValue];
      } else {
        this._config = {
          ...this._config,
          [target.configValue]:
            target.checked !== undefined ? target.checked : target.value,
        };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  static get styles() {
    return css`
      .switches {
        margin: 8px 0;
        display: flex;
        justify-content: space-between;
      }
      .switch {
        display: flex;
        align-items: center;
        justify-items: center;
      }
      .switches span {
        padding: 0 16px;
      }
    `;
  }
}

customElements.define("kodi-playlist-card-editor", KodiPlaylistCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "kodi-playlist-card",
  name: "Kodi Playlist Card",
  preview: false, // Optional - defaults to false
  description: "Shows the playlist of Kodi", // Optional
});
