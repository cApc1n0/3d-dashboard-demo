import sessions from './sessions.json'
import graph from './graph.json'
import sim from './sim.json'

const LATENCY = 200
const wait = (ms = LATENCY) => new Promise((r) => setTimeout(r, ms))
const clone = (v) => JSON.parse(JSON.stringify(v))

const sessionOf = (sid) => sessions.bySession[sid] ?? sessions.bySession[sessions.default]

// 重依赖占位:mock 下也走 ErrChip 路径(组件据此渲染降级芯片)
const CONFIG_ERR = { success: false, error: 'config_error', message: 'mock: 重依赖(LLM/Neo4j/OASIS)在 mock 下不可用' }

export function createMockApi() {
  return {
    // ---- DG:无 .data ----
    dg: {
      async listSessions() {
        await wait()
        return clone({ sessions: sessions.sessions, total: sessions.sessions.length })
      },
      async getSession(sid) {
        await wait()
        const s = sessions.sessions.find((x) => x.session_id === sid) || sessions.sessions[0]
        return clone(s)
      },
      async getDetail(sid) {
        await wait()
        return clone(sessionOf(sid).detail)
      },
      async getRiskDecomposition(sid) {
        await wait()
        return clone(sessionOf(sid).decomposition)
      },
      async getComparison(sid) {
        await wait()
        return { phase1_prediction: { initial_risk_score: 67.4 }, scenario_predictions: [] }
      },
      async getStrategyPlan(sid) {
        await wait()
        return { plan_id: 'mock', scenarios: [] }
      },
      async analyze() {
        await wait()
        return clone(CONFIG_ERR)
      },
      async iterate() {
        await wait()
        return clone(CONFIG_ERR)
      },
      async getIterateStatus() {
        await wait()
        return { status: 'not_started', iterations: [] }
      },
      async getIterateChart() {
        await wait()
        return null
      },
      async getReport() {
        await wait()
        return null
      },
    },
    // ---- Graph:无 .data(归一后)----
    graph: {
      async getGraphData() {
        await wait()
        return clone(graph.data)
      },
      async getGraphAnalysis() {
        await wait()
        return clone(graph.analysis)
      },
      async listProjects() {
        await wait()
        return [{ project_id: 'proj_mock', name: 'mock 项目', graph_id: 'uploaded_mock', status: 'graph_completed' }]
      },
      async listNeo4jGraphs() {
        await wait()
        return []
      },
      async createProject(name) {
        await wait()
        return { project_id: 'proj_mock', name, status: 'created' }
      },
      async uploadGraph() {
        await wait()
        return { success: true, graph_id: 'uploaded_mock', node_count: 24, edge_count: 35 }
      },
      async buildGraph() {
        await wait()
        return clone(CONFIG_ERR)
      },
      async getTask() {
        await wait()
        return null
      },
      async generateOntology() {
        await wait()
        return clone(CONFIG_ERR)
      },
    },
    // ---- Sim:{success, data} ----
    sim: {
      async getRunStatus() {
        await wait()
        return clone({ success: true, data: sim.runStatus })
      },
      async getSimulationHistory() {
        await wait()
        return clone({ success: true, data: sim.history })
      },
      async list() {
        await wait()
        return clone(sim.history)
      },
      async getAgentStats() {
        await wait()
        return null
      },
      async getTimeline() {
        await wait()
        return null
      },
      async create() {
        await wait()
        return clone(CONFIG_ERR)
      },
      async prepare() {
        await wait()
        return clone(CONFIG_ERR)
      },
      async start() {
        await wait()
        return clone(CONFIG_ERR)
      },
      async stop() {
        await wait()
        return clone(CONFIG_ERR)
      },
      async interview() {
        await wait()
        return clone(CONFIG_ERR)
      },
    },
    // ---- Spider(MindSpider):无 .data ----
    spider: {
      async getPlatformStats(sid) {
        await wait()
        return clone(sessionOf(sid).platformStats)
      },
    },
    // ---- Deduction:推演 ----
    deduction: {
      async listAgents() {
        await wait()
        return []
      },
      async getAgent() {
        await wait()
        return null
      },
      async getExperience() {
        await wait()
        return null
      },
      async getRelationshipGraph() {
        await wait()
        return null
      },
      async listAgentProjects() {
        await wait()
        return []
      },
      async searchAgents() {
        await wait()
        return []
      },
      async listSessions() {
        await wait()
        return []
      },
      async getSession() {
        await wait()
        return null
      },
      async getSessionStatus() {
        await wait()
        return null
      },
      async createSession() {
        await wait()
        return { session_id: 'ded_mock', status: 'created' }
      },
      async getSnapshot() {
        await wait()
        return null
      },
      async getTimeline() {
        await wait()
        return null
      },
      async getReport() {
        await wait()
        return null
      },
      async getLog() {
        await wait()
        return null
      },
      async getLogSummary() {
        await wait()
        return null
      },
      async getAgentStatus() {
        await wait()
        return null
      },
      async startSession() {
        await wait()
        return clone(CONFIG_ERR)
      },
      async pauseSession() {
        await wait()
        return null
      },
      async stopSession() {
        await wait()
        return null
      },
      async nextRound() {
        await wait()
        return clone(CONFIG_ERR)
      },
      async intervene() {
        await wait()
        return { pending_count: 0 }
      },
      async aiAnalyze() {
        await wait()
        return clone(CONFIG_ERR)
      },
      async extractAgents() {
        await wait()
        return clone(CONFIG_ERR)
      },
    },
    // ---- Strategy 套件 ----
    strategy: {
      async list() {
        await wait()
        return []
      },
      async getStatus() {
        await wait()
        return null
      },
      async getResults() {
        await wait()
        return null
      },
      async compare() {
        await wait()
        return null
      },
      async getTimeline() {
        await wait()
        return null
      },
      async create() {
        await wait()
        return { suite_id: 'suite_mock', status: 'created' }
      },
      async run() {
        await wait()
        return clone(CONFIG_ERR)
      },
      async stop() {
        await wait()
        return null
      },
    },
    // ---- Intervention ----
    intervention: {
      async getTypes() {
        await wait()
        return { intervention_types: { delete_post: { params: ['post_id', 'reason'] }, publish_correction: { params: ['content'] } } }
      },
      async getHistory() {
        await wait()
        return []
      },
      async getSummary() {
        await wait()
        return null
      },
      async autoRegister() {
        await wait()
        return { status: 'registered' }
      },
      async manualExecute() {
        await wait()
        return { status: 'executed' }
      },
    },
    // ---- Termination ----
    termination: {
      async getRules() {
        await wait()
        return null
      },
      async setRules() {
        await wait()
        return null
      },
      async emergency() {
        await wait()
        return { status: 'terminated', event: 'mock' }
      },
      async getStatus() {
        await wait()
        return null
      },
    },
    // ---- Traceability ----
    traceability: {
      async timeline() {
        await wait()
        return null
      },
      async causalChain() {
        await wait()
        return null
      },
      async impactReport() {
        await wait()
        return null
      },
      async exportBundle() {
        await wait()
        return null
      },
    },
    // ---- Report ----
    report: {
      async generate() {
        await wait()
        return clone(CONFIG_ERR)
      },
      async get() {
        await wait()
        return null
      },
      async download() {
        await wait()
        return null
      },
      async bySuite() {
        await wait()
        return []
      },
    },
    // ---- Bridge ----
    bridge: {
      async listPoissProjects() {
        await wait()
        return [{ project_id: 'proj_mock', name: 'mock 项目', graph_id: 'uploaded_mock' }]
      },
      async getPoissStrategies() {
        await wait()
        return { type: 'basic_strategies', summary: { government: 3, platform: 3, public: 3 } }
      },
      async listPoissSims() {
        await wait()
        return []
      },
      async getPoissDeduction() {
        await wait()
        return null
      },
      async getPoissReport() {
        await wait()
        return null
      },
      async transferDgToPoiss() {
        await wait()
        return clone(CONFIG_ERR)
      },
      async transferPoissToDg() {
        await wait()
        return { status: 'transferred' }
      },
      async getPoissReportFile() {
        await wait()
        return null
      },
    },
  }
}
