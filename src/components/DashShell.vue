<script setup>
import { ref, computed, onMounted } from 'vue'
import TopHud from './TopHud.vue'
import LeftRail from './LeftRail.vue'
import RightRail from './RightRail.vue'
import SceneCanvas from './SceneCanvas.vue'
import BottomBar from './BottomBar.vue'
import ConsoleStage from './console/ConsoleStage.vue'
import { dgApi, simApi, spiderApi, graphApi } from '@/api'
import { riskColor } from '@/utils/risk'

// 场景切换状态(穹顶 / 星云) + 模式(态势 / 操作台)
const scene = ref('dome')
const mode = ref('situation')
const loading = ref(true)
const detail = ref(null)
const decomp = ref(null)
const runStatus = ref(null)
const platformStats = ref(null)
const graphData = ref(null)

// 全局 --risk 随风险等级变化,子组件用 var(--risk) 自动联动
const riskVar = computed(() => riskColor(detail.value?.assessment?.risk_level || 3))

onMounted(async () => {
  try {
    const s = await dgApi.listSessions()
    // sessions 未排序,取最新需自行 sort(还原 POISS 真实坑)
    const latest = (s.sessions || [])
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
    const sid = latest?.session_id
    const [d, dec, rs, ps, gd] = await Promise.all([
      dgApi.getDetail(sid), // 无 .data
      dgApi.getRiskDecomposition(sid), // 无 .data
      simApi.getRunStatus().then((r) => r.data).catch(() => null), // 需 .data
      spiderApi.getPlatformStats(sid),
      graphApi.getGraphData(undefined).catch(() => null), // 无 .data
    ])
    detail.value = d
    decomp.value = dec
    runStatus.value = rs
    platformStats.value = ps
    graphData.value = gd
  } catch (e) {
    console.error('[DashShell] 取数失败:', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="bg-glow"></div>
  <div class="bg-grid"></div>
  <div class="bg-grain"></div>
  <div class="bg-vignette"></div>
  <div class="preview-tag">P0 · 地基 · MOCK</div>

  <div class="shell" :style="{ '--risk': riskVar }">
    <TopHud :detail="detail" :run-status="runStatus" :loading="loading" />
    <main class="stage">
      <LeftRail :detail="detail" :decomp="decomp" :loading="loading" />
      <SceneCanvas
        :scene="scene"
        :detail="detail"
        :decomp="decomp"
        :run-status="runStatus"
        :platform-stats="platformStats"
        :graph-data="graphData"
        :loading="loading"
      />
      <RightRail :run-status="runStatus" :platform-stats="platformStats" :loading="loading" />
      <!-- 操作台:覆盖在 .stage 上的绝对层(态势模式不渲染,WebGL 上下文随 SceneCanvas 保留) -->
      <ConsoleStage v-if="mode === 'console'" />
    </main>
    <BottomBar :scene="scene" :mode="mode" :detail="detail" @switch="scene = $event" @switch-mode="mode = $event" />
  </div>
</template>
