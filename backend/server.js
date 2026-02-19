const path = require('path');
const fs = require('fs'); // Indispensable pour écrire le fichier
const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const { getWatchlist } = require('./scraper');

const manifest = {
    id: 'org.stremio.letterboxd.watchlist',
    version: '1.4.4',
    name: 'Letterboxd Watchlist',
    description: 'Ta watchlist Letterboxd',
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
    // Si args.config est indéfini (test manuel), on force dackss
    const username = args.config?.username || "dackss";
    const sort = args.config?.sort || "default";

    console.log(`[SERVEUR] 🚀 Requête reçue pour : ${username}`);

    if (args.type === 'movie' && args.id === 'lb_watchlist_v2') {
        try {
            const movies = await getWatchlist(username, sort);

            // --- ÉCRITURE DANS MOVIES.JSON POUR DEBUG ---
            const filePath = path.join(__dirname, '../movies.json');
            fs.writeFileSync(filePath, JSON.stringify(movies, null, 2), 'utf-8');
            console.log(`[SERVEUR] ✅ ${movies.length} films écrits dans movies.json`);
            // --------------------------------------------

            return { metas: movies, cacheMaxAge: 3600 };
        } catch (err) {
            console.error("[SERVEUR] ❌ Erreur Scraper:", err.message);
            return { metas: [] };
        }
    }
    return { metas: [] };
});

const app = express();

// --- CRUCIAL : BYPASS LA PAGE NGROK POUR STREMIO ---
app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    next();
});

app.use('/', getRouter(builder.getInterface()));
app.use(express.static(path.join(__dirname, '../frontend/dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => console.log(`[SERVEUR] 🔥 Prêt sur http://localhost:${PORT}`));