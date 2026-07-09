import { css } from "lit";

export const cardHeaderCSS = css`
    :host {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        width: 100%;
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
    .status-dot.fixed-green {
        background: var(--success-color);
    }
    .status-dot.fixed-orange {
        background: var(--warning-color);
    }
    .status-dot.fixed-red {
        background: var(--error-color);
    }
    .status-dot.flashing-green {
        background: var(--success-color);
        animation: pulse-dot 1s infinite;
    }
    @keyframes pulse-dot {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.3;
        }
    }
`;

