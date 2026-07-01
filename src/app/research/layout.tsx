import Link from "next/link";
import { ReactNode } from "react";

export default function ResearchLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧研究导航栏 */}
      <aside className="w-16 bg-gradient-to-b from-violet-600 to-purple-700 flex flex-col items-center py-4 gap-2 shrink-0">
        <a href="/" className="w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-all hover:bg-white/10" title="返回首页">🏠</a>
        <div className="w-8 h-px bg-white/20 my-1" />
        {[
          { href: "/research", icon: "📊", tip: "仪表盘" },
          { href: "/research/modules", icon: "📦", tip: "模块" },
          { href: "/research/papers", icon: "📄", tip: "论文" },
          { href: "/research/verification", icon: "✅", tip: "验证" },
          { href: "/research/workspace", icon: "📝", tip: "工作区" },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-all hover:bg-white/10"
            title={item.tip}>
            {item.icon}
          </Link>
        ))}
        <div className="flex-1" />
      </aside>
      {/* 主内容 */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
