import React, { useState, useEffect } from 'react';
import { Server, Lock, Radio, Flame } from 'lucide-react';
import { ServerManagementConfig } from '../types/admin';
import { getAdminState, subscribeToAdminState } from '../services/adminStore';

interface MaintenanceOverlayProps {
  config?: ServerManagementConfig;
  onOpenAdminAuth?: () => void;
  onUnlock?: () => void;
}

export const MaintenanceOverlay: React.FC<MaintenanceOverlayProps> = ({
  config: propConfig,
  onOpenAdminAuth,
  onUnlock,
}) => {
  const [adminServersConfig, setAdminServersConfig] = useState<ServerManagementConfig>(() => {
    return propConfig || getAdminState().servers;
  });

  useEffect(() => {
    if (propConfig) {
      setAdminServersConfig(propConfig);
      return;
    }
    const unsub = subscribeToAdminState((state) => {
      setAdminServersConfig(state.servers);
    });
    return unsub;
  }, [propConfig]);

  const activeConfig = propConfig || adminServersConfig;

  // If maintenance mode is not active, do not render overlay
  if (!activeConfig || !activeConfig.maintenanceMode) {
    return null;
  }

  const handleUnlock = onUnlock || onOpenAdminAuth || (() => {});
  const serverList = activeConfig.servers || [];

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none animate-fadeIn overflow-y-auto">
      {/* Background Cyberpunk Grid & Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-900/20 via-neutral-950 to-black pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Animated Icon */}
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 blur-xl opacity-40 animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-neutral-950 border border-neutral-700 flex items-center justify-center text-rose-500 shadow-xl">
            <Flame className="w-9 h-9 fill-current" />
          </div>
        </div>

        {/* Heading & Notice */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono font-bold mb-3 uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse text-rose-500" />
            <span>Site Under Maintenance</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            AnizenX Core Upgrade in Progress
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-2 leading-relaxed">
            {activeConfig.maintenanceNotice ||
              'We are upgrading stream servers and database engines. AnizenX will be back online shortly!'}
          </p>
        </div>

        {/* Live Server Status Table */}
        {serverList.length > 0 && (
          <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 text-left space-y-2.5 text-xs font-mono">
            <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider flex justify-between">
              <span>Cluster Node</span>
              <span>Status</span>
            </div>

            {serverList.map((srv) => (
              <div key={srv.id} className="flex items-center justify-between py-1 border-t border-neutral-850">
                <div className="flex items-center gap-2 truncate">
                  <Server className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span className="text-neutral-300 truncate">{srv.name.split('(')[0]}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    srv.status === 'online'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : srv.status === 'degraded'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {srv.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Admin Bypass Button */}
        <div className="pt-2 flex flex-col items-center gap-2">
          <button
            onClick={handleUnlock}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-bold transition-all cursor-pointer shadow-md group"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
            <span>Admin God-Mode Access</span>
          </button>
          <span className="text-[10px] text-neutral-500 font-mono">
            Default Passcode: 1234
          </span>
        </div>
      </div>
    </div>
  );
};
