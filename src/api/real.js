// 真实 POISS(Flask,默认 127.0.0.1:5124)适配层。
// 契约已对照 mac/MAC-POISS/poiss 源码核实(见 后端接入说明.md §B),并修正了早期文档与 mock
// 与源码不一致处 —— 一切以源码为准:
//   - DG(/api/dg/*):后端返回原始 JSON,无 .data 包装 → dgApi 直接用。
//   - Graph(/api/graph/data/<gid>):后端包成 {success, data:{nodes, edges, ...}};本层解包,
//     并把 graphiti 节点/边字段(uuid/name/labels/summary · source_node_uuid/target_node_uuid)
//     归一化成星云消费的 {id,label,name,type,degree,risk} / {source,target,valid_at,invalid_at,weight}。
//   - Sim:路径为 /api/simulation/<id>/run-status(源码,非文档写的 /status);后端 {success, data},
//     调用方取 .data → 本层原样返回 {success, data}。
//   - graphId/simId 缺省时,自动发现最新(图:GET /api/graph/neo4j-graphs;仿真:GET /history)。
//   - MindSpider 七平台统计后端尚未提供(后端接入说明 §B6-1 建议新增 /api/dg/session/<sid>/platform-stats):
//     尝试取,失败返空 {items:[]}(RightRail 已对 items 兜底)。
// 浏览器侧用相对路径 /api/* → 经 vite 代理转发到 VITE_POISS_TARGET(默认 127.0.0.1:5124),规避 CORS。
// 任何网络/解析错误:打 console.error 并返回 null/空结构,保证大屏不崩、可降级到"无数据"。

const BASE = import.meta.env.VITE_POISS_BASE || '' // 相对路径 → 走 vite 代理

async function http(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch (_) {
      /* 非 JSON 响应 */
    }
  }
  if (!res.ok && json == null) throw new Error(`HTTP ${res.status} @ ${path}`)
  return json
}

// multipart 上传(DG /analyze、Graph /upload+/build+/ontology、Bridge /file/to-poiss)
async function httpForm(path, formData) {
  const res = await fetch(BASE + path, { method: 'POST', body: formData })
  const text = await res.text()
  let json = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch (_) {
      /* 非 JSON */
    }
  }
  if (!res.ok && json == null) throw new Error(`HTTP ${res.status} @ ${path}`)
  return json
}

// 二进制下载(报告 docx、traceability 导出)
async function httpBlob(path) {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`HTTP ${res.status} @ ${path}`)
  return res.blob()
}

// 统一兜底:网络异常 → console.warn(不计为 error 级,保持 verify 干净)+ 返回 fallback。
// 注意:后端缺依赖时返回的是 200 + {success:false,error,...},不会抛异常 —— 调用方据此渲染 ErrChip。
const guard = async (label, fn, fallback) => {
  try {
    return await fn()
  } catch (e) {
    console.warn(`[real] ${label}:`, e.message)
    return fallback
  }
}

// ---- graphiti 节点 → 星云 9 类语义推断(与 KnowledgeNebula TYPE_COLORS 对齐)----
const TYPE_RULES = [
  ['event', /事件|舆情|危机|事故|爆发|演变|冲突/],
  ['media', /微博|抖音|知乎|b站|小红书|贴吧|快手|话题|热搜|媒体|新闻|日报|晚报|电视/],
  ['product', /产品|品牌|食品|奶粉|商品|药物|疫苗|餐饮/],
  ['action', /通报|召回|处置|限流|辟谣|应对|措施|应急|立案|处罚|下架|赔偿/],
  ['person', /消费者|博主|网民|当事人|受害者|用户|群众|公众|kol|专家|律师|作者/],
  ['org', /局|公司|集团|大学|政府|机构|企业|平台|中心|部门|协会|法院|检测|监管/],
  ['location', /地区|省|市|县|华东|华北|华南|华中|西南|西北|东北|海外|地带/],
  ['time', /\d{1,2}月|\d{1,2}日|\d{4}年|上午|下午|时段|周期|阶段/],
]
function inferType(labels = [], name = '', summary = '') {
  const label = String(labels.find((l) => l && l !== 'Entity' && l !== 'Node') || '').toLowerCase()
  for (const [t, re] of TYPE_RULES) if (re.test(label)) return t
  const text = `${label} ${name || ''} ${summary || ''}`
  for (const [t, re] of TYPE_RULES) if (re.test(text)) return t
  return 'concept'
}

