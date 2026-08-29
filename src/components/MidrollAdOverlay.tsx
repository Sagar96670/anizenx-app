import React from 'react';
import { MidrollAdConfig } from '../types/admin';
import { BaseVastAdPlayer } from './BaseVastAdPlayer';

interface MidrollAdOverlayProps {
  config: MidrollAdConfig;
  onAdCompleted: () => void;
  onOpenVipModal: () => void;
}

export const MidrollAdOverlay: React.FC<MidrollAdOverlayProps> = ({
  config,
  onAdCompleted,
  onOpenVipModal,
}) => {
  return (
    <BaseVastAdPlayer
      config={config}
      adTypeLabel="Mid-Roll Ad Break"
      badgeBgColor="bg-purple-500/20 text-purple-400"
      onAdCompleted={onAdCompleted}
      onOpenVipModal={onOpenVipModal}
    />
  );
};
