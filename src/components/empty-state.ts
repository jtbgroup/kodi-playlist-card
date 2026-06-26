import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("kodi-empty-state")
export class KodiEmptyState extends LitElement {
  @property() icon = "mdi:playlist-music";
  @property() message = "Empty playlist";

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 12px;
      padding: 40px 16px;
      color: var(--secondary-text-color);
      text-align: center;
    }
    ha-icon {
      --icon-size: 48px;
      opacity: 0.5;
    }
  `;

  protected render() {
    return html`
      <ha-icon icon="${this.icon}"></ha-icon>
      <div>${this.message}</div>
    `;
  }
}