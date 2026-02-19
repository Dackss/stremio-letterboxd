const axios = require('axios');
const puppeteer = require('puppeteer');

// Fonction intacte : récupère les détails du film sur les serveurs Stremio/Cinemeta
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
            if (!bestMatch) bestMatch = allMetas.find(m => m.name.toLowerCase() === cleanTitle);
            if (!bestMatch) bestMatch = allMetas[0];

            if (bestMatch && bestMatch.id) {
                try {
                    const detailUrl = `https://v3-cinemeta.strem.io/meta/${bestMatch.type}/${bestMatch.id}.json`;
                    const detailRes = await axios.get(detailUrl);
                    if (detailRes.data && detailRes.data.meta) {
                        return detailRes.data.meta;
                    }
                } catch (e) { return bestMatch; }
            }
            return bestMatch;
        }
    } catch (e) { return null; }
    return null;
}

// Nouvelle fonction de scraping propulsée par Puppeteer
async function getWatchlist(username, sort = 'default') {
    let allRawMovies = [];
    let page = 1;
    let hasMore = true;
    const maxPages = 5; // Nombre maximum de pages à analyser (tu peux augmenter si besoin)

    let sortPath = '';
    switch (sort) {
        case 'popular': sortPath = 'by/popular/'; break;
        case 'rating': sortPath = 'by/rating/'; break;
        case 'release': sortPath = 'by/release/'; break;
        case 'shortest': sortPath = 'by/shortest/'; break;
        default: sortPath = ''; break;
    }

    console.log(`[Scraper] Lancement de Puppeteer pour : ${username} | Tri : ${sort}`);

    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const pageBrowser = await browser.newPage();
        await pageBrowser.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        while (hasMore && page <= maxPages) {
            const pageUrl = page === 1
                ? `https://letterboxd.com/${username}/watchlist/${sortPath}`
                : `https://letterboxd.com/${username}/watchlist/${sortPath}page/${page}/`;

            console.log(`[Scraper] Navigation vers : ${pageUrl}`);

            const response = await pageBrowser.goto(pageUrl, { waitUntil: 'domcontentloaded' });

            if (response.status() === 404) {
                console.log(`[Scraper] Fin atteinte (Erreur 404) à la page ${page}.`);
                break;
            }

            const moviesOnPage = await pageBrowser.evaluate(() => {
                const posters = document.querySelectorAll('[data-film-slug], [data-item-slug], [data-target-link], .film-poster');
                const movies = [];

                posters.forEach(element => {
                    let slug = element.getAttribute('data-item-slug') || element.getAttribute('data-film-slug') || element.getAttribute('data-target-link');
                    let name = element.getAttribute('data-item-name') || element.getAttribute('data-film-name');

                    if (!name) {
                        const img = element.querySelector('img');
                        if (img) name = img.getAttribute('alt');
                    }

                    if (slug) {
                        slug = slug.replace(/\/film\//g, '').replace(/\//g, '');
                        if (!name) name = slug.replace(/-/g, ' ');
                        movies.push({ slug, name });
                    }
                });

                return movies;
            });

            console.log(`[Scraper] Éléments trouvés sur la page ${page} : ${moviesOnPage.length}`);

            if (moviesOnPage.length === 0) {
                hasMore = false;
            } else {
                moviesOnPage.forEach(movie => {
                    if (!allRawMovies.find(m => m.slug === movie.slug)) {
                        allRawMovies.push(movie);
                    }
                });
                page++;
            }
        }
    } catch (error) {
        console.error(`[Erreur Puppeteer] ${error.message}`);
    } finally {
        await browser.close();
        console.log(`[Scraper] Navigateur fermé. Nombre total de films extraits : ${allRawMovies.length}`);
    }

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
}

module.exports = { getWatchlist };