import React from 'react'
import { useEffect, useState, useRef } from 'react';
import { Bot, CheckSquare, Server, BookOpen, FolderOpen, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatsCardProps {
  icon: string;
  value: number;
  label: string;
  trend: string;
  trendType: 'up' | 'down' | 'neutral';
  color: string;
  delay?: number;
}

const iconMap: Record<string, React.ElementType> = {
  Bot,
  CheckSquare,
  Server,
  BookOpen,
  FolderOpen,
  Users,
};

export default function StatsCard({ icon, value, label, trend, trendType, color, delay = 0 }: StatsCardProps) {
  const [count, setCount] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setRevealed(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [delay]);

  useEffect(() => {
    if (!revealed) return;
    const duration = 1200;
    const steps = 60;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [revealed, value]);

  const IconComponent = iconMap[icon] || Bot;
  const TrendIcon = trendType === 'up' ? TrendingUp : trendType === 'down' ? TrendingDown : Minus;
  const trendColor = trendType === 'up'
    ? 'bg-[rgba(91,154,109,0.15)] text-[#5b9a6d]'
    : trendType === 'down'
    ? 'bg-[rgba(201,123,132,0.15)] text-[#c97b84]'
    : 'bg-[rgba(201,169,110,0.15)] text-[#c9a96e]';

  return (
    <div
      ref={cardRef}
      className="rounded-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover"
      style={{
        backgroundColor: '#fff',
        border: '1px solid var(--sage-200)',
        boxShadow: 'var(--shadow-card)',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateX(0)' : 'translateX(-20px)',
        transition: `opacity 500ms var(--ease-gentle) ${delay}ms, transform 500ms var(--ease-gentle) ${delay}ms`,
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 hover:scale-105"
          style={{ backgroundColor: `${color}20` }}
        >
          <IconComponent size={22} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-2xl font-bold font-display" style={{ color: 'var(--sage-700)' }}>
            {count.toLocaleString()}
          </div>
          <div className="text-xs font-semibold tracking-wider uppercase mt-0.5" style={{ color: 'var(--sage-400)' }}>
            {label}
          </div>
          <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${trendColor}`}>
            <TrendIcon size={12} />
            <span>{trend}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

