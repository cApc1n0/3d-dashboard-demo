import { backend } from './backend'

// DG 决策生成接口。对齐 POISS DGAPI:返回后端原始 JSON,无 .data 包装。
export const dgApi = {
  listSessions: () => backend.dg.listSessions(),
  getDetail: (sid) => backend.dg.getDetail(sid),
  getRiskDecomposition: (sid) => backend.dg.getRiskDecomposition(sid),
}
