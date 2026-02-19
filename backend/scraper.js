const axios = require('axios');
const cheerio = require('cheerio');

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

        const allMetas = [...(movieRes.data.metas || []), ...(seriesRes.data.metas || [])];

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

            if (!bestMatch) {
                bestMatch = allMetas.find(m => m.name.toLowerCase() === cleanTitle);
            }

            if (!bestMatch) {
                bestMatch = allMetas[0];
            }

            if (bestMatch && bestMatch.id) {
                try {
                    const detailUrl = `https://v3-cinemeta.strem.io/meta/${bestMatch.type}/${bestMatch.id}.json`;
                    const detailRes = await axios.get(detailUrl);
                    if (detailRes.data && detailRes.data.meta) {
                        return detailRes.data.meta;
                    }
                } catch (e) {
                    return bestMatch;
                }
            }
            return bestMatch;
        }
    } catch (e) {
        return null;
    }
    return null;
}

async function getWatchlist(username, sort = 'default') {
    let allRawMovies = [];
    let page = 1;
    let hasMore = true;
    const maxPages = 5;

    // FORCER LES MINUSCULES POUR ÉVITER LES REDIRECTIONS BLOQUÉES
    const cleanUsername = username.toLowerCase().trim();

    console.log(`[Scraper] Récupération de la watchlist de ${cleanUsername} (Tri: ${sort})`);

    let baseUrl = `https://letterboxd.com/${cleanUsername}/watchlist/`;
    if (sort === 'popular') baseUrl += 'by/popular/';
    if (sort === 'rating') baseUrl += 'by/rating/';
    if (sort === 'release') baseUrl += 'by/release-newest/'; // CORRECTION DU LIEN
    if (sort === 'shortest') baseUrl += 'by/shortest/';

    try {
        while (hasMore && page <= maxPages) {
            const pageUrl = page === 1 ? baseUrl : `${baseUrl}page/${page}/`;

            console.log(`[Scraper] Analyse de ${pageUrl}...`);

            try {
                const { data } = await axios.get(pageUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3'
                    }
                });

                const $ = cheerio.load(data);
                const posters = $('.film-poster');

                if (posters.length === 0) {
                    hasMore = false;
                } else {
                    posters.each((i, element) => {
                        const slug = $(element).attr('data-film-slug');
                        const name = $(element).find('img').attr('alt') || (slug ? slug.replace(/-/g, ' ') : null);
                        if (slug && name) allRawMovies.push({ slug, name });
                    });
                    page++;
                }
            } catch (err) {
                console.error(`[Erreur HTTP] Échec sur ${pageUrl} :`, err.message);
                hasMore = false;
            }
        }

        console.log(`[Scraper] ${allRawMovies.length} films trouvés.`);
        console.log(`[Cinemeta] Synchronisation des métadonnées en cours...`);

        const movies = [];
        const batchSize = 10;

        for (let i = 0; i < allRawMovies.length; i += batchSize) {
            const batch = allRawMovies.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (raw) => {
                const meta = await getStremioMeta(raw.name);

                if (meta) {
                    return {
                        ...meta,
                        type: meta.type || 'movie',
                        posterShape: 'poster'
                    };
                }

                return {
                    id: `lb:${raw.slug}`,
                    type: 'movie',
                    name: raw.name,
                    poster: 'https://s.ltrbxd.com/static/img/empty-poster-125-AiuBHVCI.png',
                    posterShape: 'poster',
                    description: 'Information non trouvée sur Cinemeta'
                };
            }));
            movies.push(...batchResults);
        }

        console.log(`[Cinemeta] Synchronisation terminée (${movies.length} films).`);

        return movies;

    } catch (error) {
        console.error(`[Erreur] Échec du scraping : ${error.message}`);
        return [];
    }
}

module.exports = { getWatchlist };