import { ref, watch, onUnmounted } from 'vue'

// 数字递增动画(easeOutCubic)。getTarget 为响应式 getter;值变为数字时自动 animate。
export function useCountUp(getTarget, { duration = 1400, delay = 0, decimals = 0 } = {}) {
  const val = ref(0)
  let raf = 0
  let timer = 0

  const stop = () => {
    cancelAnimationFrame(raf)
    clearTimeout(timer)
    raf = 0
    timer = 0
  }

  const animateTo = (target) => {
    stop()
    const start = performance.now()
    const step = (now) => {
      let p = Math.min(1, (now - start) / duration)
      p = 1 - Math.pow(1 - p, 3) // easeOutCubic
      val.value = +(target * p).toFixed(decimals)
      if (p < 1) raf = requestAnimationFrame(step)
    }
    timer = setTimeout(() => {
      raf = requestAnimationFrame(step)
    }, delay)
  }

  watch(
    getTarget,
    (t) => {
      if (typeof t === 'number' && !Number.isNaN(t)) animateTo(t)
    },
    { immediate: true }
  )

  onUnmounted(stop)
  return val
}
