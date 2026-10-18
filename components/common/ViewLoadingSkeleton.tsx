import React from 'react';

/**
 * ViewLoadingSkeleton
 * 
 * Reusable skeleton UI fallback for React.Suspense during route-level lazy loading.
 * Provides immediate visual structure with subtle pulse animation, matching both
 * light and dark modes across mobile and desktop viewports.
 */
export const ViewLoadingSkeleton: React.FC = () => {
  return (
    <div
      role="status"
      aria-label="Loading view"
      className="max-w-xl mx-auto px-4 py-6 space-y-4 animate-pulse pb-safe"
    >
      {/* Header bar skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-6 w-36 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          <div className="h-3.5 w-24 bg-gray-100 dark:bg-gray-800/60 rounded" />
        </div>
        <div className="h-9 w-20 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      </div>

      {/* Filter / Search placeholder */}
      <div className="h-10 w-full bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200/60 dark:border-gray-800/80" />

      {/* Content cards skeleton */}
      <div className="space-y-3 pt-2">
        <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-neutral-900/60 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-44 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
          </div>
          <div className="h-3.5 w-3/4 bg-gray-100 dark:bg-gray-800/70 rounded" />
          <div className="h-3 w-1/2 bg-gray-100 dark:bg-gray-800/50 rounded" />
        </div>

        <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-neutral-900/60 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-36 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-5 w-20 bg-gray-200 dark:bg-gray-800 rounded-full" />
          </div>
          <div className="h-3.5 w-2/3 bg-gray-100 dark:bg-gray-800/70 rounded" />
          <div className="h-3 w-1/3 bg-gray-100 dark:bg-gray-800/50 rounded" />
        </div>

        <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80 bg-white dark:bg-neutral-900/60 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded" />
            <div className="h-5 w-14 bg-gray-200 dark:bg-gray-800 rounded-full" />
          </div>
          <div className="h-3.5 w-4/5 bg-gray-100 dark:bg-gray-800/70 rounded" />
          <div className="h-3 w-2/5 bg-gray-100 dark:bg-gray-800/50 rounded" />
        </div>
      </div>

      <span className="sr-only">Loading content...</span>
    </div>
  );
};

export default ViewLoadingSkeleton;
