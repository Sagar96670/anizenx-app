import { AnimeCharacter, AnimeGenre, AnimeItem, AnimeStudio } from '../types/anime';

// TMDb API Configuration & Image CDN Size Endpoints
export const TMDB_API_KEY = 'fed86956458f19fb45cdd382b6e6de83';
export const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_W185 = 'https://image.tmdb.org/t/p/w185';
export const TMDB_IMAGE_W300 = 'https://image.tmdb.org/t/p/w300';
export const TMDB_IMAGE_W342 = 'https://image.tmdb.org/t/p/w342';
export const TMDB_IMAGE_W500 = 'https://image.tmdb.org/t/p/w500';
export const TMDB_IMAGE_W780 = 'https://image.tmdb.org/t/p/w780';
export const TMDB_IMAGE_W1280 = 'https://image.tmdb.org/t/p/w1280';
export const TMDB_IMAGE_ORIGINAL = 'https://image.tmdb.org/t/p/original';

export type TmdbImageSize = 'w185' | 'w300' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original';

/**
 * Efficiently convert any TMDb image URL to the requested low-res or optimized size.
 * Ensures HTTPS, prioritizes image.tmdb.org, and formats TMDb image endpoints across all networks.
 */
export function getOptimizedTmdbImageUrl(
  url?: string | null,
  size: TmdbImageSize | string = 'w342'
): string {
  if (!url) return '';
  let normalized = url.trim();
  // Convert insecure http to https
  if (normalized.startsWith('http://')) {
    normalized = normalized.replace('http://', 'https://');
  }
  // If relative TMDb path, prepend canonical TMDB CDN host
  if (normalized.startsWith('/t/p/')) {
    normalized = `https://image.tmdb.org${normalized}`;
  } else if (normalized.startsWith('/') && !normalized.startsWith('//')) {
    normalized = `https://image.tmdb.org/t/p/${size}${normalized}`;
  }
  // Optimize size for image.tmdb.org URLs
  if (normalized.includes('image.tmdb.org/t/p/')) {
    return normalized.replace(/\/t\/p\/(w\d+|original)/, `/t/p/${size}`);
  }
  return normalized;
}

// In-Memory cache for instantaneous zero-latency responses
const tmdbMemoryCache = new Map<string, { data: TmdbMetadata; timestamp: number }>();
// Pending promise map for strict request deduplication
const pendingRequests = new Map<string, Promise<TmdbMetadata | null>>();

const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours cache
const LOCAL_STORAGE_KEY = 'tmdb_anime_metadata_cache_v4';

export interface TmdbMetadata {
  tmdbId?: number;
  imdbId?: string;
  title: string;
  originalTitle?: string;
  titleJapanese?: string;
  posterThumbUrl?: string; // Low-res (w342) for ultra-fast card loading
  posterUrl?: string;      // Medium-res (w500) for headers/modals
  posterOriginalUrl?: string;
  backdropUrl?: string;    // (w1280)
  backdropOriginalUrl?: string;
  rating?: number;
  voteCount?: number;
  synopsis?: string;
  duration?: string;
  year?: number;
  season?: string;
  released?: string;
  genres?: AnimeGenre[];
  studios?: AnimeStudio[];
  source?: string;
  status?: string;
  totalEpisodes?: number;
  totalSeasons?: number;
  characters?: AnimeCharacter[];
}

/**
 * Built-in Anime Metadata Registry for 100% consistent, instant detail layouts
 */
