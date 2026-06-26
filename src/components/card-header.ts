import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("kodi-card-header")
export class KodiCardHeader extends LitElement {
  @property() title = "Kodi Playlist";
  @property() statusState = "unavailable";

  static styles = css`
    :host {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
    }
    .card-title {
      margin: 0;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .kodi-icon {
      color: var(--accent-color);
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      transition: background 0.3s ease;
    }
    .status-dot.fixed-green { background: var(--success-color); }
    .status-dot.fixed-orange { background: var(--warning-color); }
    .status-dot.fixed-red { background: var(--error-color); }
    .status-dot.flashing-green {
      background: var(--success-color);
      animation: pulse-dot 1s infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `;

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