const express = require('express');
const path = require('path');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const { getWatchlist } = require('./scraper');

const manifest = {
    id: 'org.stremio.letterboxd.watchlist',
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
    idPrefixes: ['lb:'],
    behaviorHints: {
        configurable: true,
        configurationRequired: true
    },
    config: [
        {
            key: 'username',
            type: 'text',
            title: 'Pseudo Letterboxd'
        }
    ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args) => {
    console.log(`[Requête] Catalogue : ${args.type} - ${args.id}`);

    if (args.type === 'movie' && args.id === 'lb_watchlist') {
        const username = args.config && args.config.username;

        if (!username) return { metas: [] };

        const movies = await getWatchlist(username);
        return {
            metas: movies,
            cacheMaxAge: 43200
        };
    }
    return { metas: [] };
});

const app = express();

// 1. On indique à Express où trouver les fichiers statiques de React (le build)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// 2. Redirection de la racine vers /configure
app.get('/', (req, res) => res.redirect('/configure'));

// 3. Quand l'utilisateur va sur /configure, on renvoie l'application React
app.get('/configure', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// 4. Le router du SDK Stremio doit être monté à la fin
app.use('/', getRouter(builder.getInterface()));

const PORT = process.env.PORT || 7000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Serveur] En ligne sur le port ${PORT}`);
});