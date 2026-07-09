import { css } from "lit";

export const thumbnailButtonCSS = css`
    :host {
        display: block;
    }

    .thumbnail-button {
        position: relative;
        flex-shrink: 0;
        cursor: pointer;
        border-radius: 4px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--secondary-background-color);
    }

    .thumbnail-button.disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }

    .thumbnail-button.with-border {
        border: 1px solid var(--outline-color);
    }

    .track-thumb {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 4px;
    }

    .thumb-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--secondary-background-color);
        border-radius: 4px;
    }

    .play-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.4);
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
        border-radius: 4px;
    }

    .play-overlay ha-icon {
        --icon-size: 24px;
        color: white;
    }

    .thumbnail-button:not(.disabled):hover .play-overlay {
        opacity: 1;
    }
`;

