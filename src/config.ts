import { KodiPlaylistCardConfig } from "./types";

/**
 * Validates and normalizes card configuration
 */
export function validateConfig(config: any): KodiPlaylistCardConfig {
    if (!config) {
        throw new Error("Invalid card configuration: config is required.");
    }

    if (!config.entry_id || typeof config.entry_id !== "string") {
        throw new Error('Invalid card configuration: "entry_id" is required and must be a string.');
    }

    return {
        entry_id: config.entry_id,
        title: config.title || "Audio Playlist",
    };
}