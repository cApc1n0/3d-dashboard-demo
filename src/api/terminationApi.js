import { backend } from './backend'

// 终止/kill-switch 接口(/api/termination)。规则配置 + 紧急停止 + 状态;无外部依赖。
export const terminationApi = {
  getRules: (strategyId) => backend.termination.getRules(strategyId),
  setRules: (strategyId, body) => backend.termination.setRules(strategyId, body),
  emergency: (suiteId, body) => backend.termination.emergency(suiteId, body),
  getStatus: (strategyId) => backend.termination.getStatus(strategyId),
}
