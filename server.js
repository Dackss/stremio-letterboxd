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

app.get('/', (req, res) => res.redirect('/configure'));

app.get('/configure', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Configuration Letterboxd</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; background-color: #1c1c20; color: white; text-align: center; padding-top: 50px; }
                .container { max-width: 400px; margin: 0 auto; background: #2a2a30; padding: 30px; border-radius: 10px; }
                input { width: 85%; padding: 12px; margin-bottom: 20px; border-radius: 5px; border: none; text-align: center; }
                button { width: 90%; padding: 15px; background-color: #8A5A9E; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>🎬 Addon Letterboxd</h2>
                <input type="text" id="username" placeholder="Pseudo Letterboxd (ex: dackss)" />
                <button onclick="install()">Installer sur Stremio</button>
            </div>
            <script>
                function install() {
                    const user = document.getElementById('username').value.trim();
                    if (!user) return alert('Pseudo requis');

                    const config = encodeURIComponent(JSON.stringify({ username: user }));
                    const url = window.location.host + '/' + config + '/manifest.json';
                    window.location.href = 'stremio://' + url;
                }
            </script>
        </body>
        </html>
    `);
});

// Le router du SDK doit être monté à la fin
app.use('/', getRouter(builder.getInterface()));

const PORT = process.env.PORT || 7000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Serveur] En ligne sur le port ${PORT}`);
});