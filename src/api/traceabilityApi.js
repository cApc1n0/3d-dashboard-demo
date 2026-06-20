import { backend } from './backend'

// 可追溯接口(/api/traceability)。干预→影响时间线、因果链、影响报告、导出。
export const traceabilityApi = {
  timeline: (strategyId) => backend.traceability.timeline(strategyId),
  causalChain: (strategyId) => backend.traceability.causalChain(strategyId),
  impactReport: (strategyId) => backend.traceability.impactReport(strategyId),
  exportBundle: (strategyId, fmt) => backend.traceability.exportBundle(strategyId, fmt),
}
