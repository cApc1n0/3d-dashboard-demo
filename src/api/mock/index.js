import sessions from './sessions.json'
import graph from './graph.json'
import sim from './sim.json'

const LATENCY = 200
const wait = (ms = LATENCY) => new Promise((r) => setTimeout(r, ms))
const clone = (v) => JSON.parse(JSON.stringify(v))

const sessionOf = (sid) => sessions.bySession[sid] ?? sessions.bySession[sessions.default]

export function createMockApi() {
  return {
    // ---- DG:无 .data ----
    dg: {
      async listSessions() {
        await wait()
        // 注意:sessions 未排序,调用方取最新需自行 sort(还原真实坑)
        return clone({ sessions: sessions.sessions, total: sessions.sessions.length })
      },
      async getDetail(sid) {
        await wait()
        return clone(sessionOf(sid).detail)
      },
      async getRiskDecomposition(sid) {
        await wait()
        return clone(sessionOf(sid).decomposition)
      },
    },
    // ---- Graph:无 .data ----
    graph: {
      async getGraphData(_graphId) {
        await wait()
        return clone(graph.data)
      },
      async getGraphAnalysis(_graphId) {
        await wait()
        return clone(graph.analysis)
      },
    },
    // ---- Sim:POISS API 风格 { success, data } ----
    sim: {
      async getRunStatus(_simId) {
        await wait()
        return clone({ success: true, data: sim.runStatus })
      },
      async getSimulationHistory() {
        await wait()
        // history 未排序,调用方取首需 sort(还原真实坑)
        return clone({ success: true, data: sim.history })
      },
    },
    // ---- Spider(MindSpider):无 .data ----
    spider: {
      async getPlatformStats(sid) {
        await wait()
        return clone(sessionOf(sid).platformStats)
      },
    },
  }
}