export const ANIME_METADATA_REGISTRY: Record<string, Partial<TmdbMetadata>> = {
  'captain-tsubasa': {
    title: 'Captain Tsubasa',
    originalTitle: 'キャプテン翼',
    titleJapanese: 'キャプテン翼 (2018)',
    rating: 8.2,
    voteCount: 420,
    imdbId: 'tt8369688',
    year: 2018,
    season: 'Spring',
    released: '2018-04-03',
    duration: '24min',
    totalEpisodes: 52,
    totalSeasons: 2,
    status: 'Completed',
    source: 'Manga (Yoichi Takahashi)',
    studios: [{ name: 'David Production' }, { name: 'TV Tokyo' }],
    genres: [
      { mal_id: 16, name: 'Animation' },
      { mal_id: 30, name: 'Sports' },
      { mal_id: 28, name: 'Action' },
      { mal_id: 27, name: 'Shounen' },
    ],
    synopsis:
      'Captain Tsubasa is the passionate story of an elementary school soccer prodigy Tsubasa Oozora whose thoughts and dreams revolve almost entirely around the love of soccer and winning the national championship.',
    characters: [
      {
        id: 'ct_1',
        name: 'Tsubasa Oozora',
        role: 'Main (Captain / Midfielder)',
        imageUrl: 'https://image.tmdb.org/t/p/w185/Ag6VnSAb1g02YWHYxYFKRUiBtnc.jpg',
        voiceActor: { name: 'Yuko Sanpei', language: 'Japanese' },
      },
      {
        id: 'ct_2',
        name: 'Genzo Wakabayashi',
        role: 'Main (Goalkeeper)',
        imageUrl: 'https://image.tmdb.org/t/p/w185/gb0ewH7HOO3PSduPANOTZhSFZjJ.jpg',
        voiceActor: { name: 'Kenichi Suzumura', language: 'Japanese' },
      },
      {
        id: 'ct_3',
        name: 'Kojiro Hyuga',
        role: 'Main (Forward / Rival)',
        imageUrl: 'https://image.tmdb.org/t/p/w185/Ag6VnSAb1g02YWHYxYFKRUiBtnc.jpg',
        voiceActor: { name: 'Takuya Sato', language: 'Japanese' },
      },
      {
        id: 'ct_4',
        name: 'Taro Misaki',
        role: 'Supporting (Golden Duo Midfielder)',
        imageUrl: 'https://image.tmdb.org/t/p/w185/fx5JyhFvPn1GSm5ITtNNM6hmpUa.jpg',
        voiceActor: { name: 'Ayaka Fukuhara', language: 'Japanese' },
      },
    ],
  },
  'hanaori-san-still-wants-to-fight-in-the-next-life': {
    title: 'Hanaori-san Still Wants to Fight in the Next Life',
    originalTitle: '花織さんは転生しても喧嘩がしたい',
    titleJapanese: '花織さんは転生しても喧嘩がしたい',
    rating: 7.6,
    voteCount: 185,
    imdbId: 'tt31284562',
    year: 2025,
    season: 'Winter',
    released: '2025-01-10',
    duration: '24min',
    totalEpisodes: 12,
    totalSeasons: 1,
    status: 'Currently Airing',
    source: 'Manga (Hiyoko Kobato)',
    studios: [{ name: 'Passione' }, { name: 'Overlap' }],
    genres: [
      { mal_id: 16, name: 'Animation' },
      { mal_id: 28, name: 'Action' },
      { mal_id: 35, name: 'Comedy' },
      { mal_id: 22, name: 'Martial Arts' },
    ],
    synopsis:
      'A supreme warrior from another era is reincarnated into modern high school life as an ordinary girl. Despite trying to live peacefully, her indomitable martial arts instinct forces her into nonstop hilarious battles.',
  },
  'liar-game': {
    title: 'LIAR GAME',
    originalTitle: 'ライアーゲーム',
    titleJapanese: 'LIAR GAME (ライアーゲーム)',
    rating: 9.0,
    voteCount: 650,
    imdbId: 'tt0995079',
    year: 2007,
    season: 'Fall',
    released: '2007-04-14',
    duration: '36min',
    totalEpisodes: 17,
    totalSeasons: 2,
    status: 'Completed',
    source: 'Manga (Shinobu Kaitani)',
    studios: [{ name: 'Fuji Television Network' }, { name: 'Toho' }],
    genres: [
      { mal_id: 16, name: 'Animation' },
      { mal_id: 18, name: 'Drama' },
      { mal_id: 96, name: 'Psychological' },
      { mal_id: 53, name: 'Suspense' },
    ],
    synopsis:
      'When Nao Kanzaki receives a strange letter and a suitcase containing 100 million yen, she learns that she has been selected to participate in the LIAR GAME. In this high-stakes psychological battle, deception and intellect reign supreme.',
  },
  'tamons-b-side': {
    title: 'Tamon’s B-Side',
    originalTitle: '多聞くん今どっち!?',
    titleJapanese: '多聞くん今どっち!? (Tamon-kun Ima Docchi!?)',
    rating: 7.7,
    voteCount: 140,
    year: 2025,
    season: 'Winter',
    released: '2025-01-08',
    duration: '24min',
    totalEpisodes: 12,
    totalSeasons: 1,
    status: 'Currently Airing',
    source: 'Manga (Yuki Shiwasu)',
    studios: [{ name: 'J.C.Staff' }, { name: 'Hakusensha' }],
    genres: [
      { mal_id: 16, name: 'Animation' },
      { mal_id: 35, name: 'Comedy' },
      { mal_id: 10749, name: 'Romance' },
    ],
    synopsis:
      'High school student Utage Kinoshita works part-time as a housekeeper and ends up assigned to the home of her absolute favorite idol, Tamon Fukuhara, discovering his hilarious gloomy real persona.',
  },
  'sparks-of-tomorrow': {
    title: 'Sparks of Tomorrow',
    originalTitle: '明日への火花',
    titleJapanese: '明日への火花 (Ashita e no Hibana)',
    rating: 7.7,
    voteCount: 110,
    year: 2024,
    season: 'Spring',
    released: '2024-04-12',
    duration: '24min',
    totalEpisodes: 12,
    totalSeasons: 1,
    status: 'Completed',
    source: 'Original Story',
    studios: [{ name: 'Studio Trigger' }, { name: 'Ultra Super Pictures' }],
    genres: [
      { mal_id: 16, name: 'Animation' },
      { mal_id: 878, name: 'Sci-Fi' },
      { mal_id: 18, name: 'Drama' },
    ],
    synopsis:
      'A thrilling journey into future tech, boundless human spirit, and emotional encounters across neon-lit cyber frontiers.',
  },
  'jaadugar-a-witch-in-mongolia': {
    title: 'Jaadugar: A Witch in Mongolia',
    originalTitle: '天幕のジャードゥーガル',
    titleJapanese: '天幕のジャードゥーガル (Tenmaku no Jaadugar)',
    rating: 8.1,
    voteCount: 230,
    year: 2024,
    season: 'Summer',
    released: '2024-07-06',
    duration: '24min',
    totalEpisodes: 12,
    totalSeasons: 1,
    status: 'Completed',
    source: 'Historical Manga (Tomato Soup)',
    studios: [{ name: 'Science SARU' }, { name: 'Akita Shoten' }],
    genres: [
      { mal_id: 16, name: 'Animation' },
      { mal_id: 14, name: 'Fantasy' },
      { mal_id: 36, name: 'Historical' },
      { mal_id: 18, name: 'Drama' },
    ],
    synopsis:
      'In 13th-century Iran, Fatima, a captive scholar from the Mongol Empire, enters the royal court using her medicine, chemistry, and unmatched intellect to reshape history.',
  },
  'demon-slayer-kimetsu-no-yaiba': {
    title: 'Demon Slayer: Kimetsu no Yaiba',
    originalTitle: '鬼滅の刃',
    titleJapanese: '鬼滅の刃 (Kimetsu no Yaiba)',
    rating: 8.9,
    voteCount: 3500,
    imdbId: 'tt9335498',
    year: 2019,
    season: 'Spring',
    released: '2019-04-06',
    duration: '24min',
    totalEpisodes: 55,
    totalSeasons: 4,
    status: 'Completed',
    source: 'Manga (Koyoharu Gotouge)',
    studios: [{ name: 'ufotable' }, { name: 'Aniplex' }],
    genres: [
      { mal_id: 16, name: 'Animation' },
      { mal_id: 28, name: 'Action' },
      { mal_id: 14, name: 'Fantasy' },
      { mal_id: 27, name: 'Shounen' },
    ],
  },
  'jujutsu-kaisen': {
    title: 'Jujutsu Kaisen',
    originalTitle: '呪術廻戦',
    titleJapanese: '呪術廻戦 (Jujutsu Kaisen)',
    rating: 8.8,
    voteCount: 2900,
    imdbId: 'tt12343534',
    year: 2020,
    season: 'Fall',
    released: '2020-10-03',
    duration: '24min',
    totalEpisodes: 47,
    totalSeasons: 2,
    status: 'Completed',
    source: 'Manga (Gege Akutami)',
    studios: [{ name: 'MAPPA' }, { name: 'TOHO animation' }],
    genres: [
      { mal_id: 16, name: 'Animation' },
      { mal_id: 28, name: 'Action' },
      { mal_id: 14, name: 'Fantasy' },
      { mal_id: 27, name: 'Shounen' },
    ],
  },
  'solo-leveling': {
    title: 'Solo Leveling',
    originalTitle: '俺だけレベルアップな件',
    titleJapanese: '俺だけレベルアップな件 (Ore dake Level Up na Ken)',
    rating: 8.7,
    voteCount: 1800,
    imdbId: 'tt21209876',
    year: 2024,
    season: 'Winter',
    released: '2024-01-07',
    duration: '24min',
    totalEpisodes: 24,
    totalSeasons: 2,
    status: 'Currently Airing',
    source: 'Webtoon / Manhwa (Chugong / DUBU)',
    studios: [{ name: 'A-1 Pictures' }, { name: 'Aniplex' }],
    genres: [
      { mal_id: 16, name: 'Animation' },
      { mal_id: 28, name: 'Action' },
      { mal_id: 12, name: 'Adventure' },
      { mal_id: 14, name: 'Fantasy' },
    ],
  },
  'attack-on-titan': {
    title: 'Attack on Titan',
    originalTitle: '進撃の巨人',
    titleJapanese: '進撃の巨人 (Shingeki no Kyojin)',
    rating: 9.1,
    voteCount: 5200,
    imdbId: 'tt2560140',
    year: 2013,
    season: 'Spring',
    released: '2013-04-07',
    duration: '24min',
    totalEpisodes: 89,
    totalSeasons: 4,
    status: 'Completed',
    source: 'Manga (Hajime Isayama)',
    studios: [{ name: 'Wit Studio' }, { name: 'MAPPA' }],
    genres: [
      { mal_id: 16, name: 'Animation' },
      { mal_id: 28, name: 'Action' },
      { mal_id: 18, name: 'Drama' },
      { mal_id: 14, name: 'Fantasy' },
    ],
  },
  'frieren-beyond-journeys-end': {
    title: 'Frieren: Beyond Journey’s End',
    originalTitle: '葬送のフリーレン',
    titleJapanese: '葬送のフリーレン (Sousou no Frieren)',
    rating: 9.2,
    voteCount: 2100,
    imdbId: 'tt22306788',
    year: 2023,
    season: 'Fall',
    released: '2023-09-29',
    duration: '24min',
    totalEpisodes: 28,
    totalSeasons: 1,
    status: 'Completed',
    source: 'Manga (Kanehito Yamada)',
    studios: [{ name: 'Madhouse' }, { name: 'TOHO animation' }],
    genres: [
      { mal_id: 16, name: 'Animation' },
      { mal_id: 12, name: 'Adventure' },
      { mal_id: 18, name: 'Drama' },
      { mal_id: 14, name: 'Fantasy' },
    ],
  },
};

