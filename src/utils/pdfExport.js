/**
 * Module pour l'export PDF du réseau de ventilation
 */

// PDFDocument, rgb from window (loaded via CDN)

/**
 * Génère un document PDF avec le réseau de ventilation
 * @param {Array} elements - Tous les éléments du réseau
 * @param {Object} results - Résultats des calculs
 * @param {string} flowDirection - Sens de l'air ('supply' ou 'extract')
 * @returns {Promise<Uint8Array>} PDF généré
 */
window.generatePDF = async function(elements, results = {}, flowDirection = 'supply') {
    // Créer un nouveau document PDF
    const pdfDoc = await window.PDFDocument.create();
    
    // Ajouter une page
    const page = pdfDoc.addPage([800, 1100]);
    
    // Dessiner le contenu
    await drawPDFContent(page, elements, results, flowDirection);
    
    // Sauvegarder le PDF
    const pdfBytes = await pdfDoc.save();
    
    return pdfBytes;
}

/**
 * Dessine le contenu du PDF
 * @param {Object} page - Page PDF
 * @param {Array} elements - Tous les éléments
 * @param {Object} results - Résultats des calculs
 * @param {string} flowDirection - Sens de l'air
 */
async function drawPDFContent(page, elements, results, flowDirection) {
    const { width, height } = page.getSize();
    const margin = 50;
    const contentWidth = width - 2 * margin;
    const contentHeight = height - 2 * margin;

    // Couleurs
    const black = window.rgb(0, 0, 0);
    const blue = window.rgb(0, 0, 1);
    const red = window.rgb(1, 0, 0);
    const green = window.rgb(0, 0.5, 0);
    const gray = window.rgb(0.5, 0.5, 0.5);

    // Titre
    page.drawText('Rapport de Ventilation', {
        x: width / 2,
        y: height - 50,
        size: 24,
        color: black,
        font: await pdfDoc.embedFont('Helvetica-Bold'),
        textAlign: 'center'
    });

    // Sous-titre
    page.drawText(`Sens de l'air: ${flowDirection === 'supply' ? 'Soufflage' : 'Aspiration'}`, {
        x: width / 2,
        y: height - 80,
        size: 14,
        color: black,
        textAlign: 'center'
    });

    // Date
    const date = new Date().toLocaleDateString('fr-FR');
    page.drawText(`Date: ${date}`, {
        x: width / 2,
        y: height - 100,
        size: 12,
        color: gray,
        textAlign: 'center'
    });

    // Séparateur
    page.drawLine({
        start: { x: margin, y: height - 120 },
        end: { x: width - margin, y: height - 120 },
        thickness: 1,
        color: gray
    });

    // Dessiner le schéma du réseau
    let yPosition = height - 140;
    yPosition = await drawNetworkDiagram(page, elements, margin, yPosition, contentWidth, flowDirection);

    // Ajouter une nouvelle page si nécessaire
    if (yPosition < 100) {
        const newPage = pdfDoc.addPage([800, 1100]);
        yPosition = 1000;
        page = newPage;
    }

    // Tableau des éléments
    yPosition = await drawElementsTable(page, elements, margin, yPosition, contentWidth);

    // Résultats des calculs
    if (results.totalFlow || results.totalPressure) {
        yPosition = await drawCalculationResults(page, results, margin, yPosition, contentWidth);
    }

    // Validation
    yPosition = await drawValidationSummary(page, elements, margin, yPosition, contentWidth);

    // Pied de page
    page.drawText('Généré par Design Ventilation', {
        x: width / 2,
        y: 30,
        size: 10,
        color: gray,
        textAlign: 'center'
    });
}

/**
 * Dessine le schéma du réseau
 * @param {Object} page - Page PDF
 * @param {Array} elements - Tous les éléments
 * @param {number} x - Position X
 * @param {number} y - Position Y
 * @param {number} width - Largeur disponible
 * @param {string} flowDirection - Sens de l'air
 * @returns {Promise<number>} Nouvelle position Y
 */
