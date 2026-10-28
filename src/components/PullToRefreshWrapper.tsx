import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  pullProgress: number;
}

export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  pullDistance,
  isRefreshing,
  pullProgress,
}) => {
  if (pullDistance <= 0 && !isRefreshing) return null;

  const translateY = isRefreshing ? 16 : Math.min(56, Math.max(4, pullDistance * 0.7));

  return (
    <div
      aria-hidden="true"
      className="no-print fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-transform duration-150 ease-out"
      style={{
        transform: `translate3d(-50%, ${translateY}px, 0)`,
      }}
    >
      <div
        className="w-9 h-9 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-sky-700"
        style={{
          opacity: isRefreshing ? 1 : Math.min(1, pullProgress * 1.25),
          transform: isRefreshing
            ? 'scale(1)'
            : `scale(${0.65 + pullProgress * 0.35}) rotate(${pullProgress * 280}deg)`,
        }}
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      </div>
    </div>
  );
};
