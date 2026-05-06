/**
 * Module pour la validation du réseau de ventilation
 */

/**
 * Vérifie si le réseau contient des boucles
 * @param {Array} elements - Tous les éléments du réseau
 * @returns {Object} Objet avec hasLoop (boolean) et loops (Array)
 */
export function detectLoops(elements) {
    const conduits = elements.filter(el => el.type === 'conduit');
    const nodes = elements.filter(el => el.type === 'caisson' || el.type === 'bouche');

    // Créer un graphe de connexion
    const graph = buildConnectionGraph(elements);

    // Détecter les boucles avec un algorithme de parcours en profondeur
    const visited = new Set();
    const recursionStack = new Set();
    const loops = [];

    function hasCycle(nodeId) {
        if (!graph.has(nodeId)) return false;

        visited.add(nodeId);
        recursionStack.add(nodeId);

        for (const neighborId of graph.get(nodeId)) {
            if (!visited.has(neighborId)) {
                if (hasCycle(neighborId)) {
                    return true;
                }
            } else if (recursionStack.has(neighborId)) {
                // Boucle détectée
                loops.push([...recursionStack].filter(id => id !== neighborId || id === nodeId));
                return true;
            }
        }

        recursionStack.delete(nodeId);
        return false;
    }

    // Parcourir tous les nœuds
    for (const node of nodes) {
        if (!visited.has(node.id)) {
            hasCycle(node.id);
        }
    }

    return {
        hasLoop: loops.length > 0,
        loops: loops
    };
}

/**
 * Construit un graphe de connexion à partir des éléments
 * @param {Array} elements - Tous les éléments
 * @returns {Map} Graphe de connexion (nodeId -> Set of connected nodeIds)
 */
function buildConnectionGraph(elements) {
    const graph = new Map();

    // Initialiser tous les nœuds
    elements.forEach(el => {
        graph.set(el.id, new Set());
    });

    // Ajouter les connexions
    const conduits = elements.filter(el => el.type === 'conduit');
    for (const conduit of conduits) {
        if (conduit.startElementId && conduit.endElementId) {
            // Ajouter la connexion dans les deux sens
            if (graph.has(conduit.startElementId)) {
                graph.get(conduit.startElementId).add(conduit.endElementId);
            }
            if (graph.has(conduit.endElementId)) {
                graph.get(conduit.endElementId).add(conduit.startElementId);
            }
        }
    }

    return graph;
}

/**
 * Vérifie si toutes les bouches sont connectées au réseau
 * @param {Array} elements - Tous les éléments du réseau
 * @returns {Object} Objet avec allConnected (boolean) et disconnected (Array)
 */
export function checkBouchesConnected(elements) {
    const bouches = elements.filter(el => el.type === 'bouche');
    const caissons = elements.filter(el => el.type === 'caisson');
    const conduits = elements.filter(el => el.type === 'conduit');

    if (caissons.length === 0) {
        return {
            allConnected: false,
            disconnected: bouches.map(b => b.id),
            message: 'Aucun caisson trouvé. Toutes les bouches sont déconnectées.'
        };
    }

    // Construire le graphe de connexion
    const graph = buildConnectionGraph(elements);

    // Trouver toutes les bouches connectées au caisson
    const connectedBouches = new Set();
    const visited = new Set();

    // Parcourir à partir de chaque caisson
    for (const caisson of caissons) {
        if (!visited.has(caisson.id)) {
            traverseFromNode(caisson.id, graph, visited, connectedBouches);
        }
    }

    // Trouver les bouches non connectées
    const disconnected = bouches.filter(bouche => !connectedBouches.has(bouche.id));

    return {
        allConnected: disconnected.length === 0,
        disconnected: disconnected.map(b => b.id),
        message: disconnected.length === 0 
            ? 'Toutes les bouches sont connectées au réseau.'
            : `${disconnected.length} bouche(s) non connectée(s) : ${disconnected.map(b => b.id).join(', ')}`
    };
}

/**
 * Parcourt le graphe à partir d'un nœud
 * @param {string} nodeId - ID du nœud de départ
 * @param {Map} graph - Graphe de connexion
 * @param {Set} visited - Nœuds déjà visités
 * @param {Set} connectedBouches - Bouches connectées trouvées
 */