async function drawNetworkDiagram(page, elements, x, y, width, flowDirection) {
    // Trouver les dimensions du réseau
    const bounds = calculateNetworkBounds(elements);
    const networkWidth = bounds.maxX - bounds.minX;
    const networkHeight = bounds.maxY - bounds.minY;

    // Échelle pour adapter au PDF
    const scale = Math.min(width / networkWidth, 200 / networkHeight);
    const centerX = x + width / 2;
    const centerY = y - 100;

    // Dessiner le titre
    page.drawText('Schéma du réseau', {
        x: centerX,
        y: y,
        size: 16,
        color: window.rgb(0, 0, 0),
        textAlign: 'center'
    });

    y -= 30;

    // Dessiner les éléments
    for (const element of elements) {
        if (element.type === 'caisson') {
            drawCaisson(page, element, centerX, centerY, scale, flowDirection);
        } else if (element.type === 'bouche') {
            drawBouche(page, element, centerX, centerY, scale, flowDirection);
        } else if (element.type === 'conduit') {
            drawConduit(page, element, centerX, centerY, scale, flowDirection);
        }
    }

    // Légende
    const legendY = y - networkHeight * scale - 40;
    page.drawText('Légende:', {
        x: x,
        y: legendY,
        size: 12,
        color: window.rgb(0, 0, 0)
    });

    page.drawText('C - Caisson', {
        x: x + 50,
        y: legendY,
        size: 10,
        color: window.rgb(0, 0, 1)
    });

    page.drawText('B - Bouche', {
        x: x + 150,
        y: legendY,
        size: 10,
        color: window.rgb(0, 0.5, 0)
    });

    page.drawText('S - Conduit', {
        x: x + 250,
        y: legendY,
        size: 10,
        color: window.rgb(0, 0, 0)
    });

    return legendY - 30;
}

/**
 * Calcule les limites du réseau
 * @param {Array} elements - Tous les éléments
 * @returns {Object} Limites avec minX, maxX, minY, maxY
 */
function calculateNetworkBounds(elements) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (const element of elements) {
        if (element.type === 'caisson' || element.type === 'bouche') {
            minX = Math.min(minX, element.x - 30);
            maxX = Math.max(maxX, element.x + 30);
            minY = Math.min(minY, element.y - 30);
            maxY = Math.max(maxY, element.y + 30);
        } else if (element.type === 'conduit') {
            minX = Math.min(minX, element.start.x, element.end.x);
            maxX = Math.max(maxX, element.start.x, element.end.x);
            minY = Math.min(minY, element.start.y, element.end.y);
            maxY = Math.max(maxY, element.start.y, element.end.y);
        }
    }

    // Ajouter une marge
    const margin = 20;
    return {
        minX: minX - margin,
        maxX: maxX + margin,
        minY: minY - margin,
        maxY: maxY + margin
    };
}

/**
 * Dessine un caisson sur le PDF
 * @param {Object} page - Page PDF
 * @param {Object} caisson - Caisson à dessiner
 * @param {number} centerX - Centre X
 * @param {number} centerY - Centre Y
 * @param {number} scale - Échelle
 * @param {string} flowDirection - Sens de l'air
 */
function drawCaisson(page, caisson, centerX, centerY, scale, flowDirection) {
    const x = centerX + (caisson.x - calculateNetworkBounds([caisson]).minX - 20) * scale;
    const y = centerY - (caisson.y - calculateNetworkBounds([caisson]).minY - 20) * scale;
    const size = 20;

    // Dessiner le rectangle
    page.drawRectangle({
        x: x - size / 2,
        y: y - size / 2,
        width: size,
        height: size,
        borderColor: window.rgb(0, 0, 1),
        borderWidth: 1,
        color: window.rgb(0.8, 0.8, 1)
    });

    // Texte
    page.drawText(caisson.id, {
        x: x,
        y: y - size / 2 - 5,
        size: 8,
        color: window.rgb(0, 0, 0),
        textAlign: 'center'
    });

    // Débit
    if (caisson.flowRate) {
        page.drawText(`${caisson.flowRate} m³/h`, {
            x: x,
            y: y + size / 2 + 10,
            size: 7,
            color: window.rgb(0, 0, 0),
            textAlign: 'center'
        });
    }
}

/**
 * Dessine une bouche sur le PDF
 * @param {Object} page - Page PDF
 * @param {Object} bouche - Bouche à dessiner
 * @param {number} centerX - Centre X
 * @param {number} centerY - Centre Y
 * @param {number} scale - Échelle
 * @param {string} flowDirection - Sens de l'air
 */
