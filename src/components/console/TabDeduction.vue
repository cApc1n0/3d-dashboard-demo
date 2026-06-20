<script setup>
import { ref, onMounted } from 'vue'
import { deductionApi } from '@/api'
import ErrChip from './ErrChip.vue'
import FileUpload from './FileUpload.vue'

const agents = ref([])
const sessions = ref([])
const selAgent = ref(null)
const selSession = ref(null)
const sessionStatus = ref(null)
const timeline = ref(null)
const loading = ref(true)
const extractRes = ref(null)
const createRes = ref(null)
const actionRes = ref(null)
// 干预
const INTERVENTION_TYPES = ['DELETE_POST', 'PUBLISH_CORRECTION', 'RATE_LIMIT', 'BAN_ACCOUNT', 'AMPLIFY_TOPIC', 'SUPPRESS_TOPIC']
const ivType = ref('PUBLISH_CORRECTION')
const ivParams = ref('{}')
const ivRes = ref(null)
const aiInput = ref('')
const aiRes = ref(null)

const isErr = (r) => !!r && (r.success === false || (!!r.error && !r.success && !r.session_id && !r.card_id && !r.pending_count))
const errMsg = (r) => r?.message || r?.error || '未知错误'

async function load() {
  loading.value = true
  const s = await deductionApi.listSessions()
  sessions.value = s || []
  if (sessions.value.length) await selectSession(sessions.value[0])
  else agents.value = []
  loading.value = false
}
async function selectAgent(a) {
  selAgent.value = a
}
async function selectSession(s) {
  selSession.value = s
  sessionStatus.value = null
  timeline.value = null
  agents.value = []
  const id = s.session_id || s.id
  if (!id) return
  // Agent 按 session 作用域存(create 时 project_id 缺省回落 session_id),故按 session_id 取
  const [st, tl, ag] = await Promise.all([
    deductionApi.getSessionStatus(id),
    deductionApi.getTimeline(id),
    deductionApi.listAgents({ session_id: id }),
  ])
  sessionStatus.value = st
  timeline.value = tl
  agents.value = ag || []
}
async function onExtract(file) {
  const fd = new FormData()
  fd.append('file', file)
  extractRes.value = await deductionApi.extractAgents(fd)
  if (!isErr(extractRes.value)) await load()
}
async function createSession() {
  const agentIds = (selAgent.value ? [selAgent.value.card_id || selAgent.value.agent_id] : []).filter(Boolean)
  createRes.value = await deductionApi.createSession({
    mode: 'manual',
    max_rounds: 10,
    agent_card_ids: agentIds,
  })
  if (createRes.value?.session_id || createRes.value?.data?.session_id) await load()
}
async function act(kind) {
  const id = selSession.value?.session_id || selSession.value?.id
  if (!id) return
  actionRes.value = { kind, status: '执行中…' }
  let r
  if (kind === 'start') r = await deductionApi.startSession(id, { mode: 'manual' })
  else if (kind === 'next') r = await deductionApi.nextRound(id)
  else if (kind === 'pause') r = await deductionApi.pauseSession(id)
  else if (kind === 'stop') r = await deductionApi.stopSession(id)
  actionRes.value = isErr(r) ? { kind, error: errMsg(r) } : { kind, status: '已提交 ✓' }
  if (kind === 'next' && !isErr(r)) await selectSession(selSession.value)
}
async function doIntervene() {
  const id = selSession.value?.session_id || selSession.value?.id
  if (!id) return
  let params = {}
  try { params = JSON.parse(ivParams.value || '{}') } catch (_) { ivRes.value = { error: 'params 非法 JSON' }; return }
  ivRes.value = await deductionApi.intervene(id, { intervention_type: ivType.value, params })
}
async function doAi() {
  const id = selSession.value?.session_id || selSession.value?.id
  if (!id || !aiInput.value) return
  aiRes.value = await deductionApi.aiAnalyze(id, { user_input: aiInput.value })
}
onMounted(load)
</script>

