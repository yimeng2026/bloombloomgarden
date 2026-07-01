import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ContentCard from '@/components/ContentCard';
import { useAppStore } from '@/stores/appStore';

interface StubPageProps {
  title?: string;
  titleEn?: string;
}

export default function StubPage({ title, titleEn }: StubPageProps) {
  const navigate = useNavigate();
  const { language } = useAppStore();

  return (
    <div className="max-w-[1440px] mx-auto">
      <ContentCard>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-float"
            style={{ backgroundColor: 'var(--sage-100)' }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ color: 'var(--sage-400)' }}>
              <path d="M16 4C12 8 8 12 8 16C8 20 12 24 16 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M16 8C14 10 12 12 12 14.5C12 17 14 19 16 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              <circle cx="16" cy="4" r="2" fill="currentColor" />
            </svg>
          </div>
          <h2 className="text-xl font-display font-semibold" style={{ color: 'var(--sage-800)' }}>
            {title}
          </h2>
          {titleEn && (
            <p className="text-sm mt-1" style={{ color: 'var(--sage-400)' }}>
              {titleEn}
            </p>
          )}
          <p className="text-sm mt-3 max-w-sm" style={{ color: 'var(--sage-400)' }}>
            {language === 'zh'
              ? '此页面正在建设中，敬请期待...'
              : 'This page is under construction. Stay tuned...'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 mt-6 px-4 py-2 rounded-card-sm text-sm font-medium transition-all duration-200 hover:shadow-card"
            style={{ backgroundColor: 'var(--sage-100)', color: 'var(--sage-700)' }}
          >
            <ArrowLeft size={16} />
            {language === 'zh' ? '返回仪表盘' : 'Back to Dashboard'}
          </button>
        </div>
      </ContentCard>
    </div>
  );
}
