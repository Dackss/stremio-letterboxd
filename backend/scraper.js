const cheerio = require('cheerio');

// 1. Récupère la VRAIE note Letterboxd directement sur la page du film
async function getLetterboxdRating(slug) {
    try {
        const { gotScraping } = await import('got-scraping');
        const url = `https://letterboxd.com/film/${slug}/`;
        const response = await gotScraping.get(url);
        const $ = cheerio.load(response.body);

        const ratingStr = $('meta[name="twitter:data2"]').attr('content');
        if (ratingStr) {
            const match = ratingStr.match(/([\d.]+)/);
            if (match) return parseFloat(match[1]);
        }
    } catch (e) { }
    return 0;
}

// 2. Récupère les affiches et métadonnées de base via Cinemeta
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

// 3. Fonction principale de scraping
async function getWatchlist(username, sort = 'default') {
    let allRawMovies = [];
    let page = 1;
    let hasMore = true;
    const maxPages = 5;

    let sortPath = '';
    let localSortNeeded = false;

    // CORRECTION ICI : "by/release/" au lieu de "by/release-newest/"
    switch (sort) {
        case 'popular': sortPath = 'by/popular/'; break;
        case 'rating':
            sortPath = '';
            localSortNeeded = true;
            break;
        case 'release': sortPath = 'by/release/'; break;
        case 'shortest': sortPath = 'by/shortest/'; break;
        default: sortPath = ''; break;
    }

    console.log(`[Scraper] Lancement de got-scraping pour : ${username} | Tri : ${sort}`);

    try {
        const { gotScraping } = await import('got-scraping');

        while (hasMore && page <= maxPages) {
            const pageUrl = page === 1
                ? `https://letterboxd.com/${username}/watchlist/${sortPath}`
                : `https://letterboxd.com/${username}/watchlist/${sortPath}page/${page}/`;

            console.log(`[Scraper] Navigation vers : ${pageUrl}`);

            try {
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
                if (err.response && err.response.statusCode === 404) break;
                throw err;
            }
        }

        // AFFICHAGE DES LOGS INTELLIGENT
        if (sort === 'rating') {
            console.log(`[Scraper] Films extraits : ${allRawMovies.length}. Récupération des notes Letterboxd en cours (ça peut prendre du temps)...`);
        } else {
            console.log(`[Scraper] Films extraits : ${allRawMovies.length}. Récupération rapide des affiches Stremio...`);
        }

        const movies = [];
        const batchSize = 10;

        for (let i = 0; i < allRawMovies.length; i += batchSize) {
            const batch = allRawMovies.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (raw) => {

                let meta;
                let lbRating = 0;

                // OPTIMISATION : On ne va lire la note Letterboxd QUE si l'utilisateur demande le tri "rating"
                if (sort === 'rating') {
                    const [fetchedMeta, fetchedLbRating] = await Promise.all([
                        getStremioMeta(raw.name),
                        getLetterboxdRating(raw.slug)
                    ]);
                    meta = fetchedMeta;
                    lbRating = fetchedLbRating;
                } else {
                    meta = await getStremioMeta(raw.name);
                }

                let finalMeta = meta ? { ...meta, type: meta.type || 'movie', posterShape: 'poster' } : {
                    id: `lb:${raw.slug}`,
                    type: 'movie',
                    name: raw.name,
                    poster: 'https://s.ltrbxd.com/static/img/empty-poster-125-AiuBHVCI.png',
                    posterShape: 'poster'
                };

                // AJOUT DE LA NOTE SEULEMENT SI DEMANDÉ
                if (sort === 'rating') {
                    finalMeta.lbRating = lbRating;

                    // La note bien séparée tout en bas
                    const starText = lbRating > 0 ? `⭐ Note Letterboxd : ${lbRating.toFixed(2)} / 5` : `⭐ Note Letterboxd : Non noté`;
                    const originalDesc = finalMeta.description ? finalMeta.description.trim() : 'Aucune description disponible.';
                    finalMeta.description = `${originalDesc}\n\n──────────────\n${starText}`;

                    if (lbRating > 0) {
                        finalMeta.imdbRating = (lbRating * 2).toFixed(1).toString();
                    }
                }

                return finalMeta;
            }));
            movies.push(...batchResults);
        }

        // PLAN B : TRI LOCAL
        if (localSortNeeded && sort === 'rating') {
            console.log(`[Scraper] 🧠 Application du "Plan B" : Tri local par note Letterboxd...`);
            movies.sort((a, b) => {
                const ratingA = a.lbRating || 0;
                const ratingB = b.lbRating || 0;
                return ratingB - ratingA;
            });
        }

        console.log(`[Scraper] Terminé. ${movies.length} films prêts pour Stremio.`);
        return movies;

    } catch (error) {
        console.error(`[Erreur got-scraping] ${error.message}`);
        return [];
    }
}

module.exports = { getWatchlist };