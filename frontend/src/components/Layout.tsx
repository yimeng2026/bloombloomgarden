import React from 'react'
import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';
import CommandPalette from './CommandPalette';

/* ── Floating Particles Background ── */
function ParticleField() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    size: 2 + Math.random() * 4,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: 15 + Math.random() * 25,
    delay: Math.random() * -20,
    opacity: 0.1 + Math.random() * 0.3,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Gradient orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, rgba(0,240,255,0.4) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, transparent 70%)' }} />
      <div className="absolute top-3/4 left-1/3 w-64 h-64 rounded-full opacity-5"
        style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 70%)' }} />
      
      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.x}%`,
            top: `${p.y}%`,
            backgroundColor: p.id % 3 === 0 ? 'rgba(0,240,255,0.6)' : p.id % 3 === 1 ? 'rgba(168,85,247,0.5)' : 'rgba(34,197,94,0.5)',
            animation: `float ${p.duration}s linear infinite`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }} />
      ))}
      
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(0,240,255,1)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, sidebarCollapsed } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className={`min-h-[100dvh] ${theme === 'dark' ? 'dark' : ''}`}
      style={{ backgroundColor: theme === 'dark' ? '#0a0e1a' : 'var(--sage-50)' }}>
      
      {mounted && <ParticleField />}
      
      <Sidebar />
      <div
        className="flex flex-col min-h-[100dvh] transition-all duration-400 relative z-10"
        style={{
          marginLeft: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
          transitionTimingFunction: 'var(--ease-gentle)',
        }}
      >
        <Navbar />
        <main
          className="flex-1 pt-4 pb-8 px-4 md:px-6 lg:px-8 overflow-y-auto"
          style={{
            marginTop: 'var(--topbar-height)',
          }}
        >
          {children}
        </main>
        <Footer />
      </div>
      <CommandPalette />
    </div>
  );
}
