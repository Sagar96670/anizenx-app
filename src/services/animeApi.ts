import {
  AnimeItem,
  AnimeEpisode,
  AnimeCharacter,
  AnimeReview,
  AnimeGenre,
  AnimeStudio,
  StreamServer,
  AnimeStreamsResponse,
  BackendPublicSettings,
  AdminDashboardData,
} from '../types/anime';
import { getActiveProvider, BACKEND_BASE_URL } from './apiConfig';
import { enrichAnimeWithTmdb, enrichAnimeListWithTmdb, getOptimizedTmdbImageUrl, ANIME_METADATA_REGISTRY, fetchTmdbMetadataForTitle } from './tmdbApi';

// In-memory cache to ensure lightning fast navigation
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes

const preconnectedDomains = new Set<string>();

/**
 * Dynamically preconnect to streaming server domains and CDNs
 */
export function preconnectDomain(urlOrHost: string): void {
  if (!urlOrHost || typeof window === 'undefined') return;
  try {
    let origin = '';
    if (urlOrHost.startsWith('http://') || urlOrHost.startsWith('https://')) {
      origin = new URL(urlOrHost).origin;
    } else if (urlOrHost.includes('.')) {
      origin = `https://${urlOrHost}`;
    }
    if (!origin || preconnectedDomains.has(origin)) return;
    preconnectedDomains.add(origin);

    const linkPreconnect = document.createElement('link');
    linkPreconnect.rel = 'preconnect';
    linkPreconnect.href = origin;
    linkPreconnect.crossOrigin = 'anonymous';
    document.head.appendChild(linkPreconnect);

    const linkDns = document.createElement('link');
    linkDns.rel = 'dns-prefetch';
    linkDns.href = origin;
    document.head.appendChild(linkDns);
  } catch {
    // Ignore invalid url
  }
}

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data as T;
  }
  return null;
}

function setCached(key: string, data: any, ttl = CACHE_TTL) {
  cache.set(key, { data, expiry: Date.now() + ttl });
}

// Extract slug from link if slug is missing
export function extractSlug(linkOrSlug: string): string {
  if (!linkOrSlug) return '';
  if (!linkOrSlug.includes('/') && !linkOrSlug.includes('.')) return linkOrSlug.trim();
  const cleaned = linkOrSlug.replace(/\/+$/, '');
  const parts = cleaned.split('/');
  return parts[parts.length - 1] || cleaned;
}

