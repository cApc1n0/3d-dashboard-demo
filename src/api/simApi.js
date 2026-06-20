import { backend } from './backend'

// POISS 仿真接口。对齐 POISS 的 API._api() 封装:返回 { success, data },调用方必须取 .data。
export const simApi = {
  getRunStatus: (simId) => backend.sim.getRunStatus(simId),
  getSimulationHistory: () => backend.sim.getSimulationHistory(),
  list: () => backend.sim.list(),
  getAgentStats: (simId) => backend.sim.getAgentStats(simId),
  getTimeline: (simId) => backend.sim.getTimeline(simId),
  // 动作类(重依赖:OASIS/LLM)
  create: (body) => backend.sim.create(body),
  prepare: (simId, body) => backend.sim.prepare(simId, body),
  start: (simId, body) => backend.sim.start(simId, body),
  stop: (simId) => backend.sim.stop(simId),
  interview: (body) => backend.sim.interview(body),
}
