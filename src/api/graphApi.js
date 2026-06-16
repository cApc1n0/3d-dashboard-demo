import { backend } from './backend'

// 知识图谱接口(POISS /api/graph)。返回原始 JSON,无 .data。
export const graphApi = {
  getGraphData: (graphId) => backend.graph.getGraphData(graphId),
  getGraphAnalysis: (graphId) => backend.graph.getGraphAnalysis(graphId),
}