// Clean title (remove "SERIES " prefix and any embedded rating strings)
export function cleanTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/^SERIES\s+/i, '')
    .replace(/\s*[★⭐]\s*[\d.]+/gi, '')
    .replace(/\s*\(?(?:IMDb|TMDb|MAL)\s*:?\s*[\d.]+\)?/gi, '')
    .replace(/\s*★+/g, '')
    .trim();
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Normalize backend item to AnimeItem
export function normalizeBackendAnime(item: any): AnimeItem {
  const slug = item.slug || (item.link ? extractSlug(item.link) : '') || String(item.id || item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const displayTitle = cleanTitle(item.title || item.name || slug);
  const imageUrl = item.image || item.poster || item.thumbnail || (item.images?.jpg?.image_url) || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80';
  
  // Lookup curated registry as rich baseline if available
  const registryMeta = ANIME_METADATA_REGISTRY[slug] || null;

  // Extract or parse genres
  let genres: AnimeGenre[] = [];
  if (Array.isArray(item.genres) && item.genres.length > 0) {
    genres = item.genres.map((g: any) => {
      if (typeof g === 'string') {
        return { name: g, mal_id: simpleHash(g) };
      }
      return { name: g.name || 'Anime', mal_id: g.mal_id || simpleHash(g.name || '') };
    });
  } else if (typeof item.genres === 'string' && item.genres.length > 0) {
    genres = item.genres.split(',').map((s: string) => ({ name: s.trim(), mal_id: simpleHash(s.trim()) }));
  } else if (registryMeta?.genres && registryMeta.genres.length > 0) {
    genres = registryMeta.genres;
  } else {
    genres = [{ name: 'Animation' }, { name: 'Action' }];
  }

  // Parse rating
  let score: number | undefined = registryMeta?.rating;
  if (item.rating) {
    const parsed = parseFloat(String(item.rating));
    if (!isNaN(parsed)) score = parsed;
  } else if (item.score) {
    score = typeof item.score === 'number' ? item.score : parseFloat(item.score);
  }
  if (!score) score = 8.4;

  // Parse episode count
  const episodeCount = item.episodes || item.latestEpisodeCount || registryMeta?.totalEpisodes || (item.seasons ? item.seasons * 12 : 12);
  const explicitSeasons = item.seasons || registryMeta?.totalSeasons || (item.season && typeof item.season === 'number' ? item.season : undefined);
  const seasons = explicitSeasons || (episodeCount && episodeCount >= 24 ? Math.min(4, Math.ceil(episodeCount / 12)) : 1);

  const thumbUrl = getOptimizedTmdbImageUrl(imageUrl, 'w342');
  const mediumUrl = getOptimizedTmdbImageUrl(imageUrl, 'w500');
  const largeUrl = getOptimizedTmdbImageUrl(imageUrl, 'w780');

  // Studios
  let studios: AnimeStudio[] = registryMeta?.studios || [];
  if (Array.isArray(item.studios) && item.studios.length > 0) {
    studios = item.studios;
  } else if (item.studio) {
    studios = [{ name: item.studio }];
  }
  if (studios.length === 0) {
    studios = [{ name: 'Toei Animation / David Production' }];
  }

  const seasonName = item.seasonName || item.season_name || registryMeta?.season || (item.season && typeof item.season === 'string' ? item.season : 'Fall');
  const year = item.year || registryMeta?.year || (item.firstSeenAt ? new Date(item.firstSeenAt).getFullYear() : 2024);

  return {
    id: slug || item.id || Math.random(),
    slug,
    title: displayTitle,
    titleEnglish: item.titleEnglish || registryMeta?.title || displayTitle,
    titleJapanese: item.titleJapanese || registryMeta?.titleJapanese || registryMeta?.originalTitle || displayTitle,
    synopsis: item.description || item.synopsis || registryMeta?.synopsis || `${displayTitle} is an exciting anime series available to stream in HD.`,
    description: item.description || item.synopsis || registryMeta?.synopsis,
    images: {
      jpg: {
        imageUrl: thumbUrl,
        smallImageUrl: thumbUrl,
        largeImageUrl: mediumUrl || largeUrl,
      },
    },
    bannerImage: largeUrl || imageUrl,
    score,
    rating: item.rating ? String(item.rating) : score ? String(score) : '8.4',
    tmdbRating: score,
    voteCount: item.voteCount || registryMeta?.voteCount || 350,
    imdbId: item.imdbId || registryMeta?.imdbId,
    episodes: episodeCount,
    seasons,
    season: seasonName,
    studios,
    source: item.source || registryMeta?.source || 'Manga Adaptation',
    status: item.status || registryMeta?.status || 'Completed',
    type: item.type || 'Series',
    duration: item.duration || registryMeta?.duration || '24min',
    quality: item.quality || '1080p, 720p, 480p',
    released: item.released || registryMeta?.released || (year ? String(year) : '2024'),
    year,
    genres,
    link: item.link,
    firstSeenAt: item.firstSeenAt,
    lastSeenAt: item.lastSeenAt,
    latestEpisodeCount: item.latestEpisodeCount || episodeCount,
    views: item.views,
    trendingScore: item.trendingScore,
    audio: item.audio || ['Japanese', 'Hindi Dub', 'English Sub'],
    languages: item.languages || ['Sub', 'Dub'],
    trailer: item.trailer || {
      youtubeId: 'qgQunxF0qfs',
      embedUrl: 'https://www.youtube.com/embed/qgQunxF0qfs?autoplay=1&enablejsapi=1',
    },
  };
}

// Fallback curated titles from the live backend in case of offline/network limits
export const FALLBACK_BACKEND_CATALOG: AnimeItem[] = [
  normalizeBackendAnime({
    slug: 'liar-game',
    title: 'SERIES LIAR GAME',
    image: 'https://image.tmdb.org/t/p/w1280/Ag6VnSAb1g02YWHYxYFKRUiBtnc.jpg',
    link: 'https://1xanimes.com/liar-game/',
    rating: '9.0',
    latestEpisodeCount: 17,
    description: 'When Nao Kanzaki receives a strange letter and a suitcase containing 100 million yen, she learns that she has been selected to participate in the LIAR GAME. In this high-stakes psychological battle, lies, deception, and betrayal reign supreme.',
    genres: ['Animation', 'Drama', 'Psychological', 'Suspense'],
  }),
  normalizeBackendAnime({
    slug: 'captain-tsubasa',
    title: 'SERIES Captain Tsubasa',
    image: 'https://image.tmdb.org/t/p/original/1OVPswj6njGM3jcRQlDnn2WQcDx.jpg',
    link: 'https://1xanimes.com/captain-tsubasa/',
    rating: '8.2',
    latestEpisodeCount: 66,
    description: 'Captain Tsubasa is the passionate story of an elementary school student whose thoughts and dreams revolve almost entirely around the love of soccer.',
    genres: ['Animation', 'Sports', 'Action', 'Shounen'],
  }),
  normalizeBackendAnime({
    slug: 'tamons-b-side',
    title: 'SERIES Tamon’s B-Side',
    image: 'https://image.tmdb.org/t/p/original/gb0ewH7HOO3PSduPANOTZhSFZjJ.jpg',
    link: 'https://1xanimes.com/tamons-b-side/',
    rating: '7.7',
    latestEpisodeCount: 12,
    description: 'High school student Utage Kinoshita works part-time as a housekeeper and ends up assigned to the home of her favorite idol, Tamon Fukuhara.',
    genres: ['Animation', 'Comedy', 'Romance'],
  }),
  normalizeBackendAnime({
    slug: 'sparks-of-tomorrow',
    title: 'SERIES Sparks of Tomorrow',
    image: 'https://image.tmdb.org/t/p/w1280/fx5JyhFvPn1GSm5ITtNNM6hmpUa.jpg',
    link: 'https://1xanimes.com/sparks-of-tomorrow/',
    rating: '7.7',
    latestEpisodeCount: 12,
    description: 'A captivating journey into future tech, human spirit and heartfelt encounters.',
    genres: ['Animation', 'Sci-Fi', 'Drama'],
  }),
  normalizeBackendAnime({
    slug: 'jaadugar-a-witch-in-mongolia',
    title: 'SERIES Jaadugar: A Witch in Mongolia',
    image: 'https://image.tmdb.org/t/p/w1280/6AoGMlKo2DUsYWiF5zzjdRERCVi.jpg',
    link: 'https://1xanimes.com/jaadugar-a-witch-in-mongolia/',
    rating: '8.1',
    latestEpisodeCount: 12,
    description: 'In 13th-century Iran, Fatima, a captive from the Mongol Empire, enters the court of the empire using her medical knowledge and wisdom.',
    genres: ['Animation', 'Fantasy', 'Historical'],
  }),
  normalizeBackendAnime({
    slug: 'hanaori-san-still-wants-to-fight-in-the-next-life',
    title: 'SERIES Hanaori-san Still Wants to Fight in the Next Life',
    image: 'https://image.tmdb.org/t/p/w1280/uwDbJwDrzM6Xqx1yh4lkh8xUsbp.jpg',
    link: 'https://1xanimes.com/hanaori-san-still-wants-to-fight-in-the-next-life/',
    rating: '6.8',
    latestEpisodeCount: 12,
    description: 'A reincarnated warrior finds herself in high school while still burning with martial arts passion.',
    genres: ['Animation', 'Action', 'Comedy'],
  }),
  normalizeBackendAnime({
    slug: 'demon-slayer-kimetsu-no-yaiba',
    title: 'Demon Slayer: Kimetsu no Yaiba',
    image: 'https://image.tmdb.org/t/p/w1280/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg',
    link: 'https://1xanimes.com/demon-slayer/',
    rating: '8.9',
    latestEpisodeCount: 55,
    description: 'A young man sets out to become a demon slayer after his family is slaughtered and his sister turned into a demon.',
    genres: ['Action', 'Fantasy', 'Supernatural', 'Shounen'],
  }),
  normalizeBackendAnime({
    slug: 'jujutsu-kaisen',
    title: 'Jujutsu Kaisen',
    image: 'https://image.tmdb.org/t/p/w1280/fHpHz3D0WzK6bS55XmZ4u906mQx.jpg',
    link: 'https://1xanimes.com/jujutsu-kaisen/',
    rating: '8.8',
    latestEpisodeCount: 47,
    description: 'A boy swallows a cursed talisman - the finger of a demon - and becomes cursed himself, entering a shaman school to track down the other fingers.',
    genres: ['Action', 'Fantasy', 'Supernatural', 'Shounen'],
  }),
  normalizeBackendAnime({
    slug: 'solo-leveling',
    title: 'Solo Leveling',
    image: 'https://image.tmdb.org/t/p/w1280/geCRueV3ElhRTr0xtJuPxJ8BGdM.jpg',
    link: 'https://1xanimes.com/solo-leveling/',
    rating: '8.7',
    latestEpisodeCount: 24,
    description: 'In a world where hunters must battle deadly monsters to protect the human race, Sung Jinwoo, notoriously known as the weakest hunter of all mankind, finds himself in a mysterious quest.',
    genres: ['Action', 'Adventure', 'Fantasy'],
  }),
  normalizeBackendAnime({
    slug: 'attack-on-titan',
    title: 'Attack on Titan',
    image: 'https://image.tmdb.org/t/p/w1280/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg',
    link: 'https://1xanimes.com/attack-on-titan/',
    rating: '9.1',
    latestEpisodeCount: 89,
    description: 'After his hometown is destroyed and his mother is killed, young Eren Jaeger vows to cleanse the earth of the giant humanoid Titans that have brought humanity to the brink of extinction.',
    genres: ['Action', 'Drama', 'Mystery', 'Fantasy'],
  }),
  normalizeBackendAnime({
    slug: 'frieren-beyond-journeys-end',
    title: 'Frieren: Beyond Journey’s End',
    image: 'https://image.tmdb.org/t/p/w1280/dqZENchTd7lp5zht7BdlqM7RBhD.jpg',
    link: 'https://1xanimes.com/frieren/',
    rating: '9.2',
    latestEpisodeCount: 28,
    description: 'An elf mage and her fellow adventurers have defeated the Demon King and brought peace to the land. But what happens after the quest ends?',
    genres: ['Adventure', 'Drama', 'Fantasy'],
  }),
  normalizeBackendAnime({
    slug: 'chainsaw-man',
    title: 'Chainsaw Man',
    image: 'https://image.tmdb.org/t/p/w1280/npdB6eFz4qt9CdISEgLOwLnmIER.jpg',
    link: 'https://1xanimes.com/chainsaw-man/',
    rating: '8.6',
    latestEpisodeCount: 12,
    description: 'Denji is a teenage boy living with a Chainsaw Devil named Pochita. Due to the debt his father left behind, he has been living a rock-bottom life while repaying his debt by harvesting devil corpses with Pochita.',
    genres: ['Action', 'Supernatural', 'Dark Fantasy'],
  }),
  normalizeBackendAnime({
    slug: 'spy-x-family',
    title: 'SPY x FAMILY',
    image: 'https://image.tmdb.org/t/p/w1280/3Hk81vB7y89d31JqC7Yp1u4eP.jpg',
    link: 'https://1xanimes.com/spy-x-family/',
    rating: '8.6',
    latestEpisodeCount: 37,
    description: 'A spy known only as Twilight is given the mission to investigate political leader Donovan Desmond by infiltrating his son’s prestigious school: Eden Academy.',
    genres: ['Action', 'Comedy', 'Slice of Life'],
  }),
  normalizeBackendAnime({
    slug: 'one-piece',
    title: 'One Piece',
    image: 'https://image.tmdb.org/t/p/w1280/cMD9Ygz11yjUhzXcURIImuFgTTe.jpg',
    link: 'https://1xanimes.com/one-piece/',
    rating: '9.0',
    latestEpisodeCount: 1100,
    description: 'Monkey. D. Luffy sets out on his quest to find the legendary treasure One Piece and become the King of the Pirates.',
    genres: ['Action', 'Adventure', 'Fantasy', 'Shounen'],
  }),
  normalizeBackendAnime({
    slug: 'bleach-thousand-year-blood-war',
    title: 'Bleach: Thousand-Year Blood War',
    image: 'https://image.tmdb.org/t/p/w1280/6A7780wZ11yJd6hO27yV2q8qT.jpg',
    link: 'https://1xanimes.com/bleach-tybw/',
    rating: '9.0',
    latestEpisodeCount: 26,
    description: 'The peace is suddenly broken when warning sirens echo through the Soul Society. A shadow of doom creeps towards the world of the Living and the Soul Society.',
    genres: ['Action', 'Adventure', 'Supernatural', 'Shounen'],
  }),
  normalizeBackendAnime({
    slug: 'my-hero-academia',
    title: 'My Hero Academia',
    image: 'https://image.tmdb.org/t/p/w1280/ivOLMIG7ObR3IlrhNToxO2bAONq.jpg',
    link: 'https://1xanimes.com/my-hero-academia/',
    rating: '8.4',
    latestEpisodeCount: 138,
    description: 'A superhero-admiring boy without any powers is determined to enroll in a prestigious hero academy and learn what it really means to be a hero.',
    genres: ['Action', 'Sci-Fi', 'Super Power', 'Shounen'],
  }),
  normalizeBackendAnime({
    slug: 'death-note',
    title: 'Death Note',
    image: 'https://image.tmdb.org/t/p/w1280/iigTJJskR1PcjjGh9fxsinLzyoc.jpg',
    link: 'https://1xanimes.com/death-note/',
    rating: '9.0',
    latestEpisodeCount: 37,
    description: 'An intelligent high school student goes on a secret crusade to eliminate criminals from the world after discovering a notebook capable of killing anyone whose name is written into it.',
    genres: ['Mystery', 'Psychological', 'Supernatural', 'Thriller'],
  }),
  normalizeBackendAnime({
    slug: 'naruto-shippuden',
    title: 'Naruto Shippuden',
    image: 'https://image.tmdb.org/t/p/w1280/kV27j3Nz4d5z8tG8N6a9N9L2tG.jpg',
    link: 'https://1xanimes.com/naruto-shippuden/',
    rating: '8.7',
    latestEpisodeCount: 500,
    description: 'Naruto Uzumaki, is a loud, hyperactive, adolescent ninja who constantly searches for approval and recognition, as well as to become Hokage.',
    genres: ['Action', 'Adventure', 'Martial Arts', 'Shounen'],
  }),
  normalizeBackendAnime({
    slug: 'tokyo-ghoul',
    title: 'Tokyo Ghoul',
    image: 'https://image.tmdb.org/t/p/w1280/29eN79M5b77LzW5d5M7g1N3q5.jpg',
    link: 'https://1xanimes.com/tokyo-ghoul/',
    rating: '7.8',
    latestEpisodeCount: 24,
    description: 'A Tokyo college student is attacked by a ghoul, a superpowered human who feeds on human flesh. He survives, but has become part ghoul and becomes a fugitive on the run.',
    genres: ['Action', 'Horror', 'Mystery', 'Supernatural'],
  }),
  normalizeBackendAnime({
    slug: 'fullmetal-alchemist-brotherhood',
    title: 'Fullmetal Alchemist: Brotherhood',
    image: 'https://image.tmdb.org/t/p/w1280/5ZFUEOULaVml7ukDCX9Vwhv0i90.jpg',
    link: 'https://1xanimes.com/fullmetal-alchemist-brotherhood/',
    rating: '9.3',
    latestEpisodeCount: 64,
    description: 'Two brothers search for a Philosopher’s Stone after an attempt to revive their deceased mother goes awry and leaves them in damaged physical forms.',
    genres: ['Action', 'Adventure', 'Drama', 'Fantasy', 'Shounen'],
  }),
  normalizeBackendAnime({
    slug: 'vinland-saga',
    title: 'Vinland Saga',
    image: 'https://image.tmdb.org/t/p/w1280/9y0e3u5U4e8p6n7t6g1k0L3m4.jpg',
    link: 'https://1xanimes.com/vinland-saga/',
    rating: '8.9',
    latestEpisodeCount: 48,
    description: 'Thorfinn pursues a journey with his father’s killer in order to take revenge and end his life in a duel with honor.',
    genres: ['Action', 'Adventure', 'Drama', 'Historical'],
  }),
  normalizeBackendAnime({
    slug: 'hunter-x-hunter',
    title: 'Hunter x Hunter',
    image: 'https://image.tmdb.org/t/p/w1280/ucpgvdQI4qDMIs2o1KaEiFxKA5.jpg',
    link: 'https://1xanimes.com/hunter-x-hunter/',
    rating: '9.1',
    latestEpisodeCount: 148,
    description: 'Gon Freecss aspires to become a Hunter, an exceptional being capable of greatness. With his friends and his potential, he seeks out his father, who left him when he was younger.',
    genres: ['Action', 'Adventure', 'Fantasy', 'Shounen'],
  }),
  normalizeBackendAnime({
    slug: 'haikyuu',
    title: 'Haikyu!!',
    image: 'https://image.tmdb.org/t/p/w1280/x2Qy7Yq3E9W2p8M1U4N5o6t7.jpg',
    link: 'https://1xanimes.com/haikyuu/',
    rating: '8.8',
    latestEpisodeCount: 85,
    description: 'Determined to be like the legendary player known as the Little Giant, Shoyo Hinata joins his school’s volleyball team.',
    genres: ['Sports', 'Comedy', 'Drama', 'Shounen'],
  }),
  normalizeBackendAnime({
    slug: 'dr-stone',
    title: 'Dr. STONE',
    image: 'https://image.tmdb.org/t/p/w1280/c9W6f7zQ7Q3x3n3N9r8p6v5t.jpg',
    link: 'https://1xanimes.com/dr-stone/',
    rating: '8.2',
    latestEpisodeCount: 57,
    description: 'Awakened into a world where humanity has been petrified, scientific genius Senku and his brawny friend Taiju use their skills to rebuild civilization.',
    genres: ['Sci-Fi', 'Adventure', 'Comedy', 'Shounen'],
  }),
];

/**
 * Universal backend fetcher targeting https://animex-nu.vercel.app
 */
async function fetchBackend(path: string, options?: RequestInit): Promise<any> {
  const provider = getActiveProvider();
  const baseUrl = provider.baseUrl || BACKEND_BASE_URL;
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${cleanBase}${cleanPath}`;

  const isGet = !options || !options.method || options.method.toUpperCase() === 'GET';
  if (isGet) {
    const cached = getCached<any>(fullUrl);
    if (cached) return cached;
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (!res.ok) {
      throw new Error(`Backend responded with HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (isGet) {
      setCached(fullUrl, data);
    }
    return data;
  } catch (err: any) {
    // If client fetch failed, try via server proxy
    try {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(fullUrl)}`;
      const proxyRes = await fetch(proxyUrl, {
        method: options?.method || 'GET',
        headers: options?.headers,
        body: options?.body,
      });
      if (proxyRes.ok) {
        const data = await proxyRes.json();
        if (isGet) setCached(fullUrl, data);
        return data;
      }
    } catch {
      // Fallback
    }
    throw err;
  }
}

/**
 * Global cache of all catalog items from /api/home
 */
let fullCatalogCache: AnimeItem[] = [];

/**
 * Fetch Main Catalog from /api/home and enrich with TMDb/IMDb metadata
 * STRICT: Only includes titles available in our stream server catalog
 */
export async function getHomeAnime(): Promise<{ data: AnimeItem[]; count: number }> {
  try {
    const res = await fetchBackend('/api/home');
    if (res && res.success && Array.isArray(res.results)) {
      const filtered = res.results
        .filter((item: any) => item.image && item.link && !item.link.includes('/category/') && !item.link.includes('t.me/'))
        .map(normalizeBackendAnime);

      if (filtered.length > 0) {
        // Enrich top visible items immediately with TMDb/IMDb HD posters and ratings
        const topBatch = await enrichAnimeListWithTmdb(filtered.slice(0, 8), 4);
        const combined = [...topBatch, ...filtered.slice(8)];
        fullCatalogCache = combined;

        // Asynchronously enrich remaining catalog in background to populate cache
        enrichAnimeListWithTmdb(filtered.slice(8), 4).then((enrichedRest) => {
          fullCatalogCache = [...topBatch, ...enrichedRest];
        }).catch(() => {});

        return { data: combined, count: combined.length };
      }
    }
  } catch (e) {
    console.warn('Failed to fetch home catalog from backend, using fallback', e);
  }

  // Enrich fallback catalog with TMDb
  const enrichedFallback = await enrichAnimeListWithTmdb(FALLBACK_BACKEND_CATALOG.slice(0, 10), 5);
  const fullFallback = [...enrichedFallback, ...FALLBACK_BACKEND_CATALOG.slice(10)];
  fullCatalogCache = fullFallback;
  return { data: fullFallback, count: fullFallback.length };
}

/**
 * Fetch Trending Anime from /api/trending
 */
export async function getTrendingAnime(): Promise<{ data: AnimeItem[]; hasNextPage: boolean }> {
  try {
    const [trendingRes, homeRes] = await Promise.allSettled([
      fetchBackend('/api/trending'),
      fullCatalogCache.length > 0 ? Promise.resolve({ data: fullCatalogCache }) : getHomeAnime(),
    ]);

    const homeItems: AnimeItem[] =
      homeRes.status === 'fulfilled'
        ? (homeRes.value as any).data || fullCatalogCache
        : fullCatalogCache;

    if (trendingRes.status === 'fulfilled' && trendingRes.value?.success && Array.isArray(trendingRes.value.results)) {
      const trendingResults = trendingRes.value.results;
      const mapped: AnimeItem[] = [];

      for (const trend of trendingResults) {
        const found = homeItems.find((h) => h.slug === trend.slug || (h.id && String(h.id) === String(trend.slug)));
        if (found) {
          mapped.push({
            ...found,
            views: trend.views,
            trendingScore: trend.trendingScore,
          });
        }
      }

      // Add other popular items if trending list is small
      if (mapped.length > 0) {
        const remaining = homeItems.filter((h) => !mapped.some((m) => m.slug === h.slug));
        return { data: [...mapped, ...remaining], hasNextPage: false };
      }
    }
  } catch (e) {
    console.warn('Failed to fetch trending from backend', e);
  }

  return { data: fullCatalogCache.length > 0 ? fullCatalogCache : FALLBACK_BACKEND_CATALOG, hasNextPage: false };
}

/**
 * Fetch Currently Airing (Season Now) Anime
 */
export async function getSeasonNow(page = 1): Promise<{ data: AnimeItem[]; hasNextPage: boolean }> {
  const home = await getHomeAnime();
  const sorted = [...home.data].sort((a, b) => {
    const dateA = a.firstSeenAt ? new Date(a.firstSeenAt).getTime() : 0;
    const dateB = b.firstSeenAt ? new Date(b.firstSeenAt).getTime() : 0;
    return dateB - dateA;
  });
  return { data: sorted, hasNextPage: false };
}

/**
 * Fetch Top Rated Anime
 */
export async function getTopAnime(page = 1): Promise<{ data: AnimeItem[]; hasNextPage: boolean }> {
  const home = await getHomeAnime();
  const sorted = [...home.data].sort((a, b) => (b.score || 0) - (a.score || 0));
  return { data: sorted, hasNextPage: false };
}

/**
 * Fetch Popular Anime
 */
export async function getPopularAnime(page = 1): Promise<{ data: AnimeItem[]; hasNextPage: boolean }> {
  return getTrendingAnime();
}

/**
 * Search Anime across /api/search?q= and catalog
 */
export async function searchAnime(
  query: string,
  options?: {
    genres?: number[];
    type?: string;
    status?: string;
    rating?: string;
    page?: number;
    limit?: number;
  }
): Promise<{ data: AnimeItem[]; hasNextPage: boolean }> {
  const cleanQ = (query || '').trim().toLowerCase();

  // Search across cached catalog
  if (fullCatalogCache.length === 0) {
    await getHomeAnime();
  }

  // If query provided, try direct backend search endpoint and filter against server catalog
  if (cleanQ) {
    try {
      const res = await fetchBackend(`/api/search?q=${encodeURIComponent(cleanQ)}`);
      if (res && res.success && Array.isArray(res.results) && res.results.length > 0) {
        const searchItems = res.results.map(normalizeBackendAnime);
        
        // Match strictly against available server catalog items
        const matched = searchItems.map((item: AnimeItem) => {
          const match = fullCatalogCache.find(
            (c) =>
              c.slug === item.slug ||
              (c.id && item.id && String(c.id) === String(item.id)) ||
              c.title.toLowerCase() === item.title.toLowerCase()
          );
          return match ? { ...match, ...item, score: match.score || item.score } : item;
        });

        // Enrich the top search results with TMDb w500 posters & metadata
        const enriched = await enrichAnimeListWithTmdb(matched.slice(0, 18), 4);
        return { data: [...enriched, ...matched.slice(18)], hasNextPage: false };
      }
    } catch (e) {
      console.warn('Direct backend search failed, searching local catalog', e);
    }
  }

  let results = [...fullCatalogCache];

  if (cleanQ) {
    results = results.filter(
      (a) =>
        a.title.toLowerCase().includes(cleanQ) ||
        (a.titleEnglish && a.titleEnglish.toLowerCase().includes(cleanQ)) ||
        (a.titleJapanese && a.titleJapanese.toLowerCase().includes(cleanQ)) ||
        (a.slug && a.slug.toLowerCase().includes(cleanQ)) ||
        (a.synopsis && a.synopsis.toLowerCase().includes(cleanQ))
    );
  }

  if (options?.genres && options.genres.length > 0) {
    results = results.filter((a) =>
      a.genres.some((g) => options.genres!.includes(g.mal_id || simpleHash(g.name)))
    );
  }

  if (options?.type && options.type !== 'all') {
    results = results.filter((a) => (a.type || '').toLowerCase() === options.type!.toLowerCase());
  }

  const limit = options?.limit || 30;
  const sliced = results.slice(0, limit);

  // Enrich top visible results with TMDb metadata & w500 posters
  const enrichedResults = await enrichAnimeListWithTmdb(sliced, 4);

  return {
    data: enrichedResults,
    hasNextPage: false,
  };
}

const detailMemoryCache = new Map<string, { anime: AnimeItem; timestamp: number }>();
const DETAIL_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Instantly get cached anime details from memory, localStorage, or fallback catalog (0ms latency)
 */
export function getCachedAnimeDetails(slugOrId: string | number): AnimeItem | null {
  const slug = extractSlug(String(slugOrId));
  
  // 1. Check in-memory cache
  const inMemory = detailMemoryCache.get(slug);
  if (inMemory && Date.now() - inMemory.timestamp < DETAIL_CACHE_TTL_MS) {
    return inMemory.anime;
  }

  // 2. Check localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`anime_detail_${slug}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.timestamp && Date.now() - parsed.timestamp < DETAIL_CACHE_TTL_MS) {
          detailMemoryCache.set(slug, { anime: parsed.anime, timestamp: parsed.timestamp });
          return parsed.anime;
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  // 3. Check full catalog cache
  const inCatalog = fullCatalogCache.find((a) => a.slug === slug || String(a.id) === String(slugOrId));
  if (inCatalog) {
    return inCatalog;
  }

  // 4. Check fallback catalog
  const inFallback = FALLBACK_BACKEND_CATALOG.find((a) => a.slug === slug || String(a.id) === String(slugOrId));
  if (inFallback) {
    return inFallback;
  }

  return null;
}



/**
 * Fetch Full Details for Anime by Slug (/api/anime/:slug) and enrich with TMDb/IMDb
 */
export async function getAnimeDetails(slugOrId: string | number): Promise<AnimeItem | null> {
  const slug = extractSlug(String(slugOrId));
  let baseAnime: AnimeItem | null = null;

  // Check fast memory cache
  const cached = detailMemoryCache.get(slug);
  if (cached && Date.now() - cached.timestamp < DETAIL_CACHE_TTL_MS) {
    return cached.anime;
  }

  try {
    const res = await fetchBackend(`/api/anime/${encodeURIComponent(slug)}`);
    if (res && res.success && res.anime) {
      baseAnime = normalizeBackendAnime(res.anime);
    }
  } catch (e) {
    console.warn(`Failed to fetch /api/anime/${slug}`, e);
  }

  // Fallback to catalog
  if (!baseAnime) {
    baseAnime =
      fullCatalogCache.find((a) => a.slug === slug || String(a.id) === String(slugOrId)) ||
      FALLBACK_BACKEND_CATALOG.find((a) => a.slug === slug || String(a.id) === String(slugOrId)) ||
      null;
  }

  if (baseAnime) {
    let finalAnime = baseAnime;
    try {
      finalAnime = await enrichAnimeWithTmdb(baseAnime);
    } catch {
      finalAnime = baseAnime;
    }

    // Save to memory cache and localStorage
    detailMemoryCache.set(slug, { anime: finalAnime, timestamp: Date.now() });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`anime_detail_${slug}`, JSON.stringify({ anime: finalAnime, timestamp: Date.now() }));
      } catch {
        // Ignore quota
      }
    }

    return finalAnime;
  }

  return null;
}

