const path = require('path');
const fs = require('fs');
const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const { getWatchlist, getPreview } = require('./scraper');

const manifest = {
    id: 'org.stremio.letterboxd.watchlist',
    version: '1.5.3',
    name: 'Letterboxd Watchlist',
    description: 'Ta watchlist Letterboxd avec détails complets',
    resources: ['catalog'],
    types: ['movie', 'series'],
    catalogs: [{ type: 'movie', id: 'lb_watchlist_v2', name: 'Ma Watchlist Letterboxd' }],
    idPrefixes: ['lb:', 'tt'],
    behaviorHints: { configurable: true, configurationRequired: true },
    config: [
        { key: 'username', type: 'text', title: 'Pseudo Letterboxd' },
        { key: 'sort', type: 'text', title: 'Tri', default: 'default' }
    ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args) => {
    const username = args.config?.username || "dackss";
    const sort = args.config?.sort || "default";

    if (args.type === 'movie' && args.id === 'lb_watchlist_v2') {
        try {
            const movies = await getWatchlist(username, sort);

            const filePath = path.join(__dirname, `../movies_${username}_${sort}.json`);
            fs.writeFileSync(filePath, JSON.stringify(movies, null, 2), 'utf-8');

            return { metas: movies, cacheMaxAge: 0 };
        } catch (err) {
            console.error(err);
            return { metas: [] };
        }
    }
    return { metas: [] };
});

const app = express();

app.get('/api/preview/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const movies = await getPreview(username);
        res.json({ movies, success: movies.length > 0 });
    } catch (err) {
        res.status(500).json({ movies: [], success: false });
    }
});

// Important : bypass les headers pour les tunnels
app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    res.setHeader('bypass-tunnel-reminder', 'true');
    next();
});

app.use('/', getRouter(builder.getInterface()));
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// ON UTILISE APP.LISTEN (HTTP) ET NON HTTPS.CREATESERVER
const PORT = 7000;
app.listen(PORT, () => {
    console.log(`[SERVEUR] ✅ Prêt pour le tunnel sur http://localhost:${PORT}`);
});