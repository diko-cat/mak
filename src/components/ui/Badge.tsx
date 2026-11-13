import type { HTMLAttributes, PropsWithChildren } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'sage' | 'white' | 'dark'
}

export function Badge({ tone = 'sage', className = '', children, ...props }: PropsWithChildren<BadgeProps>) {
  return <span className={`badge badge--${tone} ${className}`.trim()} {...props}>{children}</span>
}
