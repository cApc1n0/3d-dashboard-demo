<script setup>
import { ref, onMounted } from 'vue'
import { graphApi } from '@/api'
import ErrChip from './ErrChip.vue'
import FileUpload from './FileUpload.vue'
import TaskPoller from './TaskPoller.vue'

const projects = ref([])
const selProject = ref(null)
const graphData = ref(null)
const analysis = ref(null)
const analysisErr = ref(null)
const loading = ref(true)
const uploadRes = ref(null)
const buildRes = ref(null)
const buildActive = ref(false)
const buildTaskId = ref(null)
const ontologyRes = ref(null)

const isErr = (r) => !!r && (r.success === false || (!!r.error && !r.success))
const errMsg = (r) => r?.message || r?.error || '未知错误'

async function load() {
  loading.value = true
  projects.value = await graphApi.listProjects()
  if (projects.value.length) await select(projects.value[0])
  loading.value = false
}
async function select(p) {
  selProject.value = p
  graphData.value = null
  analysis.value = null
  analysisErr.value = null
  if (!p?.graph_id) return
  graphData.value = await graphApi.getGraphData(p.graph_id)
}
async function loadAnalysis() {
  analysis.value = null
  analysisErr.value = null
  if (!selProject.value?.graph_id) return
  // 图谱质量分析(重依赖:embedding 配置)→ 多半 ErrChip;按需触发,避免自动 500 报错
  const a = await graphApi.getGraphAnalysis(selProject.value.graph_id)
  if (isErr(a) || !a) analysisErr.value = a
  else analysis.value = a
}
async function onUpload(file) {
  if (!selProject.value) {
    const np = await graphApi.createProject('console 上传')
    if (np?.project_id || np?.data?.project_id) {
      const pid = np.project_id || np.data.project_id
      selProject.value = { project_id: pid, name: 'console 上传' }
    }
  }
  uploadRes.value = await graphApi.uploadGraph(selProject.value.project_id, file)
  if (uploadRes.value?.graph_id) await load()
}
async function onBuild(file) {
  // 真实建图需先 ontology→build;此处演示触发 build(需 project_id)
  buildRes.value = null
  const pid = selProject.value?.project_id
  if (!pid) {
    buildRes.value = { error: '请先选择/创建项目' }
    return
  }
  buildRes.value = await graphApi.buildGraph({ project_id: pid, graph_name: 'console build' })
  if (buildRes.value?.data?.task_id || buildRes.value?.task_id) {
    buildTaskId.value = buildRes.value.data?.task_id || buildRes.value.task_id
    buildActive.value = true
  }
}
async function onOntology(file) {
  const fd = new FormData()
  fd.append('files', file)
  fd.append('simulation_requirement', '舆情态势分析')
  fd.append('project_name', 'console 本体')
  ontologyRes.value = await graphApi.generateOntology(fd)
}
onMounted(load)
</script>

<template>
  <div class="cgrid">
    <!-- 左:项目列表 + 上传/建图/本体 -->
    <div class="panel scan" style="display:flex;flex-direction:column">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>项目 / PROJECTS<span class="idx">GRAPH · 01</span></div>
      <div v-if="loading" class="cloading">载入中…</div>
      <div v-else-if="!projects.length" class="cempty">暂无项目 · 上传图谱自动创建</div>
      <div v-else class="clist">
        <div v-for="p in projects" :key="p.project_id" class="crow" :class="{sel:selProject?.project_id===p.project_id}" @click="select(p)">
          <span class="ck">{{ p.project_id.slice(0,12) }}</span>
          <span class="cv">{{ p.name }}</span>
          <span class="cmeta" :style="{color:p.graph_id?'var(--l1)':'var(--text-dim)'}">{{ p.graph_id ? '✓ 图谱' : '无图' }}</span>
        </div>
      </div>

      <div class="csec-title" style="margin-top:14px">上传 JSON 图谱(文件后端 · 现在可用)</div>
      <FileUpload accept=".json" label="上传 {nodes,edges} 图谱文件" @file="onUpload" />
      <div v-if="uploadRes?.graph_id" class="csub">✓ 已上传 {{ uploadRes.graph_id }} · {{ uploadRes.node_count }} 节点</div>

      <div class="csec-title" style="margin-top:12px">构建图谱(重依赖 · Neo4j+LLM)</div>
      <FileUpload accept=".pdf,.md,.txt,.docx" label="上传文档 → 本体生成" @file="onOntology" />
      <ErrChip v-if="ontologyRes && isErr(ontologyRes)" title="本体生成暂不可用" :message="errMsg(ontologyRes)" hint="需 Neo4j 运行 + LLM_API_KEY" @retry="ontologyRes=null" />
      <FileUpload accept=".pdf,.md,.txt,.docx" label="上传文档 → 构建图谱" @file="onBuild" />
      <ErrChip v-if="buildRes && isErr(buildRes)" title="图谱构建暂不可用" :message="errMsg(buildRes)" hint="需 Neo4j + LLM_API_KEY" @retry="buildRes=null" />
      <TaskPoller v-if="buildActive" :active="buildActive" :poll="() => graphApi.getTask(buildTaskId)" :is-terminal="(r) => r?.status==='completed'||r?.status==='failed'" @terminal="buildActive=false">
        <template #default="{ state, result }">
          <div class="csub">构建任务 {{ state }} · {{ result?.progress ?? '' }}% {{ result?.message || '' }}</div>
        </template>
      </TaskPoller>
    </div>

    <!-- 右:图谱数据 + 质量分析 -->
    <div class="panel scan flex" style="display:flex;flex-direction:column;min-width:320px">
      <div class="scanlines"></div>
      <div class="panel-title"><span class="dot"></span>图谱 / GRAPH DATA<span class="idx">GRAPH · 02</span></div>
      <div v-if="!selProject" class="cempty">选择左侧项目</div>
      <template v-else>
        <div class="cvtable" style="margin-bottom:12px">
          <span class="k">graph_id</span><span class="v">{{ selProject.graph_id || '—' }}</span>
          <span class="k">节点 / 边</span><span class="v">{{ graphData?.nodes?.length ?? 0 }} / {{ graphData?.edges?.length ?? 0 }}</span>
        </div>
        <div class="csec-title">图谱质量分析</div>
        <button class="cbtn" @click="loadAnalysis" style="margin-bottom:8px">运行质量分析</button>
        <ErrChip v-if="analysisErr" title="质量分析暂不可用" :message="errMsg(analysisErr)" hint="该端点需 embedding 配置(Neo4j+OpenAI),属重依赖" @retry="loadAnalysis" />
        <div v-else-if="analysis" class="cvtable">
          <span class="k">密度</span><span class="v">{{ analysis.density }}</span>
          <span class="k">连通性</span><span class="v">{{ analysis.connectivity }}</span>
          <span class="k">实体覆盖</span><span class="v">{{ analysis.entity_coverage }}</span>
          <span class="k">孤立节点</span><span class="v">{{ analysis.isolated_nodes }}</span>
          <span class="k">分量数</span><span class="v">{{ analysis.component_count }}</span>
        </div>
        <div v-else class="cempty">无分析数据</div>
      </template>
    </div>
  </div>
</template>
