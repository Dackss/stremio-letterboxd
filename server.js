const express = require('express');
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
    }
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args) => {
    console.log(`[Requête] Catalogue : ${args.type} - ${args.id}`);

    if (args.type === 'movie' && args.id === 'lb_watchlist') {
        const username = args.config && args.config.username;

        if (!username) {
            console.log('[Erreur] Aucun pseudo fourni.');
            return { metas: [] };
        }

        const movies = await getWatchlist(username);
        console.log(`[Succès] Envoi de ${movies.length} films pour l'utilisateur ${username}.`);

        return {
            metas: movies,
            cacheMaxAge: 43200
        };
    }

    return { metas: [] };
});

const app = express();

// --- 1. GESTION DES URLS PROPRES (ex: /watchlist-dackss/manifest.json) ---
app.use((req, res, next) => {
    const match = req.url.match(/^\/watchlist-([^/]+)\/(manifest\.json|catalog\/.*)$/);
    if (match) {
        const username = decodeURIComponent(match[1]);
        const configStr = encodeURIComponent(JSON.stringify({ username }));
        req.url = `/${configStr}/${match[2]}`;
    }
    next();
});

// --- 2. REDIRECTION ACCUEIL (Pour le Health Check de Render) ---
app.get('/', (req, res) => {
    res.redirect('/configure');
});

// --- 3. PAGE DE CONFIGURATION ---
app.get('/configure', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Configuration Letterboxd</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1c1c20; color: white; text-align: center; padding-top: 50px; }
                .container { max-width: 400px; margin: 0 auto; background: #2a2a30; padding: 30px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
                input { width: 85%; padding: 12px; font-size: 16px; border-radius: 5px; border: none; margin-bottom: 20px; outline: none; text-align: center; color: black; }
                button { width: 90%; padding: 15px; font-size: 16px; background-color: #8A5A9E; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.2s; margin-bottom: 10px; }
                button:hover { background-color: #724b82; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>🎬 Addon Letterboxd</h2>
                <p>Entrez votre pseudo public :</p>
                <input type="text" id="username" placeholder="Exemple : dackss" />
                <button onclick="install()">Installer sur Stremio</button>
            </div>
            <script>
                function install() {
                    const user = document.getElementById('username').value.trim();
                    if (!user) return alert('Veuillez entrer un pseudo Letterboxd.');
                    const host = window.location.host;
                    const stremioUrl = 'stremio://' + host + '/watchlist-' + encodeURIComponent(user) + '/manifest.json';
                    window.location.href = stremioUrl;
                }
            </script>
        </body>
        </html>
    `);
});

// --- 4. INTEGRATION DU SDK ---
app.use('/', getRouter(builder.getInterface()));

// --- 5. DÉMARRAGE (Adapté à Render) ---
const PORT = process.env.PORT || 7000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Serveur] Démarré sur le port ${PORT}`);
    console.log(`[Serveur] URL de config : /configure`);
});