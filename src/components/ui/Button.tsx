<<<<<<< HEAD
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'quiet' | 'light';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-forest text-white hover:bg-[#10382f] shadow-sm dark:bg-[#b8d5c8] dark:text-[#12372f] dark:hover:bg-[#c7dfd4]',
  secondary: 'border border-forest/20 bg-white/70 text-ink hover:border-forest/40 hover:bg-white dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:bg-white/10',
  quiet: 'text-ink hover:bg-forest/5 dark:text-slate-100 dark:hover:bg-white/10',
  light: 'bg-white text-forest hover:bg-mint',
};

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return <button className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`} {...props}>{children}</button>;
=======
import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'light'

export function buttonStyles(variant: ButtonVariant = 'primary', className = ''): string {
  return `button button--${variant} ${className}`.trim()
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({ variant = 'primary', className = '', children, ...props }: PropsWithChildren<ButtonProps>) {
  return <button className={buttonStyles(variant, className)} {...props}>{children}</button>
>>>>>>> 46ee541 (Set up clinic foundation and public flows)
}
