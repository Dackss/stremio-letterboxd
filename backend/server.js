const path = require('path');
const fs = require('fs');
const express = require('express');
const ngrok = require('@ngrok/ngrok'); // Import du SDK ngrok
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const { getWatchlist } = require('./scraper');

const manifest = {
    id: 'org.stremio.letterboxd.watchlist',
    version: '1.5.1',
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
    const sort = args.config?.sort || 'default';

    if (args.type === 'movie' && args.id === 'lb_watchlist_v2') {
        console.log(`[SERVEUR] 🚀 Requête pour : ${username}`);

        try {
            const movies = await getWatchlist(username);

            // --- ÉCRITURE DANS MOVIES.JSON POUR DEBUG ---
            const filePath = path.join(__dirname, '../movies.json');
            fs.writeFileSync(filePath, JSON.stringify(movies, null, 2), 'utf-8');
            console.log(`[DEBUG] ✅ ${movies.length} films écrits dans movies.json`);

            return { metas: movies, cacheMaxAge: 3600 };
        } catch (err) {
            console.error("[SERVEUR] ❌ Erreur :", err.message);
            return { metas: [] };
        }
    }
    return { metas: [] };
});

const app = express();

// --- BYPASS NGROK (Toujours nécessaire pour Stremio) ---
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

// Lancement du serveur et de ngrok
app.listen(PORT, async () => {
    console.log(`[SERVEUR] 🔥 Addon local sur http://localhost:${PORT}`);

    try {
        // Connexion à ngrok via le SDK
        const session = await ngrok.connect({
            addr: PORT,
            authtoken_from_env: true // Utilise la variable d'environnement NGROK_AUTHTOKEN
        });

        console.log(`[NGROK] 🚀 Addon PUBLIC sur : ${session.url()}/manifest.json`);
        console.log(`[NGROK] ⚙️  Configure ici : ${session.url()}`);
    } catch (err) {
        console.error('[NGROK] ❌ Impossible de lancer le tunnel:', err.message);
    }
});