<template>
  <div class="cgrid">
    <!-- Agent -->
    <div class="panel scan" style="display:flex;flex-direction:column">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>Agent 卡 / AGENTS<span class="idx">DEDUCT · 01</span></div>
      <div v-if="loading" class="cloading">载入中…</div>
      <div v-else-if="!agents.length" class="cempty">暂无 Agent · 抽取或创建</div>
      <div v-else class="clist">
        <div v-for="a in agents" :key="a.card_id||a.agent_id" class="crow" :class="{sel:selAgent?.card_id===a.card_id}" @click="selectAgent(a)">
          <span class="ck">{{ (a.card_id||a.agent_id||'').slice(0,10) }}</span>
          <span class="cv">{{ a.name || a.basic_info?.name || 'Agent' }}</span>
          <span class="cmeta">{{ a.card_type || '' }}</span>
        </div>
      </div>
      <div class="csec-title" style="margin-top:12px">文档抽取 Agent(重依赖 · LLM)</div>
      <FileUpload accept=".docx,.md,.pdf,.txt" label="上传文档 → 抽取 Agent 卡" @file="onExtract" />
      <ErrChip v-if="extractRes && isErr(extractRes)" title="Agent 抽取暂不可用" :message="errMsg(extractRes)" hint="需 LLM_API_KEY" @retry="extractRes=null" />
    </div>

    <!-- Session -->
    <div class="panel scan" style="display:flex;flex-direction:column;min-width:300px">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>推演会话 / SESSIONS<span class="idx">DEDUCT · 02</span></div>
      <div v-if="!sessions.length" class="cempty">暂无会话 · 下方创建</div>
      <div v-else class="clist">
        <div v-for="s in sessions" :key="s.session_id||s.id" class="crow" :class="{sel:selSession?.session_id===(s.session_id||s.id)}" @click="selectSession(s)">
          <span class="ck">{{ (s.session_id||s.id||'').slice(0,10) }}</span>
          <span class="cv">{{ s.mode || '' }} · {{ s.status || '' }}</span>
          <span class="cmeta">{{ s.current_round ?? 0 }}/{{ s.max_rounds ?? '—' }}</span>
        </div>
      </div>
      <div class="cbtn-row" style="margin-top:10px">
        <button class="cbtn" @click="createSession">＋ 创建会话(手动模式 · 文件)</button>
      </div>
      <div v-if="createRes?.error || createRes?.data?.error" class="csub" style="color:var(--l5)">{{ errMsg(createRes.data||createRes) }}</div>

      <template v-if="selSession">
        <div class="csec-title" style="margin-top:12px">会话控制</div>
        <div class="cbtn-row">
          <button class="cbtn" @click="act('start')">启动</button>
          <button class="cbtn" @click="act('next')">下一轮</button>
          <button class="cbtn" @click="act('pause')">暂停</button>
          <button class="cbtn danger" @click="act('stop')">结束</button>
        </div>
        <ErrChip v-if="actionRes?.error" :title="`${actionRes.kind} 暂不可用`" :message="actionRes.error" hint="启动(auto)/下一轮 需 LLM;手动 next-round 也需 LLM" @retry="actionRes=null" />
        <div v-else-if="actionRes?.status" class="csub">{{ actionRes.kind }}:{{ actionRes.status }}</div>
        <div v-if="timeline?.timeline?.length" class="csub" style="margin-top:8px">{{ timeline.timeline.length }} 轮记录</div>
      </template>
    </div>

    <!-- 干预 + AI -->
    <div class="panel scan" style="display:flex;flex-direction:column;min-width:300px">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>干预队列 / INTERVENE<span class="idx">DEDUCT · 03</span></div>
      <div v-if="!selSession" class="cempty">选择会话后干预</div>
      <template v-else>
        <div class="cfield">
          <label>干预类型</label>
          <select v-model="ivType" class="cinput">
            <option v-for="t in INTERVENTION_TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div class="cfield">
          <label>params (JSON)</label>
          <textarea v-model="ivParams" class="cinput"></textarea>
        </div>
        <button class="cbtn" @click="doIntervene">入队干预(文件 · 现在可用)</button>
        <div v-if="ivRes?.pending_count!=null" class="csub" style="margin-top:6px">✓ 待处理 {{ ivRes.pending_count }} 条</div>
        <ErrChip v-else-if="ivRes && isErr(ivRes)" title="干预失败" :message="errMsg(ivRes)" @retry="ivRes=null" />

        <div class="csec-title" style="margin-top:14px">AI 干预建议(重依赖 · LLM)</div>
        <textarea v-model="aiInput" class="cinput" placeholder="描述处置目标,AI 生成干预方案…"></textarea>
        <button class="cbtn" :disabled="!aiInput" @click="doAi" style="margin-top:6px">生成建议</button>
        <ErrChip v-if="aiRes && isErr(aiRes)" title="AI 建议暂不可用" :message="errMsg(aiRes)" hint="需 LLM_API_KEY" @retry="aiRes=null" />
        <div v-else-if="aiRes?.plan || aiRes?.data?.plan" class="cpre">{{ JSON.stringify(aiRes.plan||aiRes.data.plan, null, 2) }}</div>
      </template>
    </div>
  </div>
</template>