function drawBouche(page, bouche, centerX, centerY, scale, flowDirection) {
    const bounds = calculateNetworkBounds([bouche]);
    const x = centerX + (bouche.x - bounds.minX - 20) * scale;
    const y = centerY - (bouche.y - bounds.minY - 20) * scale;
    const size = 15;

    // Dessiner le cercle ou carré
    if (bouche.shape === 'round') {
        page.drawCircle({
            x: x,
            y: y,
            size: size,
            borderColor: window.rgb(0, 0.5, 0),
            borderWidth: 1,
            color: window.rgb(0.8, 1, 0.8)
        });
    } else {
        page.drawRectangle({
            x: x - size / 2,
            y: y - size / 2,
            width: size,
            height: size,
            borderColor: window.rgb(0, 0.5, 0),
            borderWidth: 1,
            color: window.rgb(0.8, 1, 0.8)
        });
    }

    // Texte
    page.drawText(bouche.id, {
        x: x,
        y: y - size / 2 - 5,
        size: 8,
        color: window.rgb(0, 0, 0),
        textAlign: 'center'
    });

    // Débit
    if (bouche.flowRate) {
        page.drawText(`${bouche.flowRate} m³/h`, {
            x: x,
            y: y + size / 2 + 10,
            size: 7,
            color: window.rgb(0, 0, 0),
            textAlign: 'center'
        });
    }
}

/**
 * Dessine un conduit sur le PDF
 * @param {Object} page - Page PDF
 * @param {Object} conduit - Conduit à dessiner
 * @param {number} centerX - Centre X
 * @param {number} centerY - Centre Y
 * @param {number} scale - Échelle
 * @param {string} flowDirection - Sens de l'air
 */
function drawConduit(page, conduit, centerX, centerY, scale, flowDirection) {
    const bounds = calculateNetworkBounds([conduit]);
    const startX = centerX + (conduit.start.x - bounds.minX - 20) * scale;
    const startY = centerY - (conduit.start.y - bounds.minY - 20) * scale;
    const endX = centerX + (conduit.end.x - bounds.minX - 20) * scale;
    const endY = centerY - (conduit.end.y - bounds.minY - 20) * scale;

    // Couleur en fonction du sens de l'air
    const color = flowDirection === 'supply' ? window.rgb(0, 0, 1) : window.rgb(1, 0, 0);

    // Dessiner la ligne
    page.drawLine({
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        thickness: 2,
        color: color
    });

    // Texte au milieu
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    
    page.drawText(conduit.id, {
        x: midX,
        y: midY - 5,
        size: 8,
        color: window.rgb(0, 0, 0),
        textAlign: 'center'
    });

    // Dimensions
    if (conduit.flowRate) {
        const dimText = conduit.isRound 
            ? `Ø${conduit.diameter}mm`
            : `${conduit.width}×${conduit.height}mm`;
        
        page.drawText(`${conduit.flowRate} m³/h, ${dimText}`, {
            x: midX,
            y: midY + 10,
            size: 7,
            color: window.rgb(0, 0, 0),
            textAlign: 'center'
        });
    }
}

/**
 * Dessine le tableau des éléments
 * @param {Object} page - Page PDF
 * @param {Array} elements - Tous les éléments
 * @param {number} x - Position X
 * @param {number} y - Position Y
 * @param {number} width - Largeur disponible
 * @returns {Promise<number>} Nouvelle position Y
 */
