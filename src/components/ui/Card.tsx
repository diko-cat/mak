import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={`rounded-3xl border border-forest/[0.08] bg-white shadow-[0_10px_40px_rgba(21,58,48,.045)] dark:border-white/10 dark:bg-[#15231f] dark:shadow-black/10 ${className}`} {...props}>{children}</div>;
}
