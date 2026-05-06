/**
 * Classe représentant un caisson de ventilation
 */
import { Element } from './Element.js';

export class Caisson extends Element {
    static nextId = 1;
    static prefix = 'C';

    constructor(x, y) {
        super(x, y);
        this.id = `${Caisson.prefix}${Caisson.nextId++}`;
        this.name = `Caisson ${Caisson.nextId - 1}`;
        this.width = 60;
        this.height = 60;
        this.flowRate = 0; // m³/h - sera calculé
        this.material = 'acier'; // acier, aluminium, flexible
        this.pressure = 0; // Pa - pression disponible
        this.type = 'caisson';
    }

    /**
     * Vérifie si le point (x, y) est dans le caisson
     * @param {number} x - Coordonnée X
     * @param {number} y - Coordonnée Y
     * @param {number} tolerance - Tolérance pour la sélection
     * @returns {boolean} Vrai si le point est dans le caisson
     */
    contains(x, y, tolerance = 10) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        return x >= this.x - halfWidth - tolerance &&
               x <= this.x + halfWidth + tolerance &&
               y >= this.y - halfHeight - tolerance &&
               y <= this.y + halfHeight + tolerance;
    }

    /**
     * Dessine le caisson sur le canvas
     * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
     * @param {number} scale - Échelle de dessin
     * @param {string} flowDirection - Sens de l'air ('supply' ou 'extract')
     */
    draw(ctx, scale = 1, flowDirection = 'supply') {
        const halfWidth = (this.width * scale) / 2;
        const halfHeight = (this.height * scale) / 2;

        // Corps du caisson
        ctx.fillStyle = this.selected ? '#f59e0b' : '#1e40af';
        ctx.strokeStyle = this.selected ? '#d97706' : '#1e3a8a';
        ctx.lineWidth = 2 * scale;

        // Dessiner le rectangle principal
        ctx.beginPath();
        ctx.rect(
            this.x * scale - halfWidth,
            this.y * scale - halfHeight,
            this.width * scale,
            this.height * scale
        );
        ctx.fill();
        ctx.stroke();

        // Ajouter une icône de ventilateur
        const fanSize = this.width * scale * 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(
            this.x * scale,
            this.y * scale,
            fanSize / 2,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Dessiner les pales du ventilateur
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 1.5 * scale;
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2;
            const startX = this.x * scale + Math.cos(angle) * (fanSize / 3);
            const startY = this.y * scale + Math.sin(angle) * (fanSize / 3);
            const endX = this.x * scale + Math.cos(angle) * (fanSize / 2);
            const endY = this.y * scale + Math.sin(angle) * (fanSize / 2);

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }

        // Indication du sens de l'air
        if (flowDirection === 'supply') {
            ctx.fillStyle = '#3b82f6';
        } else {
            ctx.fillStyle = '#ef4444';
        }
        ctx.font = `${12 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            flowDirection === 'supply' ? 'S' : 'A',
            this.x * scale,
            this.y * scale + halfHeight + 15 * scale
        );

        // Dessiner le nom
        ctx.fillStyle = '#000000';
        ctx.font = `${10 * scale}px Arial`;
        ctx.fillText(
            this.id,
            this.x * scale,
            this.y * scale - halfHeight - 15 * scale
        );

        // Dessiner les informations de débit si disponible
        if (this.flowRate > 0) {
            ctx.fillStyle = '#000000';
            ctx.font = `${10 * scale}px Arial`;
            ctx.fillText(
                `${this.flowRate} m³/h`,
                this.x * scale,
                this.y * scale + halfHeight + 30 * scale
            );
        }
    }

    /**
     * Dessine le caisson en surbrillance
     * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
     * @param {number} scale - Échelle de dessin
     */
    drawHighlight(ctx, scale = 1) {
        const halfWidth = (this.width * scale) / 2;
        const halfHeight = (this.height * scale) / 2;

        ctx.strokeStyle = '#84cc16';
        ctx.lineWidth = 3 * scale;
        ctx.setLineDash([5 * scale, 5 * scale]);

        ctx.beginPath();
        ctx.rect(
            this.x * scale - halfWidth - 5 * scale,
            this.y * scale - halfHeight - 5 * scale,
            this.width * scale + 10 * scale,
            this.height * scale + 10 * scale
        );
        ctx.stroke();

        ctx.setLineDash([]);
    }

    /**
     * Obtient les points de connexion (pour les conduits)
     * @returns {Array} Tableau de points de connexion
     */
    getConnectionPoints() {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;

        return [
            { x: this.x - halfWidth, y: this.y }, // Gauche
            { x: this.x + halfWidth, y: this.y }, // Droite
            { x: this.x, y: this.y - halfHeight }, // Haut
            { x: this.x, y: this.y + halfHeight }  // Bas
        ];
    }

    /**
     * Obtient le point de connexion le plus proche
     * @param {number} x - Coordonnée X
     * @param {number} y - Coordonnée Y
     * @returns {Object} Point de connexion
     */
    getClosestConnectionPoint(x, y) {
        const points = this.getConnectionPoints();
        let closestPoint = points[0];
        let minDistance = Infinity;

        for (const point of points) {
            const dx = x - point.x;
            const dy = y - point.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = point;
            }
        }

        return closestPoint;
    }

    /**
     * Convertit en objet pour la sérialisation
     * @returns {Object} Objet sérialisé
     */
    toJSON() {
        return {
            ...super.toJSON(),
            name: this.name,
            width: this.width,
            height: this.height,
            flowRate: this.flowRate,
            material: this.material,
            pressure: this.pressure,
            type: this.type
        };
    }

    /**
     * Crée un caisson à partir d'un objet JSON
     * @param {Object} data - Données JSON
     * @returns {Caisson} Le caisson créé
     */
    static fromJSON(data) {
        const caisson = new Caisson(data.x, data.y);
        caisson.id = data.id;
        caisson.name = data.name || caisson.name;
        caisson.width = data.width || caisson.width;
        caisson.height = data.height || caisson.height;
        caisson.flowRate = data.flowRate || caisson.flowRate;
        caisson.material = data.material || caisson.material;
        caisson.pressure = data.pressure || caisson.pressure;
        caisson.connections = [...data.connections];
        return caisson;
    }

    /**
     * Réinitialise le compteur d'IDs
     */
    static resetIdCounter() {
        Caisson.nextId = 1;
    }
}
