import React, { useState, useEffect } from 'react';
import {
  Server,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Link,
  Key,
  Database,
  ExternalLink,
  HelpCircle,
  X,
  Radio,
  Zap,
  Flame,
} from 'lucide-react';
import { ApiProviderConfig } from '../types/anime';
import {
  DEFAULT_PROVIDERS,
  getActiveProvider,
  getSavedProviders,
  saveProviders,
  setActiveProviderId,
  testApiConnection,
  BACKEND_BASE_URL,
} from '../services/apiConfig';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProviderChanged: (provider: ApiProviderConfig) => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  onProviderChanged,
}) => {
  const [providers, setProviders] = useState<ApiProviderConfig[]>([]);
  const [activeId, setActiveId] = useState<string>('anime_x_render');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [customKey, setCustomKey] = useState<string>('');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    latencyMs?: number;
    error?: string;
    sampleData?: any;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const currentProviders = getSavedProviders();
      setProviders(currentProviders);
      const active = getActiveProvider();
      setActiveId(active.id);
      const customConfig = currentProviders.find((p) => p.isCustom);
      if (customConfig) {
        setCustomUrl(customConfig.baseUrl || '');
        setCustomKey(customConfig.apiKey || '');
      }
      setTestResult(null);
      setSuccessMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async (urlToTest: string, keyToTest?: string) => {
    setIsTesting(true);
    setTestResult(null);
    setSuccessMessage('');

    const res = await testApiConnection(urlToTest, keyToTest);
    setIsTesting(false);
    setTestResult(res);
  };

  const handleSaveAndApply = () => {
    const updated = [...providers];
    let customIndex = updated.findIndex((p) => p.isCustom);

    if (customIndex >= 0) {
      updated[customIndex] = {
        ...updated[customIndex],
        baseUrl: customUrl.trim(),
        apiKey: customKey.trim() || undefined,
        status: testResult?.success ? 'connected' : 'idle',
      };
    } else {
      updated.push({
        id: 'custom_user_api',
        name: 'Custom Anime API URL',
        description: 'User provided custom anime API endpoint',
        baseUrl: customUrl.trim(),
        apiKey: customKey.trim() || undefined,
        requiresKey: !!customKey.trim(),
        isCustom: true,
        status: testResult?.success ? 'connected' : 'idle',
      });
    }

    saveProviders(updated);
    setProviders(updated);
    setActiveProviderId(activeId);

    const activeProvider = updated.find((p) => p.id === activeId) || updated[0];
    onProviderChanged(activeProvider);
    setSuccessMessage('Backend API configuration saved and active!');

    setTimeout(() => {
      onClose();
    }, 1000);
  };

  const handleSelectProvider = (providerId: string) => {
    setActiveId(providerId);
    setTestResult(null);
    setSuccessMessage('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Anime API Connection Center
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  Live
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Connected to custom anime backend live at {BACKEND_BASE_URL}
              </p>
            </div>
          </div>
          <button
            id="close-api-modal-btn"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Active Backend Status Banner */}
          <div className="p-4 bg-gradient-to-r from-rose-950/40 via-neutral-900 to-amber-950/30 border border-rose-500/30 rounded-xl flex items-start gap-3">
            <Flame className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-300 space-y-1">
              <p className="font-semibold text-rose-300">
                Live Anime Backend Active (240+ Anime Titles & Streams)
              </p>
              <p className="text-neutral-400 leading-relaxed font-mono text-[11px]">
                Endpoint: {BACKEND_BASE_URL} (/api/home, /api/anime/:slug, /api/streams/:slug, /api/trending, /api/search, /admin/api/*)
              </p>
            </div>
          </div>

          {/* Provider Selection Options */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Select API Provider / Endpoint Source
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {providers.map((p) => {
                const isSelected = activeId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProvider(p.id)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all relative ${
                      isSelected
                        ? 'border-rose-500 bg-rose-950/20 shadow-md shadow-rose-950/40 ring-1 ring-rose-500'
                        : 'border-neutral-800 bg-neutral-800/40 hover:bg-neutral-800/70 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            isSelected ? 'bg-rose-500 animate-pulse' : 'bg-neutral-600'
                          }`}
                        />
                        <h3 className="font-semibold text-sm text-white">{p.name}</h3>
                      </div>
                      {p.id === 'anime_x_render' && (
                        <span className="text-[10px] uppercase font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                      {p.isCustom && (
                        <span className="text-[10px] uppercase font-bold bg-neutral-700 text-neutral-300 px-1.5 py-0.5 rounded">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed line-clamp-2">
                      {p.description}
                    </p>
                    {p.baseUrl && (
                      <p className="text-[11px] text-neutral-500 mt-2 font-mono truncate">
                        {p.baseUrl}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom API Configuration Input */}
          {(activeId === 'custom_user_api') && (
            <div className="p-4 bg-neutral-800/50 border border-neutral-700/60 rounded-xl space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-300">
                <Link className="w-4 h-4" />
                <span>Custom API Endpoint Configuration</span>
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1.5 font-medium">
                  API Base URL / Endpoint Link
                </label>
                <div className="relative">
                  <input
                    id="custom-api-url-input"
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="e.g. https://animex-nu.vercel.app"
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1.5 font-medium">
                  API Key or Bearer Token (Optional)
                </label>
                <div className="relative">
                  <input
                    id="custom-api-key-input"
                    type="password"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    placeholder="Enter API key if required"
                    className="w-full px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-1 flex items-center gap-3">
                <button
                  id="test-custom-api-btn"
                  type="button"
                  disabled={isTesting || !customUrl.trim()}
                  onClick={() => handleTestConnection(customUrl, customKey)}
                  className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Testing Ping...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Test Connection
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* If Default Provider selected, offer Ping button */}
          {activeId !== 'custom_user_api' && (
            <div className="flex items-center justify-between p-3 bg-neutral-800/40 border border-neutral-700/50 rounded-xl">
              <div className="text-xs text-neutral-300">
                <span className="font-semibold text-white">Active Endpoint: </span>
                <span className="font-mono text-neutral-400">
                  {providers.find((p) => p.id === activeId)?.baseUrl}
                </span>
              </div>
              <button
                id="ping-default-api-btn"
                type="button"
                disabled={isTesting}
                onClick={() => {
                  const p = providers.find((pr) => pr.id === activeId);
                  if (p) handleTestConnection(p.baseUrl, p.apiKey);
                }}
                className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-xs font-medium rounded-lg text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {isTesting ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Radio className="w-3 h-3 text-emerald-400" />
                )}
                Check Live Ping
              </button>
            </div>
          )}

          {/* Test Results Display */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 animate-fadeIn ${
                testResult.success
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>
                    {testResult.success
                      ? 'Connection Successful! (Live Anime Backend Active & Responding)'
                      : 'Connection Failed'}
                  </span>
                </div>
                {testResult.latencyMs !== undefined && (
                  <span className="px-2 py-0.5 bg-neutral-900/60 rounded text-[11px] font-mono">
                    {testResult.latencyMs}ms
                  </span>
                )}
              </div>

              {testResult.error && (
                <p className="text-neutral-300 font-mono text-[11px] bg-neutral-950/70 p-2.5 rounded border border-rose-900/50">
                  {testResult.error}
                </p>
              )}

              {testResult.sampleData && (
                <details className="mt-2 text-[11px]">
                  <summary className="cursor-pointer text-emerald-400 hover:underline">
                    View Live JSON Response Sample ({Array.isArray(testResult.sampleData.results) ? `${testResult.sampleData.results.length} items` : 'Response'})
                  </summary>
                  <pre className="mt-2 p-2 bg-neutral-950 rounded border border-neutral-800 text-neutral-400 font-mono max-h-32 overflow-y-auto">
                    {JSON.stringify(testResult.sampleData, null, 2).slice(0, 500)}...
                  </pre>
                </details>
              )}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {successMessage}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-between sticky bottom-0">
          <button
            id="reset-api-btn"
            type="button"
            onClick={() => {
              saveProviders(DEFAULT_PROVIDERS);
              setProviders(DEFAULT_PROVIDERS);
              setActiveId('anime_x_render');
              setActiveProviderId('anime_x_render');
              onProviderChanged(DEFAULT_PROVIDERS[0]);
              setSuccessMessage('Reset to Anime-X Live Backend');
            }}
            className="text-xs text-neutral-400 hover:text-neutral-200 underline cursor-pointer"
          >
            Reset to Anime-X Render Backend
          </button>

          <div className="flex items-center gap-3">
            <button
              id="cancel-api-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-api-btn"
              type="button"
              onClick={handleSaveAndApply}
              className="px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save & Connect API
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
