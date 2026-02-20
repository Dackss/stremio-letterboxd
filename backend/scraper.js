const cheerio = require('cheerio');
const axios = require('axios');

// --- COLLE TA CLÉ API ICI ---
const SCRAPER_API_KEY = '42e313d5717759a7384dba4111963dc4';

// ==========================================
// 1. MOTEURS DE RECHERCHE (DIRECT VS PROXY)
// ==========================================

// Moteur 1 : Rapide & Gratuit (got-scraping)
async function fetchPageDirect(url) {
    const { gotScraping } = await import('got-scraping');
    const response = await gotScraping.get(url, {
        headerGeneratorOptions: {
            browsers: [{ name: 'chrome', minVersion: 120 }],
            devices: ['desktop'],
            operatingSystems: ['windows', 'macos']
        },
        headers: {
            'Upgrade-Insecure-Requests': '1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
        }
    });

    const $ = cheerio.load(response.body);
    const pageTitle = $('title').text().trim();

    if (pageTitle.includes('Just a moment') || pageTitle.includes('Cloudflare') || pageTitle.includes('Un instant')) {
        throw new Error('CLOUDFLARE_BLOCK');
    } else if (pageTitle === 'Page not found') {
        throw new Error('NOT_FOUND');
    }

    return $;
}

// Moteur 2 : Robuste mais coûteux (ScraperAPI)
async function fetchPageProxy(url) {
    const proxyUrl = `http://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
    const response = await axios.get(proxyUrl);
    const $ = cheerio.load(response.data);

    if ($('title').text().trim() === 'Page not found') {
        throw new Error('NOT_FOUND');
    }

    return $;
}


// ==========================================
// 2. RÉCUPÉRATION METADONNÉES STREMIO
// ==========================================
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


// ==========================================
// 3. FONCTION PRINCIPALE AVEC FALLBACK
// ==========================================
async function getWatchlist(username, sort = 'default') {
    let allRawMovies = [];
    let page = 1;
    let hasMore = true;
    const maxPages = 5;

    // Indicateur pour savoir si on a été bloqué et qu'on doit passer sur le Proxy
    let useProxy = false;

    let sortPath = '';
    switch (sort) {
        case 'popular': sortPath = 'by/popular/'; break;
        case 'rating': sortPath = 'by/rating/'; break;
        case 'release': sortPath = 'by/release/'; break;
        case 'shortest': sortPath = 'by/shortest/'; break;
        default: sortPath = ''; break;
    }

    console.log(`[Scraper] Lancement du bot pour : ${username} | Tri : ${sort}`);

    try {
        while (hasMore && page <= maxPages) {
            const targetUrl = page === 1
                ? `https://letterboxd.com/${username}/watchlist/${sortPath}`
                : `https://letterboxd.com/${username}/watchlist/${sortPath}page/${page}/`;

            let $;

            try {
                if (!useProxy) {
                    console.log(`[Scraper] Page ${page} ➔ Tentative Rapide (got-scraping)...`);
                    try {
                        $ = await fetchPageDirect(targetUrl);
                    } catch (err) {
                        if (err.message === 'CLOUDFLARE_BLOCK') {
                            console.log(`[Scraper] 🚨 BLOCAGE CLOUDFLARE ! Activation immédiate de ScraperAPI...`);
                            useProxy = true; // On mémorise le blocage pour les pages suivantes
                            $ = await fetchPageProxy(targetUrl); // On retente la même page avec le proxy
                        } else {
                            throw err; // C'est une erreur 404, on passe au catch parent
                        }
                    }
                } else {
                    console.log(`[Scraper] Page ${page} ➔ Requête via Proxy (ScraperAPI)...`);
                    $ = await fetchPageProxy(targetUrl);
                }

                const posters = $('[data-film-slug], [data-item-slug], [data-target-link], .film-poster');

                console.log(`[Scraper] ✔️ Succès : ${posters.length} éléments trouvés.`);

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
                if (err.message === 'NOT_FOUND' || (err.response && err.response.status === 404)) {
                    console.log(`[Scraper] Fin de la liste atteinte (URL introuvable).`);
                    break;
                }
                throw err;
            }
        }

        console.log(`[Scraper] Films extraits : ${allRawMovies.length}. Conversion vers Stremio...`);

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
        console.error(`[Scraper] Erreur fatale : ${error.message}`);
        return [];
    }
}

async function getPreview(username) {
    try {
        const url = `https://letterboxd.com/${username}/watchlist/`;
        console.log(`[Preview] 🔍 Tentative 100% gratuite pour : ${username}`);

        // 1. On tente uniquement la récupération directe
        let $;
        try {
            $ = await fetchPageDirect(url);
        } catch (err) {
            // Si on est bloqué ou que le pseudo n'existe pas, on s'arrête là
            console.log(`[Preview] 🛑 Échec (Bloqué ou 404). Aucun crédit utilisé.`);
            return [];
        }

        const previewItems = [];
        // On récupère les titres des 4 premiers films
        $('.film-poster').slice(0, 4).each((i, el) => {
            const img = $(el).find('img');
            const title = img.attr('alt') || $(el).attr('data-film-name');
            if (title) previewItems.push({ title });
        });

        if (previewItems.length === 0) return [];

        console.log(`[Preview] 🖼️  Titres trouvés, récupération des affiches via Cinemeta...`);

        // 2. On récupère les images via Cinemeta (toujours gratuit)
        const moviesWithPosters = await Promise.all(
            previewItems.map(async (item) => {
                const meta = await getStremioMeta(item.title);
                return {
                    title: item.title,
                    image: meta?.poster || 'https://s.ltrbxd.com/static/img/empty-poster-125-AiuBHVCI.png'
                };
            })
        );

        return moviesWithPosters;

    } catch (e) {
        console.error(`[Preview] Erreur : ${e.message}`);
        return [];
    }
}

// N'oublie pas de l'ajouter aux exports à la fin du fichier
module.exports = { getWatchlist, getPreview };