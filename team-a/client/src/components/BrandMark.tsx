import { Boxes } from 'lucide-react';

type BrandMarkProps = {
  compact?: boolean;
  light?: boolean;
};

export function BrandMark({ compact = false, light = false }: BrandMarkProps) {
  return (
    <div className={`brand-lockup ${light ? 'brand-lockup-light' : ''}`}>
      <span className="brand-mark">
        <Boxes size={compact ? 16 : 19} strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className="brand-name">
          DealFlow<span>360</span>
        </span>
      )}
    </div>
  );
}