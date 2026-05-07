/**
 * Module pour les calculs de perte de charge
 */

// Import from window

// Coefficients de perte de charge singulière pour différents types de raccords
window.window.SINGULAR_LOSS_COEFFICIENTS = {
    // Coude à 90°
    'elbow_90': {
        'round': 0.25,
        'rect': 0.30
    },
    // Coude à 45°
    'elbow_45': {
        'round': 0.15,
        'rect': 0.18
    },
    // Té (dérivation)
    'tee_branch': {
        'round': 0.50,
        'rect': 0.60
    },
    // Té (passage direct)
    'tee_straight': {
        'round': 0.10,
        'rect': 0.12
    },
    // Réduction
    'reduction': {
        'round': 0.10,
        'rect': 0.15
    },
    // Élargissement
    'expansion': {
        'round': 0.20,
        'rect': 0.25
    },
    // Entrée
    'entry': {
        'round': 0.50,
        'rect': 0.50
    },
    // Sortie
    'exit': {
        'round': 1.00,
        'rect': 1.00
    },
    // Grille
    'grille': {
        'round': 1.50,
        'rect': 1.50
    },
    // Bouche
    'bouche': {
        'round': 1.00,
        'rect': 1.00
    }
};

// Rugosité des différents matériaux (en mètres)
const MATERIAL_ROUGHNESS = {
    'acier': 0.00015,      // Acier galvanisé
    'aluminium': 0.00006,  // Aluminium
    'flexible': 0.001,     // Conduit flexible
    'pvc': 0.0000015,     // PVC lisse
    'beton': 0.003        // Béton
};

// Coefficient de perte de charge linéaire pour différents matériaux
// (perte de charge en Pa/m pour un débit de 1 m³/h dans un conduit de 100mm)
const LINEAR_LOSS_COEFFICIENTS = {
    'acier': 0.02,
    'aluminium': 0.015,
    'flexible': 0.05,
    'pvc': 0.01,
    'beton': 0.03
};

/**
 * Calcule la perte de charge linéaire avec la formule de Darcy-Weisbach
 * @param {number} length - Longueur du conduit en mètres
 * @param {number} diameter - Diamètre en mètres (pour les conduits ronds)
 * @param {number} width - Largeur en mètres (pour les conduits rectangulaires)
 * @param {number} height - Hauteur en mètres (pour les conduits rectangulaires)
 * @param {number} flowRate - Débit en m³/s
 * @param {number} roughness - Rugosité en mètres
 * @param {boolean} isRound - Vrai si conduit rond
 * @returns {number} Perte de charge en Pa
 */
window.calculateLinearPressureDrop = function(
    length, diameter = 0, width = 0, height = 0, 
    flowRate, roughness = 0.00015, isRound = true
) {
    if (flowRate <= 0 || length <= 0) return 0;

    // Calculer la section
    let area;
    let hydraulicDiameter;
    
    if (isRound) {
        const radius = diameter / 2;
        area = Math.PI * radius * radius;
        hydraulicDiameter = diameter;
    } else {
        area = width * height;
        // Diamètre hydraulique pour les conduits rectangulaires: Dh = 2 * (w * h) / (w + h)
        hydraulicDiameter = (2 * width * height) / (width + height);
    }

    if (area <= 0 || hydraulicDiameter <= 0) return 0;

    // Calculer la vitesse
    const velocity = flowRate / area;
    if (velocity <= 0) return 0;

    // Calculer le nombre de Reynolds
    const kinematicViscosity = 1.5e-5; // Viscosité cinématique de l'air à 20°C (m²/s)
    const reynoldsNumber = (velocity * hydraulicDiameter) / kinematicViscosity;

    // Calculer le coefficient de friction avec la formule de Colebrook-White
    const frictionFactor = calculateFrictionFactor(reynoldsNumber, roughness, hydraulicDiameter);

    // Formule de Darcy-Weisbach: ΔP = f * (L / Dh) * (ρ * v² / 2)
    const pressureDrop = frictionFactor * (length / hydraulicDiameter) * (window.AIR_DENSITY * velocity * velocity / 2);

    return pressureDrop;
}

/**
 * Calcule le coefficient de friction avec la formule de Colebrook-White
 * @param {number} reynoldsNumber - Nombre de Reynolds
 * @param {number} roughness - Rugosité en mètres
 * @param {number} diameter - Diamètre hydraulique en mètres
 * @returns {number} Coefficient de friction
 */
