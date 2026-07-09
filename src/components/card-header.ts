import { LitElement, html, css, CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators.js";
import { cardHeaderCSS } from "../styles/card-header.style";


@customElement("kodi-card-header")
export class KodiCardHeader extends LitElement {
  @property() title = "Kodi Playlist";
  @property() statusState = "unavailable";
  static get styles(): CSSResultGroup {
        return [cardHeaderCSS];
    }


  protected render() {
    let statusClass = "fixed-green";
    if (this.statusState === "off" || this.statusState === "unavailable") {
      statusClass = "fixed-red";
    } else if (this.statusState === "playing") {
      statusClass = "flashing-green";
    } else if (["paused", "stopped"].includes(this.statusState)) {
      statusClass = "fixed-green";
    } else if (this.statusState === "idle") {
      statusClass = "fixed-orange";
    }

    return html`
      <h3 class="card-title">
        <ha-icon class="kodi-icon" icon="mdi:kodi"></ha-icon> ${this.title}
      </h3>
      <div class="status-dot ${statusClass}"></div>
    `;
  }
}