import { backend } from './backend'

// 知识图谱接口(POISS /api/graph)。getGraphData 已解 .data + 字段归一(消费方无 .data)。
export const graphApi = {
  getGraphData: (graphId) => backend.graph.getGraphData(graphId),
  getGraphAnalysis: (graphId) => backend.graph.getGraphAnalysis(graphId),
  listProjects: () => backend.graph.listProjects(),
  listNeo4jGraphs: () => backend.graph.listNeo4jGraphs(),
  createProject: (name) => backend.graph.createProject(name),
  uploadGraph: (projectId, file) => backend.graph.uploadGraph(projectId, file),
  // 动作类(重依赖:LLM+Neo4j,异步任务)
  buildGraph: (params) => backend.graph.buildGraph(params),
  getTask: (taskId) => backend.graph.getTask(taskId),
  generateOntology: (formData) => backend.graph.generateOntology(formData),
}
