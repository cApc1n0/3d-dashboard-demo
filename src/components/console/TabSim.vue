<script setup>
import { ref, onMounted } from 'vue'
import { simApi } from '@/api'
import ErrChip from './ErrChip.vue'

const sims = ref([])
const selSim = ref(null)
const runStatus = ref(null)
const agentStats = ref(null)
const timeline = ref(null)
const loading = ref(true)
const actionRes = ref(null)
const interviewRes = ref(null)
const interviewQ = ref('')

const isErr = (r) => !!r && (r.success === false || (!!r.error && !r.success && !r.simulation_id))
const errMsg = (r) => r?.message || r?.error || '未知错误'

async function load() {
  loading.value = true
  sims.value = await simApi.list()
  if (sims.value.length) await select(sims.value[0])
  loading.value = false
}
async function select(s) {
  selSim.value = s
  const id = s.simulation_id
  runStatus.value = null
  agentStats.value = null
  timeline.value = null
  if (!id) return
  const rs = await simApi.getRunStatus(id)
  runStatus.value = rs?.success === false ? rs : rs?.data || rs
  agentStats.value = await simApi.getAgentStats(id)
  timeline.value = await simApi.getTimeline(id)
}
async function act(kind, body = {}) {
  actionRes.value = { kind, status: '执行中…' }
  const id = selSim.value?.simulation_id
  let r
  if (kind === 'create') r = await simApi.create(body)
  else if (kind === 'prepare') r = await simApi.prepare(id, body)
  else if (kind === 'start') r = await simApi.start(id, body)
  else if (kind === 'stop') r = await simApi.stop(id)
  actionRes.value = isErr(r) ? { kind, error: errMsg(r) } : { kind, status: '已提交 ✓', r }
  if (kind === 'create' && r?.simulation_id) await load()
}
async function doInterview() {
  if (!interviewQ.value || !selSim.value) return
  interviewRes.value = await simApi.interview({ simulation_id: selSim.value.simulation_id, agent_id: 0, prompt: interviewQ.value })
}
onMounted(load)
</script>

<template>
  <div class="cgrid">
    <!-- 左:仿真列表 + 控制 -->
    <div class="panel scan" style="display:flex;flex-direction:column">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>仿真 / SIMULATIONS<span class="idx">SIM · 01</span></div>
      <div v-if="loading" class="cloading">载入中…</div>
      <div v-else-if="!sims.length" class="cempty">暂无仿真 · 需先构建图谱再 create+prepare</div>
      <div v-else class="clist">
        <div v-for="s in sims" :key="s.simulation_id" class="crow" :class="{sel:selSim?.simulation_id===s.simulation_id}" @click="select(s)">
          <span class="ck">{{ s.simulation_id.slice(0,14) }}</span>
          <span class="cv">{{ s.project_name || s.status }}</span>
          <span class="cmeta">{{ s.current_round ?? 0 }}/{{ s.total_rounds ?? '—' }}</span>
        </div>
      </div>

      <div class="csec-title" style="margin-top:14px">仿真控制(重依赖 · OASIS/LLM)</div>
      <div class="cbtn-row">
        <button class="cbtn" @click="act('create')">创建</button>
        <button class="cbtn" :disabled="!selSim" @click="act('prepare')">准备</button>
        <button class="cbtn" :disabled="!selSim" @click="act('start')">启动</button>
        <button class="cbtn danger" :disabled="!selSim" @click="act('stop')">停止</button>
      </div>
      <ErrChip v-if="actionRes?.error" :title="`${actionRes.kind} 暂不可用`" :message="actionRes.error" hint="需 OASIS + LLM_API_KEY;创建需先有图谱" @retry="actionRes=null" />
      <div v-else-if="actionRes?.status" class="csub" style="margin-top:6px">{{ actionRes.kind }}:{{ actionRes.status }}</div>
    </div>

    <!-- 右:运行态 + 统计 -->
    <div class="panel scan flex" style="display:flex;flex-direction:column;min-width:320px">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>运行态 / RUN STATUS<span class="idx">SIM · 02</span></div>
      <div v-if="!selSim" class="cempty">选择左侧仿真</div>
      <template v-else>
        <div class="cvtable" style="margin-bottom:12px">
          <span class="k">状态</span><span class="v">{{ runStatus?.runner_status || 'idle' }}</span>
          <span class="k">轮次</span><span class="v">{{ runStatus?.current_round ?? 0 }} / {{ runStatus?.total_rounds ?? '—' }}</span>
          <span class="k">动作总数</span><span class="v">{{ runStatus?.total_actions_count ?? 0 }}</span>
          <span class="k">活跃 Agent</span><span class="v">{{ runStatus?.active_agents ?? runStatus?.data?.active_agents ?? 0 }}</span>
        </div>
        <div class="sim-prog"><i :style="{ width: ((runStatus?.progress ?? runStatus?.progress_percent ?? 0) * (runStatus?.progress_percent!=null?1:100)) + '%' }"></i></div>

        <div class="csec-title" style="margin-top:12px">Agent 采访(重依赖 · LLM)</div>
        <textarea v-model="interviewQ" class="cinput" placeholder="向 Agent 0 提问…"></textarea>
        <button class="cbtn" :disabled="!interviewQ" @click="doInterview" style="margin-top:6px">发送采访</button>
        <ErrChip v-if="interviewRes && isErr(interviewRes)" title="采访暂不可用" :message="errMsg(interviewRes)" hint="需仿真在运行 + LLM" @retry="interviewRes=null" />
        <div v-else-if="interviewRes?.data?.result" class="cpre">{{ typeof interviewRes.data.result === 'string' ? interviewRes.data.result : JSON.stringify(interviewRes.data.result, null, 2) }}</div>
      </template>
    </div>
  </div>
</template>
