/**
 * Classe de base pour tous les éléments du réseau de ventilation
 */
window.Element = class Element {
    static nextId = 1;
    static prefix = 'E';

    constructor(x, y) {
        this.id = `${window.Element.prefix}${window.Element.nextId++}`;
        this.x = x;
        this.y = y;
        this.selected = false;
        this.connections = []; // IDs des éléments connectés
    }

    /**
     * Vérifie si le point (x, y) est dans cet élément
     * @param {number} x - Coordonnée X
     * @param {number} y - Coordonnée Y
     * @param {number} tolerance - Tolérance pour la sélection
     * @returns {boolean} Vrai si le point est dans l'élément
     */
    contains(x, y, tolerance = 10) {
        // À implémenter dans les classes dérivées
        return false;
    }

    /**
     * Dessine l'élément sur le canvas
     * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
     * @param {number} scale - Échelle de dessin
     */
    draw(ctx, scale = 1) {
        // À implémenter dans les classes dérivées
    }

    /**
     * Dessine l'élément en surbrillance
     * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
     * @param {number} scale - Échelle de dessin
     */
    drawHighlight(ctx, scale = 1) {
        // À implémenter dans les classes dérivées
    }

    /**
     * Obtient le centre de l'élément
     * @returns {Object} Point avec x et y
     */
    getCenter() {
        return { x: this.x, y: this.y };
    }

    /**
     * Ajoute une connexion à un autre élément
     * @param {string} elementId - ID de l'élément à connecter
     */
    addConnection(elementId) {
        if (!this.connections.includes(elementId)) {
            this.connections.push(elementId);
        }
    }

    /**
     * Supprime une connexion
     * @param {string} elementId - ID de l'élément à déconnecter
     */
    removeConnection(elementId) {
        this.connections = this.connections.filter(id => id !== elementId);
    }

    /**
     * Vérifie si l'élément est connecté à un autre
     * @param {string} elementId - ID de l'élément
     * @returns {boolean} Vrai si connecté
     */
    isConnectedTo(elementId) {
        return this.connections.includes(elementId);
    }

    /**
     * Obtient toutes les connexions
     * @returns {string[]} Tableau des IDs connectés
     */
    getConnections() {
        return [...this.connections];
    }

    /**
     * Convertit en objet pour la sérialisation
     * @returns {Object} Objet sérialisé
     */
    toJSON() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            connections: [...this.connections]
        };
    }

    /**
     * Crée un élément à partir d'un objet JSON
     * @param {Object} data - Données JSON
     * @returns {Element} L'élément créé
     */
    static fromJSON(data) {
        const element = new window.Element(data.x, data.y);
        element.id = data.id;
        element.connections = [...data.connections];
        return element;
    }

    /**
     * Réinitialise le compteur d'IDs
     */
    static resetIdCounter() {
        window.Element.nextId = 1;
    }

    /**
     * Définit le préfixe pour les IDs
     * @param {string} prefix - Nouveau préfixe
     */
    static setPrefix(prefix) {
        window.Element.prefix = prefix;
    }
};
