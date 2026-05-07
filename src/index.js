// Point d'entrée de l'application
// Ce fichier est utilisé par Vite pour le build

// VentilationApp from window

// Attendre que tout soit chargé
function initApp() {
    try {
        if (window.VentilationApp && document.getElementById('canvas')) {
            const app = new window.VentilationApp();
            app.init();
            window.ventilationApp = app;
            console.log('Application initialisée avec succès');
        } else {
            console.error('VentilationApp ou canvas non trouvé');
            // Afficher une erreur visible
            const errorDiv = document.createElement('div');
            errorDiv.style.position = 'fixed';
            errorDiv.style.top = '0';
            errorDiv.style.left = '0';
            errorDiv.style.right = '0';
            errorDiv.style.padding = '20px';
            errorDiv.style.background = 'red';
            errorDiv.style.color = 'white';
            errorDiv.style.zIndex = '9999';
            errorDiv.textContent = 'ERREUR: Impossible de charger l\'application. Vérifiez que tous les fichiers JS sont présents.';
            document.body.prepend(errorDiv);
            return;
        }
    } catch (e) {
        console.error('Erreur lors de l\'initialisation:', e);
        const errorDiv = document.createElement('div');
        errorDiv.style.position = 'fixed';
        errorDiv.style.top = '0';
        errorDiv.style.left = '0';
        errorDiv.style.right = '0';
        errorDiv.style.padding = '20px';
        errorDiv.style.background = 'red';
        errorDiv.style.color = 'white';
        errorDiv.style.zIndex = '9999';
        errorDiv.textContent = 'ERREUR: ' + e.message;
        document.body.prepend(errorDiv);
    }
}

// Essayer de démarrer immédiatement
initApp();
