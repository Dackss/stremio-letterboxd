const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function getStremioMeta(fullName) {
    try {
        const cleanTitle = fullName.replace(/\s\(\d{4}\)$/, '').trim().toLowerCase();
        const yearMatch = fullName.match(/\((\d{4})\)$/);
        const targetYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

        const movieSearchUrl = `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(cleanTitle)}.json`;
        const seriesSearchUrl = `https://v3-cinemeta.strem.io/catalog/series/top/search=${encodeURIComponent(cleanTitle)}.json`;

        const [movieRes, seriesRes] = await Promise.all([
            axios.get(movieSearchUrl).catch(() => ({ data: { metas: [] } })),
            axios.get(seriesSearchUrl).catch(() => ({ data: { metas: [] } }))
        ]);

        // On met les films en premier, car c'est Letterboxd !
        const allMetas = [...(movieRes.data.metas || []), ...(seriesRes.data.metas || [])];

        if (allMetas.length > 0) {
            let bestMatch = null;

            if (targetYear) {
                // 1. Le match PARFAIT (Titre exact + Année proche)
                bestMatch = allMetas.find(m => {
                    const metaYear = parseInt(m.year || (m.releaseInfo ? m.releaseInfo.substring(0, 4) : "0"), 10);
                    return m.name.toLowerCase() === cleanTitle && Math.abs(metaYear - targetYear) <= 1;
                });

                // 2. Le match DE TRADUCTION (Titre différent ex: "Teorema", mais la bonne année)
                if (!bestMatch) {
                    bestMatch = allMetas.find(m => {
                        const metaYear = parseInt(m.year || (m.releaseInfo ? m.releaseInfo.substring(0, 4) : "0"), 10);
                        return Math.abs(metaYear - targetYear) <= 1;
                    });
                }
            }

            // 3. Si l'année est introuvable, on se rabat sur le titre exact
            if (!bestMatch) {
                bestMatch = allMetas.find(m => m.name.toLowerCase() === cleanTitle);
            }

            // 4. Si vraiment rien ne marche, on prend le premier résultat
            if (!bestMatch) {
                bestMatch = allMetas[0];
            }

            // 5. Récupération de l'affiche HD et du vrai résumé
            if (bestMatch && bestMatch.id) {
                try {
                    const detailUrl = `https://v3-cinemeta.strem.io/meta/${bestMatch.type}/${bestMatch.id}.json`;
                    const detailRes = await axios.get(detailUrl);
                    if (detailRes.data && detailRes.data.meta) {
                        return detailRes.data.meta;
                    }
                } catch (e) {
                    // Ignorer et renvoyer la miniature par défaut
                }
            }
            return bestMatch;
        }
    } catch (e) {
        // Ignorer les erreurs
    }
    return null;
}

async function getWatchlist(username) {
    let allRawMovies = [];
    let page = 1;
    let hasMore = true;
    const maxPages = 5; // Limite de sécurité (env. 140 films max)

    console.log(`\n🚀 Lancement du scraping pour ${username}...`);

    try {
        while (hasMore && page <= maxPages) {
            const pageUrl = page === 1
                ? `https://letterboxd.com/${username}/watchlist/`
                : `https://letterboxd.com/${username}/watchlist/page/${page}/`;

            console.log(`📄 Lecture de la page ${page}...`);

            try {
                const { data } = await axios.get(pageUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });

                const $ = cheerio.load(data);
                const posters = $('.react-component[data-component-class="LazyPoster"]');

                if (posters.length === 0) {
                    hasMore = false;
                } else {
                    posters.each((i, element) => {
                        const slug = $(element).attr('data-item-slug');
                        const name = $(element).attr('data-item-name');
                        if (slug && name) allRawMovies.push({ slug, name });
                    });
                    page++;
                }
            } catch (err) {
                hasMore = false;
            }
        }

        console.log(`🎬 ${allRawMovies.length} éléments trouvés sur Letterboxd.`);
        console.log(`⏳ Synchronisation avec Stremio en cours...`);

        const movies = [];
        const batchSize = 10;

        for (let i = 0; i < allRawMovies.length; i += batchSize) {
            const batch = allRawMovies.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (raw) => {
                const meta = await getStremioMeta(raw.name);

                if (meta) {
                    return {
                        id: meta.id,
                        type: meta.type || 'movie', // IMPORTANT : On assigne 'series' si c'est une série
                        name: meta.name,
                        poster: meta.poster,
                        background: meta.background,
                        description: meta.description || `Sortie : ${meta.year || 'inconnue'}`
                    };
                }

                return {
                    id: `lb:${raw.slug}`,
                    type: 'movie',
                    name: raw.name,
                    poster: "https://s.ltrbxd.com/static/img/empty-poster-125-AiuBHVCI.png",
                    description: "⚠️ Introuvable sur Cinemeta"
                };
            }));
            movies.push(...batchResults);
        }

        fs.writeFileSync('movies.json', JSON.stringify(movies, null, 2));
        console.log(`✅ ${movies.length} éléments traités et envoyés à Stremio !`);

        return movies;

    } catch (error) {
        console.error(`❌ Erreur globale : ${error.message}`);
        return [];
    }
}

module.exports = { getWatchlist };