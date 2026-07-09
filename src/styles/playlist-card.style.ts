import { css } from "lit";

export const playlistCardCSS = css`
    :host {
        display: block;
        background: var(--ha-card-background, var(--card-background-color, #ffffff));
        border-radius: var(--ha-card-border-radius, 12px);
        border: 1px solid var(--divider-color);
        overflow: hidden;
    }
    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
    }

    .playlist-container {
        overflow-y: auto;
    }
    .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 12px;
        padding: 40px 16px;
        color: var(--secondary-text-color);
        text-align: center;
    }
    .empty-state ha-icon {
        --icon-size: 48px;
        opacity: 0.5;
    }

    .playlist-items-container {
        list-style: none;
        padding: 0;
        margin: 0;
        width: 100%;
        box-sizing: border-box;
        -webkit-overflow-scrolling: touch;
    }

    .playlist-items-container::-webkit-scrollbar {
        width: 6px;
    }
    .playlist-items-container::-webkit-scrollbar-thumb {
        background-color: var(--divider-color);
        border-radius: 3px;
    }

    .version-footer {
        text-align: right;
        font-size: 0.7em;
        color: var(--secondary-text-color);
        padding: 8px;
        opacity: 0.6;
    }
`;

