/**
 * Classe représentant un conduit de ventilation
 */

// Diamètres commerciaux standard pour les conduits ronds (en mm)
window.STANDARD_DIAMETERS = [
    80, 100, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500, 
    560, 630, 710, 800, 900, 1000, 1120, 1250, 1400, 1600
];

// Dimensions standard pour les conduits rectangulaires (en mm)
window.STANDARD_RECT_SIZES = [
    { width: 100, height: 50 },
    { width: 125, height: 60 },
    { width: 160, height: 80 },
    { width: 200, height: 100 },
    { width: 250, height: 125 },
    { width: 315, height: 150 },
    { width: 400, height: 200 },
    { width: 500, height: 250 },
    { width: 630, height: 315 },
    { width: 800, height: 400 },
    { width: 1000, height: 500 },
    { width: 1250, height: 630 }
];

window.Conduit = class Conduit extends window.Element {
    static nextId = 1;
    static prefix = 'S';

    constructor(startX, startY, endX, endY, isRound = true) {
        super((startX + endX) / 2, (startY + endY) / 2);
        this.id = `${window.Conduit.prefix}${window.Conduit.nextId++}`;
        this.start = new window.Point(startX, startY);
        this.end = new window.Point(endX, endY);
        this.isRound = isRound; // true = rond, false = rectangulaire
        this.type = 'conduit';
        this.flowRate = 0; // m³/h - débit dans le conduit
        this.velocity = 0; // m/s - vitesse de l'air
        this.pressureDrop = 0; // Pa - perte de charge
        this.material = 'acier'; // acier, aluminium, flexible
        this.roughness = 0.00015; // Rugosité en mètres (acier galvanisé)
        
        // Dimensions
        this.diameter = 100; // mm - pour les conduits ronds
        this.width = 100; // mm - pour les conduits rectangulaires
        this.height = 50; // mm - pour les conduits rectangulaires
        
        // Longueur réelle (calculée)
        this.length = this.calculateLength();
        
        // Éléments connectés
        this.startElementId = null; // ID de l'élément de départ
        this.endElementId = null; // ID de l'élément d'arrivée
        
        // Points de contrôle pour les courbes
        this.controlPoints = [];
    }

    /**
     * Calcule la longueur du conduit
     * @returns {number} Longueur en pixels
     */
    calculateLength() {
        return this.start.distanceTo(this.end);
    }

    /**
     * Vérifie si le point (x, y) est sur le conduit
     * @param {number} x - Coordonnée X
     * @param {number} y - Coordonnée Y
     * @param {number} tolerance - Tolérance pour la sélection
     * @returns {boolean} Vrai si le point est sur le conduit
     */
    contains(x, y, tolerance = 10) {
        // Calculer la distance du point à la ligne
        const lineLength = this.length;
        if (lineLength === 0) return false;

        // Projection du point sur la ligne
        const u = ((x - this.start.x) * (this.end.x - this.start.x) + 
                  (y - this.start.y) * (this.end.y - this.start.y)) / 
                 (lineLength * lineLength);

        // Point projeté
        const px = this.start.x + u * (this.end.x - this.start.x);
        const py = this.start.y + u * (this.end.y - this.start.y);

        // Distance du point à la ligne
        const dx = x - px;
        const dy = y - py;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Vérifier si le point projeté est sur le segment
        const onSegment = u >= 0 && u <= 1;

        return onSegment && distance <= tolerance;
    }

    /**
     * Dessine le conduit sur le canvas
     * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
     * @param {number} scale - Échelle de dessin
     * @param {string} flowDirection - Sens de l'air ('supply' ou 'extract')
     * @param {boolean} showFlow - Afficher les flèches de flux
     */
    draw(ctx, scale = 1, flowDirection = 'supply', showFlow = false) {
        const startX = this.start.x * scale;
        const startY = this.start.y * scale;
        const endX = this.end.x * scale;
        const endY = this.end.y * scale;

        // Couleur en fonction du sens de l'air
        const baseColor = flowDirection === 'supply' ? '#3b82f6' : '#ef4444';
        
        ctx.strokeStyle = this.selected ? '#f59e0b' : baseColor;
        ctx.lineWidth = this.isRound ? 4 * scale : 3 * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Dessiner la ligne du conduit
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        // Si il y a des points de contrôle, dessiner une courbe
        if (this.controlPoints.length > 0) {
            ctx.moveTo(startX, startY);
            
            // Premier segment
            const cp1 = this.controlPoints[0];
            ctx.quadraticCurveTo(
                cp1.x * scale, cp1.y * scale,
                (this.controlPoints.length > 1 ? this.controlPoints[1].x : this.end.x) * scale,
                (this.controlPoints.length > 1 ? this.controlPoints[1].y : this.end.y) * scale
            );
            
            // Si il y a plus de points de contrôle
            if (this.controlPoints.length > 2) {
                for (let i = 1; i < this.controlPoints.length - 1; i++) {
                    const cp = this.controlPoints[i];
                    const nextCp = this.controlPoints[i + 1];
                    ctx.quadraticCurveTo(
                        cp.x * scale, cp.y * scale,
                        nextCp.x * scale, nextCp.y * scale
                    );
                }
                
                // Dernier segment
                const lastCp = this.controlPoints[this.controlPoints.length - 1];
                ctx.quadraticCurveTo(
                    lastCp.x * scale, lastCp.y * scale,
                    endX, endY
                );
            }
        } else {
            // Ligne droite
            ctx.lineTo(endX, endY);
        }
        
        ctx.stroke();

        // Dessiner les flèches de flux si activé
        if (showFlow && this.flowRate > 0) {
            this.drawFlowArrows(ctx, scale, flowDirection);
        }

        // Dessiner le nom du conduit
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        
        ctx.fillStyle = '#000000';
        ctx.font = `${10 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Positionner le texte le long du conduit
        const angle = this.start.angleTo(this.end);
        const offsetX = Math.cos(angle + Math.PI / 2) * 15 * scale;
        const offsetY = Math.sin(angle + Math.PI / 2) * 15 * scale;
        
        ctx.fillText(this.id, midX + offsetX, midY + offsetY);

        // Dessiner les informations de débit et dimension
        if (this.flowRate > 0) {
            const infoText = this.isRound 
                ? `${this.flowRate} m³/h, Ø${this.diameter}mm`
                : `${this.flowRate} m³/h, ${this.width}×${this.height}mm`;
            
            ctx.font = `${9 * scale}px Arial`;
            ctx.fillText(
                infoText,
                midX + offsetX,
                midY + offsetY + 15 * scale
            );
        }
    }

    /**
     * Dessine les flèches de flux
     * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
     * @param {number} scale - Échelle de dessin
     * @param {string} flowDirection - Sens de l'air
     */
    drawFlowArrows(ctx, scale, flowDirection) {
        const arrowSize = 8 * scale;
        const spacing = 40 * scale;
        const length = this.length * scale;
        
        // Calculer le nombre de flèches
        const arrowCount = Math.max(1, Math.floor(length / spacing));
        
        const startX = this.start.x * scale;
        const startY = this.start.y * scale;
        const endX = this.end.x * scale;
        const endY = this.end.y * scale;
        
        const dx = endX - startX;
        const dy = endY - startY;
        const angle = Math.atan2(dy, dx);
        
        // Déterminer la direction des flèches
        let arrowAngle = angle;
        let startRatio = flowDirection === 'supply' ? 0.1 : 0.9;
        let endRatio = flowDirection === 'supply' ? 0.9 : 0.1;
        let step = (endRatio - startRatio) / (arrowCount - 1 || 1);

        for (let i = 0; i < arrowCount; i++) {
            const ratio = startRatio + i * step;
            const x = startX + dx * ratio;
            const y = startY + dy * ratio;
            
            // Dessiner la flèche
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(arrowAngle);
            
            ctx.fillStyle = flowDirection === 'supply' ? '#3b82f6' : '#ef4444';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-arrowSize, -arrowSize / 2);
            ctx.lineTo(-arrowSize, arrowSize / 2);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
    }

    /**
     * Dessine le conduit en surbrillance
     * @param {CanvasRenderingContext2D} ctx - Contexte de dessin
     * @param {number} scale - Échelle de dessin
     */
    drawHighlight(ctx, scale = 1) {
        const startX = this.start.x * scale;
        const startY = this.start.y * scale;
        const endX = this.end.x * scale;
        const endY = this.end.y * scale;

        ctx.strokeStyle = '#84cc16';
        ctx.lineWidth = 6 * scale;
        ctx.setLineDash([5 * scale, 5 * scale]);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        
        if (this.controlPoints.length > 0) {
            ctx.moveTo(startX, startY);
            
            if (this.controlPoints.length > 1) {
                ctx.quadraticCurveTo(
                    this.controlPoints[0].x * scale, this.controlPoints[0].y * scale,
                    this.controlPoints[1].x * scale, this.controlPoints[1].y * scale
                );
            }
            
            for (let i = 1; i < this.controlPoints.length - 1; i++) {
                ctx.quadraticCurveTo(
                    this.controlPoints[i].x * scale, this.controlPoints[i].y * scale,
                    this.controlPoints[i + 1].x * scale, this.controlPoints[i + 1].y * scale
                );
            }
            
            if (this.controlPoints.length > 1) {
                const lastCp = this.controlPoints[this.controlPoints.length - 1];
                ctx.quadraticCurveTo(
                    lastCp.x * scale, lastCp.y * scale,
                    endX, endY
                );
            }
        } else {
            ctx.lineTo(endX, endY);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
    }

    /**
     * Obtient le point central du conduit
     * @returns {Point} Point central
     */
    getCenter() {
        return new window.Point((this.start.x + this.end.x) / 2, (this.start.y + this.end.y) / 2);
    }

    /**
     * Met à jour les points de départ et d'arrivée
     * @param {number} startX - Nouvelle coordonnée X de départ
     * @param {number} startY - Nouvelle coordonnée Y de départ
     * @param {number} endX - Nouvelle coordonnée X d'arrivée
     * @param {number} endY - Nouvelle coordonnée Y d'arrivée
     */
    updatePoints(startX, startY, endX, endY) {
        this.start.x = startX;
        this.start.y = startY;
        this.end.x = endX;
        this.end.y = endY;
        this.x = (startX + endX) / 2;
        this.y = (startY + endY) / 2;
        this.length = this.calculateLength();
    }

    /**
     * Ajoute un point de contrôle pour les courbes
     * @param {Point} point - Point de contrôle à ajouter
     */
    addControlPoint(point) {
        this.controlPoints.push(point);
    }

    /**
     * Supprime tous les points de contrôle
     */
    clearControlPoints() {
        this.controlPoints = [];
    }

    /**
     * Vérifie si le conduit est horizontal
     * @returns {boolean} Vrai si horizontal
     */
    isHorizontal() {
        return Math.abs(this.start.y - this.end.y) < 0.001;
    }

    /**
     * Vérifie si le conduit est vertical
     * @returns {boolean} Vrai si vertical
     */
    isVertical() {
        return Math.abs(this.start.x - this.end.x) < 0.001;
    }

    /**
     * Calcule l'angle du conduit par rapport à l'horizontale
     * @returns {number} Angle en radians
     */
    getAngle() {
        return this.start.angleTo(this.end);
    }

    /**
     * Convertit en objet pour la sérialisation
     * @returns {Object} Objet sérialisé
     */
    toJSON() {
        return {
            ...super.toJSON(),
            start: this.start.toJSON(),
            end: this.end.toJSON(),
            isRound: this.isRound,
            type: this.type,
            flowRate: this.flowRate,
            velocity: this.velocity,
            pressureDrop: this.pressureDrop,
            material: this.material,
            roughness: this.roughness,
            diameter: this.diameter,
            width: this.width,
            height: this.height,
            length: this.length,
            startElementId: this.startElementId,
            endElementId: this.endElementId,
            controlPoints: this.controlPoints.map(p => p.toJSON())
        };
    }

    /**
     * Crée un conduit à partir d'un objet JSON
     * @param {Object} data - Données JSON
     * @returns {Conduit} Le conduit créé
     */
    static fromJSON(data) {
        const conduit = new window.Conduit(
            data.start.x, data.start.y,
            data.end.x, data.end.y,
            data.isRound
        );
        
        conduit.id = data.id;
        conduit.isRound = data.isRound;
        conduit.flowRate = data.flowRate || conduit.flowRate;
        conduit.velocity = data.velocity || conduit.velocity;
        conduit.pressureDrop = data.pressureDrop || conduit.pressureDrop;
        conduit.material = data.material || conduit.material;
        conduit.roughness = data.roughness || conduit.roughness;
        conduit.diameter = data.diameter || conduit.diameter;
        conduit.width = data.width || conduit.width;
        conduit.height = data.height || conduit.height;
        conduit.length = data.length || conduit.length;
        conduit.startElementId = data.startElementId || null;
        conduit.endElementId = data.endElementId || null;
        conduit.controlPoints = data.controlPoints 
            ? data.controlPoints.map(p => window.Point.fromJSON(p))
            : [];
        conduit.connections = [...data.connections];
        
        return conduit;
    }

    /**
     * Réinitialise le compteur d'IDs
     */
    static resetIdCounter() {
        window.Conduit.nextId = 1;
    }
};
