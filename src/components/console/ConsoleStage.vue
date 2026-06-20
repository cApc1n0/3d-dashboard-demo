<script setup>
import { ref, shallowRef, markRaw, watch } from 'vue'
import TabDG from './TabDG.vue'
import TabGraph from './TabGraph.vue'
import TabSim from './TabSim.vue'
import TabDeduction from './TabDeduction.vue'
import TabGov from './TabGov.vue'
import TabLoop from './TabLoop.vue'

// 操作台覆盖层:6 个能力 tab。各 tab 自取数据(保持 DashShell 编排干净)。
const TABS = [
  { key: 'dg', label: '决策生成', comp: markRaw(TabDG) },
  { key: 'graph', label: '知识图谱', comp: markRaw(TabGraph) },
  { key: 'sim', label: '策略仿真', comp: markRaw(TabSim) },
  { key: 'deduction', label: '多智能体推演', comp: markRaw(TabDeduction) },
  { key: 'gov', label: '干预与治理', comp: markRaw(TabGov) },
  { key: 'loop', label: '闭环', comp: markRaw(TabLoop) },
]
const activeKey = ref('dg')
const current = shallowRef(TABS[0].comp)
watch(activeKey, (k) => {
  current.value = (TABS.find((t) => t.key === k) || TABS[0]).comp
})
</script>

<template>
  <div class="console-stage">
    <div class="console-tabs">
      <div class="ct-group">
        <button
          v-for="t in TABS"
          :key="t.key"
          class="ct-btn"
          :class="{ active: activeKey === t.key }"
          @click="activeKey = t.key"
        >
          {{ t.label }}
        </button>
      </div>
      <div class="ct-group inner">
        <span class="tagmini">OPERATIONS · CONSOLE</span>
      </div>
    </div>
    <div class="console-body">
      <component :is="current" />
    </div>
  </div>
</template>
