import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { PlaylistItem as PlaylistItemType, KodiPlaylistCardConfig } from "../types";
import "./playlist-item";

@customElement("kodi-playlist-container")
export class KodiPlaylistContainer extends LitElement {
  @property({ type: Array }) items: PlaylistItemType[] = [];
  @property({ type: Number }) currentIndex = -1;
  @property({ type: Object }) config!: KodiPlaylistCardConfig;
  @property({ type: Object }) thumbnailCache: Map<string, string> = new Map();

  @state() private _draggedIndex = -1;
  @state() private _dragOverIndex = -1;

  static styles = css`
    .playlist-items-container {
      list-style: none;
      padding: 0; margin: 0; width: 100%; box-sizing: border-box;
      -webkit-overflow-scrolling: touch;
    }
    .playlist-items-container::-webkit-scrollbar { width: 6px; }
    .playlist-items-container::-webkit-scrollbar-thumb {
      background-color: var(--divider-color); border-radius: 3px;
    }
    .playlist-items-container.hide-last kodi-playlist-item:last-child {
      --outline-color: transparent !important;
    }
  `;

  protected render() {
    const isScrollable = this.config.items_container_scrollable;
    const count = Number(this.config.visible_items_count || 5);
    const heightPerItem = 60;
    const totalHeight = count * heightPerItem;

    const containerStyle = isScrollable
      ? `overflow-y: auto !important; max-height: ${totalHeight}px !important; display: flex; flex-direction: column;`
      : "overflow-y: visible; display: flex; flex-direction: column;";

    const listClasses = this.config.hide_last_line_separator ? "playlist-items-container hide-last" : "playlist-items-container";

    return html`
      <div class="card-content">
        <ul class="${listClasses}" style="${containerStyle}">
          ${this.items.map((item, index) => {
            const isPlaying = index === this.currentIndex;
            return html`
              <kodi-playlist-item
                .item="${item}"
                .index="${index}"
                .isPlaying="${isPlaying}"
                .isDragging="${this._draggedIndex === index}"
                .isDragOver="${this._dragOverIndex === index}"
                .config="${this.config}"
                .cachedThumbnail="${this.thumbnailCache.get(item.thumbnail || "") || this.thumbnailCache.get(`/api/media_player_proxy/media_player.kodi/browse_media/album/${(item as any).albumid}` || "")}"
                draggable="${!isPlaying}"
                @dragstart="${(e: DragEvent) => this._handleDragStart(e, index)}"
                @dragover="${(e: DragEvent) => this._handleDragOver(e, index)}"
                @dragleave="${this._handleDragLeave}"
                @drop="${(e: DragEvent) => this._handleDrop(e, index)}">
              </kodi-playlist-item>
            `;
          })}
        </ul>
      </div>
    `;
  }

  private _handleDragStart(e: DragEvent, index: number) {
    this._draggedIndex = index;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", index.toString());
    }
  }

  private _handleDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    this._dragOverIndex = index;
  }

  private _handleDragLeave() {
    this._dragOverIndex = -1;
  }

  private _handleDrop(e: DragEvent, index: number) {
    e.preventDefault();
    const fromIndex = this._draggedIndex;
    this._draggedIndex = -1;
    this._dragOverIndex = -1;

    if (fromIndex !== -1 && fromIndex !== index && fromIndex !== this.currentIndex) {
      this.dispatchEvent(new CustomEvent("reorder-item", {
        detail: { fromIndex, toIndex: index },
        bubbles: true,
        composed: true
      }));
    }
  }
}