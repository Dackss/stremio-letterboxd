const express = require('express');
const path = require('path');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const { getWatchlist } = require('./scraper');

const manifest = {
    id: 'org.stremio.letterboxd.watchlist',
    version: '1.2.0',
    name: 'Letterboxd Watchlist',
    description: 'Affiche ta watchlist Letterboxd avec des filtres personnalisés',
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
    behaviorHints: { configurable: true, configurationRequired: true },
    config: [
        { key: 'username', type: 'text', title: 'Pseudo Letterboxd' },
        { key: 'sort', type: 'text', title: 'Tri', default: 'default' }
    ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args) => {
    if (args.type === 'movie' && args.id === 'lb_watchlist') {
        const username = args.config && args.config.username;
        const sort = args.config && args.config.sort ? args.config.sort : 'default';

        if (!username) return { metas: [] };

        const movies = await getWatchlist(username, sort);
        return { metas: movies, cacheMaxAge: 43200 }; // Cache de 12h
    }
    return { metas: [] };
});

const app = express();

app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('/', (req, res) => res.redirect('/configure'));
app.get('/configure', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

app.use('/', getRouter(builder.getInterface()));

const PORT = process.env.PORT || 7000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Serveur] En ligne sur le port ${PORT}`);
});