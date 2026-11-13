import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const fieldClass = 'mt-2 w-full rounded-2xl border border-forest/15 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-forest/50 focus:ring-4 focus:ring-forest/5 dark:border-white/15 dark:bg-[#101b18] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-mint/50 dark:focus:ring-mint/5';

export function FieldLabel({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: string }) {
  return <label htmlFor={htmlFor} className="block text-sm font-medium text-ink dark:text-slate-200">{children}{hint && <span className="ml-2 text-xs font-normal text-ink/45 dark:text-slate-400">{hint}</span>}</label>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClass} ${props.className ?? ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldClass} ${props.className ?? ''}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClass} resize-y ${props.className ?? ''}`} />;
}
