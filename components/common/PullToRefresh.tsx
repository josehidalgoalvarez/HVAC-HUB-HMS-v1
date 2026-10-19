import React, { useState, useRef, useEffect, useCallback } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  className = '',
  disabled = false,
}) => {
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const threshold = 65;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || containerRef.current?.scrollTop || 0;
    if (scrollTop <= 2) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || disabled || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Apply rubber-banding resistance curve
      const resistance = Math.min(diff * 0.45, 90);
      setPullY(resistance);
    } else {
      isPulling.current = false;
      setPullY(0);
    }
  };

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || disabled) return;
    isPulling.current = false;

    if (pullY >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullY(50);
      try {
        await onRefresh();
      } catch (err) {
        console.warn('[PullToRefresh] Refresh failed', err);
      } finally {
        setIsRefreshing(false);
        setPullY(0);
      }
    } else {
      setPullY(0);
    }
  }, [pullY, isRefreshing, disabled, onRefresh]);

  useEffect(() => {
    const handleGlobalTouchEnd = () => {
      if (isPulling.current) {
        handleTouchEnd();
      }
    };
    window.addEventListener('touchend', handleGlobalTouchEnd);
    return () => window.removeEventListener('touchend', handleGlobalTouchEnd);
  }, [handleTouchEnd]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative ${className}`}
    >
      {/* Pull / Refresh Indicator Pill */}
      {(pullY > 0 || isRefreshing) && (
        <div
          style={{ height: `${pullY}px` }}
          className="overflow-hidden flex items-center justify-center transition-[height] duration-150 ease-out"
        >
          <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-card-dark rounded-full shadow-md border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200">
            <span
              className={`material-symbols-outlined text-primary text-[18px] ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={{
                transform: isRefreshing ? 'none' : `rotate(${Math.min(pullY * 3, 180)}deg)`,
              }}
            >
              {isRefreshing ? 'progress_activity' : 'arrow_downward'}
            </span>
            <span>{isRefreshing ? 'Updating...' : pullY >= threshold ? 'Release to refresh' : 'Pull to refresh'}</span>
          </div>
        </div>
      )}

      {children}
    </div>
  );
};

export default PullToRefresh;
