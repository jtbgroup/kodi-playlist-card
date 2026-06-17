import { KodiPlaylistCardConfig, DEFAULT_CONFIG } from "./types";

/**
 * Validates and normalizes card configuration
 * Ensures all required fields are present and have valid values
 */
export function validateConfig(config: any): KodiPlaylistCardConfig {
    if (!config) {
        throw new Error("Invalid card configuration: config is required.");
    }

    if (!config.entry_id || typeof config.entry_id !== "string") {
        throw new Error('Invalid card configuration: "entry_id" is required and must be a string.');
    }

    // Build validated config with defaults for optional fields
    const validatedConfig: KodiPlaylistCardConfig = {
        // Required
        entry_id: config.entry_id,

        // Display options
        title: config.title ?? DEFAULT_CONFIG.title,
        show_version: config.show_version ?? DEFAULT_CONFIG.show_version,

        // Thumbnail options
        show_thumbnail: config.show_thumbnail ?? DEFAULT_CONFIG.show_thumbnail,
        show_thumbnail_overlay: config.show_thumbnail_overlay ?? DEFAULT_CONFIG.show_thumbnail_overlay,
        show_thumbnail_border: config.show_thumbnail_border ?? DEFAULT_CONFIG.show_thumbnail_border,

        // Separator and styling
        show_line_separator: config.show_line_separator ?? DEFAULT_CONFIG.show_line_separator,
        hide_last_line_separator: config.hide_last_line_separator ?? DEFAULT_CONFIG.hide_last_line_separator,
        outline_color: config.outline_color ?? DEFAULT_CONFIG.outline_color,

        // Container options
        items_container_scrollable: config.items_container_scrollable ?? DEFAULT_CONFIG.items_container_scrollable,
        items_container_height: config.items_container_height ?? DEFAULT_CONFIG.items_container_height,
    };

    // Validate outline color if provided
    if (validatedConfig.outline_color && !isValidColor(validatedConfig.outline_color)) {
        console.warn(
            `Invalid outline_color "${validatedConfig.outline_color}", using default: ${DEFAULT_CONFIG.outline_color}`,
        );
        validatedConfig.outline_color = DEFAULT_CONFIG.outline_color;
    }

    // Validate container height if scrollable is enabled
    if (
        validatedConfig.items_container_scrollable &&
        validatedConfig.items_container_height 
        // &&
        // !isValidDimension(validatedConfig.items_container_height
        )
     {
        console.warn(
            `Invalid items_container_height "${validatedConfig.items_container_height}", using default: ${DEFAULT_CONFIG.items_container_height}`,
        );
        validatedConfig.items_container_height = DEFAULT_CONFIG.items_container_height;
    }

    return validatedConfig;
}

/**
 * Check if a string is a valid CSS color value
 */
function isValidColor(color: string): boolean {
    const colorRegex = /^(#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}|rgb\(.*\)|rgba\(.*\)|[a-zA-Z]+)$/;
    return colorRegex.test(color.trim());
}

/**
 * Check if a string is a valid CSS dimension value
 */
function isValidDimension(dimension: string): boolean {
    const dimensionRegex = /^\d+(\.\d+)?(px|em|rem|vh|vw|%)$/;
    return dimensionRegex.test(dimension.trim());
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): Partial<KodiPlaylistCardConfig> {
    return { ...DEFAULT_CONFIG };
}

/**
 * Merge user config with defaults
 */
export function mergeWithDefaults(userConfig: Partial<KodiPlaylistCardConfig>): KodiPlaylistCardConfig {
    return {
        ...(DEFAULT_CONFIG as KodiPlaylistCardConfig),
        ...userConfig,
    };
}