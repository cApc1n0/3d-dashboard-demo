import { backend } from './backend'

// 套件级报告接口(/api/report)。从 suite_id 生成、查看、下载。
export const reportApi = {
  generate: (suiteId) => backend.report.generate(suiteId),
  get: (reportId) => backend.report.get(reportId),
  download: (reportId, fmt) => backend.report.download(reportId, fmt),
  bySuite: (suiteId) => backend.report.bySuite(suiteId),
}
