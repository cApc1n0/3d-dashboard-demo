<script setup>
import { ref, onMounted, computed } from 'vue'
import { interventionApi, terminationApi, traceabilityApi } from '@/api'
import ErrChip from './ErrChip.vue'

const types = ref(null)
const typesErr = ref(null)
// 干预
const stratId = ref('')
const ivType = ref('')
const ivParams = ref('{}')
const execRes = ref(null)
const history = ref(null)
// 终止
const suiteId = ref('')
const emergRes = ref(null)
const termStatus = ref(null)
// 可追溯
const traceId = ref('')
const traceTab = ref('timeline')
const traceRes = ref(null)

const isErr = (r) => !!r && (r.success === false || (!!r.error && !r.success))
const errMsg = (r) => r?.message || r?.error || '未知错误'

const typeList = computed(() => Object.entries(types.value?.intervention_types || {}))

async function loadTypes() {
  const t = await interventionApi.getTypes()
  if (isErr(t) || !t) typesErr.value = t
  else {
    types.value = t
    if (typeList.value.length) ivType.value = typeList.value[0][0]
  }
}
async function onTypeChange() {
  const def = types.value?.intervention_types?.[ivType.value]?.params || []
  const o = {}
  def.forEach((p) => (o[p] = ''))
  ivParams.value = JSON.stringify(o, null, 2)
}
async function doExecute() {
  let params = {}
  try { params = JSON.parse(ivParams.value || '{}') } catch (_) { execRes.value = { error: 'params 非法 JSON' }; return }
  execRes.value = await interventionApi.manualExecute({ strategy_id: stratId.value || 'demo', intervention_type: ivType.value, params })
}
async function doEmergency() {
  emergRes.value = await terminationApi.emergency(suiteId.value || 'demo')
}
async function doTrace() {
  traceRes.value = { loading: true }
  let r
  if (traceTab.value === 'timeline') r = await traceabilityApi.timeline(traceId.value)
  else if (traceTab.value === 'causal') r = await traceabilityApi.causalChain(traceId.value)
  else r = await traceabilityApi.impactReport(traceId.value)
  traceRes.value = r
}
onMounted(loadTypes)
</script>

<template>
  <div class="cgrid">
    <!-- 干预 -->
    <div class="panel scan" style="display:flex;flex-direction:column;min-width:300px">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>干预 / INTERVENTION<span class="idx">GOV · 01</span></div>
      <ErrChip v-if="typesErr" title="干预类型加载失败" :message="errMsg(typesErr)" @retry="loadTypes" />
      <template v-else>
        <div class="csub" style="margin-bottom:8px">{{ typeList.length }} 种干预类型(文件 · 现在可用)</div>
        <div class="cfield">
          <label>strategy_id</label>
          <input v-model="stratId" class="cinput" placeholder="demo" />
        </div>
        <div class="cfield">
          <label>干预类型</label>
          <select v-model="ivType" class="cinput" @change="onTypeChange">
            <option v-for="[k,v] in typeList" :key="k" :value="k">{{ k }} ({{ (v.params||[]).join(',') }})</option>
          </select>
        </div>
        <div class="cfield">
          <label>params (JSON)</label>
          <textarea v-model="ivParams" class="cinput"></textarea>
        </div>
        <button class="cbtn" @click="doExecute">手动执行</button>
        <div v-if="execRes?.status || execRes?.data?.status" class="csub" style="margin-top:6px;color:var(--l1)">✓ {{ execRes.status || execRes.data.status }}</div>
        <ErrChip v-else-if="execRes && isErr(execRes)" title="执行失败" :message="errMsg(execRes)" @retry="execRes=null" />
      </template>
    </div>

    <!-- 终止 -->
    <div class="panel scan" style="display:flex;flex-direction:column;min-width:260px">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>终止 / TERMINATION<span class="idx">GOV · 02</span></div>
      <div class="csub" style="margin-bottom:8px">紧急停止 kill-switch(文件 · 现在可用)</div>
      <div class="cfield">
        <label>suite_id</label>
        <input v-model="suiteId" class="cinput" placeholder="demo" />
      </div>
      <button class="cbtn danger" @click="doEmergency">🛑 紧急停止</button>
      <div v-if="emergRes?.event || emergRes?.data?.event" class="csub" style="margin-top:6px;color:var(--l1)">✓ 已触发 {{ emergRes.event || emergRes.data.event }}</div>
      <ErrChip v-else-if="emergRes && isErr(emergRes)" title="紧急停止失败" :message="errMsg(emergRes)" @retry="emergRes=null" />
      <div class="csec-title" style="margin-top:14px">终止状态</div>
      <button class="cbtn" @click="termStatus = '查询中…'; terminationApi.getStatus(suiteId||'demo').then(r=>termStatus=r)">查询</button>
      <div v-if="termStatus && typeof termStatus==='object'" class="cpre">{{ JSON.stringify(termStatus, null, 2) }}</div>
    </div>

    <!-- 可追溯 -->
    <div class="panel scan" style="display:flex;flex-direction:column;min-width:300px">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>可追溯 / TRACEABILITY<span class="idx">GOV · 03</span></div>
      <div class="cfield">
        <label>strategy_id</label>
        <input v-model="traceId" class="cinput" placeholder="demo" />
      </div>
      <div class="cbtn-row">
        <button :class="['ct-btn',{active:traceTab==='timeline'}]" @click="traceTab='timeline'">时间线</button>
        <button :class="['ct-btn',{active:traceTab==='causal'}]" @click="traceTab='causal'">因果链</button>
        <button :class="['ct-btn',{active:traceTab==='impact'}]" @click="traceTab='impact'">影响报告</button>
        <button class="cbtn" @click="doTrace">查询</button>
      </div>
      <ErrChip v-if="traceRes && isErr(traceRes)" title="可追溯数据暂不可用" :message="errMsg(traceRes)" hint="需有对应 strategy 的干预历史" @retry="traceRes=null" />
      <div v-else-if="traceRes && !traceRes.loading" class="cpre">{{ JSON.stringify(traceRes, null, 2) }}</div>
      <div v-else-if="traceRes?.loading" class="cloading">查询中…</div>
    </div>
  </div>
</template>
