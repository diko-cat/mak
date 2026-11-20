import type { ReactNode } from 'react';

export function SectionHeading({ eyebrow, title, children, centered = false }: { eyebrow: string; title: string; children?: ReactNode; centered?: boolean }) {
  return <div className={`mb-9 max-w-2xl ${centered ? 'mx-auto text-center' : ''}`}>
    <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-forest/65 dark:text-mint/75">{eyebrow}</p>
    <h2 className="font-display text-3xl leading-tight tracking-[-.035em] text-ink sm:text-4xl dark:text-white">{title}</h2>
    {children && <div className="mt-4 text-sm leading-7 text-ink/65 dark:text-slate-300">{children}</div>}
  </div>;
}