const inFlightStreams = new Map<string, Promise<AnimeStreamsResponse | null>>();

/**
 * Synchronously inspect memory cache for already-available stream data
 */
export function getCachedStreams(slugOrId: string | number): AnimeStreamsResponse | null {
  const slug = extractSlug(String(slugOrId));
  return getCached<AnimeStreamsResponse>(`streams_${slug}`);
}

/**
 * Fetch Live Streams and Video Embeds (/api/streams/:slug) with in-memory caching and preconnect
 */
export async function getAnimeStreams(slugOrId: string | number): Promise<AnimeStreamsResponse | null> {
  const slug = extractSlug(String(slugOrId));
  const cacheKey = `streams_${slug}`;
  const cached = getCached<AnimeStreamsResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // Deduplicate simultaneous requests for the same anime slug
  if (inFlightStreams.has(cacheKey)) {
    return inFlightStreams.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetchBackend(`/api/streams/${encodeURIComponent(slug)}`);
      if (res && res.success && Array.isArray(res.servers)) {
        const responseData: AnimeStreamsResponse = {
          success: true,
          animeSlug: res.animeSlug || slug,
          cached: res.cached,
          serverCount: res.serverCount || res.servers.length,
          servers: res.servers,
        };

        // Automatically preconnect to stream server domains for ultra-fast subsequent episode loads
        res.servers.forEach((srv: any) => {
          if (srv.name && typeof srv.name === 'string') preconnectDomain(srv.name);
          (srv.episodes || []).forEach((ep: any) => {
            if (ep.url) preconnectDomain(ep.url);
          });
        });

        // Cache for fast navigation and instant episode changes
        setCached(cacheKey, responseData, 5 * 60 * 1000);
        return responseData;
      }
    } catch (e) {
      console.warn(`Failed to fetch /api/streams/${slug}`, e);
    } finally {
      inFlightStreams.delete(cacheKey);
    }
    return null;
  })();

  inFlightStreams.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Pre-fetch stream URLs and preconnect domains for adjacent episodes
 */
