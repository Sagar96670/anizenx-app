import React from 'react';
import { PrerollAdConfig } from '../types/admin';
import { BaseVastAdPlayer } from './BaseVastAdPlayer';

interface PrerollAdOverlayProps {
  config: PrerollAdConfig;
  onAdCompleted: () => void;
  onOpenVipModal: () => void;
}

export const PrerollAdOverlay: React.FC<PrerollAdOverlayProps> = ({
  config,
  onAdCompleted,
  onOpenVipModal,
}) => {
  return (
    <BaseVastAdPlayer
      config={config}
      adTypeLabel="Sponsored Ad"
      badgeBgColor="bg-amber-500/20 text-amber-400"
      onAdCompleted={onAdCompleted}
      onOpenVipModal={onOpenVipModal}
    />
  );
};
