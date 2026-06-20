import { backend } from './backend'

// DG↔POISS 闭环接口(/api/bridge)。双向传输 + 只读 poiss 数据 + 报告下载。
export const bridgeApi = {
  listPoissProjects: () => backend.bridge.listPoissProjects(),
  getPoissStrategies: (projectId) => backend.bridge.getPoissStrategies(projectId),
  listPoissSims: () => backend.bridge.listPoissSims(),
  getPoissDeduction: (sid) => backend.bridge.getPoissDeduction(sid),
  getPoissReport: (rid) => backend.bridge.getPoissReport(rid),
  transferDgToPoiss: (body) => backend.bridge.transferDgToPoiss(body),
  transferPoissToDg: (body) => backend.bridge.transferPoissToDg(body),
  getPoissReportFile: (rid) => backend.bridge.getPoissReportFile(rid),
}
