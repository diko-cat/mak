import type { ReactNode } from 'react'

interface SectionHeadingProps {
  eyebrow?: string
  title: ReactNode
  description?: string
  align?: 'left' | 'center'
  /** `h1` — когда секция открыта отдельной страницей. */
  as?: 'h1' | 'h2'
}

export function SectionHeading({ eyebrow, title, description, align = 'left', as: Heading = 'h2' }: SectionHeadingProps) {
  return (
    <div className={`section-heading section-heading--${align}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <Heading>{title}</Heading>
      {description && <p className="section-heading__description">{description}</p>}
    </div>
  )
}
