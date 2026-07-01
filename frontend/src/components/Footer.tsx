import { useAppStore } from '@/stores/appStore';

export default function Footer() {
  const { language } = useAppStore();

  return (
    <footer
      className="w-full py-4 px-8 border-t text-center text-xs"
      style={{
        borderColor: 'var(--sage-200)',
        color: 'var(--sage-400)',
      }}
    >
      <span className="font-display font-medium" style={{ color: 'var(--sage-600)' }}>
        Bloombloomgarden
      </span>
      <span className="mx-2">{language === 'zh' ? '千界花园' : 'Thousand World Garden'}</span>
      <span className="mx-1">|</span>
      <span>v1.0.0</span>
    </footer>
  );
}
