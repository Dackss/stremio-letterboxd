const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const { getWatchlist } = require('./scraper');

const manifest = {
    "id": "org.stremio.letterboxd.dackss",
    "version": "1.1.0",
    "name": "Letterboxd Watchlist",
    "description": "Affiche ta watchlist Letterboxd",
    "resources": ["catalog"],
    "types": ["movie"],
    "catalogs": [
        {
            type: "movie",
            id: "lb_watchlist",
            name: "Ma Watchlist Letterboxd"
        }
    ],
    "idPrefixes": ["lb:"]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args) => {
    console.log(`📨 Requête catalogue : ${args.type} - ${args.id}`);

    if (args.type === "movie" && args.id === "lb_watchlist") {
        // REMPLACE BIEN PAR TON PSEUDO ICI
        const username = "dackss";
        const movies = await getWatchlist(username);

        console.log(`📤 Réponse envoyée à Stremio : ${movies.length} films.`);
        return { metas: movies };
    }

    return { metas: [] };
});

// --- DÉMARRAGE DU SERVEUR ---
const PORT = 7000;
const serverInterface = builder.getInterface();

console.log("🚀 Tentative de démarrage du serveur...");

serveHTTP(serverInterface, {
    port: PORT,
    host: '0.0.0.0' // Obligatoire pour WSL/Docker/Tunnels
});

console.log(`✅ Serveur actif sur http://localhost:${PORT}/manifest.json`);