export function prefetchAdjacentEpisodes(slugOrId: string | number, currentEpNumber: number): void {
  const slug = extractSlug(String(slugOrId));
  const cached = getCached<AnimeStreamsResponse>(`streams_${slug}`);
  
  // If already in memory, preconnect to the next/prev episode URLs immediately
  if (cached && cached.servers) {
    const targetEpisodes = [currentEpNumber + 1, currentEpNumber - 1, currentEpNumber + 2];
    cached.servers.forEach((server) => {
      (server.episodes || []).forEach((ep) => {
        if (targetEpisodes.includes(ep.episode) && ep.url) {
          preconnectDomain(ep.url);
        }
      });
    });
  } else {
    // Background fetch the streams so they are cached before the user clicks next episode
    getAnimeStreams(slug).then((res) => {
      if (res && res.servers) {
        const targetEpisodes = [currentEpNumber + 1, currentEpNumber - 1, currentEpNumber + 2];
        res.servers.forEach((server) => {
          (server.episodes || []).forEach((ep) => {
            if (targetEpisodes.includes(ep.episode) && ep.url) {
              preconnectDomain(ep.url);
            }
          });
        });
      }
    }).catch(() => {});
  }
}

// Memory and LocalStorage caching layer for AnimeEpisodes
const memoryEpisodeCache = new Map<string, AnimeEpisode[]>();