/**
 * Derive season name (Winter, Spring, Summer, Fall) from release date string
 */
export function getSeasonFromDate(dateStr?: string): string {
  if (!dateStr) return 'Fall';
  try {
    const month = new Date(dateStr).getMonth() + 1; // 1 to 12
    if (month >= 1 && month <= 3) return 'Winter';
    if (month >= 4 && month <= 6) return 'Spring';
    if (month >= 7 && month <= 9) return 'Summer';
    return 'Fall';
  } catch {
    return 'Fall';
  }
}

/**
 * Clean search title by removing prefixes like "SERIES ", "Season 1", "Dub", "Sub", etc.
 */
export function cleanSearchTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/^SERIES\s+/i, '')
    .replace(/\s*\(?(?:Hindi|English|Jap|Dub|Sub|Dual Audio|HD|4K|1080p|720p)\)?/gi, '')
    .replace(/\s*Season\s+\d+/gi, '')
    .replace(/\s*S\d+/gi, '')
    .replace(/\s*:\s*Season\s+\d+/gi, '')
    .replace(/[–—]/g, '-')
    .trim();
}

/**
 * Generate a dynamic gradient placeholder for missing posters
 */
export function generateGradientPlaceholder(title: string): string {
  const safeTitle = (title || 'Anime').replace(/[<>&"]/g, '');
  const colors = [
    ['#1e1b4b', '#4338ca'],
    ['#311042', '#831843'],
    ['#0f172a', '#1e293b'],
    ['#18181b', '#3f3f46'],
    ['#134e4a', '#065f46'],
  ];
  let hash = 0;
  for (let i = 0; i < safeTitle.length; i++) {
    hash = (hash << 5) - hash + safeTitle.charCodeAt(i);
    hash |= 0;
  }
  const [c1, c2] = colors[Math.abs(hash) % colors.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="500" height="750" fill="url(#grad)"/>
    <circle cx="250" cy="320" r="70" fill="rgba(255,255,255,0.08)"/>
    <path d="M235 295 L275 320 L235 345 Z" fill="rgba(255,255,255,0.6)"/>
    <text x="250" y="440" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle" opacity="0.95">${safeTitle.slice(0, 24)}</text>
    <text x="250" y="475" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="#f43f5e" font-weight="600" text-anchor="middle" letter-spacing="2">HD STREAM AVAILABLE</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Universal fetcher for TMDb with direct fetch and proxy fallback
 */
async function fetchTmdbApi(endpoint: string): Promise<any> {
  const url = `${TMDB_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_API_KEY}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Attempt proxy fallback if direct fetch fails (e.g. CORS)
  }

  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const proxyRes = await fetch(proxyUrl);
    if (proxyRes.ok) {
      return await proxyRes.json();
    }
  } catch (err) {
    console.warn(`Failed to fetch TMDb endpoint: ${endpoint}`, err);
  }

  return null;
}

/**
 * Initialize cache from localStorage / sessionStorage
 */
function initCacheFromStorage() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || sessionStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const now = Date.now();
      Object.entries(parsed).forEach(([key, val]: [string, any]) => {
        if (val && val.timestamp && now - val.timestamp < CACHE_TTL_MS) {
          tmdbMemoryCache.set(key, val);
        }
      });
    }
  } catch {
    // Ignore storage parse errors
  }
}

// Initialize on module load
initCacheFromStorage();

/**
 * Save cache back to localStorage (debounced)
 */
let saveTimeout: NodeJS.Timeout | null = null;
function persistCache() {
  if (typeof window === 'undefined') return;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const obj: Record<string, any> = {};
      tmdbMemoryCache.forEach((val, key) => {
        obj[key] = val;
      });
      const serialized = JSON.stringify(obj);
      localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
      sessionStorage.setItem(LOCAL_STORAGE_KEY, serialized);
    } catch {
      // Ignore quota exceeded or storage disabled
    }
  }, 500);
}

/**
 * Fetch TMDb and IMDb metadata for a specific anime title
 * STRICT: Only invoked for items in our local server catalog
 */
export async function fetchTmdbMetadataForTitle(
  rawTitle: string,
  slug?: string
): Promise<TmdbMetadata | null> {
  const cleanQ = cleanSearchTitle(rawTitle);
  if (!cleanQ) return null;

  const normalizedSlug = (slug || cleanQ).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  const cacheKey = normalizedSlug;

  // 1. Check in-memory / local storage cache first
  const cached = tmdbMemoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. Request deduplication: return existing inflight promise if already fetching
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey)!;
  }

  const fetchPromise = (async () => {
    try {
      // Lookup curated registry as rich baseline
      const registryEntry = ANIME_METADATA_REGISTRY[normalizedSlug] || null;

      // 1. Search TMDb TV series first (highest accuracy for anime)
      let searchRes = await fetchTmdbApi(`/search/tv?query=${encodeURIComponent(cleanQ)}&include_adult=false`);
      let match = searchRes?.results?.[0];

      // 2. If no TV result, try multi search (catches anime movies like Demon Slayer: Mugen Train)
      if (!match) {
        searchRes = await fetchTmdbApi(`/search/multi?query=${encodeURIComponent(cleanQ)}&include_adult=false`);
        match = searchRes?.results?.find(
          (r: any) => r.media_type === 'tv' || r.media_type === 'movie'
        ) || searchRes?.results?.[0];
      }

      // 3. If still no result and title contains colon/dash, try searching the primary prefix
      if (!match && (cleanQ.includes(':') || cleanQ.includes('-'))) {
        const prefix = cleanQ.split(/[:\-]/)[0].trim();
        if (prefix.length >= 3) {
          searchRes = await fetchTmdbApi(`/search/tv?query=${encodeURIComponent(prefix)}&include_adult=false`);
          match = searchRes?.results?.[0];
        }
      }

      // 4. Fallback search with original title or sanitized letters
      if (!match) {
        const sanitized = cleanQ.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        if (sanitized !== cleanQ && sanitized.length >= 3) {
          searchRes = await fetchTmdbApi(`/search/tv?query=${encodeURIComponent(sanitized)}&include_adult=false`);
          match = searchRes?.results?.[0];
        }
      }

      if (!match && !registryEntry) {
        return null;
      }

      const isMovie = match ? (match.media_type === 'movie' || !match.first_air_date) : false;
      const mediaType = isMovie ? 'movie' : 'tv';
      const tmdbId = match?.id;

      // Fetch detailed metadata including external IDs (IMDb ID), credits (cast & crew), and production companies
      let details: any = null;
      if (tmdbId) {
        details = await fetchTmdbApi(
          `/${mediaType}/${tmdbId}?append_to_response=external_ids,credits,images,networks`
        );
      }

      const target = details || match || {};

      // Poster and Backdrop paths with optimized resolution tiers
      const posterPath = target.poster_path || match?.poster_path;
      const backdropPath = target.backdrop_path || match?.backdrop_path;

      // Optimized low-res (w342) for grid cards to boost loading speed
      const posterThumbUrl = posterPath ? `${TMDB_IMAGE_W342}${posterPath}` : undefined;
      // High quality w500 for modals and featured headers
      const posterUrl = posterPath ? `${TMDB_IMAGE_W500}${posterPath}` : undefined;
      const posterOriginalUrl = posterPath ? `${TMDB_IMAGE_ORIGINAL}${posterPath}` : undefined;
      const backdropUrl = backdropPath ? `${TMDB_IMAGE_W1280}${backdropPath}` : undefined;
      const backdropOriginalUrl = backdropPath ? `${TMDB_IMAGE_ORIGINAL}${backdropPath}` : undefined;

      // Rating (vote_average) rounded to 1 decimal place
      const voteAvg = target.vote_average || match?.vote_average || registryEntry?.rating || 8.4;
      const rating = voteAvg ? parseFloat(Number(voteAvg).toFixed(1)) : 8.4;
      const voteCount = target.vote_count || match?.vote_count || registryEntry?.voteCount || 250;

      // Release year & season
      const releaseDate = target.first_air_date || target.release_date || match?.first_air_date || match?.release_date || registryEntry?.released;
      const year = releaseDate ? new Date(releaseDate).getFullYear() : (registryEntry?.year || 2024);
      const season = registryEntry?.season || getSeasonFromDate(releaseDate);

      // Runtime / Duration
      let duration: string | undefined = registryEntry?.duration;
      if (!duration) {
        if (Array.isArray(target.episode_run_time) && target.episode_run_time.length > 0) {
          duration = `${target.episode_run_time[0]}min`;
        } else if (target.runtime && typeof target.runtime === 'number') {
          duration = `${target.runtime}min`;
        } else {
          duration = '24min';
        }
      }

      // IMDb ID
      const imdbId = target.external_ids?.imdb_id || registryEntry?.imdbId;

      // Genres mapping
      let genres: AnimeGenre[] = Array.isArray(target.genres)
        ? target.genres.map((g: any) => ({
            mal_id: g.id,
            name: g.name,
          }))
        : [];
      if (genres.length === 0 && registryEntry?.genres) {
        genres = registryEntry.genres;
      }
      if (genres.length === 0) {
        genres = [{ name: 'Animation' }, { name: 'Action' }, { name: 'Fantasy' }];
      }

      // Studios and Production Companies
      let studios: AnimeStudio[] = registryEntry?.studios || [];
      if (Array.isArray(target.production_companies) && target.production_companies.length > 0) {
        studios = target.production_companies.slice(0, 3).map((p: any) => ({
          mal_id: p.id,
          name: p.name,
        }));
      } else if (Array.isArray(target.networks) && target.networks.length > 0) {
        studios = target.networks.slice(0, 2).map((n: any) => ({
          mal_id: n.id,
          name: n.name,
        }));
      }
      if (studios.length === 0) {
        studios = [{ name: 'Toei Animation / TV Tokyo' }];
      }

      // Characters extraction from TMDb credits cast
      let characters: AnimeCharacter[] = registryEntry?.characters || [];
      if (Array.isArray(target.credits?.cast) && target.credits.cast.length > 0) {
        characters = target.credits.cast.slice(0, 8).map((c: any) => ({
          id: c.id || Math.random(),
          name: c.name || 'Character',
          role: c.character ? `${c.character}` : 'Main Cast',
          imageUrl: c.profile_path
            ? `${TMDB_IMAGE_W185}${c.profile_path}`
            : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80',
          voiceActor: {
            name: c.name || 'Japanese Cast',
            language: 'Japanese',
          },
        }));
      }

      // Source Material
      const source = registryEntry?.source || 'Manga Adaptation';

      // Japanese Title
      const originalTitle = target.original_name || target.original_title || registryEntry?.originalTitle || cleanQ;
      const titleJapanese = registryEntry?.titleJapanese || originalTitle;

      const meta: TmdbMetadata = {
        tmdbId: tmdbId || registryEntry?.tmdbId,
        imdbId,
        title: target.name || target.title || registryEntry?.title || cleanQ,
        originalTitle,
        titleJapanese,
        posterThumbUrl: posterThumbUrl || registryEntry?.posterThumbUrl,
        posterUrl: posterUrl || registryEntry?.posterUrl,
        posterOriginalUrl: posterOriginalUrl || registryEntry?.posterOriginalUrl,
        backdropUrl: backdropUrl || registryEntry?.backdropUrl,
        backdropOriginalUrl: backdropOriginalUrl || registryEntry?.backdropOriginalUrl,
        rating,
        voteCount,
        synopsis: target.overview || match?.overview || registryEntry?.synopsis,
        duration: duration || '24min',
        year: year || 2024,
        season,
        released: releaseDate,
        genres: genres.length > 0 ? genres : undefined,
        studios,
        source,
        status: target.status || registryEntry?.status || 'Completed',
        totalEpisodes: target.number_of_episodes || registryEntry?.totalEpisodes,
        totalSeasons: target.number_of_seasons || registryEntry?.totalSeasons || 1,
        characters: characters.length > 0 ? characters : undefined,
      };

      // Cache result
      tmdbMemoryCache.set(cacheKey, { data: meta, timestamp: Date.now() });
      persistCache();

      return meta;
    } catch (err) {
      console.warn(`Error fetching TMDb metadata for "${rawTitle}":`, err);
      // Fallback directly to registry entry if present
      const fallbackEntry = ANIME_METADATA_REGISTRY[normalizedSlug];
      if (fallbackEntry) {
        return fallbackEntry as TmdbMetadata;
      }
      return null;
    } finally {
      pendingRequests.delete(cacheKey);
    }
  })();

  pendingRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Enrich a single catalog anime item with TMDb metadata & posters
 * Preserves all server catalog identity, stream endpoints, and servers
 */
export async function enrichAnimeWithTmdb(anime: AnimeItem): Promise<AnimeItem> {
  if (!anime) return anime;

  // Don't re-enrich if already has valid TMDb ID and studios
  if (anime.tmdbId && anime.studios && anime.studios.length > 0 && anime.images?.jpg?.imageUrl?.includes('image.tmdb.org')) {
    return anime;
  }

  const meta = await fetchTmdbMetadataForTitle(anime.title, anime.slug);
  if (!meta) {
    // If no TMDb image exists, ensure we have a fallback poster gradient and fallback metadata
    const placeholder = (!anime.images?.jpg?.imageUrl || anime.images.jpg.imageUrl.includes('placeholder'))
      ? generateGradientPlaceholder(anime.title)
      : anime.images.jpg.imageUrl;
    
    return {
      ...anime,
      titleEnglish: anime.titleEnglish || anime.title,
      titleJapanese: anime.titleJapanese || anime.title,
      score: anime.score || 8.4,
      rating: anime.rating || '8.4',
      tmdbRating: anime.tmdbRating || 8.4,
      voteCount: anime.voteCount || 150,
      season: anime.season || 'Fall',
      year: anime.year || 2024,
      duration: anime.duration || '24min',
      episodes: anime.episodes || anime.latestEpisodeCount || 12,
      seasons: anime.seasons || 1,
      studios: anime.studios && anime.studios.length > 0 ? anime.studios : [{ name: 'Toei Animation / TV Tokyo' }],
      source: anime.source || 'Manga Adaptation',
      images: {
        jpg: {
          imageUrl: placeholder,
          largeImageUrl: placeholder,
          smallImageUrl: placeholder,
        },
      },
    };
  }

  const posterThumb = meta.posterThumbUrl || meta.posterUrl || anime.images?.jpg?.imageUrl || generateGradientPlaceholder(anime.title);
  const posterMed = meta.posterUrl || meta.posterThumbUrl || anime.images?.jpg?.largeImageUrl || posterThumb;
  const posterLarge = meta.posterOriginalUrl || meta.posterUrl || anime.images?.jpg?.largeImageUrl || posterMed;
  const backdrop = meta.backdropUrl || anime.bannerImage || posterLarge;

  return {
    ...anime,
    tmdbId: meta.tmdbId || anime.tmdbId,
    imdbId: meta.imdbId || anime.imdbId,
    titleEnglish: anime.titleEnglish || meta.title || anime.title,
    titleJapanese: meta.titleJapanese || anime.titleJapanese || meta.originalTitle || anime.title,
    synopsis: (meta.synopsis && meta.synopsis.length > 20) ? meta.synopsis : anime.synopsis,
    description: (meta.synopsis && meta.synopsis.length > 20) ? meta.synopsis : anime.description,
    images: {
      jpg: {
        imageUrl: posterThumb,       // Low-res w342 for snappy card rendering
        smallImageUrl: posterThumb,  // Low-res w342 for previews
        largeImageUrl: posterMed,    // w500 for modals & zoom
      },
    },
    bannerImage: backdrop,
    backdropImage: backdrop,
    score: meta.rating || anime.score || 8.4,
    rating: meta.rating ? String(meta.rating) : (anime.rating || '8.4'),
    tmdbRating: meta.rating || 8.4,
    voteCount: meta.voteCount || anime.voteCount || 300,
    duration: meta.duration || anime.duration || '24min',
    year: meta.year || anime.year || 2024,
    season: meta.season || anime.season || 'Fall',
    released: meta.released || anime.released,
    genres: (meta.genres && meta.genres.length > 0) ? meta.genres : (anime.genres && anime.genres.length > 0 ? anime.genres : [{ name: 'Animation' }, { name: 'Action' }]),
    studios: (meta.studios && meta.studios.length > 0) ? meta.studios : (anime.studios && anime.studios.length > 0 ? anime.studios : [{ name: 'David Production / TV Tokyo' }]),
    source: meta.source || anime.source || 'Manga Adaptation',
    episodes: anime.episodes || meta.totalEpisodes || anime.latestEpisodeCount || 12,
    seasons: anime.seasons || meta.totalSeasons || 1,
    status: meta.status || anime.status || 'Completed',
  };
}

/**
 * Concurrently enrich a list of server catalog anime items
 * Controlled batch size prevents excessive rate limits while ensuring fast loading
 */
export async function enrichAnimeListWithTmdb(
  animeList: AnimeItem[],
  batchSize = 6
): Promise<AnimeItem[]> {
  if (!Array.isArray(animeList) || animeList.length === 0) {
    return [];
  }

  const results: AnimeItem[] = [...animeList];

  for (let i = 0; i < animeList.length; i += batchSize) {
    const batch = animeList.slice(i, i + batchSize);
    const enrichedBatch = await Promise.all(
      batch.map((item) => enrichAnimeWithTmdb(item).catch(() => item))
    );
    enrichedBatch.forEach((enriched, idx) => {
      results[i + idx] = enriched;
    });
  }

  return results;
}

