<script setup>
import { computed } from 'vue'
import { useCountUp } from '@/composables/useCountUp'
import { riskName } from '@/utils/risk'

const props = defineProps({ detail: Object, decomp: Object, loading: Boolean })

const ARC = 251.327 // 2π·40
const assessment = computed(() => props.detail?.assessment)
const score = computed(() => assessment.value?.comprehensive_risk_score ?? 0)
const level = computed(() => assessment.value?.risk_level || 3)
const gaugeVal = useCountUp(score, { delay: 700 })
const gaugeOffset = computed(() => ARC * (1 - (gaugeVal.value || 0) / 100))

// dimensions 是对象,遍历用 Object.values
const dims = computed(() => Object.values(props.decomp?.dimensions || {}))

const strat = computed(() => props.detail?.strategies || {})
const stratRows = computed(() => [
  { tag: '政府', cls: 'gov', item: strat.value.government?.[0] },
  { tag: '平台', cls: 'plat', item: strat.value.platform?.[0] },
  { tag: '公众', cls: 'pub', item: strat.value.public?.[0] },
])
</script>

<template>
  <aside class="rail rail-left">
    <div class="panel scan">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>综合风险评分<span class="idx">DG · 01</span></div>
      <div class="gauge-wrap">
        <svg class="gauge" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#00E676" />
              <stop offset=".5" stop-color="#FFD600" />
              <stop offset="1" stop-color="#FF5252" />
            </linearGradient>
          </defs>
          <circle class="track" cx="50" cy="50" r="40" />
          <circle
            class="arc"
            cx="50" cy="50" r="40"
            stroke-dasharray="251.327"
            :stroke-dashoffset="gaugeOffset"
            transform="rotate(-90 50 50)"
          />
          <text class="val" x="50" y="54" text-anchor="middle">{{ Math.round(gaugeVal) }}</text>
          <text class="unit" x="50" y="68" text-anchor="middle">/ 100</text>
        </svg>
        <div class="gauge-meta">
          等级 <b>L{{ level }} {{ riskName(level) }}</b><br />
          综合分 <b>{{ score.toFixed(1) }}</b><br />
          建议响应 <b>提级</b>
        </div>
      </div>
    </div>

    <div class="panel scan flex">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>风险五维分解<span class="idx">DG · 02</span></div>
      <div class="dim" v-for="(d, i) in dims" :key="i">
        <div class="dim-row">
          <span class="lbl">{{ d.label }}</span>
          <span class="num">{{ d.final_score }} / {{ d.max }}</span>
        </div>
        <!-- 长度须 final_score/max 归一(各维 max 不同) -->
        <div class="dim-bar"><i :style="{ '--w': ((d.final_score / d.max) * 100).toFixed(0) + '%' }"></i></div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title"><span class="dot"></span>三层策略摘要<span class="idx">DG · 03</span></div>
      <div class="strat">
        <div class="strat-row" v-for="r in stratRows" :key="r.tag">
          <span class="strat-tag" :class="r.cls">{{ r.tag }}</span>
          <span class="txt">{{ r.item || '—' }}</span>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title"><span class="dot"></span>迭代收敛<span class="idx">DG · 04</span></div>
      <svg class="spark" viewBox="0 0 200 48" preserveAspectRatio="none">
        <polyline
          fill="none" stroke="url(#gaugeGrad)" stroke-width="2"
          points="0,10 18,14 36,20 54,17 72,26 90,23 108,30 126,29 144,34 162,33 180,37 200,38"
          style="filter: drop-shadow(0 0 4px var(--cyan-soft))"
        />
        <polyline
          fill="rgba(0,229,255,.06)" stroke="none"
          points="0,10 18,14 36,20 54,17 72,26 90,23 108,30 126,29 144,34 162,33 180,37 200,38 200,48 0,48"
        />
      </svg>
      <div class="conv-val">第 14 轮 · Δ 0.03 · 已收敛</div>
    </div>
  </aside>
</template>
