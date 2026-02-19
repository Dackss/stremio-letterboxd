const cheerio = require('cheerio');

// 1. Récupère la VRAIE note Letterboxd directement sur la page du film
async function getLetterboxdRating(slug) {
    try {
        const { gotScraping } = await import('got-scraping');
        const url = `https://letterboxd.com/film/${slug}/`;
        const response = await gotScraping.get(url);
        const $ = cheerio.load(response.body);

        // Letterboxd cache la note globale dans les balises meta de Twitter (ex: "4.23 out of 5")
        const ratingStr = $('meta[name="twitter:data2"]').attr('content');
        if (ratingStr) {
            const match = ratingStr.match(/([\d.]+)/);
            if (match) return parseFloat(match[1]); // Renvoie 4.23
        }
    } catch (e) {
        // En cas d'erreur (ex: film introuvable), on renvoie 0
    }
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

// 3. Fonction principale de scraping
async function getWatchlist(username, sort = 'default') {
    let allRawMovies = [];
    let page = 1;
    let hasMore = true;
    const maxPages = 5;

    let sortPath = '';
    let localSortNeeded = false; // Activation du Plan B

    // On trompe Cloudflare en ne demandant que des pages "propres"
    switch (sort) {
        case 'popular': sortPath = 'by/popular/'; break;
        case 'rating':
            sortPath = ''; // TRICHE : On demande la page par défaut
            localSortNeeded = true;
            break;
        case 'release': sortPath = 'by/release-newest/'; break;
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

        console.log(`[Scraper] Films extraits : ${allRawMovies.length}. Récupération des notes Letterboxd en cours...`);
        const movies = [];
        const batchSize = 10;

        for (let i = 0; i < allRawMovies.length; i += batchSize) {
            const batch = allRawMovies.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(async (raw) => {

                // On récupère les deux sources en parallèle pour aller plus vite
                const [meta, lbRating] = await Promise.all([
                    getStremioMeta(raw.name),
                    getLetterboxdRating(raw.slug)
                ]);

                let finalMeta = meta ? { ...meta, type: meta.type || 'movie', posterShape: 'poster' } : {
                    id: `lb:${raw.slug}`,
                    type: 'movie',
                    name: raw.name,
                    poster: 'https://s.ltrbxd.com/static/img/empty-poster-125-AiuBHVCI.png',
                    posterShape: 'poster'
                };

                // SAUVEGARDE POUR LE TRI
                finalMeta.lbRating = lbRating;

                // MODIFICATION DE LA DESCRIPTION DANS STREMIO (Note en bas)
                const starText = lbRating > 0 ? `⭐ Note Letterboxd : ${lbRating.toFixed(2)} / 5` : `⭐ Note Letterboxd : Non noté`;
                const originalDesc = finalMeta.description ? finalMeta.description.trim() : 'Aucune description disponible.';

                // On place la note tout en bas, séparée par une ligne visuelle
                finalMeta.description = `${originalDesc}\n\n──────────────\n${starText}`;

                // REMPLACEMENT DE L'ÉTOILE OFFICIELLE STREMIO (Convertie sur 10)
                if (lbRating > 0) {
                    finalMeta.imdbRating = (lbRating * 2).toFixed(1).toString();
                }

                return finalMeta;
            }));
            movies.push(...batchResults);
        }

        // -------------------------------------------------------------
        // 🧠 PLAN B : LE TRI LOCAL PAR NOTE LETTERBOXD
        // -------------------------------------------------------------
        if (localSortNeeded && sort === 'rating') {
            console.log(`[Scraper] 🧠 Application du "Plan B" : Tri local par note Letterboxd...`);
            movies.sort((a, b) => {
                const ratingA = a.lbRating || 0;
                const ratingB = b.lbRating || 0;
                return ratingB - ratingA; // Du plus grand au plus petit
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