/**
 * Classe représentant une bouche de ventilation
 */

window.Bouche = class Bouche extends window.Element {
    static nextId = 1;
    static prefix = 'B';

    constructor(x, y) {
        super(x, y);
        this.id = `${window.Bouche.prefix}${window.Bouche.nextId++}`;
        this.name = `Bouche ${window.Bouche.nextId - 1}`;
        this.width = 30;
        this.height = 30;
        this.flowRate = 0; // m³/h - débit de la bouche
        this.type = 'bouche';
        this.airType = 'supply'; // supply ou extract (peut être différent du réseau)
        this.shape = 'square'; // square, round
        this.size = 15; // Taille de la bouche (diamètre ou côté)
    }

    /**
     * Vérifie si le point (x, y) est dans la bouche
     * @param {number} x - Coordonnée X
     * @param {number} y - Coordonnée Y
     * @param {number} tolerance - Tolérance pour la sélection
     * @returns {boolean} Vrai si le point est dans la bouche
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
     * Dessine la bouche sur le canvas
     * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
     * @param {number} scale - Échelle de dessin
     * @param {string} flowDirection - Sens de l'air du réseau ('supply' ou 'extract')
     */
    draw(ctx, scale = 1, flowDirection = 'supply') {
        const halfWidth = (this.width * scale) / 2;
        const halfHeight = (this.height * scale) / 2;

        // Couleur en fonction du sens de l'air
        const isSupply = this.airType === 'supply' || flowDirection === 'supply';
        const baseColor = isSupply ? '#059669' : '#dc2626';
        
        ctx.fillStyle = this.selected ? '#f59e0b' : baseColor;
        ctx.strokeStyle = this.selected ? '#d97706' : (isSupply ? '#047857' : '#b91c1c');
        ctx.lineWidth = 2 * scale;

        // Dessiner la forme de la bouche
        if (this.shape === 'round') {
            ctx.beginPath();
            ctx.arc(
                this.x * scale,
                this.y * scale,
                this.width * scale / 2,
                0,
                Math.PI * 2
            );
            ctx.fill();
            ctx.stroke();
        } else {
            // Forme carrée
            ctx.beginPath();
            ctx.rect(
                this.x * scale - halfWidth,
                this.y * scale - halfHeight,
                this.width * scale,
                this.height * scale
            );
            ctx.fill();
            ctx.stroke();
        }

        // Dessiner les grilles de la bouche
        const gridSize = this.width * scale * 0.3;
        const gridSpacing = this.width * scale * 0.1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1 * scale;

        if (this.shape === 'round') {
            // Grilles pour bouche ronde
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.moveTo(
                    this.x * scale - gridSize / 2,
                    this.y * scale + i * gridSpacing
                );
                ctx.lineTo(
                    this.x * scale + gridSize / 2,
                    this.y * scale + i * gridSpacing
                );
                ctx.stroke();
            }
        } else {
            // Grilles pour bouche carrée
            for (let i = -1; i <= 1; i++) {
                // Lignes horizontales
                ctx.beginPath();
                ctx.moveTo(
                    this.x * scale - gridSize / 2,
                    this.y * scale + i * gridSpacing
                );
                ctx.lineTo(
                    this.x * scale + gridSize / 2,
                    this.y * scale + i * gridSpacing
                );
                ctx.stroke();

                // Lignes verticales
                ctx.beginPath();
                ctx.moveTo(
                    this.x * scale + i * gridSpacing,
                    this.y * scale - gridSize / 2
                );
                ctx.lineTo(
                    this.x * scale + i * gridSpacing,
                    this.y * scale + gridSize / 2
                );
                ctx.stroke();
            }
        }

        // Dessiner le nom
        ctx.fillStyle = '#000000';
        ctx.font = `${10 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            this.id,
            this.x * scale,
            this.y * scale - halfHeight - 15 * scale
        );

        // Dessiner le débit
        if (this.flowRate > 0) {
            ctx.fillStyle = '#000000';
            ctx.font = `${10 * scale}px Arial`;
            ctx.fillText(
                `${this.flowRate} m³/h`,
                this.x * scale,
                this.y * scale + halfHeight + 15 * scale
            );
        }

        // Indication du sens de l'air
        ctx.fillStyle = isSupply ? '#3b82f6' : '#ef4444';
        ctx.font = `${12 * scale}px Arial`;
        ctx.fillText(
            isSupply ? '→' : '←',
            this.x * scale + halfWidth + 10 * scale,
            this.y * scale
        );
    }

    /**
     * Dessine la bouche en surbrillance
     * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
     * @param {number} scale - Échelle de dessin
     */
    drawHighlight(ctx, scale = 1) {
        const halfWidth = (this.width * scale) / 2;
        const halfHeight = (this.height * scale) / 2;

        ctx.strokeStyle = '#84cc16';
        ctx.lineWidth = 3 * scale;
        ctx.setLineDash([5 * scale, 5 * scale]);

        if (this.shape === 'round') {
            ctx.beginPath();
            ctx.arc(
                this.x * scale,
                this.y * scale,
                this.width * scale / 2 + 5 * scale,
                0,
                Math.PI * 2
            );
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.rect(
                this.x * scale - halfWidth - 5 * scale,
                this.y * scale - halfHeight - 5 * scale,
                this.width * scale + 10 * scale,
                this.height * scale + 10 * scale
            );
            ctx.stroke();
        }

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
            type: this.type,
            airType: this.airType,
            shape: this.shape,
            size: this.size
        };
    }

    /**
     * Crée une bouche à partir d'un objet JSON
     * @param {Object} data - Données JSON
     * @returns {Bouche} La bouche créée
     */
    static fromJSON(data) {
        const bouche = new window.Bouche(data.x, data.y);
        bouche.id = data.id;
        bouche.name = data.name || bouche.name;
        bouche.width = data.width || bouche.width;
        bouche.height = data.height || bouche.height;
        bouche.flowRate = data.flowRate || bouche.flowRate;
        bouche.airType = data.airType || bouche.airType;
        bouche.shape = data.shape || bouche.shape;
        bouche.size = data.size || bouche.size;
        bouche.connections = [...data.connections];
        return bouche;
    }

    /**
     * Réinitialise le compteur d'IDs
     */
    static resetIdCounter() {
        window.Bouche.nextId = 1;
    }
};
