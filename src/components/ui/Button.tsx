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
<<<<<<< HEAD
=======
>>>>>>> 32a33964d3dfc2c35b3233d1af01f7b8fcfc127e
>>>>>>> 53d41b56e91a232979132ad699ea09408bd59c65
}
