import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

type NoticeProps = { children: ReactNode };

export function Notice({ children }: NoticeProps) {
  return (
    <div className="inline-note">
      <Sparkles size={15} /> <span>{children}</span>
    </div>
  );
}
