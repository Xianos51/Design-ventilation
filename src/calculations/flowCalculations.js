/**
 * Module pour les calculs de débit et dimensionnement
 */

// Import from window

// Constantes pour les calculs
window.AIR_DENSITY = 1.2; // kg/m³ - densité de l'air à 20°C
window.MAX_VELOCITY_SUPPLY = 8; // m/s - vitesse maximale recommandée pour le soufflage
window.MAX_VELOCITY_EXTRACT = 10; // m/s - vitesse maximale recommandée pour l'aspiration
window.MAX_VELOCITY_MAIN = 12; // m/s - vitesse maximale recommandée pour les conduits principaux
window.MIN_VELOCITY = 2; // m/s - vitesse minimale recommandée

// Normes de débit par type de local (m³/h par m²)
window.FLOW_RATES_PER_AREA = {
    'bureau': 30,
    'salle_de_reunion': 40,
    'salle_de_classe': 35,
    'chambre': 25,
    'cuisine': 60,
    'salle_de_bain': 50,
    'wc': 40,
    'salle_de_sport': 50,
    'restaurant': 45,
    'magasin': 30,
    'atelier': 40
};

/**
 * Calcule le débit total d'un réseau
 * @param {Array} bouches - Tableau des bouches
 * @returns {number} Débit total en m³/h
 */
export function calculateTotalFlow(bouches) {
    return bouches.reduce((total, bouche) => total + (bouche.flowRate || 0), 0);
}

/**
 * Calcule les débits dans chaque conduit en fonction des bouches connectées
 * @param {Array} conduits - Tableau des conduits
 * @param {Array} bouches - Tableau des bouches
 * @param {Array} caissons - Tableau des caissons
 * @returns {Array} Tableau des conduits avec les débits mis à jour
 */
export function calculateConduitFlows(conduits, bouches, caissons) {
    // Créer une carte des éléments par ID
    const elementsMap = new Map();
    [...bouches, ...caissons].forEach(el => elementsMap.set(el.id, el));

    // Pour chaque conduit, calculer le débit en fonction des bouches connectées
    return conduits.map(conduit => {
        // Trouver les éléments connectés
        const startElement = elementsMap.get(conduit.startElementId);
        const endElement = elementsMap.get(conduit.endElementId);

        // Si le conduit est connecté à une bouche, le débit est celui de la bouche
        if (startElement && startElement.type === 'bouche') {
            return { ...conduit, flowRate: startElement.flowRate };
        }

        if (endElement && endElement.type === 'bouche') {
            return { ...conduit, flowRate: endElement.flowRate };
        }

        // Sinon, calculer le débit en fonction des bouches en aval
        // (Cette logique sera améliorée avec le graphe de réseau)
        return conduit;
    });
}

/**
 * Calcule le débit dans un conduit en fonction des bouches en aval
 * @param {Object} conduit - Le conduit
 * @param {Array} bouches - Tableau des bouches
 * @param {Array} conduits - Tableau des conduits
 * @param {Map} networkGraph - Graphe du réseau (elementId -> [connectedElementIds])
 * @returns {number} Débit dans le conduit
 */
export function calculateConduitFlow(conduit, bouches, conduits, networkGraph) {
    // Si le conduit est connecté directement à une bouche, retourner le débit de la bouche
    const startElement = findElementById(conduit.startElementId, bouches, conduits);
    const endElement = findElementById(conduit.endElementId, bouches, conduits);

    if (startElement && startElement.type === 'bouche') {
        return startElement.flowRate;
    }

    if (endElement && endElement.type === 'bouche') {
        return endElement.flowRate;
    }

    // Sinon, calculer le débit en fonction des bouches en aval
    // (Implémentation simplifiée - à améliorer avec un algorithme de parcours de graphe)
    return 0;
}

/**
 * Trouve un élément par son ID
 * @param {string} id - ID de l'élément
 * @param {Array} bouches - Tableau des bouches
 * @param {Array} conduits - Tableau des conduits
 * @param {Array} caissons - Tableau des caissons
 * @returns {Object|null} L'élément trouvé ou null
 */
function findElementById(id, bouches, conduits, caissons = []) {
    if (!id) return null;
    
    const allElements = [...bouches, ...conduits, ...caissons];
    return allElements.find(el => el.id === id) || null;
}

/**
 * Dimensionne un conduit rond en fonction du débit
 * @param {number} flowRate - Débit en m³/h
 * @param {number} maxVelocity - Vitesse maximale en m/s
 * @returns {number} Diamètre en mm
 */
