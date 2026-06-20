import { backend } from './backend'

// DG 决策生成接口。对齐 POISS DGAPI:返回后端原始 JSON,无 .data 包装。
export const dgApi = {
  listSessions: () => backend.dg.listSessions(),
  getSession: (sid) => backend.dg.getSession(sid),
  getDetail: (sid) => backend.dg.getDetail(sid),
  getRiskDecomposition: (sid) => backend.dg.getRiskDecomposition(sid),
  getComparison: (sid) => backend.dg.getComparison(sid),
  getStrategyPlan: (sid) => backend.dg.getStrategyPlan(sid),
  // 动作类(重依赖:LLM)
  analyze: (file) => backend.dg.analyze(file),
  iterate: (sid, params) => backend.dg.iterate(sid, params),
  getIterateStatus: (sid) => backend.dg.getIterateStatus(sid),
  getIterateChart: (sid) => backend.dg.getIterateChart(sid),
  getReport: (sid) => backend.dg.getReport(sid),
}
