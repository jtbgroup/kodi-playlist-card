import { HomeAssistant } from "custom-card-helpers";
import { KodiMediaSensorEvent } from "../types";

export class KodiService {
    constructor(private hass: HomeAssistant) {}

    /**
     * Souscrit aux mises à jour de la playlist Kodi via WebSocket.
     */
    public subscribe(
        entryId: string,
        kodiEntityId: string,
        callback: (event: KodiMediaSensorEvent) => void,
    ): Promise<() => void> {
        if (!this.hass?.connection) {
            return Promise.reject("Pas de connexion Home Assistant active.");
        }

        // Sécurité stricte pour éviter d'envoyer des valeurs undefined à Voluptuous
        if (!entryId || !kodiEntityId) {
            return Promise.reject("Identifiants Kodi manquants pour la souscription.");
        }

        // Construction explicite du message attendu par playlist.py
        return this.hass.connection.subscribeMessage((message: any) => callback(message as KodiMediaSensorEvent), {
            type: "kodi_media_sensors/playlist_subscribe",
            entry_id: String(entryId),
            kodi_entity_id: String(kodiEntityId),
        });
    }

    /**
     * Envoie l'ordre de lire un élément précis de la playlist.
     */
    public sendPlayItem(entryId: string, kodiEntityId: string, index: number): void {
        if (!entryId || !kodiEntityId) return;
        this._sendMessage({
            type: "kodi_media_sensors/playlist_play_item",
            entry_id: String(entryId),
            kodi_entity_id: String(kodiEntityId),
            index: Number(index),
        });
    }

    /**
     * Envoie l'ordre de supprimer un élément de la playlist.
     */
    public sendRemoveItem(entryId: string, kodiEntityId: string, index: number): void {
        if (!entryId || !kodiEntityId) return;
        this._sendMessage({
            type: "kodi_media_sensors/playlist_remove_item",
            entry_id: String(entryId),
            kodi_entity_id: String(kodiEntityId),
            index: Number(index),
        });
    }

    /**
     * Envoie l'ordre de réordonner la playlist (Drag & Drop).
     */
    public sendReorderPlaylist(entryId: string, kodiEntityId: string, fromIndex: number, toIndex: number): void {
        if (!entryId || !kodiEntityId) return;
        this._sendMessage({
            type: "kodi_media_sensors/playlist_reorder",
            entry_id: String(entryId),
            kodi_entity_id: String(kodiEntityId),
            from_index: Number(fromIndex),
            to_index: Number(toIndex),
        });
    }

    private _sendMessage(message: { type: string; [key: string]: any }): void {
        if (!this.hass?.connection) {
            console.error("Kodi Card Service: Impossible d'envoyer le message - connexion absente.", message);
            return;
        }
        // L'objet possède maintenant obligatoirement 'type', ce qui valide l'interface de Home Assistant
        this.hass.connection.sendMessage(message);
    }
}
