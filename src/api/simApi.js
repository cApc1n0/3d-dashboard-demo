import { backend } from './backend'

// POISS 仿真接口。对齐 POISS 的 API._api() 封装:返回 { success, data },调用方必须取 .data。
export const simApi = {
  getRunStatus: (simId) => backend.sim.getRunStatus(simId),
  getSimulationHistory: () => backend.sim.getSimulationHistory(),
}
