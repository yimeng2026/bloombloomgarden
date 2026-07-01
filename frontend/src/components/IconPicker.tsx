import { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';

/* ── Common Icons ─────────────────────────────────────────────── */

const COMMON_ICONS: (keyof typeof LucideIcons)[] = [
  'Sparkles', 'Bot', 'Code', 'PenTool', 'BarChart3', 'Palette', 'Search',
  'Briefcase', 'Eye', 'Building2', 'TestTube', 'Server', 'Headphones',
  'Shield', 'Scale', 'HeartPulse', 'GraduationCap', 'Gamepad2', 'Megaphone',
  'MessageSquare', 'Cpu', 'Brain', 'Globe', 'Zap', 'Star', 'Target',
  'Wrench', 'Lightbulb', 'BookOpen', 'Calendar', 'Mail', 'FileText',
  'Database', 'Cloud', 'Lock', 'Unlock', 'Key', 'Map', 'Compass',
  'Flame', 'Droplets', 'Leaf', 'Flower', 'TreePine', 'Mountain',
  'Sun', 'Moon', 'Rocket', 'Plane', 'Car', 'Home', 'ShoppingCart',
  'Camera', 'Music', 'Film', 'Radio', 'Tv', 'Smartphone', 'Laptop',
  'Monitor', 'Printer', 'HardDrive', 'Wifi', 'Bluetooth', 'Cable',
];

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  label?: string;
}

export default function IconPicker({ value, onChange, label = '图标' }: IconPickerProps) {
  const [search, setSearch] = useState('');

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return COMMON_ICONS;
    return COMMON_ICONS.filter((icon) =>
      icon.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--sage-700)]">{label}</label>
      <div className="relative">
        <LucideIcons.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--sage-400)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索图标..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        />
      </div>
      <div className="grid grid-cols-8 gap-1.5 max-h-48 overflow-y-auto p-1">
        {filteredIcons.map((iconName) => {
          const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;
          const isSelected = value === iconName;
          return (
            <button
              key={iconName}
              onClick={() => onChange(iconName)}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${
                isSelected
                  ? 'bg-[var(--sage-500)] text-white'
                  : 'bg-[var(--sage-50)] text-[var(--sage-500)] hover:bg-[var(--sage-200)]'
              }`}
              title={iconName}
            >
              <IconComponent className="w-4 h-4" />
            </button>
          );
        })}
      </div>
      {filteredIcons.length === 0 && (
        <p className="text-xs text-[var(--sage-400)] text-center py-2">未找到匹配的图标</p>
      )}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-[var(--sage-500)]">当前:</span>
        <div className="w-6 h-6 rounded bg-[var(--sage-100)] flex items-center justify-center">
          {(() => {
            const IconComponent = (LucideIcons as any)[value] || LucideIcons.HelpCircle;
            return <IconComponent className="w-3.5 h-3.5 text-[var(--sage-600)]" />;
          })()}
        </div>
        <span className="text-xs text-[var(--sage-600)] font-mono">{value}</span>
      </div>
    </div>
  );
}
