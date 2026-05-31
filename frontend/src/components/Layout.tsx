import React from 'react'
import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';
import CommandPalette from './CommandPalette';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, sidebarCollapsed } = useAppStore();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className={`min-h-[100dvh] ${theme === 'dark' ? 'dark' : ''}`}>
      <Sidebar />
      <div
        className="flex flex-col min-h-[100dvh] transition-all duration-400"
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
            backgroundColor: 'var(--sage-50)',
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