function calculateFrictionFactor(reynoldsNumber, roughness, diameter) {
    if (reynoldsNumber <= 0 || diameter <= 0) return 0.02;

    const relativeRoughness = roughness / diameter;

    // Approximation de Swamee-Jain pour éviter l'itération
    if (reynoldsNumber < 2000) {
        // Régime laminaire
        return 64 / reynoldsNumber;
    }

    // Régime turbulent - approximation de Swamee-Jain
    const term1 = 0.25 / Math.pow(Math.log10(relativeRoughness / 3.7 + 5.74 / Math.pow(reynoldsNumber, 0.9)), 2);
    return term1;
}

/**
 * Calcule la perte de charge singulière
 * @param {number} velocity - Vitesse en m/s
 * @param {string} fittingType - Type de raccord
 * @param {boolean} isRound - Vrai si conduit rond
 * @returns {number} Perte de charge en Pa
 */
window.calculateSingularPressureDrop = function(velocity, fittingType = 'elbow_90', isRound = true) {
    if (velocity <= 0) return 0;

    const coefficient = window.SINGULAR_LOSS_COEFFICIENTS[fittingType]?.[isRound ? 'round' : 'rect'] || 0.25;
    
    // Formule: ΔP = K * (ρ * v² / 2)
    return coefficient * (window.AIR_DENSITY * velocity * velocity / 2);
}

/**
 * Calcule la perte de charge pour une réduction
 * @param {number} velocityIn - Vitesse en amont en m/s
 * @param {number} areaIn - Section en amont en m²
 * @param {number} areaOut - Section en aval en m²
 * @param {boolean} isRound - Vrai si conduit rond
 * @returns {number} Perte de charge en Pa
 */
window.calculateReductionPressureDrop = function(velocityIn, areaIn, areaOut, isRound = true) {
    if (velocityIn <= 0 || areaIn <= 0 || areaOut <= 0) return 0;

    // Calculer la vitesse en aval (conservation du débit)
    const velocityOut = velocityIn * (areaIn / areaOut);

    // Coefficient de perte de charge pour une réduction
    const areaRatio = areaOut / areaIn;
    const coefficient = 0.5 * Math.pow(1 - areaRatio, 2);

    // Formule: ΔP = K * (ρ * v² / 2)
    return coefficient * (window.AIR_DENSITY * velocityIn * velocityIn / 2);
}

/**
 * Calcule la perte de charge pour un élargissement
 * @param {number} velocityIn - Vitesse en amont en m/s
 * @param {number} areaIn - Section en amont en m²
 * @param {number} areaOut - Section en aval en m²
 * @param {boolean} isRound - Vrai si conduit rond
 * @returns {number} Perte de charge en Pa
 */
window.calculateExpansionPressureDrop = function(velocityIn, areaIn, areaOut, isRound = true) {
    if (velocityIn <= 0 || areaIn <= 0 || areaOut <= 0) return 0;

    // Calculer la vitesse en aval
    const velocityOut = velocityIn * (areaIn / areaOut);

    // Coefficient de perte de charge pour un élargissement
    const areaRatio = areaOut / areaIn;
    const coefficient = Math.pow(1 - areaIn / areaOut, 2);

    // Formule: ΔP = K * (ρ * v² / 2)
    return coefficient * (window.AIR_DENSITY * velocityIn * velocityIn / 2);
}

/**
 * Calcule la perte de charge totale pour un conduit
 * @param {Object} conduit - Le conduit
 * @param {Array} elements - Tous les éléments du réseau
 * @returns {number} Perte de charge totale en Pa
 */
window.calculateTotalPressureDrop = function(conduit, elements) {
    if (!conduit || conduit.flowRate <= 0) return 0;

    let totalPressureDrop = 0;

    // 1. Perte de charge linéaire
    const lengthM = conduit.length / 1000; // Convertir de mm à m
    const diameterM = conduit.diameter / 1000; // Convertir de mm à m
    const widthM = conduit.width / 1000;
    const heightM = conduit.height / 1000;
    const flowRateM3s = conduit.flowRate / 3600; // Convertir de m³/h à m³/s
    const roughness = MATERIAL_ROUGHNESS[conduit.material] || 0.00015;

    const linearDrop = calculateLinearPressureDrop(
        lengthM, diameterM, widthM, heightM,
        flowRateM3s, roughness, conduit.isRound
    );
    totalPressureDrop += linearDrop;

    // 2. Pertes de charge singulières (coudes, etc.)
    // Détecter les changements de direction
    const directionChanges = detectDirectionChanges(conduit, elements);
    
    for (const change of directionChanges) {
        const singularDrop = calculateSingularPressureDrop(
            conduit.velocity,
            change.type,
            conduit.isRound
        );
        totalPressureDrop += singularDrop;
    }

    // 3. Pertes de charge pour les réductions/élargissements
    // (À implémenter avec la détection des changements de diamètre)

    return totalPressureDrop;
}

/**
 * Détecte les changements de direction dans un conduit
 * @param {Object} conduit - Le conduit
 * @param {Array} elements - Tous les éléments du réseau
 * @returns {Array} Tableau des changements de direction
 */