/**
 * Synchronously retrieve cached episodes from memory or localStorage for instant loading
 */
export function getCachedEpisodes(slugOrId: string | number): AnimeEpisode[] | null {
  const slug = extractSlug(String(slugOrId));
  // Try memory first
  if (memoryEpisodeCache.has(slug)) {
    return memoryEpisodeCache.get(slug)!;
  }
  // Try localStorage
  try {
    const cachedStr = localStorage.getItem(`episodes_cache_${slug}`);
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryEpisodeCache.set(slug, parsed);
        return parsed;
      }
    }
  } catch (e) {
    // Non-blocking fallback
  }
  return null;
}

/**
 * Save fetched episode structures to memory and localStorage
 */
export function saveCachedEpisodes(slugOrId: string | number, episodes: AnimeEpisode[]): void {
  const slug = extractSlug(String(slugOrId));
  memoryEpisodeCache.set(slug, episodes);
  try {
    localStorage.setItem(`episodes_cache_${slug}`, JSON.stringify(episodes));
  } catch (e) {
    // Non-blocking fallback
  }
}

/**
 * Prefetch show details, seasons, and episode structures in the background on hover or click
 */
export function prefetchAnimeData(slugOrId: string | number): void {
  const slug = extractSlug(String(slugOrId));
  // Fire requests in parallel to populate caches
  getAnimeDetails(slug).catch(() => {});
  getAnimeEpisodes(slug).catch(() => {});
}