function traverseFromNode(nodeId, graph, visited, connectedBouches) {
    if (!graph.has(nodeId) || visited.has(nodeId)) return;

    visited.add(nodeId);

    // Si c'est une bouche, l'ajouter aux bouches connectées
    const node = findElementById(nodeId, [...graph.keys()]);
    if (node && node.type === 'bouche') {
        connectedBouches.add(nodeId);
    }

    // Parcourir les voisins
    for (const neighborId of graph.get(nodeId)) {
        if (!visited.has(neighborId)) {
            traverseFromNode(neighborId, graph, visited, connectedBouches);
        }
    }
}

/**
 * Trouve un élément par son ID
 * @param {string} id - ID de l'élément
 * @param {Array} elements - Tableau des éléments
 * @returns {Object|null} L'élément trouvé ou null
 */
function findElementById(id, elements) {
    return elements.find(el => el.id === id) || null;
}

/**
 * Vérifie si le réseau a un seul caisson (recommandé)
 * @param {Array} elements - Tous les éléments
 * @returns {Object} Objet avec valid (boolean) et message (string)
 */
export function checkSingleCaisson(elements) {
    const caissons = elements.filter(el => el.type === 'caisson');

    if (caissons.length === 0) {
        return {
            valid: false,
            message: 'Aucun caisson trouvé. Ajoutez au moins un caisson pour démarrer le réseau.'
        };
    }

    if (caissons.length > 1) {
        return {
            valid: false,
            message: `${caissons.length} caissons trouvés. Il est recommandé d'avoir un seul caisson principal.`
        };
    }

    return {
        valid: true,
        message: 'Configuration de caisson valide.'
    };
}

/**
 * Vérifie si les débits des bouches sont valides
 * @param {Array} bouches - Tableau des bouches
 * @returns {Object} Objet avec valid (boolean), errors (Array) et warnings (Array)
 */