function detectDirectionChanges(conduit, elements) {
    const changes = [];

    // Vérifier si le conduit a des points de contrôle (courbe)
    if (conduit.controlPoints && conduit.controlPoints.length > 0) {
        // Estimer le nombre de coudes en fonction des points de contrôle
        const segmentCount = conduit.controlPoints.length + 1;
        for (let i = 0; i < segmentCount; i++) {
            changes.push({ type: 'elbow_45' }); // Approximation
        }
    }

    // Vérifier les connexions avec d'autres éléments
    // (À implémenter)

    return changes;
}

/**
 * Calcule la pression totale nécessaire pour un réseau
 * @param {Array} conduits - Tableau des conduits
 * @param {Array} bouches - Tableau des bouches
 * @param {Array} caissons - Tableau des caissons
 * @returns {number} Pression totale en Pa
 */
window.calculateTotalNetworkPressure = function(conduits, bouches, caissons) {
    if (caissons.length === 0) return 0;

    // Calculer la perte de charge pour chaque conduit
    const pressureDrops = conduits.map(conduit => 
        calculateTotalPressureDrop(conduit, [...bouches, ...caissons, ...conduits])
    );

    // La pression totale est la somme des pertes de charge du chemin le plus long
    // (Implémentation simplifiée - à améliorer avec un algorithme de chemin critique)
    return Math.max(...pressureDrops, 0);
}

/**
 * Dimensionne un caisson en fonction du débit total
 * @param {number} totalFlow - Débit total en m³/h
 * @param {string} type - Type de caisson ('centrifuge', 'axial')
 * @returns {Object} Dimensions du caisson
 */
window.sizeCaisson = function(totalFlow, type = 'centrifuge') {
    // Dimensions approximatives basées sur le débit
    // (Ces valeurs sont indicatives et doivent être ajustées selon les normes constructeur)
    
    const dimensions = {
        width: 0,
        height: 0,
        depth: 0,
        power: 0 // Puissance en kW
    };

    if (totalFlow <= 1000) {
        // Petit caisson
        dimensions.width = 500;
        dimensions.height = 400;
        dimensions.depth = 300;
        dimensions.power = 0.5;
    } else if (totalFlow <= 5000) {
        // Caisson moyen
        dimensions.width = 800;
        dimensions.height = 600;
        dimensions.depth = 400;
        dimensions.power = 2.2;
    } else if (totalFlow <= 10000) {
        // Grand caisson
        dimensions.width = 1200;
        dimensions.height = 800;
        dimensions.depth = 600;
        dimensions.power = 5.5;
    } else {
        // Très grand caisson
        dimensions.width = 1500;
        dimensions.height = 1000;
        dimensions.depth = 800;
        dimensions.power = 11;
    }

    // Ajuster selon le type
    if (type === 'axial') {
        dimensions.depth = dimensions.depth * 0.8;
    }

    return dimensions;
}

/**
 * Calcule la perte de charge pour un réseau complet
 * @param {Array} elements - Tous les éléments du réseau
 * @returns {Object} Objet avec les résultats de calcul
 */
window.calculateNetworkPressureLoss = function(elements) {
    const conduits = elements.filter(el => el.type === 'conduit');
    const bouches = elements.filter(el => el.type === 'bouche');
    const caissons = elements.filter(el => el.type === 'caisson');

    // Calculer la perte de charge pour chaque conduit
    const results = conduits.map(conduit => {
        const pressureDrop = calculateTotalPressureDrop(conduit, elements);
        return {
            id: conduit.id,
            pressureDrop: pressureDrop,
            velocity: conduit.velocity || 0
        };
    });

    // Calculer la pression totale nécessaire
    const totalPressure = calculateTotalNetworkPressure(conduits, bouches, caissons);

    // Dimensionner le caisson
    const totalFlow = bouches.reduce((sum, bouche) => sum + (bouche.flowRate || 0), 0);
    const caissonSize = sizeCaisson(totalFlow);

    return {
        conduits: results,
        totalPressure: totalPressure,
        caissonSize: caissonSize,
        totalFlow: totalFlow
    };
}

/**
 * Obtient le coefficient de rugosité pour un matériau
 * @param {string} material - Matériau
 * @returns {number} Rugosité en mètres
 */
window.getMaterialRoughness = function(material) {
    return MATERIAL_ROUGHNESS[material] || 0.00015;
}

/**
 * Obtient le coefficient de perte de charge linéaire pour un matériau
 * @param {string} material - Matériau
 * @returns {number} Coefficient de perte de charge
 */
window.getLinearLossCoefficient = function(material) {
    return LINEAR_LOSS_COEFFICIENTS[material] || 0.02;
}
