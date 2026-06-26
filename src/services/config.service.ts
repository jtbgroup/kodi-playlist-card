import { KodiPlaylistCardConfig, DEFAULT_CONFIG } from "../types";

export class ConfigService {
  /**
   * Valide la configuration brute et applique les valeurs par défaut.
   */
  public validateConfig(config: any): KodiPlaylistCardConfig {
    if (!config) {
      throw new Error("Configuration invalide.");
    }
    if (!config.entity) {
      throw new Error("L'entité de configuration Kodi (entity) est requise.");
    }

    // Fusionne la configuration utilisateur avec les valeurs par défaut
    return {
      ...DEFAULT_CONFIG,
      ...config,
      // Sécurité pour s'assurer que le nombre d'éléments visibles est exploitable
      visible_items_count: config.visible_items_count !== undefined 
        ? Number(config.visible_items_count) 
        : DEFAULT_CONFIG.visible_items_count,
    } as KodiPlaylistCardConfig;
  }
}