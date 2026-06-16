<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({ scene: String, detail: Object })
const emit = defineEmits(['switch'])

// ---- 心跳 ECG(从 moodboard 移植,Canvas)----
const hb = ref(null)
const N = 240
const pts = new Array(N).fill(0)
let hbT = 0
let dpr = 1
let hbW = 0
let hbH = 0
let ctx = null
let raf = 0

const draw = () => {
  hbT += 1
  const phase = hbT % 46 // PQRST 心跳波形
  let y = 0
  if (phase === 10) y = 0.18
  else if (phase === 16) y = -0.12
  else if (phase === 18) y = 0.95
  else if (phase === 20) y = -0.35
  else if (phase === 30) y = 0.28
  pts.push(y)
  if (pts.length > N) pts.shift()
  if (!ctx) {
    raf = requestAnimationFrame(draw)
    return
  }
  ctx.clearRect(0, 0, hbW, hbH)
  ctx.strokeStyle = 'rgba(0,229,255,.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, hbH / 2)
  ctx.lineTo(hbW, hbH / 2)
  ctx.stroke()

  ctx.strokeStyle = '#00E5FF'
  ctx.lineWidth = 2 * dpr
  ctx.shadowColor = '#00E5FF'
  ctx.shadowBlur = 8
  ctx.beginPath()
  for (let i = 0; i < pts.length; i++) {
    const x = (i / (N - 1)) * hbW
    const yy = hbH / 2 - pts[i] * hbH * 0.42
    if (i === 0) ctx.moveTo(x, yy)
    else ctx.lineTo(x, yy)
  }
  ctx.stroke()
  ctx.shadowBlur = 0

  const hy = hbH / 2 - pts[pts.length - 1] * hbH * 0.42
  ctx.fillStyle = '#00E5FF'
  ctx.beginPath()
  ctx.arc(hbW - 4 * dpr, hy, 3 * dpr, 0, Math.PI * 2)
  ctx.fill()
  raf = requestAnimationFrame(draw)
}

const resize = () => {
  const c = hb.value
  if (!c) return
  const r = c.getBoundingClientRect()
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  hbW = c.width = Math.max(1, r.width) * dpr
  hbH = c.height = Math.max(1, r.height) * dpr
  ctx = c.getContext('2d')
}

onMounted(() => {
  resize()
  raf = requestAnimationFrame(draw)
  window.addEventListener('resize', resize)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <footer class="bottom-bar">
    <div class="panel hb-panel scan">
      <div class="scanlines"></div>
      <div class="panel-title">
        <span class="dot"></span>全局心跳时间轴 / HEARTBEAT<span class="idx">SYS · GLOBAL</span>
      </div>
      <canvas ref="hb"></canvas>
      <div class="hb-foot"><span>T-04:00</span><span>NOW</span><span>+04:00</span></div>
    </div>

    <div class="panel switch-panel">
      <div>
        <div class="panel-title" style="margin-bottom: 8px">
          <span class="dot"></span>事件流<span class="idx">FEED</span>
        </div>
        <div class="marquee">
          <span class="marquee-track">
            [14:26] <b>微博</b> 原帖转发突破 8K ·&nbsp;&nbsp;[14:24] <b>抖音</b> 衍生视频 +320
            ·&nbsp;&nbsp;[14:21] <b>知乎</b> 高赞回答倾向转负 ·&nbsp;&nbsp;[14:18] 仿真 Agent 级联扩散 第42轮
            ·&nbsp;&nbsp;[14:15] 推演快照 round_0042 已生成
          </span>
        </div>
      </div>
      <div class="scene-switch">
        <button :class="{ active: scene === 'dome' }" @click="emit('switch', 'dome')">态势穹顶</button>
        <button :class="{ active: scene === 'nebula' }" @click="emit('switch', 'nebula')">知识星云</button>
      </div>
    </div>
  </footer>
</template>
