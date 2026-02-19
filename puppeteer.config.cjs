const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Déplace le cache de Puppeteer dans le dossier du projet pour que Render le conserve au déploiement
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};