// graphiti 原始图 → 星云 {nodes, edges}(消费方 graphApi 期望无 .data、字段已归一)
function normalizeGraph(payload) {
  const raw = payload?.data ?? payload ?? {}
  const rawNodes = raw.nodes || raw.node_list || []
  const rawEdges = raw.edges || raw.edge_list || []
  const idOf = (n) => n.uuid || n.id || n.name
  const nodes = rawNodes
    .filter((n) => idOf(n))
    .map((n) => ({
      id: idOf(n),
      label: n.name || n.label || idOf(n),
      name: n.name || n.label || idOf(n),
      type: inferType(n.labels, n.name, n.summary),
      degree: 0,
      risk: Number(n.risk ?? 0) || 0,
    }))
  const idx = new Map(nodes.map((n) => [n.id, n]))
  const edges = []
  for (const e of rawEdges) {
    const s = e.source_node_uuid || e.source
    const t = e.target_node_uuid || e.target
    if (!s || !t) continue
    edges.push({
      source: s,
      target: t,
      valid_at: e.valid_at || null,
      invalid_at: e.invalid_at || e.expired_at || null,
      weight: Number(e.weight ?? 0.5),
    })
    if (idx.has(s)) idx.get(s).degree++
    if (idx.has(t)) idx.get(t).degree++
  }
  return { nodes, edges }
}

async function getPlatformStats(sid) {
  // MindSpider 七平台聚合接口后端尚未提供(后端接入说明 §B6-1)。
  // 默认不请求(避免浏览器对不存在端点的 404 网络报错);后端实现后设 VITE_PLATFORM_STATS=true 启用。
  if (!sid || import.meta.env.VITE_PLATFORM_STATS !== 'true') return { items: [] }
  try {
    const j = await http(`/api/dg/session/${sid}/platform-stats`)
    if (j && Array.isArray(j.items)) return j
    if (j && Array.isArray(j.data?.items)) return j.data
    return { items: [] }
  } catch (e) {
    console.warn('[real] platform-stats 暂不可用(后端待新增):', e.message)
    return { items: [] }
  }
}

