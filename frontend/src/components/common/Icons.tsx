import { Check } from 'lucide-react';

export function MoreHorizontalIcon() {
  return (
    <span className="more-horizontal-dots">
      <span />
      <span />
      <span />
    </span>
  );
}

export function ShieldIcon() {
  return (
    <span className="page-context-icon">
      <Check size={13} />
    </span>
  );
}

export function Settings2Icon() {
  return (
    <span className="button-icon-inline">
      <SlidersIcon />
    </span>
  );
}

export function SlidersIcon() {
  return (
    <span className="slider-glyph">
      <span />
      <span />
      <span />
    </span>
  );
}

export function ReceiptIcon() {
  return (
    <span className="page-context-icon">
      <Check size={13} />
    </span>
  );
}

export function RepeatIcon() {
  return <span className="repeat-glyph">↻</span>;
}
