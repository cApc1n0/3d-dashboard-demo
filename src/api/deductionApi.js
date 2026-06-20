import { backend } from './backend'

// 多智能体推演接口(/api/deduction)。混合信封:list 系返裸数组,单读返 {data,success};
// 适配层已统一归一(list 返数组、单读返对象)。无 .data。
export const deductionApi = {
  listAgents: (params) => backend.deduction.listAgents(params),
  getAgent: (id) => backend.deduction.getAgent(id),
  getExperience: (id, round) => backend.deduction.getExperience(id, round),
  getRelationshipGraph: (sessionId) => backend.deduction.getRelationshipGraph(sessionId),
  listAgentProjects: () => backend.deduction.listAgentProjects(),
  searchAgents: (keyword) => backend.deduction.searchAgents(keyword),
  listSessions: () => backend.deduction.listSessions(),
  getSession: (id) => backend.deduction.getSession(id),
  getSessionStatus: (id) => backend.deduction.getSessionStatus(id),
  createSession: (body) => backend.deduction.createSession(body),
  getSnapshot: (id, round) => backend.deduction.getSnapshot(id, round),
  getTimeline: (id) => backend.deduction.getTimeline(id),
  getReport: (id) => backend.deduction.getReport(id),
  getLog: (id, params) => backend.deduction.getLog(id, params),
  getLogSummary: (id) => backend.deduction.getLogSummary(id),
  getAgentStatus: (id) => backend.deduction.getAgentStatus(id),
  startSession: (id, body) => backend.deduction.startSession(id, body),
  pauseSession: (id) => backend.deduction.pauseSession(id),
  stopSession: (id) => backend.deduction.stopSession(id),
  nextRound: (id, body) => backend.deduction.nextRound(id, body),
  intervene: (id, body) => backend.deduction.intervene(id, body),
  aiAnalyze: (id, body) => backend.deduction.aiAnalyze(id, body),
  extractAgents: (formData) => backend.deduction.extractAgents(formData),
}