export function sizeRoundConduit(flowRate, maxVelocity = MAX_VELOCITY_MAIN) {
    if (flowRate <= 0) return window.STANDARD_DIAMETERS[0];

    // Convertir le débit de m³/h à m³/s
    const flowRateM3s = flowRate / 3600;

    // Calculer la section nécessaire : Q = V * A => A = Q / V
    const area = flowRateM3s / maxVelocity;

    // Calculer le diamètre : A = π * r² => r = sqrt(A / π) => d = 2 * r
    const diameterM = Math.sqrt(area / Math.PI) * 2;
    const diameterMm = diameterM * 1000;

    // Trouver le diamètre standard le plus proche (supérieur ou égal)
    return findClosestStandardDiameter(diameterMm);
}

/**
 * Dimensionne un conduit rectangulaire en fonction du débit
 * @param {number} flowRate - Débit en m³/h
 * @param {number} maxVelocity - Vitesse maximale en m/s
 * @param {number} aspectRatio - Rapport largeur/hauteur (optionnel)
 * @returns {Object} Objet avec width et height en mm
 */
export function sizeRectConduit(flowRate, maxVelocity = MAX_VELOCITY_MAIN, aspectRatio = 2) {
    if (flowRate <= 0) return window.STANDARD_RECT_SIZES[0];

    // Convertir le débit de m³/h à m³/s
    const flowRateM3s = flowRate / 3600;

    // Calculer la section nécessaire
    const area = flowRateM3s / maxVelocity;

    // Calculer les dimensions en fonction du rapport d'aspect
    const widthM = Math.sqrt(area * aspectRatio);
    const heightM = widthM / aspectRatio;

    const widthMm = widthM * 1000;
    const heightMm = heightM * 1000;

    // Trouver la taille standard la plus proche
    return findClosestStandardRectSize(widthMm, heightMm);
}

/**
 * Trouve le diamètre standard le plus proche (supérieur ou égal)
 * @param {number} diameter - Diamètre en mm
 * @returns {number} Diamètre standard
 */
function findClosestStandardDiameter(diameter) {
    for (const stdDiameter of window.STANDARD_DIAMETERS) {
        if (stdDiameter >= diameter) {
            return stdDiameter;
        }
    }
    return window.STANDARD_DIAMETERS[window.STANDARD_DIAMETERS.length - 1];
}

/**
 * Trouve la taille rectangulaire standard la plus proche
 * @param {number} width - Largeur en mm
 * @param {number} height - Hauteur en mm
 * @returns {Object} Taille standard avec width et height
 */
function findClosestStandardRectSize(width, height) {
    let bestFit = window.STANDARD_RECT_SIZES[0];
    let minDiff = Infinity;

    for (const size of window.STANDARD_RECT_SIZES) {
        const area = size.width * size.height;
        const targetArea = width * height;
        const diff = Math.abs(area - targetArea);

        if (diff < minDiff) {
            minDiff = diff;
            bestFit = size;
        }
    }

    return bestFit;
}

/**
 * Calcule la vitesse de l'air dans un conduit
 * @param {number} flowRate - Débit en m³/h
 * @param {number} diameter - Diamètre en mm (pour les conduits ronds)
 * @param {number} width - Largeur en mm (pour les conduits rectangulaires)
 * @param {number} height - Hauteur en mm (pour les conduits rectangulaires)
 * @param {boolean} isRound - Vrai si conduit rond
 * @returns {number} Vitesse en m/s
 */
export function calculateVelocity(flowRate, diameter = 0, width = 0, height = 0, isRound = true) {
    if (flowRate <= 0) return 0;

    // Convertir le débit de m³/h à m³/s
    const flowRateM3s = flowRate / 3600;

    // Calculer la section en m²
    let areaM2;
    if (isRound) {
        const radiusM = (diameter / 1000) / 2;
        areaM2 = Math.PI * radiusM * radiusM;
    } else {
        const widthM = width / 1000;
        const heightM = height / 1000;
        areaM2 = widthM * heightM;
    }

    if (areaM2 <= 0) return 0;

    // Vitesse = Débit / Section
    return flowRateM3s / areaM2;
}

/**
 * Vérifie si la vitesse est dans les limites recommandées
 * @param {number} velocity - Vitesse en m/s
 * @param {string} elementType - Type d'élément ('supply', 'extract', 'main')
 * @returns {Object} Objet avec valid (boolean) et message (string)
 */
