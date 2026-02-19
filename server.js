const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const { getWatchlist } = require('./scraper');

const manifest = {
    id: 'org.stremio.letterboxd.dackss',
    version: '1.1.0',
    name: 'Letterboxd Watchlist',
    description: 'Affiche ta watchlist Letterboxd',
    resources: ['catalog'],
    types: ['movie'],
    catalogs: [
        {
            type: 'movie',
            id: 'lb_watchlist',
            name: 'Ma Watchlist Letterboxd'
        }
    ],
    idPrefixes: ['lb:']
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args) => {
    console.log(`[Requête] Catalogue : ${args.type} - ${args.id}`);

    if (args.type === 'movie' && args.id === 'lb_watchlist') {
        const username = 'dackss';
        const movies = await getWatchlist(username);

        console.log(`[Succès] Envoi de ${movies.length} films à Stremio.`);

        return {
            metas: movies,
            cacheMaxAge: 43200
        };
    }

    return { metas: [] };
});

const PORT = 7000;
const serverInterface = builder.getInterface();

console.log('[Serveur] Démarrage en cours...');

serveHTTP(serverInterface, {
    port: PORT,
    host: '0.0.0.0'
});

console.log(`[Serveur] Actif sur http://localhost:${PORT}/manifest.json`);