export function createRealApi() {
  return {
    // ---- DG:无 .data(后端原始 JSON)----
    dg: {
      async listSessions() {
        return guard('dg.listSessions', async () => (await http('/api/dg/sessions')) || { sessions: [], total: 0 }, { sessions: [], total: 0 })
      },
      async getSession(sid) {
        if (!sid) return null
        return guard('dg.getSession', async () => http(`/api/dg/session/${sid}`), null)
      },
      async getDetail(sid) {
        if (!sid) return null
        return guard('dg.getDetail', async () => http(`/api/dg/session/${sid}/detail`), null)
      },
      async getRiskDecomposition(sid) {
        if (!sid) return null
        return guard('dg.getRiskDecomposition', async () => http(`/api/dg/session/${sid}/risk/decomposition`), null)
      },
      async getComparison(sid) {
        if (!sid) return null
        return guard('dg.getComparison', async () => http(`/api/dg/session/${sid}/comparison`), null)
      },
      async getStrategyPlan(sid) {
        if (!sid) return null
        return guard('dg.getStrategyPlan', async () => http(`/api/dg/session/${sid}/strategy-plan`), null)
      },
      // 动作类(重依赖:LLM)
      async analyze(file) {
        const fd = new FormData()
        fd.append('file', file)
        return guard('dg.analyze', async () => httpForm('/api/dg/analyze', fd), { error: 'analyze 失败' })
      },
      async iterate(sid, params = {}) {
        if (!sid) return null
        return guard('dg.iterate', async () => http(`/api/dg/session/${sid}/iterate`, { method: 'POST', body: params }), null)
      },
      async getIterateStatus(sid) {
        if (!sid) return null
        return guard('dg.getIterateStatus', async () => http(`/api/dg/session/${sid}/iterate/status`), null)
      },
      async getIterateChart(sid) {
        if (!sid) return null
        return guard('dg.getIterateChart', async () => http(`/api/dg/session/${sid}/iterate/chart`), null)
      },
      async getReport(sid) {
        if (!sid) return null
        return guard('dg.getReport', async () => httpBlob(`/api/dg/session/${sid}/report`), null)
      },
    },
    // ---- Graph:解 .data + 字段归一(消费方期望无 .data)----
    graph: {
      async getGraphData(graphId) {
        return guard('graph.getGraphData', async () => {
          let gid = graphId
          if (!gid) {
            const pl = await http('/api/graph/project/list')
            gid = ((pl?.data || []).find((p) => p.graph_id) || {}).graph_id
            if (!gid) {
              try {
                const list = await http('/api/graph/neo4j-graphs')
                const arr = (list?.data || [])
                  .slice()
                  .sort((a, b) => String(b.first_created || '').localeCompare(String(a.first_created || '')))
                gid = arr[0]?.graph_id
              } catch (_) {
                /* Neo4j 不可用 */
              }
            }
          }
          if (!gid) return null
          const payload = await http(`/api/graph/data/${gid}`)
          return normalizeGraph(payload)
        }, null)
      },
      async getGraphAnalysis(graphId) {
        // ⚠ 重依赖:需 embedding 配置(Neo4j/OpenAI),当前环境会返回 {error:...} → 组件渲染 ErrChip
        if (!graphId) return null
        return guard('graph.getGraphAnalysis', async () => {
          const j = await http(`/api/graph/graph/${graphId}/analysis`)
          return j?.data || j
        }, null)
      },
      async listProjects() {
        return guard('graph.listProjects', async () => {
          const j = await http('/api/graph/project/list')
          return j?.data || []
        }, [])
      },
      async listNeo4jGraphs() {
        return guard('graph.listNeo4jGraphs', async () => {
          const j = await http('/api/graph/neo4j-graphs')
          return j?.data || []
        }, [])
      },
      // 上传 JSON 图谱(文件后端,现在可用)
      async uploadGraph(projectId, file) {
        const fd = new FormData()
        fd.append('project_id', projectId)
        fd.append('file', file)
        return guard('graph.uploadGraph', async () => httpForm('/api/graph/upload', fd), { success: false, error: '上传失败' })
      },
      async createProject(name) {
        return guard('graph.createProject', async () => http('/api/graph/project/create', { method: 'POST', body: { name } }), null)
      },
      // 动作类(重依赖:LLM+Neo4j,异步任务)
      async buildGraph(params) {
        return guard('graph.buildGraph', async () => http('/api/graph/build', { method: 'POST', body: params }), null)
      },
      async getTask(taskId) {
        if (!taskId) return null
        return guard('graph.getTask', async () => {
          const j = await http(`/api/graph/task/${taskId}`)
          return j?.data || j
        }, null)
      },
      async generateOntology(formData) {
        return guard('graph.generateOntology', async () => httpForm('/api/graph/ontology/generate', formData), null)
      },
    },
    // ---- Sim:{success, data}(消费方取 .data)----
    sim: {
      async getRunStatus(simId) {
        return guard('sim.getRunStatus', async () => {
          let id = simId
          if (!id) {
            const h = await http('/api/simulation/history')
            const arr = (h?.data || [])
              .slice()
              .sort((a, b) =>
                String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''))
              )
            id = arr[0]?.simulation_id
          }
          if (!id) return { success: true, data: null }
          return http(`/api/simulation/${id}/run-status`)
        }, { success: false, data: null })
      },
      async getSimulationHistory() {
        return guard('sim.getSimulationHistory', async () => (await http('/api/simulation/history')) || { success: true, data: [] }, { success: true, data: [] })
      },
      async list() {
        return guard('sim.list', async () => {
          const j = await http('/api/simulation/list')
          return j?.data || []
        }, [])
      },
      async getAgentStats(simId) {
        if (!simId) return null
        return guard('sim.getAgentStats', async () => {
          const j = await http(`/api/simulation/${simId}/agent-stats`)
          return j?.data || j
        }, null)
      },
      async getTimeline(simId) {
        if (!simId) return null
        return guard('sim.getTimeline', async () => {
          const j = await http(`/api/simulation/${simId}/timeline`)
          return j?.data || j
        }, null)
      },
      // 动作类(重依赖:OASIS/LLM)
      async create(body) {
        return guard('sim.create', async () => http('/api/simulation/create', { method: 'POST', body }), null)
      },
      async prepare(simId, body = {}) {
        if (!simId) return null
        return guard('sim.prepare', async () => http(`/api/simulation/prepare`, { method: 'POST', body: { simulation_id: simId, ...body } }), null)
      },
      async start(simId, body = {}) {
        if (!simId) return null
        return guard('sim.start', async () => http('/api/simulation/start', { method: 'POST', body: { simulation_id: simId, ...body } }), null)
      },
      async stop(simId) {
        if (!simId) return null
        return guard('sim.stop', async () => http('/api/simulation/stop', { method: 'POST', body: { simulation_id: simId } }), null)
      },
      async interview(body) {
        return guard('sim.interview', async () => http('/api/simulation/interview', { method: 'POST', body }), null)
      },
    },
    // ---- Spider(MindSpider):后端待新增(B6-1)----
    spider: { getPlatformStats },

    // ---- Deduction:推演(agent/session)---- 混合信封:list 返裸数组,单读/proj 返 {data,success}
    deduction: {
      async listAgents(params = {}) {
        const qs = new URLSearchParams(params).toString()
        return guard('deduction.listAgents', async () => {
          const j = await http(`/api/deduction/agent/list${qs ? '?' + qs : ''}`)
          return Array.isArray(j) ? j : j?.data || []
        }, [])
      },
      async getAgent(id) {
        if (!id) return null
        return guard('deduction.getAgent', async () => http(`/api/deduction/agent/${id}`), null)
      },
      async getExperience(id, round) {
        if (!id) return null
        const qs = round != null ? `?round_number=${round}` : ''
        return guard('deduction.getExperience', async () => http(`/api/deduction/agent/${id}/experience${qs}`), null)
      },
      async getRelationshipGraph(sessionId) {
        if (!sessionId) return null
        return guard('deduction.getRelationshipGraph', async () => http(`/api/deduction/agent/relationship-graph?session_id=${sessionId}`), null)
      },
      async listAgentProjects() {
        return guard('deduction.listAgentProjects', async () => {
          const j = await http('/api/deduction/agent/projects')
          return j?.data || []
        }, [])
      },
      async searchAgents(keyword) {
        return guard('deduction.searchAgents', async () => {
          const j = await http(`/api/deduction/agent/search?keyword=${encodeURIComponent(keyword)}`)
          return Array.isArray(j) ? j : j?.data || []
        }, [])
      },
      async listSessions() {
        return guard('deduction.listSessions', async () => {
          const j = await http('/api/deduction/session/list')
          return Array.isArray(j) ? j : j?.data || []
        }, [])
      },
      async getSession(id) {
        if (!id) return null
        return guard('deduction.getSession', async () => http(`/api/deduction/session/${id}`), null)
      },
      async getSessionStatus(id) {
        if (!id) return null
        return guard('deduction.getSessionStatus', async () => http(`/api/deduction/session/${id}/status`), null)
      },
      async createSession(body) {
        return guard('deduction.createSession', async () => http('/api/deduction/session/create', { method: 'POST', body }), null)
      },
      async getSnapshot(id, round) {
        if (!id) return null
        return guard('deduction.getSnapshot', async () => http(`/api/deduction/session/${id}/snapshot/${round}`), null)
      },
      async getTimeline(id) {
        if (!id) return null
        return guard('deduction.getTimeline', async () => http(`/api/deduction/session/${id}/timeline`), null)
      },
      async getReport(id) {
        if (!id) return null
        return guard('deduction.getReport', async () => http(`/api/deduction/session/${id}/report`), null)
      },
      async getLog(id, params = {}) {
        if (!id) return null
        const qs = new URLSearchParams(params).toString()
        return guard('deduction.getLog', async () => http(`/api/deduction/session/${id}/log${qs ? '?' + qs : ''}`), null)
      },
      async getLogSummary(id) {
        if (!id) return null
        return guard('deduction.getLogSummary', async () => http(`/api/deduction/session/${id}/log/summary`), null)
      },
      async getAgentStatus(id) {
        if (!id) return null
        return guard('deduction.getAgentStatus', async () => http(`/api/deduction/session/${id}/agent-status`), null)
      },
      // 动作类
      async startSession(id, body = {}) {
        if (!id) return null
        return guard('deduction.startSession', async () => http(`/api/deduction/session/${id}/start`, { method: 'POST', body }), null)
      },
      async pauseSession(id) {
        if (!id) return null
        return guard('deduction.pauseSession', async () => http(`/api/deduction/session/${id}/pause`, { method: 'POST' }), null)
      },
      async stopSession(id) {
        if (!id) return null
        return guard('deduction.stopSession', async () => http(`/api/deduction/session/${id}/stop`, { method: 'POST' }), null)
      },
      async nextRound(id, body = {}) {
        if (!id) return null
        return guard('deduction.nextRound', async () => http(`/api/deduction/session/${id}/next-round`, { method: 'POST', body }), null)
      },
      async intervene(id, body) {
        if (!id) return null
        return guard('deduction.intervene', async () => http(`/api/deduction/session/${id}/intervene`, { method: 'POST', body }), null)
      },
      async aiAnalyze(id, body) {
        if (!id) return null
        return guard('deduction.aiAnalyze', async () => http(`/api/deduction/session/${id}/ai-analyze`, { method: 'POST', body }), null)
      },
      async extractAgents(formData) {
        return guard('deduction.extractAgents', async () => httpForm('/api/deduction/agent/extract', formData), null)
      },
    },

    // ---- Strategy 套件:{success,data}(部分裸 {suites})----
    strategy: {
      async list() {
        return guard('strategy.list', async () => {
          const j = await http('/api/strategy/suite/list')
          return j?.suites || j?.data || []
        }, [])
      },
      async getStatus(suiteId) {
        if (!suiteId) return null
        return guard('strategy.getStatus', async () => http(`/api/strategy/suite/${suiteId}/status`), null)
      },
      async getResults(suiteId) {
        if (!suiteId) return null
        return guard('strategy.getResults', async () => http(`/api/strategy/suite/${suiteId}/results`), null)
      },
      async compare(suiteId) {
        if (!suiteId) return null
        return guard('strategy.compare', async () => http(`/api/strategy/suite/${suiteId}/compare`), null)
      },
      async getTimeline(suiteId) {
        if (!suiteId) return null
        return guard('strategy.getTimeline', async () => http(`/api/strategy/suite/${suiteId}/timeline`), null)
      },
      async create(body) {
        return guard('strategy.create', async () => http('/api/strategy/suite/create', { method: 'POST', body }), null)
      },
      async run(suiteId) {
        if (!suiteId) return null
        return guard('strategy.run', async () => http(`/api/strategy/suite/${suiteId}/run`, { method: 'POST' }), null)
      },
      async stop(suiteId) {
        if (!suiteId) return null
        return guard('strategy.stop', async () => http(`/api/strategy/suite/${suiteId}/stop`, { method: 'POST' }), null)
      },
    },

    // ---- Intervention:干预(裸 JSON)----
    intervention: {
      async getTypes() {
        return guard('intervention.getTypes', async () => http('/api/intervention/types'), null)
      },
      async getHistory(strategyId, params = {}) {
        if (!strategyId) return []
        const qs = new URLSearchParams(params).toString()
        return guard('intervention.getHistory', async () => {
          const j = await http(`/api/intervention/${strategyId}/history${qs ? '?' + qs : ''}`)
          return Array.isArray(j) ? j : j?.data || j?.history || []
        }, [])
      },
      async getSummary(strategyId) {
        if (!strategyId) return null
        return guard('intervention.getSummary', async () => http(`/api/intervention/${strategyId}/summary`), null)
      },
      async autoRegister(body) {
        return guard('intervention.autoRegister', async () => http('/api/intervention/auto/register', { method: 'POST', body }), null)
      },
      async manualExecute(body) {
        return guard('intervention.manualExecute', async () => http('/api/intervention/manual/execute', { method: 'POST', body }), null)
      },
    },

    // ---- Termination:终止/kill-switch(裸 JSON)----
    termination: {
      async getRules(strategyId) {
        if (!strategyId) return null
        return guard('termination.getRules', async () => http(`/api/termination/rules/${strategyId}`), null)
      },
      async setRules(strategyId, body) {
        if (!strategyId) return null
        return guard('termination.setRules', async () => http(`/api/termination/rules/${strategyId}`, { method: 'POST', body }), null)
      },
      async emergency(suiteId, body = {}) {
        if (!suiteId) return null
        return guard('termination.emergency', async () => http(`/api/termination/emergency/${suiteId}`, { method: 'POST', body }), null)
      },
      async getStatus(strategyId) {
        if (!strategyId) return null
        return guard('termination.getStatus', async () => http(`/api/termination/status/${strategyId}`), null)
      },
    },

    // ---- Traceability:可追溯({success,data})----
    traceability: {
      async timeline(strategyId) {
        if (!strategyId) return null
        return guard('traceability.timeline', async () => {
          const j = await http(`/api/traceability/${strategyId}/timeline`)
          return j?.data || j
        }, null)
      },
      async causalChain(strategyId) {
        if (!strategyId) return null
        return guard('traceability.causalChain', async () => {
          const j = await http(`/api/traceability/${strategyId}/causal-chain`)
          return j?.data || j
        }, null)
      },
      async impactReport(strategyId) {
        if (!strategyId) return null
        return guard('traceability.impactReport', async () => {
          const j = await http(`/api/traceability/${strategyId}/impact-report`)
          return j?.data || j
        }, null)
      },
      async exportBundle(strategyId, fmt = 'json') {
        if (!strategyId) return null
        return guard('traceability.export', async () => httpBlob(`/api/traceability/${strategyId}/export?format=${fmt}`), null)
      },
    },

    // ---- Report:套件级报告(裸 JSON)----
    report: {
      async generate(suiteId) {
        if (!suiteId) return null
        return guard('report.generate', async () => http('/api/report/generate', { method: 'POST', body: { suite_id: suiteId } }), null)
      },
      async get(reportId) {
        if (!reportId) return null
        return guard('report.get', async () => http(`/api/report/${reportId}`), null)
      },
      async download(reportId, fmt = 'md') {
        if (!reportId) return null
        return guard('report.download', async () => httpBlob(`/api/report/${reportId}/download/${fmt}`), null)
      },
      async bySuite(suiteId) {
        if (!suiteId) return []
        return guard('report.bySuite', async () => {
          const j = await http(`/api/report/by-suite/${suiteId}`)
          return Array.isArray(j) ? j : j?.data || j?.reports || []
        }, [])
      },
    },

    // ---- Bridge:DG↔POISS 闭环({data,success})----
    bridge: {
      async listPoissProjects() {
        return guard('bridge.listPoissProjects', async () => {
          const j = await http('/api/bridge/poiss/projects')
          return j?.data || []
        }, [])
      },
      async getPoissStrategies(projectId) {
        if (!projectId) return null
        return guard('bridge.getPoissStrategies', async () => http(`/api/bridge/poiss/project/${projectId}/strategies`), null)
      },
      async listPoissSims() {
        return guard('bridge.listPoissSims', async () => {
          const j = await http('/api/bridge/poiss/simulations')
          return j?.data || []
        }, [])
      },
      async getPoissDeduction(sid) {
        if (!sid) return null
        return guard('bridge.getPoissDeduction', async () => http(`/api/bridge/poiss/deduction/${sid}`), null)
      },
      async getPoissReport(rid) {
        if (!rid) return null
        return guard('bridge.getPoissReport', async () => http(`/api/bridge/poiss/report/${rid}`), null)
      },
      async transferDgToPoiss(body) {
        return guard('bridge.transferDgToPoiss', async () => http('/api/bridge/transfer/dg-to-poiss', { method: 'POST', body }), null)
      },
      async transferPoissToDg(body) {
        return guard('bridge.transferPoissToDg', async () => http('/api/bridge/transfer/poiss-to-dg', { method: 'POST', body }), null)
      },
      async getPoissReportFile(rid) {
        if (!rid) return null
        return guard('bridge.getPoissReportFile', async () => httpBlob(`/api/bridge/file/poiss-report/${rid}`), null)
      },
    },
  }
}