export function validateBouchesFlowRates(bouches) {
    const errors = [];
    const warnings = [];

    for (const bouche of bouches) {
        if (bouche.flowRate === undefined || bouche.flowRate === null) {
            errors.push({
                id: bouche.id,
                message: `Débit non défini pour la bouche ${bouche.id}`
            });
        } else if (bouche.flowRate <= 0) {
            errors.push({
                id: bouche.id,
                message: `Débit invalide (${bouche.flowRate} m³/h) pour la bouche ${bouche.id}. Doit être > 0.`
            });
        } else if (bouche.flowRate > 10000) {
            warnings.push({
                id: bouche.id,
                message: `Débit élevé (${bouche.flowRate} m³/h) pour la bouche ${bouche.id}. Vérifiez la valeur.`
            });
        }
    }

    return {
        valid: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}

/**
 * Vérifie si le réseau a des conduits non connectés
 * @param {Array} elements - Tous les éléments
 * @returns {Object} Objet avec valid (boolean) et disconnected (Array)
 */
export function checkConduitsConnected(elements) {
    const conduits = elements.filter(el => el.type === 'conduit');
    const disconnected = [];

    for (const conduit of conduits) {
        if (!conduit.startElementId || !conduit.endElementId) {
            disconnected.push({
                id: conduit.id,
                message: `Conduit ${conduit.id} non connecté à un ou deux éléments.`
            });
        } else {
            // Vérifier si les éléments de connexion existent
            const startElement = findElementById(conduit.startElementId, elements);
            const endElement = findElementById(conduit.endElementId, elements);

            if (!startElement || !endElement) {
                disconnected.push({
                    id: conduit.id,
                    message: `Conduit ${conduit.id} connecté à des éléments inexistants.`
                });
            }
        }
    }

    return {
        valid: disconnected.length === 0,
        disconnected: disconnected
    };
}

/**
 * Vérifie si le réseau a des conduits qui se croisent
 * @param {Array} conduits - Tableau des conduits
 * @returns {Object} Objet avec hasCrossings (boolean) et crossings (Array)
 */
export function detectConduitCrossings(conduits) {
    const crossings = [];

    for (let i = 0; i < conduits.length; i++) {
        for (let j = i + 1; j < conduits.length; j++) {
            const conduit1 = conduits[i];
            const conduit2 = conduits[j];

            // Vérifier si les conduits se croisent
            if (doConduitsCross(conduit1, conduit2)) {
                crossings.push({
                    conduit1: conduit1.id,
                    conduit2: conduit2.id
                });
            }
        }
    }

    return {
        hasCrossings: crossings.length > 0,
        crossings: crossings
    };
}

/**
 * Vérifie si deux conduits se croisent
 * @param {Object} conduit1 - Premier conduit
 * @param {Object} conduit2 - Deuxième conduit
 * @returns {boolean} Vrai si les conduits se croisent
 */
function doConduitsCross(conduit1, conduit2) {
    // Implémentation simplifiée de la détection de croisement de segments
    const p1 = { x: conduit1.start.x, y: conduit1.start.y };
    const p2 = { x: conduit1.end.x, y: conduit1.end.y };
    const p3 = { x: conduit2.start.x, y: conduit2.start.y };
    const p4 = { x: conduit2.end.x, y: conduit2.end.y };

    // Calculer les orientations
    const o1 = orientation(p1, p2, p3);
    const o2 = orientation(p1, p2, p4);
    const o3 = orientation(p3, p4, p1);
    const o4 = orientation(p3, p4, p2);

    // Cas général : les segments se croisent si les orientations sont différentes
    if (o1 !== o2 && o3 !== o4) {
        return true;
    }

    // Cas particuliers : colinéaires et chevauchants
    // (Non implémenté pour simplifier)

    return false;
}

/**
 * Calcule l'orientation de trois points
 * @param {Object} p - Point 1
 * @param {Object} q - Point 2
 * @param {Object} r - Point 3
 * @returns {number} 0 = colinéaire, 1 = sens horaire, 2 = sens anti-horaire
 */
function orientation(p, q, r) {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    
    if (val === 0) return 0; // colinéaire
    return val > 0 ? 1 : 2; // sens horaire ou anti-horaire
}

/**
 * Vérifie si le réseau dépasse la limite recommandée de nœuds
 * @param {Array} elements - Tous les éléments
 * @param {number} maxNodes - Nombre maximum de nœuds (défaut: 100)
 * @returns {Object} Objet avec valid (boolean) et message (string)
 */
export function checkNodeLimit(elements, maxNodes = 100) {
    const bouches = elements.filter(el => el.type === 'bouche');

    if (bouches.length > maxNodes) {
        return {
            valid: false,
            message: `Trop de bouches (${bouches.length}). Limite recommandée : ${maxNodes}.`
        };
    }

    return {
        valid: true,
        message: `Nombre de bouches acceptable (${bouches.length}/${maxNodes}).`
    };
}

/**
 * Effectue une validation complète du réseau
 * @param {Array} elements - Tous les éléments du réseau
 * @returns {Object} Résultats de la validation
 */
export function validateNetwork(elements) {
    const results = {
        isValid: true,
        errors: [],
        warnings: [],
        info: []
    };

    // 1. Vérifier le nombre de caissons
    const caissonCheck = checkSingleCaisson(elements);
    if (!caissonCheck.valid) {
        results.isValid = false;
        results.errors.push(caissonCheck.message);
    } else {
        results.info.push(caissonCheck.message);
    }

    // 2. Vérifier les débits des bouches
    const bouches = elements.filter(el => el.type === 'bouche');
    const flowValidation = validateBouchesFlowRates(bouches);
    if (!flowValidation.valid) {
        results.isValid = false;
        flowValidation.errors.forEach(error => {
            results.errors.push(error.message);
        });
    }
    flowValidation.warnings.forEach(warning => {
        results.warnings.push(warning.message);
    });

    // 3. Vérifier les connexions des bouches
    const bouchesConnected = checkBouchesConnected(elements);
    if (!bouchesConnected.allConnected) {
        results.isValid = false;
        results.errors.push(bouchesConnected.message);
    } else {
        results.info.push(bouchesConnected.message);
    }

    // 4. Vérifier les connexions des conduits
    const conduitsConnected = checkConduitsConnected(elements);
    if (!conduitsConnected.valid) {
        results.isValid = false;
        conduitsConnected.disconnected.forEach(dc => {
            results.errors.push(dc.message);
        });
    }

    // 5. Détecter les boucles
    const loopDetection = detectLoops(elements);
    if (loopDetection.hasLoop) {
        results.warnings.push(`Boucle(s) détectée(s) dans le réseau : ${loopDetection.loops.length}`);
    } else {
        results.info.push('Aucune boucle détectée dans le réseau.');
    }

    // 6. Détecter les croisements de conduits
    const conduits = elements.filter(el => el.type === 'conduit');
    const crossingDetection = detectConduitCrossings(conduits);
    if (crossingDetection.hasCrossings) {
        results.warnings.push(`Croisement(s) de conduits détecté(s) : ${crossingDetection.crossings.length}`);
    } else {
        results.info.push('Aucun croisement de conduits détecté.');
    }

    // 7. Vérifier la limite de nœuds
    const nodeLimit = checkNodeLimit(elements);
    if (!nodeLimit.valid) {
        results.warnings.push(nodeLimit.message);
    } else {
        results.info.push(nodeLimit.message);
    }

    return results;
}
