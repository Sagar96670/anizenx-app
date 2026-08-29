export type { ApiProviderConfig } from '../types/anime';
import { ApiProviderConfig } from '../types/anime';

const STORAGE_KEY_ACTIVE_PROVIDER = 'animestream_active_provider';
const STORAGE_KEY_CUSTOM_CONFIGS = 'animestream_custom_api_configs';

export const BACKEND_BASE_URL = 'https://animex-nu.vercel.app';

export const DEFAULT_PROVIDERS: ApiProviderConfig[] = [
  {
    id: 'anime_x_render',
    name: 'Anime-X Backend (Live Vercel)',
    description: 'Direct live connection to your backend (https://animex-nu.vercel.app) with 240+ anime, real-time streams, views tracking & admin sync.',
    baseUrl: 'https://animex-nu.vercel.app',
    requiresKey: false,
    status: 'connected',
  },
  {
    id: 'jikan_v4',
    name: 'Jikan API v4 (MyAnimeList)',
    description: 'Public MAL anime database fallback.',
    baseUrl: 'https://api.jikan.moe/v4',
    requiresKey: false,
    status: 'idle',
  },
  {
    id: 'kitsu',
    name: 'Kitsu API',
    description: 'Fast anime database and community recommendations.',
    baseUrl: 'https://kitsu.io/api/edge',
    requiresKey: false,
    status: 'idle',
  },
  {
    id: 'custom_user_api',
    name: 'Custom Endpoint URL',
    description: 'Connect any alternative custom anime API endpoint.',
    baseUrl: '',
    requiresKey: false,
    isCustom: true,
    status: 'idle',
  }
];

export function getSavedProviders(): ApiProviderConfig[] {
  try {
    const customData = localStorage.getItem(STORAGE_KEY_CUSTOM_CONFIGS);
    if (customData) {
      const parsed: ApiProviderConfig[] = JSON.parse(customData);
      // Migrate any legacy onrender URLs in storage to the new Vercel domain
      parsed.forEach((p) => {
        if (p.baseUrl && p.baseUrl.includes('anime-x-rdtd.onrender.com')) {
          p.baseUrl = 'https://animex-nu.vercel.app';
          p.description = 'Direct live connection to your backend (https://animex-nu.vercel.app) with 240+ anime, real-time streams, views tracking & admin sync.';
          p.name = 'Anime-X Backend (Live Vercel)';
        }
      });
      // Ensure anime_x_render is present at index 0
      if (!parsed.some(p => p.id === 'anime_x_render')) {
        parsed.unshift(DEFAULT_PROVIDERS[0]);
      } else {
        const idx = parsed.findIndex(p => p.id === 'anime_x_render');
        if (idx >= 0 && parsed[idx].baseUrl !== 'https://animex-nu.vercel.app') {
          parsed[idx].baseUrl = 'https://animex-nu.vercel.app';
        }
      }
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to load saved API configs', e);
  }
  return DEFAULT_PROVIDERS;
}

export function saveProviders(providers: ApiProviderConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_CONFIGS, JSON.stringify(providers));
  } catch (e) {
    console.error('Failed to save API configs', e);
  }
}

export function getActiveProvider(): ApiProviderConfig {
  const providers = getSavedProviders();
  const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_PROVIDER) || 'anime_x_render';
  const found = providers.find((p) => p.id === activeId);
  return found || providers[0] || DEFAULT_PROVIDERS[0];
}

export function setActiveProviderId(providerId: string): void {
  localStorage.setItem(STORAGE_KEY_ACTIVE_PROVIDER, providerId);
}

export function updateProviderConfig(updated: ApiProviderConfig): void {
  const providers = getSavedProviders();
  const index = providers.findIndex((p) => p.id === updated.id);
  if (index >= 0) {
    providers[index] = updated;
  } else {
    providers.push(updated);
  }
  saveProviders(providers);
}

/**
 * Tests connection to an API baseUrl
 */
export async function testApiConnection(baseUrl: string, apiKey?: string): Promise<{ success: boolean; latencyMs: number; error?: string; sampleData?: any }> {
  if (!baseUrl || !baseUrl.trim()) {
    return { success: false, latencyMs: 0, error: 'URL cannot be empty' };
  }

  const cleanUrl = baseUrl.trim().replace(/\/+$/, '');
  const startTime = performance.now();

  try {
    let pingUrl = cleanUrl;
    if (cleanUrl.includes('animex-nu.vercel.app') || cleanUrl.includes('anime-x-rdtd.onrender.com') || cleanUrl.endsWith('/api') || !cleanUrl.includes('/api/')) {
      pingUrl = `${cleanUrl}/api/home`;
    } else if (cleanUrl.includes('jikan.moe')) {
      pingUrl = `${cleanUrl}/top/anime?limit=1`;
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch(pingUrl, { headers });
    const latencyMs = Math.round(performance.now() - startTime);

    if (response.ok) {
      const data = await response.json().catch(() => ({ status: 'ok' }));
      return {
        success: true,
        latencyMs,
        sampleData: data,
      };
    } else {
      return {
        success: false,
        latencyMs,
        error: `Server responded with HTTP ${response.status}: ${response.statusText}`,
      };
    }
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      success: false,
      latencyMs,
      error: err?.message || 'Network request failed (Check URL or CORS permissions)',
    };
  }
}
