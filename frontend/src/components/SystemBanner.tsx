import { useState, useEffect } from 'react';

interface Banner {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  link?: { text: string; href: string };
  dismissible?: boolean;
}

/**
 * SystemBanner — 系统公告横幅
 * 顶部常驻/可关闭，支持多种类型和链接
 */
export default function SystemBanner() {
  const [banners, setBanners] = useState<Banner[]>([
    {
      id: 'welcome',
      type: 'info',
      message: '🌸 欢迎使用千界花园 — 当前运行的是 v1.0.0 预览版',
      dismissible: true,
    },
  ]);

  // 模拟动态公告推送
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    const demoBanners: Banner[] = [
      { id: 'update', type: 'success', message: '✅ 全部 10 个 LLM Provider 适配完成，填入 API Key 即可使用', dismissible: true },
      { id: 'tip', type: 'info', message: '💡 提示：按 Ctrl+K 打开命令面板，Ctrl+/ 查看快捷键', dismissible: true },
    ];

    demoBanners.forEach((b, i) => {
      timers.push(setTimeout(() => {
        setBanners(prev => [...prev.filter(p => p.id !== b.id), b]);
      }, 3000 + i * 4000));
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  const removeBanner = (id: string) => {
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  const bgColor = {
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    error: 'bg-red-500/10 border-red-500/30 text-red-300',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  };

  if (banners.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {banners.map(banner => (
        <div
          key={banner.id}
          className={`flex items-center gap-3 px-4 py-2 border ${bgColor[banner.type]} text-sm animate-in slide-in-from-top`}
        >
          <span className="flex-1">{banner.message}</span>
          {banner.link && (
            <a
              href={banner.link.href}
              className="text-xs underline hover:no-underline shrink-0"
            >
              {banner.link.text}
            </a>
          )}
          {banner.dismissible && (
            <button
              onClick={() => removeBanner(banner.id)}
              className="shrink-0 text-current hover:opacity-70 text-lg leading-none"
              aria-label="关闭"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
