import { useEffect } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

export function usePaneScroll(wrapper: HTMLElement | null): void {
  useEffect(() => {
    if (!wrapper) return
    const content = wrapper.firstElementChild
    if (!(content instanceof HTMLElement)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({
      wrapper,
      content,
      eventsTarget: wrapper,
      autoRaf: true,
      smoothWheel: true,
      lerp: 0.12,
    })
    return () => {
      lenis.destroy()
    }
  }, [wrapper])
}
