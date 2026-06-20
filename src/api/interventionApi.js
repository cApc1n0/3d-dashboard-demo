import { backend } from './backend'

// 干预接口(/api/intervention)。类型 schema + 自动注册 + 手动执行 + 历史;无外部依赖。
export const interventionApi = {
  getTypes: () => backend.intervention.getTypes(),
  getHistory: (strategyId, params) => backend.intervention.getHistory(strategyId, params),
  getSummary: (strategyId) => backend.intervention.getSummary(strategyId),
  autoRegister: (body) => backend.intervention.autoRegister(body),
  manualExecute: (body) => backend.intervention.manualExecute(body),
}
