import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'card' | 'table' | 'detail' | 'list';
  count?: number;
  className?: string;
}

/**
 * LoadingSkeleton — 骨架屏加载占位组件
 * 多场景：卡片列表 / 表格 / 详情页 / 列表
 * 使用 Tailwind animate-pulse
 */
export default function LoadingSkeleton({
  variant = 'card',
  count = 3,
  className = '',
}: LoadingSkeletonProps) {
  const basePulse = 'bg-gray-800 rounded animate-pulse';

  if (variant === 'card') {
    return (
      <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-[#12121a] border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${basePulse}`} />
              <div className="flex-1 space-y-2">
                <div className={`h-4 w-1/3 ${basePulse}`} />
                <div className={`h-3 w-1/4 ${basePulse}`} />
              </div>
            </div>
            <div className={`h-3 w-full ${basePulse}`} />
            <div className={`h-3 w-3/4 ${basePulse}`} />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Header row */}
        <div className="flex gap-3 p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`h-${i}`} className={`flex-1 h-4 ${basePulse}`} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3 border-b border-gray-800">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className={`flex-1 h-3 ${basePulse}`} style={{ opacity: 1 - j * 0.15 }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-xl ${basePulse}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-6 w-1/3 ${basePulse}`} />
            <div className={`h-4 w-1/4 ${basePulse}`} />
          </div>
        </div>
        {/* Content sections */}
        <div className="space-y-3">
          <div className={`h-4 w-full ${basePulse}`} />
          <div className={`h-4 w-5/6 ${basePulse}`} />
          <div className={`h-4 w-4/6 ${basePulse}`} />
        </div>
        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#12121a] border border-gray-800 rounded-xl p-4 space-y-2">
              <div className={`h-3 w-1/2 ${basePulse}`} />
              <div className={`h-6 w-3/4 ${basePulse}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // list variant (default)
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-[#12121a] border border-gray-800 rounded-lg">
          <div className={`w-8 h-8 rounded-lg ${basePulse}`} />
          <div className="flex-1 space-y-1.5">
            <div className={`h-3 w-1/3 ${basePulse}`} />
            <div className={`h-2 w-1/4 ${basePulse}`} />
          </div>
          <div className={`w-16 h-6 rounded ${basePulse}`} />
        </div>
      ))}
    </div>
  );
}
