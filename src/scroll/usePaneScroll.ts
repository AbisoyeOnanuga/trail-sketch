import { useEffect } from 'react'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

/** Smooth wheel scrolling for one pane, plus --scroll, --view, and edge flags for the slim scroll line. */
export function usePaneScroll(wrapper: HTMLElement | null): void {
  useEffect(() => {
    if (!wrapper) return
    const pane: HTMLElement = wrapper
    const content = pane.firstElementChild
    if (!(content instanceof HTMLElement)) return

    function measure() {
      const range = pane.scrollHeight - pane.clientHeight
      const progress = range > 0 ? Math.min(1, Math.max(0, pane.scrollTop / range)) : 0
      pane.style.setProperty('--scroll', progress.toFixed(4))
      pane.style.setProperty('--view', range > 0 ? (pane.clientHeight / pane.scrollHeight).toFixed(4) : '1')
      pane.setAttribute('data-scrollable', range > 2 ? 'true' : 'false')
      pane.setAttribute('data-at-start', pane.scrollTop < 2 ? 'true' : 'false')
      pane.setAttribute('data-at-end', pane.scrollTop > range - 2 ? 'true' : 'false')
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
