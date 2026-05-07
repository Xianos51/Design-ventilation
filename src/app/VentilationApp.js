/**
 * Classe principale de l'application Design Ventilation
 */

// Caisson from window
// Bouche from window
// Conduit, window.STANDARD_DIAMETERS, window.STANDARD_RECT_SIZES from window
// Point from window
// calculateNetworkFlows, dimensionAllConduits, calculateRecommendedFlow from window
// calculateNetworkPressureLoss, calculateTotalPressureDrop from window
// validateNetwork from window
// generatePDF, downloadPDF from window

window.VentilationApp = class VentilationApp {
    constructor() {
        // Éléments du réseau
        this.elements = [];
        this.selectedElement = null;
        this.selectedElements = new Set();
        
        // Canvas et contexte de dessin
        this.canvas = null;
        this.ctx = null;
        this.scale = 1;
        this.offset = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        
        // Outils
        this.currentTool = 'select';
        this.flowDirection = 'supply'; // 'supply' ou 'extract'
        this.showFlow = false;
        
        // État du dessin
        this.drawingConduit = false;
        this.conduitStartElement = null;
        this.conduitStartPoint = null;
        this.tempConduit = null;
        
        // UI
        this.propertiesPanel = null;
        this.resultsPanel = null;
        this.validationPanel = null;
        
        // Historique
        this.history = [];
        this.historyIndex = -1;
    }

    /**
     * Initialise l'application
     */
    init() {
        // Récupérer les éléments du DOM
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Configurer le canvas
        this.setupCanvas();
        
        // Configurer les écouteurs d'événements
        this.setupEventListeners();
        
        // Configurer les panneaux
        this.setupPanels();
        
        // Charger un réseau de test (optionnel)
        // this.loadTestNetwork();
        
        // Dessiner initialement
        this.draw();
        
        // Mettre à jour l'interface
        this.updateUI();
    }

    /**
     * Configure le canvas
     */
    setupCanvas() {
        // Redimensionner le canvas
        const resizeCanvas = () => {
            const container = this.canvas.parentElement;
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.draw();
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Style du canvas
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        this.ctx.font = '12px Arial';
    }

    /**
     * Configure les écouteurs d'événements
     */
    setupEventListeners() {
        // Événements de la souris
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        
        // Événements tactiles
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Boutons de la barre d'outils
        document.getElementById('tool-select').addEventListener('click', () => this.setTool('select'));
        document.getElementById('tool-caisson').addEventListener('click', () => this.setTool('caisson'));
        document.getElementById('tool-bouche').addEventListener('click', () => this.setTool('bouche'));
        document.getElementById('tool-conduit-round').addEventListener('click', () => this.setTool('conduit-round'));
        document.getElementById('tool-conduit-rect').addEventListener('click', () => this.setTool('conduit-rect'));
        
        // Boutons d'action
        document.getElementById('calculate-btn').addEventListener('click', () => this.calculateNetwork());
        document.getElementById('clear-btn').addEventListener('click', () => this.showConfirmClear());
        document.getElementById('export-pdf-btn').addEventListener('click', () => this.exportPDF());
        document.getElementById('flow-direction').addEventListener('change', (e) => {
            this.flowDirection = e.target.value;
            this.draw();
        });
        
        // Bouton d'aide
        document.getElementById('help-btn').addEventListener('click', () => this.showHelp());
        
        // Modale de confirmation
        document.getElementById('confirm-yes').addEventListener('click', () => this.clearAll());
        document.getElementById('confirm-no').addEventListener('click', () => this.hideConfirmModal());
        document.getElementById('close-confirm').addEventListener('click', () => this.hideConfirmModal());
        
        // Modale d'aide
        document.getElementById('close-help').addEventListener('click', () => this.hideHelpModal());
        document.getElementById('close-help-footer').addEventListener('click', () => this.hideHelpModal());
        
        // Panneaux
        document.getElementById('close-properties').addEventListener('click', () => this.hidePropertiesPanel());
        document.getElementById('close-results').addEventListener('click', () => this.hideResultsPanel());
        document.getElementById('close-validation').addEventListener('click', () => this.hideValidationPanel());
    }

    /**
     * Configure les panneaux
     */
    setupPanels() {
        this.propertiesPanel = document.getElementById('properties-content');
        this.resultsPanel = document.getElementById('results-content');
        this.validationPanel = document.getElementById('validation-content');
    }

    /**
     * Définit l'outil courant
     * @param {string} tool - Nom de l'outil
     */
    setTool(tool) {
        // Désactiver tous les boutons d'outil
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => btn.classList.remove('active'));
        
        // Activer le bouton sélectionné
        const activeButton = document.getElementById(`tool-${tool}`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        this.currentTool = tool;
        
        // Réinitialiser l'état de dessin
        this.drawingConduit = false;
        this.conduitStartElement = null;
        this.conduitStartPoint = null;
        this.tempConduit = null;
        
        // Mettre à jour l'interface
        this.updateUI();
        this.draw();
    }

    /**
     * Gère le clic de la souris
     * @param {MouseEvent} event - Événement de la souris
     */
    handleMouseDown(event) {
        const point = this.getCanvasCoordinates(event);
        
        if (this.currentTool === 'select') {
            // Sélectionner un élément
            const element = this.findElementAtPoint(point.x, point.y);
            
            if (element) {
                // Si la touche Shift est enfoncée, ajouter à la sélection multiple
                if (event.shiftKey) {
                    if (this.selectedElements.has(element.id)) {
                        this.selectedElements.delete(element.id);
                    } else {
                        this.selectedElements.add(element.id);
                    }
                    this.selectedElement = null;
                } else {
                    // Sélection simple
                    this.selectedElement = element;
                    this.selectedElements.clear();
                    this.selectedElements.add(element.id);
                }
                
                // Afficher les propriétés
                this.showProperties(element);
                
                // Commencer le glisser-déposer
                this.isDragging = true;
                this.dragStart = { x: point.x, y: point.y };
                
                this.draw();
            } else {
                // Désélectionner tout
                this.selectedElement = null;
                this.selectedElements.clear();
                this.hidePropertiesPanel();
                
                // Commencer le défilement
                this.isDragging = true;
                this.dragStart = { x: point.x, y: point.y };
            }
        } else if (this.currentTool === 'caisson') {
            // Ajouter un caisson
            this.addCaisson(point.x, point.y);
        } else if (this.currentTool === 'bouche') {
            // Ajouter une bouche
            this.addBouche(point.x, point.y);
        } else if (this.currentTool === 'conduit-round' || this.currentTool === 'conduit-rect') {
            // Commencer à dessiner un conduit
            const element = this.findElementAtPoint(point.x, point.y);
            
            if (element && (element.type === 'caisson' || element.type === 'bouche')) {
                this.drawingConduit = true;
                this.conduitStartElement = element;
                this.conduitStartPoint = { x: point.x, y: point.y };
                
                // Créer un conduit temporaire
                this.tempConduit = new window.Conduit(
                    point.x, point.y, point.x, point.y,
                    this.currentTool === 'conduit-round'
                );
            }
        }
    }

    /**
     * Gère le mouvement de la souris
     * @param {MouseEvent} event - Événement de la souris
     */
    handleMouseMove(event) {
        const point = this.getCanvasCoordinates(event);
        
        if (this.isDragging) {
            // Déplacer les éléments sélectionnés ou défiler la vue
            if (this.selectedElements.size > 0) {
                // Déplacer les éléments
                const dx = point.x - this.dragStart.x;
                const dy = point.y - this.dragStart.y;
                
                this.moveSelectedElements(dx, dy);
                
                this.dragStart = { x: point.x, y: point.y };
                this.draw();
            } else {
                // Défiler la vue
                this.offset.x += point.x - this.dragStart.x;
                this.offset.y += point.y - this.dragStart.y;
                this.dragStart = { x: point.x, y: point.y };
                this.draw();
            }
        } else if (this.drawingConduit) {
            // Mettre à jour le conduit temporaire
            this.tempwindow.Conduit.end.x = point.x;
            this.tempwindow.Conduit.end.y = point.y;
            this.tempwindow.Conduit.x = (this.tempwindow.Conduit.start.x + this.tempwindow.Conduit.end.x) / 2;
            this.tempwindow.Conduit.y = (this.tempwindow.Conduit.start.y + this.tempwindow.Conduit.end.y) / 2;
            this.tempwindow.Conduit.length = this.tempwindow.Conduit.calculateLength();
            
            this.draw();
        } else {
            // Survoler un élément
            const element = this.findElementAtPoint(point.x, point.y);
            
            if (element) {
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.style.cursor = this.currentTool === 'select' ? 'default' : 'crosshair';
            }
        }
    }

    /**
     * Gère le relâchement de la souris
     * @param {MouseEvent} event - Événement de la souris
     */
    handleMouseUp(event) {
        const point = this.getCanvasCoordinates(event);
        
        if (this.isDragging) {
            this.isDragging = false;
        }
        
        if (this.drawingConduit) {
            // Terminer de dessiner le conduit
            const endElement = this.findElementAtPoint(point.x, point.y);
            
            if (endElement && (endElement.type === 'caisson' || endElement.type === 'bouche') && 
                endElement.id !== this.conduitStartElement.id) {
                // Ajouter le conduit
                this.addConduit(
                    this.conduitStartElement,
                    endElement,
                    this.currentTool === 'conduit-round'
                );
            }
            
            // Réinitialiser
            this.drawingConduit = false;
            this.conduitStartElement = null;
            this.conduitStartPoint = null;
            this.tempConduit = null;
            
            this.draw();
        }
    }

    /**
     * Gère le survol de la souris hors du canvas
     */
    handleMouseLeave() {
        this.isDragging = false;
        this.canvas.style.cursor = 'default';
    }

    /**
     * Gère la molette de la souris (zoom)
     * @param {WheelEvent} event - Événement de la molette
     */
    handleWheel(event) {
        event.preventDefault();
        
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        const oldScale = this.scale;
        this.scale = Math.max(0.1, Math.min(3, this.scale + delta));
        
        // Ajuster l'offset pour zoomer vers le curseur
        const point = this.getCanvasCoordinates(event);
        this.offset.x = point.x - (point.x - this.offset.x) * (this.scale / oldScale);
        this.offset.y = point.y - (point.y - this.offset.y) * (this.scale / oldScale);
        
        this.draw();
    }

    /**
     * Gère le double-clic
     * @param {MouseEvent} event - Événement de la souris
     */
    handleDoubleClick(event) {
        const point = this.getCanvasCoordinates(event);
        const element = this.findElementAtPoint(point.x, point.y);
        
        if (element) {
            // Ouvrir les propriétés en mode édition
            this.showProperties(element);
        }
    }

    /**
     * Gère le toucher (début)
     * @param {TouchEvent} event - Événement tactile
     */
    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }

    /**
     * Gère le toucher (mouvement)
     * @param {TouchEvent} event - Événement tactile
     */
    handleTouchMove(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }

    /**
     * Gère le toucher (fin)
     * @param {TouchEvent} event - Événement tactile
     */
    handleTouchEnd(event) {
        event.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        this.canvas.dispatchEvent(mouseEvent);
    }

    /**
     * Obtient les coordonnées du canvas à partir d'un événement de souris
     * @param {MouseEvent} event - Événement de la souris
     * @returns {Object} Coordonnées x et y
     */
    getCanvasCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left - this.offset.x) / this.scale,
            y: (event.clientY - rect.top - this.offset.y) / this.scale
        };
    }

    /**
     * Trouve un élément à une position donnée
     * @param {number} x - Coordonnée X
     * @param {number} y - Coordonnée Y
     * @returns {Object|null} L'élément trouvé ou null
     */
    findElementAtPoint(x, y) {
        // Parcourir les éléments dans l'ordre inverse pour sélectionner le premier au-dessus
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const element = this.elements[i];
            if (element.contains(x, y, 10 / this.scale)) {
                return element;
            }
        }
        return null;
    }

    /**
     * Ajoute un caisson
     * @param {number} x - Coordonnée X
     * @param {number} y - Coordonnée Y
     */
    addCaisson(x, y) {
        const caisson = new window.Caisson(x, y);
        this.elements.push(caisson);
        
        // Sauvegarder dans l'historique
        this.saveToHistory();
        
        // Sélectionner le nouvel élément
        this.selectedElement = caisson;
        this.selectedElements.clear();
        this.selectedElements.add(caisson.id);
        
        // Afficher les propriétés
        this.showProperties(caisson);
        
        this.draw();
        this.showNotification('Caisson ajouté', 'success');
    }

    /**
     * Ajoute une bouche
     * @param {number} x - Coordonnée X
     * @param {number} y - Coordonnée Y
     */
    addBouche(x, y) {
        const bouche = new window.Bouche(x, y);
        this.elements.push(bouche);
        
        // Sauvegarder dans l'historique
        this.saveToHistory();
        
        // Sélectionner le nouvel élément
        this.selectedElement = bouche;
        this.selectedElements.clear();
        this.selectedElements.add(bouche.id);
        
        // Afficher les propriétés
        this.showProperties(bouche);
        
        this.draw();
        this.showNotification('Bouche ajoutée', 'success');
    }

    /**
     * Ajoute un conduit entre deux éléments
     * @param {Object} startElement - Élément de départ
     * @param {Object} endElement - Élément d'arrivée
     * @param {boolean} isRound - Vrai si conduit rond
     */
    addConduit(startElement, endElement, isRound = true) {
        // Vérifier si un conduit existe déjà entre ces éléments
        const existingConduit = this.elements.find(conduit => 
            conduit.type === 'conduit' &&
            ((conduit.startElementId === startElement.id && conduit.endElementId === endElement.id) ||
             (conduit.startElementId === endElement.id && conduit.endElementId === startElement.id))
        );
        
        if (existingConduit) {
            this.showNotification('Un conduit existe déjà entre ces éléments', 'warning');
            return;
        }
        
        // Obtenir les points de connexion
        const startPoint = startElement.getClosestConnectionPoint(endElement.x, endElement.y);
        const endPoint = endElement.getClosestConnectionPoint(startElement.x, startElement.y);
        
        const conduit = new window.Conduit(
            startPoint.x, startPoint.y,
            endPoint.x, endPoint.y,
            isRound
        );
        
        conduit.startElementId = startElement.id;
        conduit.endElementId = endElement.id;
        
        // Ajouter les connexions
        startElement.addConnection(conduit.id);
        endElement.addConnection(conduit.id);
        conduit.addConnection(startElement.id);
        conduit.addConnection(endElement.id);
        
        this.elements.push(conduit);
        
        // Sauvegarder dans l'historique
        this.saveToHistory();
        
        // Sélectionner le nouvel élément
        this.selectedElement = conduit;
        this.selectedElements.clear();
        this.selectedElements.add(conduit.id);
        
        // Afficher les propriétés
        this.showProperties(conduit);
        
        this.draw();
        this.showNotification('Conduit ajouté', 'success');
    }

    /**
     * Déplace les éléments sélectionnés
     * @param {number} dx - Déplacement en X
     * @param {number} dy - Déplacement en Y
     */
    moveSelectedElements(dx, dy) {
        for (const element of this.elements) {
            if (this.selectedElements.has(element.id)) {
                element.x += dx;
                element.y += dy;
                
                // Si c'est un conduit, déplacer aussi les points
                if (element.type === 'conduit') {
                    element.start.x += dx;
                    element.start.y += dy;
                    element.end.x += dx;
                    element.end.y += dy;
                    element.x = (element.start.x + element.end.x) / 2;
                    element.y = (element.start.y + element.end.y) / 2;
                    
                    // Déplacer les points de contrôle
                    for (const cp of element.controlPoints) {
                        cp.x += dx;
                        cp.y += dy;
                    }
                }
            }
        }
    }

    /**
     * Supprime les éléments sélectionnés
     */
    deleteSelectedElements() {
        if (this.selectedElements.size === 0) return;
        
        // Supprimer les connexions
        for (const elementId of this.selectedElements) {
            const element = this.findElementById(elementId);
            if (element) {
                // Supprimer les connexions vers cet élément
                for (const connectionId of element.connections) {
                    const connectedElement = this.findElementById(connectionId);
                    if (connectedElement) {
                        connectedElement.removeConnection(element.id);
                    }
                }
            }
        }
        
        // Supprimer les éléments
        this.elements = this.elements.filter(el => !this.selectedElements.has(el.id));
        
        // Réinitialiser la sélection
        this.selectedElement = null;
        this.selectedElements.clear();
        
        // Sauvegarder dans l'historique
        this.saveToHistory();
        
        this.draw();
        this.hidePropertiesPanel();
        this.showNotification(`${this.selectedElements.size} élément(s) supprimé(s)`, 'success');
    }

    /**
     * Trouve un élément par son ID
     * @param {string} id - ID de l'élément
     * @returns {Object|null} L'élément trouvé ou null
     */
    findElementById(id) {
        return this.elements.find(el => el.id === id) || null;
    }

    /**
     * Affiche les propriétés d'un élément
     * @param {Object} element - L'élément
     */
    showProperties(element) {
        if (!element || !this.propertiesPanel) return;
        
        let html = '';
        
        if (element.type === 'caisson') {
            html = this.getCaissonPropertiesHTML(element);
        } else if (element.type === 'bouche') {
            html = this.getBouchePropertiesHTML(element);
        } else if (element.type === 'conduit') {
            html = this.getConduitPropertiesHTML(element);
        }
        
        this.propertiesPanel.innerHTML = html;
        
        // Ajouter les écouteurs d'événements pour les champs de formulaire
        this.setupPropertyEventListeners(element);
    }

    /**
     * Obtient le HTML des propriétés d'un caisson
     * @param {Object} caisson - Le caisson
     * @returns {string} HTML
     */
    getCaissonPropertiesHTML(caisson) {
        return `
            <div class="form-group">
                <label class="form-label">ID</label>
                <input type="text" class="form-input" value="${caisson.id}" disabled>
            </div>
            <div class="form-group">
                <label class="form-label">Nom</label>
                <input type="text" class="form-input" id="caisson-name" value="${caisson.name}">
            </div>
            <div class="form-group">
                <label class="form-label">Débit (m³/h)</label>
                <input type="number" class="form-input" id="caisson-flow" value="${caisson.flowRate}" min="0" step="1">
            </div>
            <div class="form-group">
                <label class="form-label">Largeur (mm)</label>
                <input type="number" class="form-input" id="caisson-width" value="${caisson.width}" min="10" step="1">
            </div>
            <div class="form-group">
                <label class="form-label">Hauteur (mm)</label>
                <input type="number" class="form-input" id="caisson-height" value="${caisson.height}" min="10" step="1">
            </div>
            <div class="form-group">
                <label class="form-label">Matériau</label>
                <select class="form-select" id="caisson-material">
                    <option value="acier" ${caisson.material === 'acier' ? 'selected' : ''}>Acier</option>
                    <option value="aluminium" ${caisson.material === 'aluminium' ? 'selected' : ''}>Aluminium</option>
                    <option value="flexible" ${caisson.material === 'flexible' ? 'selected' : ''}>Flexible</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Pression disponible (Pa)</label>
                <input type="number" class="form-input" id="caisson-pressure" value="${caisson.pressure}" min="0" step="1">
            </div>
            <div class="form-group">
                <button class="btn danger" id="delete-element">Supprimer</button>
            </div>
        `;
    }

    /**
     * Obtient le HTML des propriétés d'une bouche
     * @param {Object} bouche - La bouche
     * @returns {string} HTML
     */
    getBouchePropertiesHTML(bouche) {
        return `
            <div class="form-group">
                <label class="form-label">ID</label>
                <input type="text" class="form-input" value="${bouche.id}" disabled>
            </div>
            <div class="form-group">
                <label class="form-label">Nom</label>
                <input type="text" class="form-input" id="bouche-name" value="${bouche.name}">
            </div>
            <div class="form-group">
                <label class="form-label">Débit (m³/h)</label>
                <input type="number" class="form-input" id="bouche-flow" value="${bouche.flowRate}" min="0" step="1">
            </div>
            <div class="form-group">
                <label class="form-label">Forme</label>
                <select class="form-select" id="bouche-shape">
                    <option value="square" ${bouche.shape === 'square' ? 'selected' : ''}>Carrée</option>
                    <option value="round" ${bouche.shape === 'round' ? 'selected' : ''}>Ronde</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Taille (mm)</label>
                <input type="number" class="form-input" id="bouche-size" value="${bouche.size}" min="10" step="1">
            </div>
            <div class="form-group">
                <label class="form-label">Sens de l'air</label>
                <select class="form-select" id="bouche-air-type">
                    <option value="supply" ${bouche.airType === 'supply' ? 'selected' : ''}>Soufflage</option>
                    <option value="extract" ${bouche.airType === 'extract' ? 'selected' : ''}>Aspiration</option>
                </select>
            </div>
            <div class="form-group">
                <button class="btn danger" id="delete-element">Supprimer</button>
            </div>
        `;
    }

    /**
     * Obtient le HTML des propriétés d'un conduit
     * @param {Object} conduit - Le conduit
     * @returns {string} HTML
     */
    getConduitPropertiesHTML(conduit) {
        const dimHTML = conduit.isRound ? `
            <div class="form-group">
                <label class="form-label">Diamètre (mm)</label>
                <select class="form-select" id="conduit-diameter">
                    ${window.STANDARD_DIAMETERS.map(d => 
                        `<option value="${d}" ${conduit.diameter === d ? 'selected' : ''}>${d}</option>`
                    ).join('')}
                </select>
            </div>
        ` : `
            <div class="form-group">
                <label class="form-label">Largeur (mm)</label>
                <select class="form-select" id="conduit-width">
                    ${window.STANDARD_RECT_SIZES.map(s => 
                        `<option value="${s.width}" ${conduit.width === s.width ? 'selected' : ''}>${s.width}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Hauteur (mm)</label>
                <select class="form-select" id="conduit-height">
                    ${window.STANDARD_RECT_SIZES.map(s => 
                        `<option value="${s.height}" ${conduit.height === s.height ? 'selected' : ''}>${s.height}</option>`
                    ).join('')}
                </select>
            </div>
        `;

        return `
            <div class="form-group">
                <label class="form-label">ID</label>
                <input type="text" class="form-input" value="${conduit.id}" disabled>
            </div>
            <div class="form-group">
                <label class="form-label">Type</label>
                <select class="form-select" id="conduit-type" disabled>
                    <option value="round" ${conduit.isRound ? 'selected' : ''}>Rond</option>
                    <option value="rect" ${!conduit.isRound ? 'selected' : ''}>Rectangulaire</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Débit (m³/h)</label>
                <input type="number" class="form-input" id="conduit-flow" value="${conduit.flowRate}" min="0" step="1">
            </div>
            ${dimHTML}
            <div class="form-group">
                <label class="form-label">Matériau</label>
                <select class="form-select" id="conduit-material">
                    <option value="acier" ${conduit.material === 'acier' ? 'selected' : ''}>Acier</option>
                    <option value="aluminium" ${conduit.material === 'aluminium' ? 'selected' : ''}>Aluminium</option>
                    <option value="flexible" ${conduit.material === 'flexible' ? 'selected' : ''}>Flexible</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Vitesse (m/s)</label>
                <input type="text" class="form-input" id="conduit-velocity" value="${conduit.velocity ? conduit.velocity.toFixed(2) : '0'}" disabled>
            </div>
            <div class="form-group">
                <label class="form-label">Perte de charge (Pa)</label>
                <input type="text" class="form-input" id="conduit-pressure-drop" value="${conduit.pressureDrop ? conduit.pressureDrop.toFixed(2) : '0'}" disabled>
            </div>
            <div class="form-group">
                <label class="form-label">Connecté à</label>
                <input type="text" class="form-input" value="${conduit.startElementId || 'Départ'} → ${conduit.endElementId || 'Arrivée'}" disabled>
            </div>
            <div class="form-group">
                <button class="btn danger" id="delete-element">Supprimer</button>
            </div>
        `;
    }

    /**
     * Configure les écouteurs d'événements pour les propriétés
     * @param {Object} element - L'élément
     */
    setupPropertyEventListeners(element) {
        // Bouton de suppression
        const deleteBtn = document.getElementById('delete-element');
        if (deleteBtn) {
            deleteBtn.onclick = () => {
                this.selectedElements.clear();
                this.selectedElements.add(element.id);
                this.deleteSelectedElements();
            };
        }
        
        // Écouteurs spécifiques selon le type
        if (element.type === 'caisson') {
            this.setupCaissonPropertyListeners(element);
        } else if (element.type === 'bouche') {
            this.setupBouchePropertyListeners(element);
        } else if (element.type === 'conduit') {
            this.setupConduitPropertyListeners(element);
        }
    }

    /**
     * Configure les écouteurs pour un caisson
     * @param {Object} caisson - Le caisson
     */
    setupCaissonPropertyListeners(caisson) {
        const updateCaisson = () => {
            caisson.name = document.getElementById('caisson-name').value;
            caisson.flowRate = parseFloat(document.getElementById('caisson-flow').value) || 0;
            caisson.width = parseInt(document.getElementById('caisson-width').value) || caisson.width;
            caisson.height = parseInt(document.getElementById('caisson-height').value) || caisson.height;
            caisson.material = document.getElementById('caisson-material').value;
            caisson.pressure = parseFloat(document.getElementById('caisson-pressure').value) || 0;
            this.draw();
        };
        
        document.getElementById('caisson-name').addEventListener('change', updateCaisson);
        document.getElementById('caisson-flow').addEventListener('change', updateCaisson);
        document.getElementById('caisson-width').addEventListener('change', updateCaisson);
        document.getElementById('caisson-height').addEventListener('change', updateCaisson);
        document.getElementById('caisson-material').addEventListener('change', updateCaisson);
        document.getElementById('caisson-pressure').addEventListener('change', updateCaisson);
    }

    /**
     * Configure les écouteurs pour une bouche
     * @param {Object} bouche - La bouche
     */
    setupBouchePropertyListeners(bouche) {
        const updateBouche = () => {
            bouche.name = document.getElementById('bouche-name').value;
            bouche.flowRate = parseFloat(document.getElementById('bouche-flow').value) || 0;
            bouche.shape = document.getElementById('bouche-shape').value;
            bouche.size = parseInt(document.getElementById('bouche-size').value) || bouche.size;
            bouche.airType = document.getElementById('bouche-air-type').value;
            this.draw();
        };
        
        document.getElementById('bouche-name').addEventListener('change', updateBouche);
        document.getElementById('bouche-flow').addEventListener('change', updateBouche);
        document.getElementById('bouche-shape').addEventListener('change', updateBouche);
        document.getElementById('bouche-size').addEventListener('change', updateBouche);
        document.getElementById('bouche-air-type').addEventListener('change', updateBouche);
    }

    /**
     * Configure les écouteurs pour un conduit
     * @param {Object} conduit - Le conduit
     */
    setupConduitPropertyListeners(conduit) {
        const updateConduit = () => {
            conduit.flowRate = parseFloat(document.getElementById('conduit-flow').value) || 0;
            
            if (conduit.isRound) {
                conduit.diameter = parseInt(document.getElementById('conduit-diameter').value) || conduit.diameter;
            } else {
                conduit.width = parseInt(document.getElementById('conduit-width').value) || conduit.width;
                conduit.height = parseInt(document.getElementById('conduit-height').value) || conduit.height;
            }
            
            conduit.material = document.getElementById('conduit-material').value;
            this.draw();
        };
        
        document.getElementById('conduit-flow').addEventListener('change', updateConduit);
        
        if (conduit.isRound) {
            document.getElementById('conduit-diameter').addEventListener('change', updateConduit);
        } else {
            document.getElementById('conduit-width').addEventListener('change', updateConduit);
            document.getElementById('conduit-height').addEventListener('change', updateConduit);
        }
        
        document.getElementById('conduit-material').addEventListener('change', updateConduit);
    }

    /**
     * Masque le panneau des propriétés
     */
    hidePropertiesPanel() {
        if (this.propertiesPanel) {
            this.propertiesPanel.innerHTML = '<p class="empty-message">Sélectionnez un élément pour voir ses propriétés.</p>';
        }
    }

    /**
     * Affiche les résultats des calculs
     * @param {Object} results - Résultats des calculs
     */
    showResults(results) {
        if (!this.resultsPanel) return;
        
        let html = '<h4>Résultats des calculs</h4>';
        
        if (results.totalFlow) {
            html += `<p><strong>Débit total:</strong> ${results.totalFlow} m³/h</p>`;
        }
        
        if (results.totalPressure) {
            html += `<p><strong>Pression totale nécessaire:</strong> ${results.totalPressure.toFixed(2)} Pa</p>`;
        }
        
        if (results.caissonSize) {
            html += `<p><strong>Dimensionnement du caisson:</strong></p>`;
            html += `<ul>`;
            html += `<li>Largeur: ${results.caissonSize.width} mm</li>`;
            html += `<li>Hauteur: ${results.caissonSize.height} mm</li>`;
            html += `<li>Profondeur: ${results.caissonSize.depth} mm</li>`;
            html += `<li>Puissance: ${results.caissonSize.power} kW</li>`;
            html += `</ul>`;
        }
        
        if (results.conduits && results.conduits.length > 0) {
            html += `<p><strong>Pertes de charge par conduit:</strong></p>`;
            html += `<table class="pdf-table">`;
            html += `<thead><tr><th>ID</th><th>Perte de charge (Pa)</th><th>Vitesse (m/s)</th></tr></thead>`;
            html += `<tbody>`;
            
            for (const conduit of results.conduits) {
                html += `<tr>`;
                html += `<td>${conduit.id}</td>`;
                html += `<td>${conduit.pressureDrop.toFixed(2)}</td>`;
                html += `<td>${conduit.velocity.toFixed(2)}</td>`;
                html += `</tr>`;
            }
            
            html += `</tbody></table>`;
        }
        
        this.resultsPanel.innerHTML = html;
    }

    /**
     * Masque le panneau des résultats
     */
    hideResultsPanel() {
        if (this.resultsPanel) {
            this.resultsPanel.innerHTML = '<p class="empty-message">Calculez le réseau pour voir les résultats.</p>';
        }
    }

    /**
     * Affiche le résumé de validation
     * @param {Object} validation - Résultats de la validation
     */
    showValidation(validation) {
        if (!this.validationPanel) return;
        
        let html = '<h4>Validation du réseau</h4>';
        
        html += `<p><strong>Statut:</strong> <span class="badge ${validation.isValid ? 'success' : 'error'}">${validation.isValid ? 'Valide' : 'Invalide'}</span></p>`;
        
        if (validation.errors.length > 0) {
            html += `<p><strong>Erreurs:</strong></p><ul>`;
            validation.errors.forEach(error => {
                html += `<li class="text-danger">${error}</li>`;
            });
            html += `</ul>`;
        }
        
        if (validation.warnings.length > 0) {
            html += `<p><strong>Avertissements:</strong></p><ul>`;
            validation.warnings.forEach(warning => {
                html += `<li class="text-warning">${warning}</li>`;
            });
            html += `</ul>`;
        }
        
        if (validation.info.length > 0) {
            html += `<p><strong>Informations:</strong></p><ul>`;
            validation.info.forEach(info => {
                html += `<li>${info}</li>`;
            });
            html += `</ul>`;
        }
        
        this.validationPanel.innerHTML = html;
    }

    /**
     * Masque le panneau de validation
     */
    hideValidationPanel() {
        if (this.validationPanel) {
            this.validationPanel.innerHTML = '<p class="empty-message">Aucune erreur détectée.</p>';
        }
    }

    /**
     * Calcule le réseau
     */
    calculateNetwork() {
        // Valider le réseau
        const validation = window.validateNetwork(this.elements);
        this.showValidation(validation);
        
        if (!validation.isValid) {
            this.showNotification('Corrigez les erreurs avant de calculer', 'error');
            return;
        }
        
        // Calculer les débits
        const elementsWithFlows = window.calculateNetworkFlows(this.elements, this.flowDirection);
        
        // Mettre à jour les éléments
        this.elements = elementsWithFlows;
        
        // Dimensionner les conduits
        const bouches = this.elements.filter(el => el.type === 'bouche');
        const conduits = this.elements.filter(el => el.type === 'conduit');
        
        const dimensionedConduits = window.dimensionAllConduits(conduits, bouches, this.flowDirection);
        
        // Remplacer les conduits
        this.elements = this.elements.filter(el => el.type !== 'conduit');
        this.elements.push(...dimensionedConduits);
        
        // Calculer les pertes de charge
        const pressureResults = window.calculateNetworkPressureLoss(this.elements);
        
        // Mettre à jour les conduits avec les pertes de charge
        for (const conduit of this.elements) {
            if (conduit.type === 'conduit') {
                const pressureResult = pressureResults.conduits.find(c => c.id === conduit.id);
                if (pressureResult) {
                    conduit.pressureDrop = pressureResult.pressureDrop;
                    conduit.velocity = pressureResult.velocity;
                }
            }
        }
        
        // Afficher les résultats
        this.showResults(pressureResults);
        
        // Dessiner
        this.draw();
        
        this.showNotification('Calculs terminés', 'success');
    }

    /**
     * Exporte le réseau en PDF
     */
    async exportPDF() {
        try {
            // Calculer les résultats si ce n'est pas déjà fait
            let results = {};
            const bouches = this.elements.filter(el => el.type === 'bouche');
            if (bouches.length > 0) {
                results = window.calculateNetworkPressureLoss(this.elements);
            }
            
            // Générer le PDF
            const pdfBytes = await window.generatePDF(this.elements, results, this.flowDirection);
            
            // Télécharger le PDF
            window.downloadPDF(pdfBytes, `reseau_ventilation_${new Date().toISOString().slice(0, 10)}.pdf`);
            
            this.showNotification('Export PDF terminé', 'success');
        } catch (error) {
            console.error('Erreur lors de l\'export PDF:', error);
            this.showNotification('Erreur lors de l\'export PDF', 'error');
        }
    }

    /**
     * Affiche la modale de confirmation pour effacer tout
     */
    showConfirmClear() {
        const modal = document.getElementById('confirm-modal');
        modal.classList.add('active');
    }

    /**
     * Masque la modale de confirmation
     */
    hideConfirmModal() {
        const modal = document.getElementById('confirm-modal');
        modal.classList.remove('active');
    }

    /**
     * Efface tout le réseau
     */
    clearAll() {
        this.elements = [];
        this.selectedElement = null;
        this.selectedElements.clear();
        
        // Réinitialiser les compteurs d'IDs
        window.Caisson.resetIdCounter();
        window.Bouche.resetIdCounter();
        window.Conduit.resetIdCounter();
        
        // Réinitialiser l'historique
        this.history = [];
        this.historyIndex = -1;
        
        this.draw();
        this.hidePropertiesPanel();
        this.hideResultsPanel();
        this.hideValidationPanel();
        this.hideConfirmModal();
        
        this.showNotification('Réseau effacé', 'success');
    }

    /**
     * Affiche la modale d'aide
     */
    showHelp() {
        const modal = document.getElementById('help-modal');
        modal.classList.add('active');
    }

    /**
     * Masque la modale d'aide
     */
    hideHelpModal() {
        const modal = document.getElementById('help-modal');
        modal.classList.remove('active');
    }

    /**
     * Affiche une notification
     * @param {string} message - Message de la notification
     * @param {string} type - Type de notification ('success', 'warning', 'error', 'info')
     */
    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = type === 'success' ? '✓' : 
                    type === 'warning' ? '⚠' : 
                    type === 'error' ? '✗' : 'ℹ';
        
        notification.innerHTML = `
            <span class="icon">${icon}</span>
            <span class="message">${message}</span>
            <button class="close">×</button>
        `;
        
        notifications.appendChild(notification);
        
        // Supprimer après 5 secondes
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        // Écouteur pour fermer manuellement
        notification.querySelector('.close').addEventListener('click', () => {
            notification.remove();
        });
    }

    /**
     * Dessine tous les éléments sur le canvas
     */
    draw() {
        // Effacer le canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Sauvegarder le contexte
        this.ctx.save();
        
        // Appliquer la transformation (zoom et décalage)
        this.ctx.translate(this.offset.x * this.scale, this.offset.y * this.scale);
        this.ctx.scale(this.scale, this.scale);
        
        // Dessiner la grille
        this.drawGrid();
        
        // Dessiner les éléments
        for (const element of this.elements) {
            if (element.type === 'caisson') {
                element.draw(this.ctx, this.scale, this.flowDirection);
            } else if (element.type === 'bouche') {
                element.draw(this.ctx, this.scale, this.flowDirection);
            } else if (element.type === 'conduit') {
                element.draw(this.ctx, this.scale, this.flowDirection, this.showFlow);
            }
        }
        
        // Dessiner le conduit temporaire (si en cours de dessin)
        if (this.tempConduit) {
            this.tempwindow.Conduit.draw(this.ctx, this.scale, this.flowDirection);
        }
        
        // Dessiner les éléments sélectionnés en surbrillance
        for (const element of this.elements) {
            if (this.selectedElements.has(element.id)) {
                element.drawHighlight(this.ctx, this.scale);
            }
        }
        
        // Restaurer le contexte
        this.ctx.restore();
    }

    /**
     * Dessine la grille
     */
    drawGrid() {
        const gridSize = 20;
        const width = this.canvas.width / this.scale;
        const height = this.canvas.height / this.scale;
        
        this.ctx.strokeStyle = '#f0f0f0';
        this.ctx.lineWidth = 1;
        
        // Lignes verticales
        for (let x = -width; x <= width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, -height);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
        }
        
        // Lignes horizontales
        for (let y = -height; y <= height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(-width, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
        
        // Réinitialiser le style
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
    }

    /**
     * Sauvegarde l'état actuel dans l'historique
     */
    saveToHistory() {
        // Limiter l'historique à 50 étapes
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
        
        // Sauvegarder une copie profonde des éléments
        const elementsCopy = JSON.parse(JSON.stringify(this.elements));
        this.history.push(elementsCopy);
        this.historyIndex = this.history.length - 1;
    }

    /**
     * Annule la dernière action
     */
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.elements = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.draw();
        }
    }

    /**
     * Rétablit la dernière action annulée
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.elements = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.draw();
        }
    }

    /**
     * Met à jour l'interface utilisateur
     */
    updateUI() {
        // Mettre à jour le bouton de calcul
        const caissons = this.elements.filter(el => el.type === 'caisson');
        const bouches = this.elements.filter(el => el.type === 'bouche');
        const calculateBtn = document.getElementById('calculate-btn');
        
        if (calculateBtn) {
            calculateBtn.disabled = caissons.length === 0 || bouches.length === 0;
        }
        
        // Mettre à jour le bouton d'export PDF
        const exportBtn = document.getElementById('export-pdf-btn');
        if (exportBtn) {
            exportBtn.disabled = this.elements.length === 0;
        }
    }

    /**
     * Charge un réseau de test
     */
    loadTestNetwork() {
        // Réinitialiser
        this.clearAll();
        
        // Ajouter un caisson
        const caisson = new window.Caisson(200, 200);
        this.elements.push(caisson);
        
        // Ajouter des bouches
        const bouche1 = new window.Bouche(400, 100);
        bouche1.flowRate = 500;
        this.elements.push(bouche1);
        
        const bouche2 = new window.Bouche(400, 300);
        bouche2.flowRate = 300;
        this.elements.push(bouche2);
        
        const bouche3 = new window.Bouche(600, 200);
        bouche3.flowRate = 200;
        this.elements.push(bouche3);
        
        // Ajouter des conduits
        const conduit1 = new window.Conduit(260, 200, 340, 150, true);
        conduit1.startElementId = caisson.id;
        conduit1.endElementId = bouche1.id;
        caisson.addConnection(conduit1.id);
        bouche1.addConnection(conduit1.id);
        conduit1.addConnection(caisson.id);
        conduit1.addConnection(bouche1.id);
        this.elements.push(conduit1);
        
        const conduit2 = new window.Conduit(260, 200, 340, 250, true);
        conduit2.startElementId = caisson.id;
        conduit2.endElementId = bouche2.id;
        caisson.addConnection(conduit2.id);
        bouche2.addConnection(conduit2.id);
        conduit2.addConnection(caisson.id);
        conduit2.addConnection(bouche2.id);
        this.elements.push(conduit2);
        
        const conduit3 = new window.Conduit(340, 200, 540, 200, true);
        conduit3.startElementId = caisson.id;
        conduit3.endElementId = bouche3.id;
        caisson.addConnection(conduit3.id);
        bouche3.addConnection(conduit3.id);
        conduit3.addConnection(caisson.id);
        conduit3.addConnection(bouche3.id);
        this.elements.push(conduit3);
        
        this.draw();
        this.showNotification('Réseau de test chargé', 'success');
    }
};