const cheerio = require('cheerio');
const axios = require('axios');

// --- COLLE TA CLÉ API ICI ---
const SCRAPER_API_KEY = '42e313d5717759a7384dba4111963dc4';

// 1. Récupère les affiches et métadonnées de base via Cinemeta (INCHANGÉ)
async function getStremioMeta(fullName) {
    try {
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
                    if (detailRes && detailRes.meta) return detailRes.meta;
                } catch (e) { return bestMatch; }
            }
            return bestMatch;
        }
    } catch (e) { return null; }
    return null;
}

// 2. Fonction principale de scraping (Retour à la normale, propre et rapide)
async function getWatchlist(username, sort = 'default') {
    let allRawMovies = [];
    let page = 1;
    let hasMore = true;
    const maxPages = 5;

    let sortPath = '';

    // Retour à la normale : on laisse Letterboxd gérer le tri "rating"
    switch (sort) {
        case 'popular': sortPath = 'by/popular/'; break;
        case 'rating': sortPath = 'by/rating/'; break;
        case 'release': sortPath = 'by/release/'; break;
        case 'shortest': sortPath = 'by/shortest/'; break;
        default: sortPath = ''; break;
    }

    console.log(`[Scraper] Lancement via ScraperAPI pour : ${username} | Tri : ${sort}`);

    try {
        while (hasMore && page <= maxPages) {
            const targetUrl = page === 1
                ? `https://letterboxd.com/${username}/watchlist/${sortPath}`
                : `https://letterboxd.com/${username}/watchlist/${sortPath}page/${page}/`;

            console.log(`[Scraper] Navigation vers (Proxy) : ${targetUrl}`);

            try {
                // Utilisation de ScraperAPI
                const proxyUrl = `http://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(targetUrl)}`;
                const response = await axios.get(proxyUrl);

                const $ = cheerio.load(response.data);

                // Mouchard de sécurité
                const pageTitle = $('title').text().trim();
                if (pageTitle.includes('Just a moment') || pageTitle.includes('Cloudflare') || pageTitle.includes('Un instant')) {
                    console.log(`[Scraper] 🚨 BLOCAGE DÉTECTÉ ! Titre : "${pageTitle}"`);
                } else if (pageTitle === 'Page not found') {
                    console.log(`[Scraper] ❌ ERREUR 404 : L'URL Letterboxd n'existe pas.`);
                }

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
                if (err.response && err.response.status === 404) break;
                throw err;
            }
        }

        console.log(`[Scraper] Films extraits : ${allRawMovies.length}. Récupération rapide des affiches Stremio...`);

        const movies = [];
        const batchSize = 10;

        for (let i = 0; i < allRawMovies.length; i += batchSize) {
            const batch = allRawMovies.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (raw) => {
                const meta = await getStremioMeta(raw.name);

                return meta ? { ...meta, type: meta.type || 'movie', posterShape: 'poster' } : {
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
        console.error(`[Erreur ScraperAPI] ${error.message}`);
        return [];
    }
}

module.exports = { getWatchlist };