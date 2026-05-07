// Point d'entrée de l'application
// Ce fichier est utilisé par Vite pour le build

// VentilationApp from window

// Initialiser l'application directement (le DOM est déjà chargé quand ce script s'exécute)
const app = new window.VentilationApp();
app.init();

// Exposer l'application au niveau global pour le débogage
window.ventilationApp = app;