async function drawElementsTable(page, elements, x, y, width) {
    page.drawText('Liste des éléments', {
        x: x,
        y: y,
        size: 16,
        color: window.rgb(0, 0, 0)
    });

    y -= 25;

    // En-têtes du tableau
    const headers = ['ID', 'Type', 'Débit (m³/h)', 'Dimensions', 'Matériau'];
    const colWidths = [60, 80, 80, 100, 80];

    // Dessiner les en-têtes
    let currentX = x;
    for (let i = 0; i < headers.length; i++) {
        page.drawText(headers[i], {
            x: currentX + colWidths[i] / 2,
            y: y,
            size: 10,
            color: window.rgb(1, 1, 1),
            textAlign: 'center'
        });
        
        // Fond gris pour les en-têtes
        page.drawRectangle({
            x: currentX,
            y: y - 5,
            width: colWidths[i],
            height: 15,
            color: window.rgb(0.7, 0.7, 0.7)
        });
        
        currentX += colWidths[i];
    }

    y -= 20;

    // Dessiner les lignes du tableau
    const caissons = elements.filter(el => el.type === 'caisson');
    const bouches = elements.filter(el => el.type === 'bouche');
    const conduits = elements.filter(el => el.type === 'conduit');

    // Dessiner les caissons
    for (const caisson of caissons) {
        currentX = x;
        
        page.drawText(caisson.id, {
            x: currentX + 10,
            y: y,
            size: 9,
            color: window.rgb(0, 0, 0)
        });
        currentX += colWidths[0];

        page.drawText('Caisson', {
            x: currentX + 10,
            y: y,
            size: 9,
            color: window.rgb(0, 0, 0)
        });
        currentX += colWidths[1];

        page.drawText(caisson.flowRate ? `${caisson.flowRate}` : '-', {
            x: currentX + 10,
            y: y,
            size: 9,
            color: window.rgb(0, 0, 0)
        });
        currentX += colWidths[2];

        page.drawText(`${caisson.width}×${caisson.height}mm`, {
            x: currentX + 10,
            y: y,
            size: 9,
            color: window.rgb(0, 0, 0)
        });
        currentX += colWidths[3];

        page.drawText(caisson.material, {
            x: currentX + 10,
            y: y,
            size: 9,
            color: window.rgb(0, 0, 0)
        });

        y -= 15;
    }

    // Dessiner les bouches
    for (const bouche of bouches) {
        currentX = x;
        
        page.drawText(bouche.id, {
            x: currentX + 10,
            y: y,
            size: 9,
            color: window.rgb(0, 0, 0)
        });
        currentX += colWidths[0];

        page.drawText('Bouche', {
            x: currentX + 10,
            y: y,
            size: 9,
            color: window.rgb(0, 0, 0)
        });
        currentX += colWidths[1];

        page.drawText(bouche.flowRate ? `${bouche.flowRate}` : '-', {
            x: currentX + 10,
            y: y,
            size: 9,
            color: window.rgb(0, 0, 0)
        });
        currentX += colWidths[2];

        page.drawText(bouche.shape === 'round' ? `Ø${bouche.size}mm` : `${bouche.size}×${bouche.size}mm`, {
            x: currentX + 10,
            y: y,
            size: 9,
            color: window.rgb(0, 0, 0)
        });
        currentX += colWidths[3];

        page.drawText('-', {
            x: currentX + 10,
            y: y,
            size: 9,
            color: window.rgb(0, 0, 0)
        });

        y -= 15;
    }

    // Dessiner les conduits
    for (const conduit of conduits) {
        currentX = x;
        
        page.drawText(conduit.id, {
            x: currentX + 10,
            y: y,
            size: 9,
            color: window.rgb(0, 0, 0)
        });
        currentX += colWidths[0];

        page.drawText('Conduit', {
            x: currentX + 10,
            y: y,
            size: 9,
            color: window.rgb(0, 0, 0)
        });
        currentX += colWidths[1];

        page.drawText(conduit.flowRate ? `${conduit.flowRate}` : '-', {
            x: currentX + 10,
            y: y,
            size: 9,
            color: window.rgb(0, 0, 0)
        });
        currentX += colWidths[2];

        const dimText = conduit.isRound 
            ? `Ø${conduit.diameter}mm`
            : `${conduit.width}×${conduit.height}mm`;
        page.drawText(dimText, {
            x: currentX + 10,
            y: y,
            size: 9,
            color: window.rgb(0, 0, 0)
        });
        currentX += colWidths[3];

        page.drawText(conduit.material, {
            x: currentX + 10,
            y: y,
            size: 9,
            color: window.rgb(0, 0, 0)
        });

        y -= 15;
    }

    return y - 20;
}

/**
 * Dessine les résultats des calculs
 * @param {Object} page - Page PDF
 * @param {Object} results - Résultats des calculs
 * @param {number} x - Position X
 * @param {number} y - Position Y
 * @param {number} width - Largeur disponible
 * @returns {Promise<number>} Nouvelle position Y
 */
