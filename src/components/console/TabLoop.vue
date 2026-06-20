<script setup>
import { ref, onMounted } from 'vue'
import { bridgeApi, strategyApi, dgApi } from '@/api'
import ErrChip from './ErrChip.vue'

const projects = ref([])
const sims = ref([])
const selProject = ref(null)
const strategies = ref(null)
const dgSession = ref('')
const transferRes = ref(null)
// 策略套件
const suites = ref([])
const suiteRes = ref(null)
const runRes = ref(null)

const isErr = (r) => !!r && (r.success === false || (!!r.error && !r.success && !r.suite_id))
const errMsg = (r) => r?.message || r?.error || '未知错误'

async function load() {
  ;[projects.value, sims.value, suites.value] = await Promise.all([
    bridgeApi.listPoissProjects(),
    bridgeApi.listPoissSims(),
    strategyApi.list(),
  ])
  // 取最新 DG 会话 id 作为闭环源
  const s = await dgApi.listSessions()
  const latest = (s?.sessions || []).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]
  dgSession.value = latest?.session_id || ''
  if (projects.value.length) await select(projects.value[0])
}
async function select(p) {
  selProject.value = p
  strategies.value = await bridgeApi.getPoissStrategies(p.project_id)
}
async function dgToPoiss() {
  transferRes.value = { kind: 'DG→POISS', status: '传输中…' }
  const r = await bridgeApi.transferDgToPoiss({ dg_session_id: dgSession.value, auto_build_graph: false })
  transferRes.value = isErr(r) ? { kind: 'DG→POISS', error: errMsg(r) } : { kind: 'DG→POISS', status: '已传输 ✓' }
}
async function poissToDg() {
  transferRes.value = { kind: 'POISS→DG', status: '传输中…' }
  const simId = sims.value[0]?.simulation_id
  const r = await bridgeApi.transferPoissToDg({ poiss_simulation_id: simId, dg_session_id: dgSession.value })
  transferRes.value = isErr(r) ? { kind: 'POISS→DG', error: errMsg(r) } : { kind: 'POISS→DG', status: '已传输 ✓' }
}
async function createSuite() {
  // 用当前 DG 会话的三套策略建套件(适配层把 government/platform/public → interventions)
  suiteRes.value = await strategyApi.create({ dg_session_id: dgSession.value, project_id: selProject.value?.project_id })
  if (suiteRes.value?.suite_id || suiteRes.value?.data?.suite_id) await load()
}
async function runSuite() {
  const sid = suites.value[0]?.suite_id
  if (!sid) return
  runRes.value = await strategyApi.run(sid)
}
onMounted(load)
</script>

<template>
  <div class="cgrid">
    <!-- 闭环导航 + 传输 -->
    <div class="panel scan" style="display:flex;flex-direction:column;min-width:300px">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>闭环导航 / BRIDGE<span class="idx">LOOP · 01</span></div>
      <div class="csec-title">POISS 项目</div>
      <div v-if="!projects.length" class="cempty">暂无项目</div>
      <div v-else class="clist">
        <div v-for="p in projects" :key="p.project_id" class="crow" :class="{sel:selProject?.project_id===p.project_id}" @click="select(p)">
          <span class="ck">{{ p.project_id.slice(0,12) }}</span>
          <span class="cv">{{ p.name }}</span>
        </div>
      </div>
      <div class="csec-title" style="margin-top:10px">仿真 ({{ sims.length }})</div>
      <div v-if="!sims.length" class="cempty">暂无仿真</div>
      <div v-else class="clist">
        <div v-for="s in sims.slice(0,5)" :key="s.simulation_id" class="crow">
          <span class="ck">{{ s.simulation_id.slice(0,14) }}</span>
          <span class="cv">{{ s.status }}</span>
        </div>
      </div>
    </div>

    <!-- 传输 -->
    <div class="panel scan" style="display:flex;flex-direction:column;min-width:280px">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>数据流转 / TRANSFER<span class="idx">LOOP · 02</span></div>
      <div class="cfield">
        <label>DG 会话(源)</label>
        <input v-model="dgSession" class="cinput" />
      </div>
      <div class="cbtn-row" style="flex-direction:column;gap:10px">
        <button class="cbtn" style="width:100%" @click="dgToPoiss">→ DG 决策 → POISS 仿真</button>
        <button class="cbtn" style="width:100%" @click="poissToDg">← POISS 仿真 → DG 反馈</button>
      </div>
      <ErrChip v-if="transferRes?.error" :title="`${transferRes.kind} 暂不可用`" :message="transferRes.error" hint="DG→POISS 若 auto_build_graph=true 需 Neo4j" @retry="transferRes=null" />
      <div v-else-if="transferRes?.status" class="csub" style="margin-top:6px;color:var(--l1)">{{ transferRes.kind }}:{{ transferRes.status }}</div>
      <div v-if="strategies" class="csec-title" style="margin-top:12px">项目策略</div>
      <div v-if="strategies" class="csub">{{ strategies.type }} · {{ JSON.stringify(strategies.summary||strategies.scenarios?.length||0) }}</div>
    </div>

    <!-- 策略套件 -->
    <div class="panel scan" style="display:flex;flex-direction:column;min-width:280px">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>策略套件 / STRATEGY SUITE<span class="idx">LOOP · 03</span></div>
      <div class="csub" style="margin-bottom:8px">把 DG 三套策略适配为可执行干预并运行</div>
      <button class="cbtn" @click="createSuite">＋ 从 DG 策略创建套件</button>
      <div v-if="suiteRes?.error || suiteRes?.data?.error" class="csub" style="color:var(--l5);margin-top:6px">{{ errMsg(suiteRes.data||suiteRes) }}</div>
      <div v-else-if="suiteRes?.suite_id || suiteRes?.data?.suite_id" class="csub" style="margin-top:6px;color:var(--l1)">✓ 套件 {{ suiteRes.suite_id || suiteRes.data.suite_id }}</div>
      <div class="csec-title" style="margin-top:12px">已有套件 ({{ suites.length }})</div>
      <div v-if="!suites.length" class="cempty">暂无</div>
      <div v-else class="clist">
        <div v-for="su in suites" :key="su.suite_id" class="crow">
          <span class="ck">{{ su.suite_id.slice(0,12) }}</span>
          <span class="cv">{{ su.status || '' }}</span>
        </div>
      </div>
      <button class="cbtn" :disabled="!suites.length" @click="runSuite" style="margin-top:8px">▶ 运行套件(重依赖 · OASIS)</button>
      <ErrChip v-if="runRes && isErr(runRes)" title="套件运行暂不可用" :message="errMsg(runRes)" hint="需 OASIS + LLM" @retry="runRes=null" />
    </div>
  </div>
</template>
