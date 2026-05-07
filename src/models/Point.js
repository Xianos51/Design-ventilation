/**
 * Classe représentant un point 2D
 */
window.Point = class Point {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    /**
     * Calcule la distance entre ce point et un autre
     * @param {Point} other - L'autre point
     * @returns {number} La distance en pixels
     */
    distanceTo(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calcule l'angle entre ce point et un autre (en radians)
     * @param {Point} other - L'autre point
     * @returns {number} L'angle en radians
     */
    angleTo(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        return Math.atan2(dy, dx);
    }

    /**
     * Calcule le point intermédiaire entre ce point et un autre
     * @param {Point} other - L'autre point
     * @param {number} ratio - Ratio (0 = ce point, 1 = l'autre point)
     * @returns {Point} Le point intermédiaire
     */
    lerp(other, ratio) {
        const x = this.x + (other.x - this.x) * ratio;
        const y = this.y + (other.y - this.y) * ratio;
        return new window.Point(x, y);
    }

    /**
     * Vérifie si ce point est égal à un autre
     * @param {Point} other - L'autre point
     * @param {number} tolerance - Tolérance pour la comparaison
     * @returns {boolean} Vrai si les points sont égaux
     */
    equals(other, tolerance = 0.001) {
        return Math.abs(this.x - other.x) < tolerance && 
               Math.abs(this.y - other.y) < tolerance;
    }

    /**
     * Clone ce point
     * @returns {Point} Une copie de ce point
     */
    clone() {
        return new window.Point(this.x, this.y);
    }

    /**
     * Convertit en objet simple
     * @returns {Object} Objet avec les propriétés x et y
     */
    toJSON() {
        return { x: this.x, y: this.y };
    }

    /**
     * Crée un Point à partir d'un objet
     * @param {Object} obj - Objet avec les propriétés x et y
     * @returns {Point} Le point créé
     */
    static fromJSON(obj) {
        return new window.Point(obj.x, obj.y);
    }
};
