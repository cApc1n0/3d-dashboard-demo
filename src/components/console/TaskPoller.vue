<script setup>
import { ref, watch, onUnmounted } from 'vue'
// 声明式异步任务轮询(Graph /build、Strategy /run 返回 task_id 后用)。
// active=true 开始轮询 poll();isTerminal(result) 为真则停;超过 maxPolls 触发 timeout。
// 卸载自动清 interval,封顶防死循环。
const props = defineProps({
  active: { type: Boolean, default: false },
  poll: { type: Function, required: true },
  intervalMs: { type: Number, default: 1500 },
  maxPolls: { type: Number, default: 200 },
  isTerminal: { type: Function, default: (r) => false },
})
const emit = defineEmits(['result', 'terminal', 'timeout'])
const count = ref(0)
const last = ref(null)
const state = ref('idle') // idle | polling | done | failed | timeout
let timer = null

const stop = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
const tick = async () => {
  if (count.value >= props.maxPolls) {
    state.value = 'timeout'
    stop()
    emit('timeout')
    return
  }
  count.value++
  try {
    const r = await props.poll()
    last.value = r
    emit('result', r)
    if (props.isTerminal(r)) {
      state.value = r?.status === 'failed' || r?.error ? 'failed' : 'done'
      stop()
      emit('terminal', r)
    }
  } catch (e) {
    state.value = 'failed'
    last.value = { error: e.message }
    stop()
    emit('terminal', { error: e.message })
  }
}
watch(
  () => props.active,
  (a) => {
    stop()
    if (a) {
      count.value = 0
      state.value = 'polling'
      tick()
      timer = setInterval(tick, props.intervalMs)
    } else {
      state.value = 'idle'
    }
  },
  { immediate: true }
)
onUnmounted(stop)
</script>

<template>
  <slot :state="state" :result="last" :count="count" />
</template>