export function checkVelocityLimits(velocity, elementType = 'main') {
    let maxVelocity;
    switch (elementType) {
        case 'supply':
            maxVelocity = MAX_VELOCITY_SUPPLY;
            break;
        case 'extract':
            maxVelocity = MAX_VELOCITY_EXTRACT;
            break;
        default:
            maxVelocity = MAX_VELOCITY_MAIN;
    }

    if (velocity < MIN_VELOCITY) {
        return {
            valid: false,
            message: `Vitesse trop faible (${velocity.toFixed(2)} m/s). Minimum recommandé : ${MIN_VELOCITY} m/s`
        };
    }

    if (velocity > maxVelocity) {
        return {
            valid: false,
            message: `Vitesse trop élevée (${velocity.toFixed(2)} m/s). Maximum recommandé pour ${elementType} : ${maxVelocity} m/s`
        };
    }

    return { valid: true, message: `Vitesse acceptable (${velocity.toFixed(2)} m/s)` };
}

/**
 * Calcule le débit recommandé pour un local en fonction de sa surface
 * @param {number} area - Surface en m²
 * @param {string} roomType - Type de local
 * @returns {number} Débit recommandé en m³/h
 */
window.calculateRecommendedFlow = function(area, roomType = 'bureau') {
    const rate = FLOW_RATES_PER_AREA[roomType] || FLOW_RATES_PER_AREA['bureau'];
    return area * rate;
}

/**
 * Dimensionne tous les conduits d'un réseau
 * @param {Array} conduits - Tableau des conduits
 * @param {Array} bouches - Tableau des bouches
 * @param {string} flowDirection - Sens de l'air ('supply' ou 'extract')
 * @returns {Array} Tableau des conduits dimensionnés
 */
window.dimensionAllConduits = function(conduits, bouches, flowDirection = 'supply') {
    // Créer une carte des bouches par ID
    const bouchesMap = new Map(bouches.map(b => [b.id, b]));

    return conduits.map(conduit => {
        // Trouver les bouches connectées
        const startBouche = bouchesMap.get(conduit.startElementId);
        const endBouche = bouchesMap.get(conduit.endElementId);

        // Déterminer le débit
        let flowRate = 0;
        if (startBouche) {
            flowRate = startBouche.flowRate;
        } else if (endBouche) {
            flowRate = endBouche.flowRate;
        }

        // Dimensionner le conduit
        const dimensionedConduit = { ...conduit, flowRate };

        if (conduit.isRound) {
            dimensionedConduit.diameter = sizeRoundConduit(flowRate);
            dimensionedConduit.velocity = calculateVelocity(
                flowRate, dimensionedConduit.diameter, 0, 0, true
            );
        } else {
            const size = sizeRectConduit(flowRate);
            dimensionedConduit.width = size.width;
            dimensionedConduit.height = size.height;
            dimensionedConduit.velocity = calculateVelocity(
                flowRate, 0, dimensionedConduit.width, dimensionedConduit.height, false
            );
        }

        return dimensionedConduit;
    });
}

/**
 * Calcule les débits dans un réseau en partant des bouches
 * @param {Array} elements - Tous les éléments du réseau
 * @param {string} flowDirection - Sens de l'air ('supply' ou 'extract')
 * @returns {Array} Tableau des éléments avec les débits mis à jour
 */
window.calculateNetworkFlows = function(elements, flowDirection = 'supply') {
    // Séparer les éléments par type
    const caissons = elements.filter(el => el.type === 'caisson');
    const bouches = elements.filter(el => el.type === 'bouche');
    const conduits = elements.filter(el => el.type === 'conduit');

    // Si pas de caisson, retourner les éléments inchangés
    if (caissons.length === 0) {
        return elements;
    }

    // Calculer le débit total
    const totalFlow = calculateTotalFlow(bouches);

    // Mettre à jour le débit du caisson
    const updatedCaissons = caissons.map(caisson => ({
        ...caisson,
        flowRate: totalFlow
    }));

    // Pour chaque conduit, calculer le débit en fonction des bouches connectées
    // (Implémentation simplifiée - à améliorer avec un algorithme de parcours de graphe)
    const updatedConduits = conduits.map(conduit => {
        // Trouver les bouches connectées directement
        const connectedBouches = bouches.filter(bouche => 
            conduit.startElementId === bouche.id || conduit.endElementId === bouche.id
        );

        // Si connecté à une seule bouche, le débit est celui de la bouche
        if (connectedBouches.length === 1) {
            return {
                ...conduit,
                flowRate: connectedBouches[0].flowRate
            };
        }

        // Sinon, estimer le débit en fonction de la position dans le réseau
        // (Cette logique sera améliorée)
        return conduit;
    });

    return [...updatedCaissons, ...bouches, ...updatedConduits];
}