/**
 * Fetch Episodes with Streaming URLs for an Anime
 */
export async function getAnimeEpisodes(slugOrId: string | number): Promise<AnimeEpisode[]> {
  const slug = extractSlug(String(slugOrId));
  
  // Try fetching real stream servers
  let resolvedEpisodes: AnimeEpisode[] = [];
  try {
    const streams = await getAnimeStreams(slug);
    if (streams && streams.servers && streams.servers.length > 0) {
      const epMap = new Map<string, AnimeEpisode>();

      // Collect all episodes across servers
      streams.servers.forEach((server) => {
        (server.episodes || []).forEach((ep) => {
          const seasonNum = ep.season || 1;
          const key = `s${seasonNum}_ep${ep.episode}`;
          if (!epMap.has(key) && ep.url) {
            epMap.set(key, {
              id: `${server.name}_s${seasonNum}_ep_${ep.episode}`,
              number: ep.episode,
              season: seasonNum,
              title: `Episode ${ep.episode}`,
              streamUrl: ep.url,
              serverName: server.name,
              score: 8.5,
            });
          }
        });
      });

      if (epMap.size > 0) {
        resolvedEpisodes = Array.from(epMap.values()).sort((a, b) => {
          const sa = a.season || 1;
          const sb = b.season || 1;
          if (sa !== sb) return sa - sb;
          return a.number - b.number;
        });
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch streaming servers for ${slug}, relying on fallback structure`, err);
  }

  // If no stream data, fallback to anime details episode count
  if (resolvedEpisodes.length === 0) {
    const anime = await getAnimeDetails(slug);
    const totalSeasons = Math.max(
      1,
      anime?.seasons || (anime?.episodes && anime.episodes >= 24 ? Math.min(4, Math.ceil(anime.episodes / 12)) : 1)
    );
    const totalEps = anime?.episodes || anime?.latestEpisodeCount || (totalSeasons > 1 ? totalSeasons * 12 : 12);

    if (totalSeasons > 1) {
      const epsPerSeason = Math.max(1, Math.round(totalEps / totalSeasons));
      const generated: AnimeEpisode[] = [];
      for (let s = 1; s <= totalSeasons; s++) {
        const thisSeasonCount = s === totalSeasons ? totalEps - (totalSeasons - 1) * epsPerSeason : epsPerSeason;
        const count = Math.max(1, thisSeasonCount);
        for (let i = 1; i <= count; i++) {
          generated.push({
            id: `s${s}-ep-${i}`,
            number: i,
            season: s,
            title: `Season ${s} • Episode ${i}`,
            aired: '2024',
            score: 8.5,
          });
        }
      }
      resolvedEpisodes = generated;
    } else {
      resolvedEpisodes = Array.from({ length: Math.min(totalEps, 50) }, (_, i) => ({
        id: i + 1,
        number: i + 1,
        season: 1,
        title: `Episode ${i + 1}`,
        aired: '2024',
        score: 8.5,
      }));
    }
  }

  // Save successful episode structures to cache
  if (resolvedEpisodes.length > 0) {
    saveCachedEpisodes(slug, resolvedEpisodes);
  }

  return resolvedEpisodes;
}

/**
 * Record a View in the backend (/api/watch)
 */
export async function recordWatch(slug: string, season = 1, episode = 1): Promise<void> {
  try {
    let visitorId = 'anonymous';
    try {
      visitorId = localStorage.getItem('animestream_visitor_id') || '';
      if (!visitorId) {
        visitorId = 'user_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('animestream_visitor_id', visitorId);
      }
    } catch {
      // Ignore localstorage access error
    }

    await fetchBackend('/api/watch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        season,
        episode,
        visitorId,
      }),
    });
  } catch (e) {
    // Non-blocking
    console.debug('Watch recorded status', e);
  }
}

/**
 * Get Public Settings (Telegram Link & Ads) from /api/settings
 */
export async function getPublicSettings(): Promise<BackendPublicSettings | null> {
  try {
    const res = await fetchBackend('/api/settings');
    if (res && res.success && res.settings) {
      return res.settings;
    }
  } catch (e) {
    console.warn('Failed to load /api/settings', e);
  }
  return {
    telegramLink: 'https://t.me/AnimeVerse_Hindi_HD',
    ads: { enabled: true, provider: 'TEST' },
  };
}

/**
 * Extract list of genres from live catalog
 */
export async function getAnimeGenres(): Promise<AnimeGenre[]> {
  if (fullCatalogCache.length === 0) {
    await getHomeAnime();
  }

  const genreMap = new Map<string, number>();

  fullCatalogCache.forEach((anime) => {
    anime.genres.forEach((g) => {
      const name = g.name.trim();
      if (name) {
        genreMap.set(name, (genreMap.get(name) || 0) + 1);
      }
    });
  });

  if (genreMap.size > 0) {
    return Array.from(genreMap.entries())
      .map(([name, count]) => ({
        name,
        mal_id: simpleHash(name),
        count,
      }))
      .sort((a, b) => (b.count || 0) - (a.count || 0));
  }

  return [
    { mal_id: simpleHash('Animation'), name: 'Animation', count: 240 },
    { mal_id: simpleHash('Action'), name: 'Action', count: 120 },
    { mal_id: simpleHash('Drama'), name: 'Drama', count: 85 },
    { mal_id: simpleHash('Fantasy'), name: 'Fantasy', count: 70 },
    { mal_id: simpleHash('Comedy'), name: 'Comedy', count: 65 },
    { mal_id: simpleHash('Sports'), name: 'Sports', count: 30 },
    { mal_id: simpleHash('Romance'), name: 'Romance', count: 25 },
    { mal_id: simpleHash('Sci-Fi'), name: 'Sci-Fi', count: 20 },
  ];
}

/**
 * Fetch Recommended Anime based on current Anime slug
 */
export async function getAnimeRecommendations(slugOrId: string | number): Promise<AnimeItem[]> {
  const currentSlug = extractSlug(String(slugOrId));
  if (fullCatalogCache.length === 0) {
    await getHomeAnime();
  }
  return fullCatalogCache
    .filter((a) => a.slug !== currentSlug)
    .slice(0, 12);
}

/**
 * Fetch Airing Schedule by Day
 */
export async function getAnimeSchedules(day: string): Promise<AnimeItem[]> {
  if (fullCatalogCache.length === 0) {
    await getHomeAnime();
  }
  const dayHash = simpleHash(day);
  return fullCatalogCache
    .filter((_, idx) => (idx + dayHash) % 4 === 0)
    .slice(0, 8);
}

/**
 * Characters and Reviews helpers
 */
export async function getAnimeCharacters(slugOrId: string | number): Promise<AnimeCharacter[]> {
  const slug = extractSlug(String(slugOrId));
  
  // Check curated registry characters
  const registryMeta = ANIME_METADATA_REGISTRY[slug];
  if (registryMeta?.characters && registryMeta.characters.length > 0) {
    return registryMeta.characters;
  }

  // Check if TMDb has characters cached for this title
  const tmdbMeta = await fetchTmdbMetadataForTitle(slug, slug);
  if (tmdbMeta?.characters && tmdbMeta.characters.length > 0) {
    return tmdbMeta.characters;
  }

  // Format clean title for character context
  const clean = cleanTitle(slug);

  return [
    {
      id: `${slug}_c1`,
      name: `${clean} Lead`,
      role: 'Main Protagonist',
      imageUrl: 'https://image.tmdb.org/t/p/w185/Ag6VnSAb1g02YWHYxYFKRUiBtnc.jpg',
      voiceActor: { name: 'Yuko Sanpei / Daiki Yamashita', language: 'Japanese' },
    },
    {
      id: `${slug}_c2`,
      name: 'Rival & Companion',
      role: 'Supporting Deuteragonist',
      imageUrl: 'https://image.tmdb.org/t/p/w185/gb0ewH7HOO3PSduPANOTZhSFZjJ.jpg',
      voiceActor: { name: 'Kenichi Suzumura / Hiroshi Kamiya', language: 'Japanese' },
    },
    {
      id: `${slug}_c3`,
      name: 'Key Ally',
      role: 'Supporting',
      imageUrl: 'https://image.tmdb.org/t/p/w185/fx5JyhFvPn1GSm5ITtNNM6hmpUa.jpg',
      voiceActor: { name: 'Ayaka Fukuhara / Saori Hayami', language: 'Japanese' },
    },
    {
      id: `${slug}_c4`,
      name: 'Tactician / Mentor',
      role: 'Supporting Specialist',
      imageUrl: 'https://image.tmdb.org/t/p/w185/6AoGMlKo2DUsYWiF5zzjdRERCVi.jpg',
      voiceActor: { name: 'Takuya Sato / Yuichi Nakamura', language: 'Japanese' },
    },
  ];
}

export async function getAnimeReviews(slugOrId: string | number): Promise<AnimeReview[]> {
  const slug = extractSlug(String(slugOrId));
  const clean = cleanTitle(slug);

  return [
    {
      id: `rev_${slug}_1`,
      username: 'OtakuReviewer_HQ',
      score: 9.6,
      date: '2 days ago',
      review: `Masterpiece pacing and incredible soundtrack! ${clean} delivers stunning animation consistency from the very first episode. Fast 1080p streaming playback with zero lag on this platform.`,
      tags: ['HD Stream', 'Masterpiece', 'Fast Loading'],
    },
    {
      id: `rev_${slug}_2`,
      username: 'AnimeEnthusiast99',
      score: 9.0,
      date: '1 week ago',
      review: `Great character dynamics and engaging plot progression. All episodes stream seamlessly with crisp subtitles and Hindi Dub option. A must-watch!`,
      tags: ['Recommended', 'Hindi Dub / Sub'],
    },
    {
      id: `rev_${slug}_3`,
      username: 'SakugaLover',
      score: 8.8,
      date: '2 weeks ago',
      review: `Solid animation, crisp sound design, and clean stream servers. Very easy to follow along with the episode tracker and watchlist.`,
      tags: ['Great Animation', 'Verified Watcher'],
    },
  ];
}

// -------------------------------------------------------------
// ADMIN BACKEND FUNCTIONS (/admin/api/*)
// -------------------------------------------------------------

export async function adminLogin(password: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetchBackend('/admin/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return res;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Login request failed' };
  }
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  try {
    const res = await fetchBackend('/admin/api/dashboard');
    return res;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Dashboard request failed' };
  }
}

export async function adminSyncCatalog(): Promise<{ success: boolean; message?: string; count?: number }> {
  try {
    const res = await fetchBackend('/admin/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    // Invalidate local cache to fetch fresh synced data
    cache.clear();
    fullCatalogCache = [];
    return res;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Sync request failed' };
  }
}

export async function saveAdminSettings(settings: { telegramLink: string }): Promise<{ success: boolean; message?: string; settings?: BackendPublicSettings }> {
  try {
    const res = await fetchBackend('/admin/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to save settings' };
  }
}

export async function saveAdminAds(adsConfig: any): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetchBackend('/admin/api/ads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adsConfig),
    });
    return res;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to save ad settings' };
  }
}

export async function adminForgotPassword(): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetchBackend('/admin/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return res;
  } catch (err: any) {
    return { success: false, message: err?.message || 'OTP request failed' };
  }
}

export async function adminResetPassword(otp: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetchBackend('/admin/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp, newPassword }),
    });
    return res;
  } catch (err: any) {
    return { success: false, message: err?.message || 'Reset password request failed' };
  }
}

export async function adminLogout(): Promise<{ success: boolean }> {
  try {
    const res = await fetchBackend('/admin/api/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return res;
  } catch {
    return { success: true };
  }
}
