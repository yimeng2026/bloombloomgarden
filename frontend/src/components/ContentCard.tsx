import React from 'react'
import { useRef, useState, useEffect } from 'react';

interface ContentCardProps {
  title?: string;
  titleEn?: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function ContentCard({
  title,
  titleEn,
  subtitle,
  children,
  actions,
  className = '',
  noPadding = false,
}: ContentCardProps) {
  const [revealed, setRevealed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`rounded-card transition-all duration-500 ${className}`}
      style={{
        backgroundColor: '#fff',
        border: '1px solid var(--sage-200)',
        boxShadow: 'var(--shadow-card)',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(24px)',
        transitionTimingFunction: 'var(--ease-gentle)',
      }}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between px-6 pt-5 pb-2">
          <div>
            {title && (
              <h2 className="text-lg font-semibold" style={{ color: 'var(--sage-800)' }}>
                {title}
                {titleEn && (
                  <span className="ml-2 text-sm font-normal" style={{ color: 'var(--sage-400)' }}>
                    {titleEn}
                  </span>
                )}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--sage-400)' }}>
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'px-6 pb-5'}>{children}</div>
    </div>
  );
}

