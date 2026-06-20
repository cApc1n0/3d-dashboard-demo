<script setup>
import { ref, onMounted } from 'vue'
import { dgApi } from '@/api'
import { riskName, riskColor, kwText } from '@/utils/risk'
import ErrChip from './ErrChip.vue'
import FileUpload from './FileUpload.vue'

const sessions = ref([])
const selSid = ref(null)
const detail = ref(null)
const decomp = ref(null)
const loading = ref(true)
const busy = ref(false)
const analyzeRes = ref(null)
const iterateState = ref(null)
const reportMsg = ref('')

const isErr = (r) => !!r && (r.success === false || (!!r.error && !r.success && !r.session_id))
const errMsg = (r) => r?.message || r?.error || '未知错误'

const fmtDate = (s) => (s ? String(s).slice(0, 16).replace('T', ' ') : '—')

async function load() {
  loading.value = true
  const s = await dgApi.listSessions()
  sessions.value = (s?.sessions || []).slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  if (sessions.value.length && !selSid.value) await select(sessions.value[0].session_id)
  loading.value = false
}
async function select(sid) {
  selSid.value = sid
  detail.value = null
  decomp.value = null
  if (!sid) return
  const [d, dec] = await Promise.all([dgApi.getDetail(sid), dgApi.getRiskDecomposition(sid)])
  detail.value = d
  decomp.value = dec
}
async function onAnalyze(file) {
  busy.value = true
  analyzeRes.value = null
  analyzeRes.value = await dgApi.analyze(file)
  busy.value = false
  // 成功则刷新会话列表
  if (analyzeRes.value?.session_id) await load()
}
async function downloadReport() {
  reportMsg.value = '生成中…'
  const blob = await dgApi.getReport(selSid.value)
  if (!blob) {
    reportMsg.value = '报告生成失败(后端返回空,可能缺依赖)'
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `report_${selSid.value}.docx`
  a.click()
  URL.revokeObjectURL(url)
  reportMsg.value = '已下载 ✓'
}
async function doIterate() {
  iterateState.value = { status: '启动中…' }
  const r = await dgApi.iterate(selSid.value, { max_iterations: 5 })
  if (isErr(r)) {
    iterateState.value = { error: errMsg(r) }
    return
  }
  iterateState.value = { status: '迭代中…', polling: true }
  const poll = async () => {
    const st = await dgApi.getIterateStatus(selSid.value)
    iterateState.value = { ...iterateState.value, status: st?.status || '…', iters: st?.iterations || [] }
    return st
  }
  const stop = async (st) => {
    iterateState.value = { ...iterateState.value, polling: false, status: st?.status || '完成' }
  }
  // 简易轮询(后端 iterate 在后台线程跑)
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    if (!iterateState.value.polling) return
    const st = await poll()
    if (st?.status === 'completed' || st?.status?.startsWith('error')) {
      await stop(st)
      return
    }
  }
  await stop({ status: '超时' })
}

const dims = () => (decomp.value?.dimensions ? Object.values(decomp.value.dimensions) : [])
onMounted(load)
</script>

<template>
  <div class="cgrid">
    <!-- 左:会话列表 + 上传分析 -->
    <div class="panel scan" style="display:flex;flex-direction:column">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>会话 / SESSIONS<span class="idx">DG · 01</span></div>
      <div v-if="loading" class="cloading">载入中…</div>
      <div v-else-if="!sessions.length" class="cempty">暂无会话 · 上传文档分析生成</div>
      <div v-else class="clist">
        <div
          v-for="s in sessions"
          :key="s.session_id"
          class="crow"
          :class="{ sel: selSid === s.session_id }"
          @click="select(s.session_id)"
        >
          <span class="ck">{{ fmtDate(s.created_at) }}</span>
          <span class="cv">{{ s.event_type || s.name }}</span>
          <span class="cmeta">{{ s.risk_score ?? '—' }}</span>
        </div>
      </div>

      <div class="csec-title" style="margin-top:14px">事件理解 · 上传分析</div>
      <FileUpload accept=".docx,.doc,.md,.pdf,.txt" label="上传事件文档(docx/md/pdf)→ 自动分析" @file="onAnalyze" />
      <div v-if="busy" class="cloading">分析中(LLM,耗时)…</div>
      <ErrChip
        v-else-if="analyzeRes && isErr(analyzeRes)"
        title="事件分析暂不可用"
        :message="errMsg(analyzeRes)"
        hint="需配置 LLM_API_KEY(DeepSeek);后端 /api/dg/analyze"
        @retry="analyzeRes = null"
      />
      <div v-else-if="analyzeRes?.session_id" class="csub">✓ 已生成会话 {{ analyzeRes.session_id }} · 风险 {{ analyzeRes.risk_score }}</div>
    </div>

    <!-- 右:决策详情 -->
    <div class="panel scan flex" style="display:flex;flex-direction:column;min-width:320px">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>决策详情 / DETAIL<span class="idx">DG · 02</span></div>
      <div v-if="!detail" class="cempty">选择左侧会话查看</div>
      <template v-else>
        <div class="cvtable" style="margin-bottom:12px">
          <span class="k">事件类型</span><span class="v">{{ detail.info?.event_type?.primary_type || '—' }} / {{ detail.info?.event_type?.secondary_type || '' }}</span>
          <span class="k">综合风险</span><span class="v"><b :style="{color:riskColor(detail.assessment?.risk_level||3)}">{{ detail.assessment?.comprehensive_risk_score ?? '—' }}</b> · {{ riskName(detail.assessment?.risk_level||3) }}</span>
        </div>

        <div class="csec-title">关键词</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px">
          <span v-for="(k,i) in (detail.info?.keywords||[]).slice(0,10)" :key="i" class="tagmini">{{ kwText(k) }}</span>
        </div>

        <div class="csec-title">策略推荐(政府 / 平台 / 公众)</div>
        <div class="strat" style="margin-bottom:12px">
          <template v-for="(items,tier) in detail.strategies||{}" :key="tier">
            <div v-for="(t,i) in (items||[])" :key="tier+i" class="strat-row">
              <span class="strat-tag" :class="tier==='government'?'gov':tier==='platform'?'plat':'pub'">{{ {government:'政府',platform:'平台',public:'公众'}[tier] }}</span>
              <span class="txt">{{ t }}</span>
            </div>
          </template>
        </div>

        <div class="csec-title">风险五维分解</div>
        <div v-if="!dims().length" class="cempty">无分解数据</div>
        <div v-else>
          <div v-for="d in dims()" :key="d.label" class="dim">
            <div class="dim-row"><span class="lbl">{{ d.label }}</span><span class="num">{{ d.final_score }}/{{ d.max }}</span></div>
            <div class="dim-bar"><i :style="{ '--w': Math.min(100, (d.final_score / d.max) * 100) + '%' }"></i></div>
          </div>
        </div>

        <div class="cbtn-row" style="margin-top:14px">
          <button class="cbtn" @click="downloadReport">📄 生成/下载报告</button>
          <button class="cbtn" @click="doIterate">🔁 策略迭代优化</button>
        </div>
        <div v-if="reportMsg" class="csub" style="margin-top:6px">{{ reportMsg }}</div>
        <ErrChip v-if="iterateState?.error" title="策略迭代暂不可用" :message="iterateState.error" hint="需 LLM_API_KEY" @retry="iterateState=null" />
        <div v-else-if="iterateState" class="csub" style="margin-top:6px">迭代:{{ iterateState.status }}<span v-if="iterateState.iters?.length"> · {{ iterateState.iters.length }} 轮</span></div>
      </template>
    </div>
  </div>
</template>
