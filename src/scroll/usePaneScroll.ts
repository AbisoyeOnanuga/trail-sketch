import { useEffect } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

/** Smooth wheel scrolling for one pane, plus --scroll, --view, and edge flags for the slim scroll line. */
export function usePaneScroll(wrapper: HTMLElement | null): void {
  useEffect(() => {
    if (!wrapper) return
    const content = wrapper.firstElementChild
    if (!(content instanceof HTMLElement)) return

    const measure = () => {
      const range = wrapper.scrollHeight - wrapper.clientHeight
      const progress = range > 0 ? Math.min(1, Math.max(0, wrapper.scrollTop / range)) : 0
      wrapper.style.setProperty('--scroll', progress.toFixed(4))
      wrapper.style.setProperty('--view', range > 0 ? (wrapper.clientHeight / wrapper.scrollHeight).toFixed(4) : '1')
      wrapper.dataset.scrollable = range > 2 ? 'true' : 'false'
      wrapper.dataset.atStart = wrapper.scrollTop < 2 ? 'true' : 'false'
      wrapper.dataset.atEnd = wrapper.scrollTop > range - 2 ? 'true' : 'false'
    }
    measure()
    wrapper.addEventListener('scroll', measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(wrapper)
    observer.observe(content)

    const lenis = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? null
      : new Lenis({
          wrapper,
          content,
          eventsTarget: wrapper,
          autoRaf: true,
          smoothWheel: true,
          lerp: 0.12,
        })
    return () => {
      wrapper.removeEventListener('scroll', measure)
      observer.disconnect()
      lenis?.destroy()
    }
  }, [wrapper])
}
