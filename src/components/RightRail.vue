<script setup>
import { computed } from 'vue'

const props = defineProps({ runStatus: Object, platformStats: Object, loading: Boolean })

const rs = computed(() => props.runStatus || {})
const plats = computed(() => props.platformStats?.items || [])
const fmtK = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n ?? 0))

const ARC = 150.8 // 2π·24
const rumorPct = computed(() => (rs.value.rumor_coverage ?? 0) * 100)
const rumorOffset = computed(() => ARC * (1 - (rs.value.rumor_coverage ?? 0)))
const sentAvg = computed(() => rs.value.sentiment_avg ?? 0)
const sentOffset = computed(() => ARC * (1 - Math.min(1, Math.abs(sentAvg.value))))
const actPct = computed(() => (rs.value.user_activity ?? 0) * 100)
const actOffset = computed(() => ARC * (1 - (rs.value.user_activity ?? 0)))
</script>

<template>
  <aside class="rail rail-right">
    <div class="panel scan">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>仿真状态<span class="idx">POISS · 01</span></div>
      <div class="sim-head">
        <span class="sim-status">{{ (rs.runner_status || 'IDLE').toUpperCase() }}</span>
        <span style="color: var(--text-mut)">OASIS · round {{ rs.current_round ?? '—' }}/{{ rs.total_rounds ?? '—' }}</span>
      </div>
      <div class="sim-grid">
        <span class="k">Twitter 动作</span><span class="v">{{ (rs.twitter_actions_count ?? 0).toLocaleString() }}</span>
        <span class="k">Reddit 动作</span><span class="v">{{ (rs.reddit_actions_count ?? 0).toLocaleString() }}</span>
        <span class="k">活跃 Agent</span><span class="v">{{ (rs.active_agents ?? 0).toLocaleString() }}</span>
        <span class="k">谣言覆盖</span><span class="v">{{ rumorPct.toFixed(1) }}%</span>
      </div>
      <div class="sim-prog"><i :style="{ width: (rs.progress ?? 0) * 100 + '%' }"></i></div>
    </div>

    <div class="panel scan flex">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>七平台活跃度<span class="idx">SPIDER · 02</span></div>
      <div class="plat">
        <div class="plat-row" v-for="(p, i) in plats" :key="i">
          <span class="nm">{{ p.name }}</span>
          <span class="bar"><i :style="{ '--w': (p.ratio * 100).toFixed(0) + '%' }"></i></span>
          <span class="v">{{ fmtK(p.count) }}</span>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title"><span class="dot"></span>态势三指标<span class="idx">POISS · 03</span></div>
      <div class="metrics">
        <div class="metric">
          <svg class="ring" viewBox="0 0 60 60">
            <circle class="bg" cx="30" cy="30" r="24" />
            <circle class="fg" cx="30" cy="30" r="24" stroke="#FF9100" stroke-dasharray="150.8"
              :stroke-dashoffset="rumorOffset" transform="rotate(-90 30 30)" style="filter: drop-shadow(0 0 4px #FF9100)" />
            <text class="t" x="30" y="34" text-anchor="middle">{{ rumorPct.toFixed(0) }}%</text>
          </svg>
          <div class="lab">谣言覆盖</div>
        </div>
        <div class="metric">
          <svg class="ring" viewBox="0 0 60 60">
            <circle class="bg" cx="30" cy="30" r="24" />
            <circle class="fg" cx="30" cy="30" r="24" stroke="#FF5252" stroke-dasharray="150.8"
              :stroke-dashoffset="sentOffset" transform="rotate(-90 30 30)" style="filter: drop-shadow(0 0 4px #FF5252)" />
            <text class="t" x="30" y="34" text-anchor="middle">{{ sentAvg.toFixed(2) }}</text>
          </svg>
          <div class="lab">情绪均值</div>
        </div>
        <div class="metric">
          <svg class="ring" viewBox="0 0 60 60">
            <circle class="bg" cx="30" cy="30" r="24" />
            <circle class="fg" cx="30" cy="30" r="24" stroke="#00E5FF" stroke-dasharray="150.8"
              :stroke-dashoffset="actOffset" transform="rotate(-90 30 30)" style="filter: drop-shadow(0 0 4px #00E5FF)" />
            <text class="t" x="30" y="34" text-anchor="middle">{{ actPct.toFixed(0) }}%</text>
          </svg>
          <div class="lab">活跃度</div>
        </div>
      </div>
    </div>
  </aside>
</template>
