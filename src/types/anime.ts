export interface AnimeImage {
  imageUrl: string;
  largeImageUrl?: string;
  smallImageUrl?: string;
}

export interface AnimeGenre {
  mal_id?: number;
  name: string;
  count?: number;
}

export interface AnimeStudio {
  mal_id?: number;
  name: string;
}

export interface AnimeTrailer {
  youtubeId?: string;
  url?: string;
  embedUrl?: string;
}

export interface StreamEpisode {
  episode: number;
  season: number;
  type: string;
  url: string;
}

export interface StreamServer {
  name: string;
  type: string;
  episodes: StreamEpisode[];
}

export interface AnimeStreamsResponse {
  success: boolean;
  animeSlug: string;
  cached?: boolean;
  serverCount?: number;
  servers: StreamServer[];
}

export interface AnimeItem {
  id: string | number;
  slug?: string;
  title: string;
  titleEnglish?: string;
  titleJapanese?: string;
  synopsis?: string;
  description?: string;
  images: {
    jpg: AnimeImage;
    webp?: AnimeImage;
  };
  bannerImage?: string;
  trailer?: AnimeTrailer;
  score?: number;
  scoredBy?: number;
  rank?: number;
  popularity?: number;
  episodes?: number;
  seasons?: number;
  status?: string;
  airedString?: string;
  year?: number;
  season?: string;
  type?: string; // Series, TV, Movie, OVA, Special
  duration?: string;
  rating?: string; // PG-13, R-17+, 9, 8.2 etc.
  quality?: string; // 480p, 720p, 1080p
  released?: string;
  genres: AnimeGenre[];
  studios?: AnimeStudio[];
  source?: string;
  link?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  latestEpisodeCount?: number;
  views?: number;
  trendingScore?: number;
  audio?: string[];
  languages?: string[];
  streamServers?: StreamServer[];
  imdbId?: string;
  tmdbId?: number;
  backdropImage?: string;
  voteCount?: number;
  tmdbRating?: number;
}

export interface AnimeEpisode {
  id: string | number;
  number: number;
  season?: number;
  title: string;
  titleJapanese?: string;
  aired?: string;
  score?: number;
  filler?: boolean;
  recap?: boolean;
  videoUrl?: string;
  streamUrl?: string;
  serverName?: string;
}

export interface AnimeCharacter {
  id: string | number;
  name: string;
  role: string;
  imageUrl: string;
  voiceActor?: {
    name: string;
    language: string;
    imageUrl?: string;
  };
}

export interface AnimeReview {
  id: string;
  username: string;
  userAvatar?: string;
  score: number;
  date: string;
  review: string;
  tags?: string[];
}

export interface WatchlistEntry {
  anime: AnimeItem;
  status: 'watching' | 'plan_to_watch' | 'completed' | 'on_hold' | 'dropped';
  watchedEpisodes: number;
  userRating?: number;
  updatedAt: string;
  notes?: string;
}

export interface ApiProviderConfig {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  requiresKey: boolean;
  apiKey?: string;
  customHeaders?: Record<string, string>;
  isCustom?: boolean;
  status: 'connected' | 'testing' | 'error' | 'idle';
  lastPingMs?: number;
}

export interface BackendPublicSettings {
  telegramLink?: string;
  ads?: {
    enabled?: boolean;
    provider?: string;
    homeAdCode?: string;
    animeAdCode?: string;
    episodeAdCode?: string;
  };
}

export interface AdminDashboardData {
  success: boolean;
  totalCatalogCount?: number;
  totalViews?: number;
  trendingCount?: number;
  settings?: BackendPublicSettings;
  catalog?: AnimeItem[];
  message?: string;
}
