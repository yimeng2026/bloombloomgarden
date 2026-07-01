import { useState } from 'react';
import { Check } from 'lucide-react';

/* ── Preset Colors ─────────────────────────────────────────────── */

const PRESET_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#6366F1',
  '#64748B', '#EC4899', '#0EA5E9', '#EF4444', '#14B8A6',
  '#F97316', '#DC2626', '#7C3AED', '#06B6D4', '#FBBF24',
  '#D946EF', '#FB923C', '#6B7280', '#22c55e', '#a855f7',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export default function ColorPicker({ value, onChange, label = '主题色' }: ColorPickerProps) {
  const [customValue, setCustomValue] = useState(value);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--sage-700)]">{label}</label>
      <div className="grid grid-cols-10 gap-1.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className={`w-7 h-7 rounded-lg transition-all hover:scale-110 ${
              value === color ? 'ring-2 ring-offset-2 ring-[var(--sage-500)]' : ''
            }`}
            style={{ backgroundColor: color }}
            title={color}
          >
            {value === color && (
              <Check className="w-3.5 h-3.5 text-white mx-auto" strokeWidth={3} />
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <div
          className="w-8 h-8 rounded-lg border flex-shrink-0"
          style={{ backgroundColor: value, borderColor: 'var(--sage-200)' }}
        />
        <input
          type="text"
          value={customValue}
          onChange={(e) => {
            setCustomValue(e.target.value);
            if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
              onChange(e.target.value);
            }
          }}
          placeholder="#3B82F6"
          className="flex-1 px-3 py-2 rounded-lg border text-sm font-mono"
          style={{ borderColor: 'var(--sage-200)', backgroundColor: 'var(--sage-50)' }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => {
            setCustomValue(e.target.value);
            onChange(e.target.value);
          }}
          className="w-10 h-10 p-0 border-0 rounded-lg cursor-pointer"
        />
      </div>
    </div>
  );
}
