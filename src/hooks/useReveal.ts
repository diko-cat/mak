import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Плавное появление элементов при прокрутке.
 * Элементы по селектору выезжают снизу группами, когда попадают в экран.
 * При «уменьшении движения» в системе анимация не включается.
 */
export function useReveal(selector: string, deps: unknown[] = []): void {
  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const items = gsap.utils.toArray<HTMLElement>(selector)
      if (items.length === 0) return
      gsap.set(items, { autoAlpha: 0, y: 26 })
      ScrollTrigger.batch(items, {
        start: 'top 90%',
        once: true,
        onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', overwrite: true, clearProps: 'transform,opacity,visibility' }),
      })
    })
    return () => mm.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
