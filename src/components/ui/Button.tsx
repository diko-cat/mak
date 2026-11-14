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
}
