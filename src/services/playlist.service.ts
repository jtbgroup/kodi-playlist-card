export class PlaylistService {
  /**
   * Détermine si un élément peut être déplacé dans la playlist (interdit pour l'élément en cours de lecture).
   */
  public canReorder(fromIndex: number, toIndex: number, currentIndex: number): boolean {
    if (fromIndex === -1 || fromIndex === toIndex) return false;
    if (fromIndex === currentIndex) return false; // Impossible de bouger le morceau en cours de lecture.
    return true;
  }
}