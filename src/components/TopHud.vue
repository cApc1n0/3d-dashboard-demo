<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCountUp } from '@/composables/useCountUp'
import { riskName } from '@/utils/risk'

const props = defineProps({ detail: Object, runStatus: Object, loading: Boolean })

const assessment = computed(() => props.detail?.assessment)
const level = computed(() => assessment.value?.risk_level || 0)
const score = computed(() => assessment.value?.comprehensive_risk_score ?? 0)
const scoreDisp = useCountUp(score, { decimals: 1, delay: 600 })

const agents = computed(() => props.runStatus?.active_agents ?? 0)
const agentsDisp = useCountUp(agents, { delay: 900 })

// 时钟
const clockText = ref('--:--:--')
let timer = 0
const pad = (n) => String(n).padStart(2, '0')
const tick = () => {
  const d = new Date()
  clockText.value = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
onMounted(() => {
  tick()
  timer = setInterval(tick, 1000)
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <header class="top-hud">
    <div class="brand">
      <span class="brand-mark">◈</span>
      <span class="brand-name">MAC-POSAIS</span>
      <span class="brand-sub">PUBLIC OPINION SITUATION AWARENESS</span>
    </div>

    <div class="risk-badge">
      <span class="risk-lvl">RISK · {{ level ? 'L' + level : '—' }}</span>
      <span class="risk-name">{{ level ? riskName(level) : '加载中' }}</span>
      <span class="risk-bar"><i :style="{ width: score + '%' }"></i></span>
    </div>

    <div class="top-right">
      <div class="kpi">
        <span class="kpi-val">{{ scoreDisp.toFixed(1) }}</span>
        <span class="kpi-label">综合风险 / 100</span>
      </div>
      <div class="kpi">
        <span class="kpi-val">{{ agentsDisp.toLocaleString() }}</span>
        <span class="kpi-label">活跃 Agent</span>
      </div>
      <div class="clock"><span>{{ clockText }}</span><span class="live">● LIVE</span></div>
    </div>
  </header>
</template>
