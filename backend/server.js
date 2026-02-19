const path = require('path');
const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const { getWatchlist } = require('./scraper');

const manifest = {
    id: 'org.stremio.letterboxd.watchlist',
    version: '1.2.1',
    name: 'Letterboxd Watchlist',
    description: 'Ta watchlist Letterboxd',
    resources: ['catalog'],
    types: ['movie'],
    catalogs: [{ type: 'movie', id: 'lb_watchlist_v2', name: 'Ma Watchlist Letterboxd' }],
    idPrefixes: ['lb:'],
    behaviorHints: { configurable: true, configurationRequired: true },
    config: [
        { key: 'username', type: 'text', title: 'Pseudo Letterboxd' },
        { key: 'sort', type: 'text', title: 'Tri', default: 'default' }
    ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args) => {
    console.log(`[SERVEUR] Requête catalogue reçue. Config :`, args.config);

    if (args.type === 'movie' && args.id === 'lb_watchlist_v2') {
        const username = args.config?.username;
        const sort = args.config?.sort || 'default';

        if (!username) {
            console.error("[SERVEUR] Erreur : Aucun pseudo reçu dans la config !");
            return { metas: [] };
        }

        const movies = await getWatchlist(username, sort);
        return { metas: movies, cacheMaxAge: 60 }; // Cache très court (1 min) pour les tests
    }
    return { metas: [] };
});

const app = express();

// 1. Servir le routeur de l'addon (pour /manifest.json)
app.use('/', getRouter(builder.getInterface()));

// 2. Servir les fichiers statiques du dossier frontend/dist (après le build)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// 3. Rediriger toutes les autres requêtes vers l'index.html du frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => console.log(`[SERVEUR] Prêt sur http://localhost:${PORT}`));