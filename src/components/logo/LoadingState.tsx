import React from 'react';

interface LoadingStateProps {
  numSkeletons?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ numSkeletons = 3 }) => {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {Array.from({ length: numSkeletons }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 space-y-4">
            {/* Logo Preview Skeleton */}
            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="w-16 h-16 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse rounded-full" />
              </div>
            </div>

            {/* Title Skeleton */}
            <div className="space-y-3">
              <div className="h-6 bg-gray-100 rounded w-1/3" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-5/6" />
                <div className="h-4 bg-gray-100 rounded w-4/6" />
              </div>
            </div>

            {/* Actions Skeleton */}
            <div className="flex justify-between items-center pt-2">
              <div className="w-10 h-10 bg-gray-100 rounded-full" />
              <div className="w-32 h-10 bg-gray-100 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 