# Design Ventilation

Une application web moderne pour la conception et le calcul automatique des réseaux de ventilation.

## Fonctionnalités

### 🎨 Interface de dessin 2D
- Planche à dessins pour tracer des réseaux de ventilation
- Dessinez des conduits ronds ou rectangulaires
- Ajoutez des caissons de ventilation (origine)
- Ajoutez des bouches de ventilation
- Système de nommage incrémental et logique (C1, C2 pour les caissons ; B1, B2 pour les bouches ; S1, S2 pour les conduits)

### 🔢 Calculs automatiques
- Saisie manuelle du débit pour chaque bouche
- Calcul automatique des débits dans chaque tronçon
- Détermination automatique de la taille des tronçons (diamètres commerciaux standard)
- Calcul des pertes de charge linéaires et singulières (formule de Darcy-Weisbach)
- Dimensionnement des caissons en fonction du débit total

### 🌬️ Sens de l'air
- Précisez si le réseau est en aspiration ou en soufflage
- Visualisation dynamique du sens de circulation de l'air
- Couleurs distinctes pour l'aspiration (rouge) et le soufflage (bleu)

### 📄 Export PDF
- Génération d'un PDF complet avec :
  - Représentation visuelle du réseau
  - Toutes les informations pour chaque bouche et tronçon (débit, taille, etc.)
  - Résultats des calculs (pertes de charge, dimensionnement du caisson)
  - Validation du réseau

### ✅ Validation
- Vérification des débits saisis (valeurs positives)
- Détection des erreurs de topologie (boucles, bouches non connectées)
- Avertissements si les valeurs dépassent les seuils recommandés
- Respect des normes NF EN 13779 (Europe) et ASHRAE (États-Unis)

### 🎯 Expérience utilisateur
- Interface intuitive avec barre d'outils
- Info-bulles au survol des éléments
- Mode "simulation" avec visualisation des flèches de flux
- Personnalisation des couleurs et épaisseurs des traits
- Aide contextuelle et documentation intégrée

## Installation

### Prérequis
- Node.js 18+ 
- npm ou yarn

### Étapes

1. Cloner le dépôt :
```bash
git clone https://github.com/Xianos51/Design-ventilation.git
cd Design-ventilation
```

2. Installer les dépendances :
```bash
npm install
```

3. Démarrer l'application en mode développement :
```bash
npm run dev
```

4. Ouvrir votre navigateur à l'adresse :
```
http://localhost:3000
```

### Build pour la production

```bash
npm run build
```

Les fichiers seront générés dans le dossier `dist/`.

## Utilisation

### Création d'un réseau

1. **Ajouter un caisson** : Cliquez sur le bouton "Caisson" puis cliquez sur la zone de dessin pour placer le caisson.

2. **Ajouter des bouches** : Cliquez sur le bouton "Bouche" puis cliquez sur la zone de dessin pour placer les bouches.

3. **Connecter avec des conduits** : 
   - Sélectionnez "Conduit ⭕" pour un conduit rond ou "Conduit ⬜" pour un conduit rectangulaire
   - Cliquez sur un caisson ou une bouche pour commencer le conduit
   - Cliquez sur un autre caisson ou bouche pour terminer le conduit

4. **Définir les débits** : Sélectionnez une bouche et entrez son débit dans le panneau de propriétés.

5. **Sélectionner le sens de l'air** : Utilisez le sélecteur en haut de la barre d'outils pour choisir entre "Soufflage" et "Aspiration".

6. **Calculer le réseau** : Cliquez sur le bouton "Calculer" pour dimensionner automatiquement le réseau.

7. **Exporter en PDF** : Cliquez sur le bouton "PDF" pour générer et télécharger un rapport complet.

### Contrôles

- **Sélection** : Cliquez sur un élément pour le sélectionner. Utilisez Shift + Clic pour une sélection multiple.
- **Déplacement** : Faites glisser les éléments sélectionnés pour les déplacer.
- **Zoom** : Utilisez la molette de la souris pour zoomer/dézoomer.
- **Défilement** : Faites glisser avec la souris (sans élément sélectionné) pour défiler la vue.
- **Suppression** : Sélectionnez un élément et cliquez sur "Supprimer" dans le panneau de propriétés.

### Raccourcis clavier

- **Supprimer** : Supprime les éléments sélectionnés
- **Échap** : Désélectionne tout

## Architecture

```
design-ventilation/
├── index.html              # Page HTML principale
├── package.json            # Configuration npm
├── vite.config.js          # Configuration Vite
├── .gitignore              # Fichiers à ignorer
├── README.md               # Documentation
└── src/
    ├── index.js            # Point d'entrée
    ├── styles.css          # Styles CSS
    ├── app/
    │   └── VentilationApp.js  # Classe principale de l'application
    ├── models/
    │   ├── Point.js        # Classe Point 2D
    │   ├── Element.js      # Classe de base pour les éléments
    │   ├── Caisson.js      # Classe Caisson
    │   ├── Bouche.js       # Classe Bouche
    │   └── Conduit.js      # Classe Conduit
    ├── calculations/
    │   ├── flowCalculations.js    # Calculs de débit et dimensionnement
    │   └── pressureCalculations.js # Calculs de perte de charge
    └── utils/
        ├── networkValidation.js  # Validation du réseau
        └── pdfExport.js          # Export PDF
```

## Technologies utilisées

- **Frontend** : HTML5, CSS3, JavaScript (ES6+)
- **Canvas API** : Pour le dessin 2D
- **Vite** : Bundler moderne pour le développement
- **pdf-lib** : Génération de PDF côté client
- **uuid** : Génération d'IDs uniques

## Normes implémentées

- **NF EN 13779** : Norme européenne pour la ventilation des bâtiments non résidentiels
- **ASHRAE 62.1** : Norme américaine pour la qualité de l'air intérieur
- **Valeurs recommandées** :
  - Vitesse maximale dans les conduits principaux : 12 m/s
  - Vitesse maximale dans les bouches de soufflage : 8 m/s
  - Vitesse maximale dans les bouches d'aspiration : 10 m/s
  - Vitesse minimale recommandée : 2 m/s

## Contribution

Les contributions sont les bienvenues ! Veuillez suivre ces étapes :

1. Forker le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/nouvelle-fonctionnalité`)
3. Commiter vos changements (`git commit -m 'Ajout de la nouvelle fonctionnalité'`)
4. Pousser vers la branche (`git push origin feature/nouvelle-fonctionnalité`)
5. Ouvrir une Pull Request

## Licence

MIT

## Auteur

Xianos51

## Remerciements

- Merci à tous les contributeurs
- Inspiration tirée des logiciels professionnels de conception HVAC