async function drawCalculationResults(page, results, x, y, width) {
    page.drawText('Résultats des calculs', {
        x: x,
        y: y,
        size: 16,
        color: window.rgb(0, 0, 0)
    });

    y -= 25;

    // Débit total
    if (results.totalFlow) {
        page.drawText(`Débit total: ${results.totalFlow} m³/h`, {
            x: x,
            y: y,
            size: 12,
            color: window.rgb(0, 0, 0)
        });
        y -= 20;
    }

    // Pression totale
    if (results.totalPressure) {
        page.drawText(`Pression totale nécessaire: ${results.totalPressure.toFixed(2)} Pa`, {
            x: x,
            y: y,
            size: 12,
            color: window.rgb(0, 0, 0)
        });
        y -= 20;
    }

    // Dimension du caisson
    if (results.caissonSize) {
        page.drawText('Dimensionnement du caisson:', {
            x: x,
            y: y,
            size: 12,
            color: window.rgb(0, 0, 0)
        });
        y -= 20;

        page.drawText(`  Largeur: ${results.caissonSize.width} mm`, {
            x: x + 20,
            y: y,
            size: 10,
            color: window.rgb(0, 0, 0)
        });
        y -= 15;

        page.drawText(`  Hauteur: ${results.caissonSize.height} mm`, {
            x: x + 20,
            y: y,
            size: 10,
            color: window.rgb(0, 0, 0)
        });
        y -= 15;

        page.drawText(`  Profondeur: ${results.caissonSize.depth} mm`, {
            x: x + 20,
            y: y,
            size: 10,
            color: window.rgb(0, 0, 0)
        });
        y -= 15;

        page.drawText(`  Puissance: ${results.caissonSize.power} kW`, {
            x: x + 20,
            y: y,
            size: 10,
            color: window.rgb(0, 0, 0)
        });
        y -= 20;
    }

    // Pertes de charge par conduit
    if (results.conduits && results.conduits.length > 0) {
        page.drawText('Pertes de charge par conduit:', {
            x: x,
            y: y,
            size: 12,
            color: window.rgb(0, 0, 0)
        });
        y -= 20;

        for (const conduit of results.conduits) {
            page.drawText(`${conduit.id}: ${conduit.pressureDrop.toFixed(2)} Pa (vitesse: ${conduit.velocity.toFixed(2)} m/s)`, {
                x: x + 20,
                y: y,
                size: 10,
                color: window.rgb(0, 0, 0)
            });
            y -= 15;
        }
    }

    return y - 20;
}

/**
 * Dessine le résumé de validation
 * @param {Object} page - Page PDF
 * @param {Array} elements - Tous les éléments
 * @param {number} x - Position X
 * @param {number} y - Position Y
 * @param {number} width - Largeur disponible
 * @returns {Promise<number>} Nouvelle position Y
 */
async function drawValidationSummary(page, elements, x, y, width) {
    page.drawText('Validation du réseau', {
        x: x,
        y: y,
        size: 16,
        color: window.rgb(0, 0, 0)
    });

    y -= 25;

    // Importer la fonction de validation
    const { validateNetwork } = await import('./networkValidation.js');
    const validation = validateNetwork(elements);

    // Résumé
    page.drawText(`Statut: ${validation.isValid ? 'Valide' : 'Invalide'}`, {
        x: x,
        y: y,
        size: 12,
        color: validation.isValid ? window.rgb(0, 0.5, 0) : window.rgb(1, 0, 0)
    });
    y -= 20;

    // Erreurs
    if (validation.errors.length > 0) {
        page.drawText('Erreurs:', {
            x: x,
            y: y,
            size: 12,
            color: window.rgb(1, 0, 0)
        });
        y -= 20;

        for (const error of validation.errors) {
            page.drawText(`• ${error}`, {
                x: x + 20,
                y: y,
                size: 10,
                color: window.rgb(0, 0, 0)
            });
            y -= 15;
        }
    }

    // Avertissements
    if (validation.warnings.length > 0) {
        page.drawText('Avertissements:', {
            x: x,
            y: y,
            size: 12,
            color: window.rgb(1, 0.5, 0)
        });
        y -= 20;

        for (const warning of validation.warnings) {
            page.drawText(`• ${warning}`, {
                x: x + 20,
                y: y,
                size: 10,
                color: window.rgb(0, 0, 0)
            });
            y -= 15;
        }
    }

    // Informations
    if (validation.info.length > 0) {
        page.drawText('Informations:', {
            x: x,
            y: y,
            size: 12,
            color: window.rgb(0, 0, 1)
        });
        y -= 20;

        for (const info of validation.info) {
            page.drawText(`• ${info}`, {
                x: x + 20,
                y: y,
                size: 10,
                color: window.rgb(0, 0, 0)
            });
            y -= 15;
        }
    }

    return y - 20;
}

/**
 * Télécharge le PDF
 * @param {Uint8Array} pdfBytes - Contenu du PDF
 * @param {string} fileName - Nom du fichier
 */
export function downloadPDF(pdfBytes, fileName = 'reseau_ventilation.pdf') {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Libérer l'URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
}
