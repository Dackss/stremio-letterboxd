const cheerio = require('cheerio');

// Récupère les détails du film sur les serveurs Stremio/Cinemeta
async function getStremioMeta(fullName) {
    try {
        // IMPORTATION DYNAMIQUE : Résout le conflit ESM / CommonJS
        const { gotScraping } = await import('got-scraping');

        const cleanTitle = fullName.replace(/\s\(\d{4}\)$/, '').trim().toLowerCase();
        const yearMatch = fullName.match(/\((\d{4})\)$/);
        const targetYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

        const movieSearchUrl = `https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(cleanTitle)}.json`;
        const seriesSearchUrl = `https://v3-cinemeta.strem.io/catalog/series/top/search=${encodeURIComponent(cleanTitle)}.json`;

        const [movieRes, seriesRes] = await Promise.all([
            gotScraping.get(movieSearchUrl).json().catch(() => ({ metas: [] })),
            gotScraping.get(seriesSearchUrl).json().catch(() => ({ metas: [] }))
        ]);

        const allMetas = [...(movieRes.metas || []), ...(seriesRes.metas || [])];

        if (allMetas.length > 0) {
            let bestMatch = null;
            if (targetYear) {
                bestMatch = allMetas.find(m => {
                    const metaYear = parseInt(m.year || (m.releaseInfo ? m.releaseInfo.substring(0, 4) : '0'), 10);
                    return m.name.toLowerCase() === cleanTitle && Math.abs(metaYear - targetYear) <= 1;
                });
                if (!bestMatch) {
                    bestMatch = allMetas.find(m => {
                        const metaYear = parseInt(m.year || (m.releaseInfo ? m.releaseInfo.substring(0, 4) : '0'), 10);
                        return Math.abs(metaYear - targetYear) <= 1;
                    });
                }
            }
            if (!bestMatch) bestMatch = allMetas.find(m => m.name.toLowerCase() === cleanTitle);
            if (!bestMatch) bestMatch = allMetas[0];

            if (bestMatch && bestMatch.id) {
                try {
                    const detailUrl = `https://v3-cinemeta.strem.io/meta/${bestMatch.type}/${bestMatch.id}.json`;
                    const detailRes = await gotScraping.get(detailUrl).json();
                    if (detailRes && detailRes.meta) {
                        return detailRes.meta;
                    }
                } catch (e) { return bestMatch; }
            }
            return bestMatch;
        }
    } catch (e) { return null; }
    return null;
}

// Fonction de scraping allégée via got-scraping
async function getWatchlist(username, sort = 'default') {
    let allRawMovies = [];
    let page = 1;
    let hasMore = true;
    const maxPages = 5;

    let sortPath = '';
    switch (sort) {
        case 'popular': sortPath = 'by/popular/'; break;
        case 'rating': sortPath = 'by/rating/'; break;
        case 'release': sortPath = 'by/release-newest/'; break;
        case 'shortest': sortPath = 'by/shortest/'; break;
        default: sortPath = ''; break;
    }

    console.log(`[Scraper] Lancement de got-scraping pour : ${username} | Tri : ${sort}`);

    try {
        // IMPORTATION DYNAMIQUE ICI AUSSI
        const { gotScraping } = await import('got-scraping');

        while (hasMore && page <= maxPages) {
            const pageUrl = page === 1
                ? `https://letterboxd.com/${username}/watchlist/${sortPath}`
                : `https://letterboxd.com/${username}/watchlist/${sortPath}page/${page}/`;

            console.log(`[Scraper] Navigation vers : ${pageUrl}`);

            try {
                // Requête réseau furtive
                const response = await gotScraping.get(pageUrl);
                const $ = cheerio.load(response.body);

                const posters = $('[data-film-slug], [data-item-slug], [data-target-link], .film-poster');

                console.log(`[Scraper] Éléments trouvés sur la page ${page} : ${posters.length}`);

                if (posters.length === 0) {
                    hasMore = false;
                } else {
                    posters.each((i, element) => {
                        let slug = $(element).attr('data-item-slug') || $(element).attr('data-film-slug') || $(element).attr('data-target-link');
                        let name = $(element).attr('data-item-name') || $(element).attr('data-film-name');

                        if (!name) {
                            const img = $(element).find('img');
                            if (img.length) name = img.attr('alt');
                        }

                        if (slug) {
                            slug = slug.replace(/\/film\//g, '').replace(/\//g, '');
                            if (!name) name = slug.replace(/-/g, ' ');

                            if (!allRawMovies.find(m => m.slug === slug)) {
                                allRawMovies.push({ slug, name });
                            }
                        }
                    });
                    page++;
                }
            } catch (err) {
                // Si on tombe sur une erreur 404 de Letterboxd, c'est la fin de la liste
                if (err.response && err.response.statusCode === 404) {
                    console.log(`[Scraper] Fin atteinte (Erreur 404) à la page ${page}.`);
                    break;
                }
                throw err;
            }
        }

        console.log(`[Scraper] Scraping terminé. Nombre total de films extraits : ${allRawMovies.length}`);

        // --- PARTIE 2 : Conversion vers le format Stremio ---
        console.log(`[Scraper] Récupération des métadonnées Stremio pour ${allRawMovies.length} films...`);
        const movies = [];
        const batchSize = 10;

        for (let i = 0; i < allRawMovies.length; i += batchSize) {
            const batch = allRawMovies.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (raw) => {
                const meta = await getStremioMeta(raw.name);
                if (meta) return { ...meta, type: meta.type || 'movie', posterShape: 'poster' };
                return {
                    id: `lb:${raw.slug}`,
                    type: 'movie',
                    name: raw.name,
                    poster: 'https://s.ltrbxd.com/static/img/empty-poster-125-AiuBHVCI.png',
                    posterShape: 'poster'
                };
            }));
            movies.push(...batchResults);
        }

        console.log(`[Scraper] Terminé. ${movies.length} films prêts pour Stremio.`);
        return movies;

    } catch (error) {
        console.error(`[Erreur got-scraping] ${error.message}`);
        return [];
    }
}

module.exports = { getWatchlist };