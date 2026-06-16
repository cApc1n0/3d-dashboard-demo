<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { createStage } from '@/three/core/createStage'
import { createSituationDome } from '@/three/dome/SituationDome'
import { createKnowledgeNebula } from '@/three/nebula/KnowledgeNebula'
import NebulaPanel from './NebulaPanel.vue'

const props = defineProps({
  scene: String,
  detail: Object,
  decomp: Object,
  runStatus: Object,
  platformStats: Object,
  graphData: Object,
  loading: Boolean,
})

const hostRef = ref(null)
const tooltipRef = ref(null)
const tooltipText = ref('')
const tooltipVisible = ref(false)
const selectedNode = ref(null)
const flashKey = ref(0)

let current = null // 'dome' | 'nebula'
let stage = null
let dome = null
let nebula = null

const fmtK = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n || 0))
// 挂载新场景前清空 host,防止上一场景残留 canvas/overlay 叠加导致切换卡住
const clearHost = () => {
  const h = hostRef.value
  if (h) while (h.firstChild) h.removeChild(h.firstChild)
}

// ---------- 穹顶 ----------
function mountDome() {
  if (!hostRef.value || stage) return
  clearHost()
  stage = createStage(hostRef.value, { cameraPos: [0, 7.5, 24], lookAt: [0, 2.2, 0] })
  if (!stage.setSize()) requestAnimationFrame(() => stage && stage.setSize())
  dome = createSituationDome(stage, { onHover: handleDomeHover })
  stage.start()
  applyDomeData()
  window.addEventListener('resize', onResize)
}
function disposeDome() {
  window.removeEventListener('resize', onResize)
  if (dome) { dome.dispose(); dome = null }
  if (stage) { stage.dispose(); stage = null }
  tooltipVisible.value = false
}
function applyDomeData() {
  if (dome && props.detail) {
    dome.update({ detail: props.detail, decomp: props.decomp, runStatus: props.runStatus, platformStats: props.platformStats })
  }
}
function handleDomeHover(info) {
  if (info.active) {
    tooltipText.value = `${info.name} · ${fmtK(info.count)} 帖 · 覆盖 ${(info.ratio * 100).toFixed(0)}%${info.isActive ? '' : ' · 未命中'}`
    tooltipVisible.value = true
    if (tooltipRef.value) {
      tooltipRef.value.style.left = info.x + 14 + 'px'
      tooltipRef.value.style.top = info.y + 14 + 'px'
    }
  } else {
    tooltipVisible.value = false
  }
}

// ---------- 星云 ----------
function mountNebula() {
  if (!hostRef.value || nebula) return
  clearHost()
  nebula = createKnowledgeNebula(hostRef.value, { onNodeClick: (n) => (selectedNode.value = n) })
  applyNebulaData()
  window.addEventListener('resize', onResizeNebula)
}
function disposeNebula() {
  window.removeEventListener('resize', onResizeNebula)
  if (nebula) { nebula.dispose(); nebula = null }
  selectedNode.value = null
}
function applyNebulaData() {
  if (nebula && props.graphData) nebula.update(props.graphData)
}
function onResizeNebula() { nebula?.resize() }

// ---------- 切换 ----------
function ensure(name) {
  if (name === current) return
  teardown()
  current = name
  // 等下一帧,确保 hostRef 已是干净容器
  nextTick(() => {
    if (name === 'dome') mountDome()
    else if (name === 'nebula') mountNebula()
  })
}
function teardown() {
  if (current === 'dome') disposeDome()
  else if (current === 'nebula') disposeNebula()
  current = null
}
function onResize() { stage?.setSize() }

watch(() => props.scene, (s) => {
  flashKey.value++ // 触发切换闪屏过渡
  ensure(s)
})
watch(() => [props.detail, props.decomp, props.runStatus, props.platformStats], () => {
  if (current === 'dome') applyDomeData()
})
watch(() => props.graphData, () => {
  if (current === 'nebula') applyNebulaData()
})

onMounted(async () => {
  await nextTick()
  ensure(props.scene || 'dome')
})
onBeforeUnmount(() => teardown())
</script>

<template>
  <section class="canvas-wrap">
    <div class="scene-host" ref="hostRef"></div>

    <div class="scene-title" v-if="scene === 'dome'">
      舆情态势穹顶<small>SITUATION DOME · LIVE TELEMETRY</small>
    </div>
    <div class="scene-title" v-else>
      知识图谱星云<small>KNOWLEDGE NEBULA · GRAPH VIEW</small>
    </div>

    <div class="corner tl"></div><div class="corner tr"></div>
    <div class="corner bl"></div><div class="corner br"></div>
    <div class="reticle" v-if="scene === 'dome'"></div>

    <div class="readout" v-if="scene === 'dome'">
      DOME_R <b>10.00</b> · NODES <b>07</b> · PARTICLES <b>0800</b> · DIM_AXES <b>05</b> · SCENE <b>DOME</b>
    </div>
    <div class="readout" v-else>
      NODES <b>{{ String(graphData?.nodes?.length || 0).padStart(2, '0') }}</b>
      · EDGES <b>{{ String(graphData?.edges?.length || 0).padStart(2, '0') }}</b>
      · TYPES <b>09</b> · SCENE <b>NEBULA</b>
    </div>
    <div class="scale-bar" v-if="scene === 'dome'">SCALE 1:2.4K<i></i></div>

    <div ref="tooltipRef" class="dome-tooltip" v-show="tooltipVisible">{{ tooltipText }}</div>
    <div class="scene-flash" :key="flashKey"></div>
    <NebulaPanel v-if="scene === 'nebula'" :node="selectedNode" @close="selectedNode = null" />
  </section>
</template>

<style scoped>
.dome-tooltip {
  position: absolute;
  z-index: 6;
  pointer-events: none;
  padding: 6px 10px;
  font-family: var(--f-mono);
  font-size: 11px;
  color: var(--text);
  background: rgba(6, 9, 18, 0.92);
  border: 1px solid var(--risk);
  border-radius: 3px;
  box-shadow: 0 0 14px rgba(0, 0, 0, 0.6);
  white-space: nowrap;
}
.scene-flash {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.2), transparent);
  transform: translateX(-100%);
  animation: sweep 0.6s ease-out forwards;
}
@keyframes sweep {
  0% { transform: translateX(-100%); opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
}
</style>
