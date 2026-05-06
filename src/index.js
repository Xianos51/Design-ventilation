// Point d'entrée de l'application
// Ce fichier est utilisé par Vite pour le build

import './styles.css';
import { VentilationApp } from './app/VentilationApp.js';

// Initialiser l'application quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    const app = new VentilationApp();
    app.init();
    
    // Exposer l'application au niveau global pour le débogage
    window.ventilationApp = app;
});
